const { ipcRenderer } = window.require('electron');
const path = window.require('path');

export class ExportUZS {
    constructor(app) {
        this.app = app;
        this._buildUI();
        window._openExportUZS = () => this.open();
    }

    _buildUI() {
        this.overlay = document.createElement('div');
        this.overlay.className = 'modal-overlay hidden';
        this.overlay.id = 'modal-export-uzs';

        this.overlay.innerHTML = `
            <div class="modal-box">
                <div class="modal-title">Selar Código-Fonte (.uzs)</div>
                <div class="modal-desc">O código-fonte será criptografado com AES-256-GCM.<br>O arquivo poderá ser aberto no editor por quem possuir a senha.</div>
                <div class="modal-filename" id="export-filename">Nenhum arquivo ativo.</div>
                <div class="modal-field">
                    <label>Senha</label>
                    <input type="password" id="export-password" placeholder="Senha de proteção" autocomplete="new-password">
                </div>
                <div class="modal-field">
                    <label>Confirmar senha</label>
                    <input type="password" id="export-confirm" placeholder="Repita a senha" autocomplete="new-password">
                </div>
                <div class="modal-error" id="export-error"></div>
                <div class="modal-progress hidden" id="export-progress">
                    <div class="modal-progress-bar indeterminate" id="export-bar"></div>
                </div>
                <div class="modal-actions">
                    <button class="btn-ghost" id="export-cancel">Cancelar</button>
                    <button class="btn-primary" id="export-submit">Exportar</button>
                </div>
            </div>
        `;

        document.body.appendChild(this.overlay);

        this.overlay.addEventListener('mousedown', (e) => {
            if (e.target === this.overlay) this.close();
        });

        document.getElementById('export-cancel').onclick = () => this.close();
        document.getElementById('export-submit').onclick = () => this._submit();

        document.getElementById('export-password').addEventListener('keydown', (e) => {
            if (e.key === 'Enter')  document.getElementById('export-confirm').focus();
            if (e.key === 'Escape') this.close();
        });
        document.getElementById('export-confirm').addEventListener('keydown', (e) => {
            if (e.key === 'Enter')  this._submit();
            if (e.key === 'Escape') this.close();
        });
    }

    open() {
        const tab = this.app.tabs.getActiveTab();
        const fileEl = document.getElementById('export-filename');

        if (!tab?.filePath) {
            fileEl.textContent = 'Nenhum arquivo ativo.';
        } else {
            fileEl.textContent = path.basename(tab.filePath);
        }

        document.getElementById('export-password').value = '';
        document.getElementById('export-confirm').value = '';
        document.getElementById('export-error').textContent = '';
        document.getElementById('export-progress').classList.add('hidden');
        document.getElementById('export-submit').disabled = false;
        document.getElementById('export-cancel').disabled = false;

        this.overlay.classList.remove('hidden');
        setTimeout(() => document.getElementById('export-password').focus(), 50);
    }

    close() {
        this.overlay.classList.add('hidden');
    }

    async _submit() {
        const tab = this.app.tabs.getActiveTab();
        const errorEl = document.getElementById('export-error');
        const progressEl = document.getElementById('export-progress');
        const submitBtn = document.getElementById('export-submit');
        const cancelBtn = document.getElementById('export-cancel');

        errorEl.textContent = '';

        if (!tab?.filePath) {
            errorEl.textContent = 'Nenhum arquivo ativo para exportar.';
            return;
        }

        const pw = document.getElementById('export-password').value;
        const confirm = document.getElementById('export-confirm').value;

        if (pw.length < 4) {
            errorEl.textContent = 'Senha deve ter pelo menos 4 caracteres.';
            return;
        }

        if (pw !== confirm) {
            errorEl.textContent = 'As senhas não coincidem.';
            document.getElementById('export-confirm').focus();
            return;
        }

        if (tab.dirty) await this.app.saveActive();

        submitBtn.disabled = true;
        cancelBtn.disabled = true;
        progressEl.classList.remove('hidden');

        try {
            const result = await ipcRenderer.invoke('uvlm:exportUZS', {
                filePath: tab.filePath,
                password: pw,
            });

            progressEl.classList.add('hidden');

            if (result.success) {
                const name = path.basename(result.uzsPath);
                this.app.bottomPanel.logOutput(`✓ Exportado → ${name}`, 'RUN');
                this.app.bottomPanel.switchPanel('output');
                this.close();
            } else {
                errorEl.textContent = result.error || 'Erro ao exportar.';
                submitBtn.disabled = false;
                cancelBtn.disabled = false;
            }
        } catch (e) {
            progressEl.classList.add('hidden');
            errorEl.textContent = e.message || 'Erro inesperado.';
            submitBtn.disabled = false;
            cancelBtn.disabled = false;
        }
    }
}
