const { ipcRenderer } = window.require('electron');
const path = window.require('path');

export class UZSOpener {
    constructor(app) {
        this.app = app;
        this._filePath = null;
        this._resolve = null;
        this._reject = null;
        this._decryptedSource = null;
        this._format = 'uz'; // 'uz' or 'uzb'
        this._buildUI();
    }

    _buildUI() {
        this.overlay = document.createElement('div');
        this.overlay.className = 'modal-overlay hidden';
        this.overlay.id = 'modal-open-uzs';

        this.overlay.innerHTML = `
            <div class="modal-box" id="uzs-phase-password">
                <div class="modal-title">Arquivo Selado (.uzs)</div>
                <div class="modal-desc">
                    Este arquivo está protegido por senha.<br>
                    Insira a senha para revelar o conteúdo.
                </div>
                <div class="modal-filename" id="uzs-open-filename"></div>
                <div class="modal-field">
                    <label>Senha</label>
                    <input type="password" id="uzs-open-password" placeholder="Senha do arquivo">
                </div>
                <div class="modal-error" id="uzs-open-error"></div>
                <div class="modal-progress hidden" id="uzs-open-progress">
                    <div class="modal-progress-bar indeterminate"></div>
                </div>
                <div class="modal-actions">
                    <button class="btn-ghost" id="uzs-open-cancel">Cancelar</button>
                    <button class="btn-primary" id="uzs-open-submit">Desbloquear</button>
                </div>
            </div>

            <div class="modal-box hidden" id="uzs-phase-options">
                <div class="modal-title">Sucesso!</div>
                <div class="modal-desc">Como você deseja acessar o conteúdo deste arquivo?</div>
                
                <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px;">
                    <button class="btn-primary" id="uzs-open-editor" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 12px;">
                        <span class="material-icons">edit</span> Abrir no Editor (Reversível)
                    </button>
                    <div style="text-align: center; font-size: 11px; color: var(--text-muted); margin: -4px 0;">— OU —</div>
                </div>

                <div class="modal-field">
                    <label>Formato de Extração (Salvar em Disco)</label>
                    <div style="display: flex; gap: 8px; margin-top: 5px;">
                        <button class="btn-ghost active-option" id="opt-save-uz" style="flex: 1; border-color: var(--accent); color: var(--text-main);">.uz (Fonte)</button>
                        <button class="btn-ghost" id="opt-save-uzb" style="flex: 1;">.uzb (Compilado)</button>
                    </div>
                </div>

                <div class="modal-field">
                    <label>Pasta de Destino</label>
                    <div style="display: flex; gap: 8px;">
                        <input type="text" id="uzs-extract-path" readonly placeholder="Selecione a pasta" style="flex: 1;">
                        <button class="btn-ghost" id="uzs-extract-browse" style="padding: 7px 10px;">
                            <span class="material-icons" style="font-size: 18px;">folder</span>
                        </button>
                    </div>
                </div>

                <div class="modal-error" id="uzs-extract-error"></div>
                
                <div class="modal-actions">
                    <button class="btn-ghost" id="uzs-extract-cancel">Fechar</button>
                    <button class="btn-primary" id="uzs-extract-submit">Extrair Arquivo</button>
                </div>
            </div>
        `;

        document.body.appendChild(this.overlay);

        // Events Phase 1
        document.getElementById('uzs-open-cancel').onclick = () => this._cancel();
        document.getElementById('uzs-open-submit').onclick  = () => this._submitPassword();
        document.getElementById('uzs-open-password').onkeydown = (e) => {
            if (e.key === 'Enter') this._submitPassword();
            if (e.key === 'Escape') this._cancel();
        };

        // Events Phase 2
        document.getElementById('opt-save-uz').onclick = () => this._setFormat('uz');
        document.getElementById('opt-save-uzb').onclick = () => this._setFormat('uzb');
        document.getElementById('uzs-extract-browse').onclick = () => this._browseFolder();
        document.getElementById('uzs-extract-cancel').onclick = () => this._cancel();
        document.getElementById('uzs-extract-submit').onclick = () => this._submitExtract();
        document.getElementById('uzs-open-editor').onclick = () => this._openInEditor();
    }

    open(filePath) {
        this._filePath = filePath;
        this._decryptedSource = null;
        this._isBytecode = false;
        this._format = 'uz';

        document.getElementById('uzs-phase-password').classList.remove('hidden');
        document.getElementById('uzs-phase-options').classList.add('hidden');
        
        document.getElementById('uzs-open-filename').textContent = path.basename(filePath);
        document.getElementById('uzs-open-password').value = '';
        document.getElementById('uzs-open-error').textContent = '';
        document.getElementById('uzs-open-progress').classList.add('hidden');
        document.getElementById('uzs-open-submit').disabled = false;
        
        const dir = path.dirname(filePath);
        document.getElementById('uzs-extract-path').value = dir;

        this.overlay.classList.remove('hidden');
        setTimeout(() => document.getElementById('uzs-open-password').focus(), 50);

        return new Promise((res, rej) => {
            this._resolve = res;
            this._reject  = rej;
        });
    }

    _cancel() {
        this.overlay.classList.add('hidden');
        if (this._reject) { this._reject(new Error('cancelled')); this._reject = null; }
    }

