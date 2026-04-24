export class Settings {
    constructor(app) {
        this.app = app;
        this.overlay = null;
    }

    show(category = 'editor') {
        if (this.overlay) this.overlay.remove();

        this.overlay = document.createElement('div');
        this.overlay.id = 'settings-overlay';
        this.overlay.innerHTML = `
            <div class="settings-sidebar">
                <div class="settings-nav-item ${category === 'editor' ? 'active' : ''}" data-cat="editor">Editor</div>
                <div class="settings-nav-item ${category === 'uvlm' ? 'active' : ''}" data-cat="uvlm">UVLM</div>
                <div class="settings-nav-item" data-cat="appearance">Aparência</div>
                <div class="spacer"></div>
                <div class="settings-nav-item" id="close-settings"> Fechar</div>
            </div>
            <div class="settings-content">
                ${this.renderCategory(category)}
            </div>
        `;

        const editorArea = document.getElementById('editor-area');
        if (!editorArea) {
            console.error('Editor area not found');
            return;
        }
        editorArea.appendChild(this.overlay);

        this.overlay.querySelectorAll('.settings-nav-item').forEach(item => {
            item.onclick = () => {
                if (item.id === 'close-settings') {
                    this.overlay.remove();
                    this.overlay = null;
                } else {
                    this.show(item.getAttribute('data-cat'));
                }
            };
        });

        // Bind events for inputs
        this.overlay.querySelectorAll('input, select').forEach(input => {
            input.onchange = () => {
                const key = input.getAttribute('data-key');
                let value = input.type === 'checkbox' ? input.checked : input.value;
                this.app.config.set(key, value);
                this.applySetting(key, value);
            };
        });
    }

    renderCategory(cat) {
        if (cat === 'editor') {
            return `
                <div class="settings-group">
                    <h2>Editor</h2>
                    <div class="setting-row">
                        <div class="setting-info">
                            <h3>Tamanho da Fonte</h3>
                            <p>Controla o tamanho da fonte no editor (padrão: 13).</p>
                        </div>
                        <div class="setting-control">
                            <input type="number" data-key="editor.fontSize" value="${this.app.config.get('editor.fontSize', 13)}">
                        </div>
                    </div>
                    <div class="setting-row">
                        <div class="setting-info">
                            <h3>Modo VIM</h3>
                            <p>Ativa atalhos de teclado do VIM.</p>
                        </div>
                        <div class="setting-control">
                            <input type="checkbox" data-key="editor.vim" ${this.app.config.get('editor.vim') ? 'checked' : ''}>
                        </div>
                    </div>
                </div>
            `;
        } else if (cat === 'uvlm') {
            return `
                <div class="settings-group">
                    <h2>UVLM</h2>
                    <div class="setting-row">
                        <div class="setting-info">
                            <h3>Caminho do UVLM JAR</h3>
                            <p>Localização absoluta do Main.jar.</p>
                        </div>
                        <div class="setting-control">
                            <input type="text" data-key="uvlm.jarPath" value="${this.app.config.get('uvlm.jarPath', '')}" style="width: 300px;">
                        </div>
                    </div>
                </div>
            `;
        }
        return '';
    }

    applySetting(key, value) {
        if (key === 'editor.vim') {
            this.app.editor.toggleVim(value);
        }
        // Add more live updates here
    }
}