    _setFormat(fmt) {
        this._format = fmt;
        const btnUz = document.getElementById('opt-save-uz');
        const btnUzb = document.getElementById('opt-save-uzb');
        
        if (fmt === 'uz') {
            btnUz.style.borderColor = 'var(--accent)';
            btnUz.style.color = 'var(--text-main)';
            btnUzb.style.borderColor = 'var(--border)';
            btnUzb.style.color = 'var(--text-muted)';
        } else {
            btnUzb.style.borderColor = 'var(--accent)';
            btnUzb.style.color = 'var(--text-main)';
            btnUz.style.borderColor = 'var(--border)';
            btnUz.style.color = 'var(--text-muted)';
        }
    }

    async _browseFolder() {
        const folder = await ipcRenderer.invoke('dialog:openFolder');
        if (folder) {
            document.getElementById('uzs-extract-path').value = folder;
        }
    }

    async _submitPassword() {
        const pw = document.getElementById('uzs-open-password').value;
        if (!pw) return;

        document.getElementById('uzs-open-error').textContent = '';
        document.getElementById('uzs-open-progress').classList.remove('hidden');
        document.getElementById('uzs-open-submit').disabled = true;

        const result = await ipcRenderer.invoke('uvlm:unsealUZS', {
            filePath: this._filePath,
            password: pw,
        });

        document.getElementById('uzs-open-progress').classList.add('hidden');

        if (result.success) {
            this._decryptedSource = result.source;
            this._isBytecode = result.isBytecode;
            document.getElementById('uzs-phase-password').classList.add('hidden');
            document.getElementById('uzs-phase-options').classList.remove('hidden');

            if (result.isBytecode) {
                const desc = document.querySelector('#uzs-phase-options .modal-desc');
                desc.innerHTML = `
                    <span style="color: var(--warning); font-weight: bold;">⚠ Atenção:</span> 
                    Este arquivo contém bytecode (.uzb). A edição será limitada ao binário.
                `;
                document.getElementById('uzs-open-editor').innerHTML = '<span class="material-icons">visibility</span> Ver Binário no Editor';
                document.getElementById('opt-save-uz').textContent = '.uz (Binário)';
                document.getElementById('opt-save-uzb').textContent = '.uzb (Executável)';
            } else {
                const desc = document.querySelector('#uzs-phase-options .modal-desc');
                desc.textContent = 'Este arquivo contém o código-fonte original e é totalmente editável.';
                document.getElementById('uzs-open-editor').innerHTML = '<span class="material-icons">edit</span> Abrir Código para Editar';
                document.getElementById('opt-save-uz').textContent = '.uz (Fonte)';
                document.getElementById('opt-save-uzb').textContent = '.uzb (Compilado)';
            }
        } else {
            document.getElementById('uzs-open-error').textContent = result.error || 'Senha incorreta.';
            document.getElementById('uzs-open-submit').disabled = false;
            document.getElementById('uzs-open-password').select();
        }
    }

    _openInEditor() {
        if (!this._decryptedSource) return;
        
        const name = path.basename(this._filePath, '.uzs') + (this._isBytecode ? '.uzb' : '.uz');
        this.app.tabs.openDecrypted(name, this._decryptedSource);
        
        this.overlay.classList.add('hidden');
        if (this._resolve) {
            this._resolve(this._decryptedSource);
            this._resolve = null;
        }
    }

    async _submitExtract() {
        const destDir = document.getElementById('uzs-extract-path').value;
        const errorEl = document.getElementById('uzs-extract-error');
        const submitBtn = document.getElementById('uzs-extract-submit');
        
        if (!destDir) {
            errorEl.textContent = 'Selecione uma pasta de destino.';
            return;
        }

        submitBtn.disabled = true;
        errorEl.textContent = '';
        errorEl.style.color = 'var(--text-muted)';
        
        let statusMsg = this._format === 'uz' ? 'Salvando...' : 'Compilando...';
        if (this._isBytecode && this._format === 'uzb') statusMsg = 'Salvando Executável...';
        errorEl.textContent = statusMsg;

        const baseName = path.basename(this._filePath, '.uzs');
        const targetPath = path.join(destDir, `${baseName}.${this._format}`);

        try {
            if (this._format === 'uz') {
                // Salva como código fonte (ou binário se for bytecode)
                await ipcRenderer.invoke('fs:writeFile', {
                    filePath: targetPath,
                    content: this._decryptedSource
                });
            } else if (this._isBytecode) {
                // Se já é bytecode, apenas salva com extensão .uzb sem compilar novamente
                await ipcRenderer.invoke('fs:writeFile', {
                    filePath: targetPath,
                    content: this._decryptedSource
                });
            } else {
                // Salva como compilado (.uzb) a partir de fonte
                const tempUz = path.join(destDir, `__temp_${Date.now()}.uz`);
                const tempUzb = tempUz.replace('.uz', '.uzb');
                
                await ipcRenderer.invoke('fs:writeFile', {
                    filePath: tempUz,
                    content: this._decryptedSource
                });
                
                try {
                    const compileResult = await ipcRenderer.invoke('uvlm:compile', { filePath: tempUz });
                    await ipcRenderer.invoke('fs:rename', {
                        oldPath: tempUzb,
                        newPath: targetPath
                    });
                } finally {
                    await ipcRenderer.invoke('fs:unlink', tempUz);
                }
            }

            this.overlay.classList.add('hidden');
            if (this._resolve) {
                this._resolve(this._decryptedSource);
                this._resolve = null;
            }
            
            this.app.bottomPanel.logOutput(`✓ Conteúdo extraído com sucesso para: ${targetPath}`, 'SUCCESS');
            this.app.bottomPanel.switchPanel('output');

        } catch (e) {
            errorEl.style.color = 'var(--error)';
            errorEl.textContent = `Erro: ${e.message}`;
            submitBtn.disabled = false;
        }
    }
}



