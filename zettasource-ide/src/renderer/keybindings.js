export class Keybindings {
    constructor(app) {
        this.app = app;
        this.init();
    }

    init() {
        window.onkeydown = async (e) => {
            const ctrl = e.ctrlKey || e.metaKey;
            const shift = e.shiftKey;

            // Ctrl+N - Novo arquivo
            if (ctrl && !shift && e.key === 'n') {
                e.preventDefault();
                this.app.tabs.createNew();
            }

            // Ctrl+O - Abrir arquivo
            if (ctrl && !shift && e.key === 'o') {
                e.preventDefault();
                this.app.openFile();
            }

            // Ctrl+K Ctrl+O - Abrir Pasta
            if (ctrl && e.key === 'k') {
                // Simplified: just wait for O
                this._waitingForO = true;
                setTimeout(() => this._waitingForO = false, 1000);
            }
            if (ctrl && this._waitingForO && e.key === 'o') {
                e.preventDefault();
                this.app.openFolder();
            }

            // Ctrl+S - Salvar
            if (ctrl && !shift && e.key === 's') {
                e.preventDefault();
                this.app.saveActive();
            }

            // Ctrl+W - Fechar Tab
            if (ctrl && !shift && e.key === 'w') {
                e.preventDefault();
                if (this.app.tabs.activeTabId) this.app.tabs.close(this.app.tabs.activeTabId);
            }

            // Ctrl+` - Terminal
            if (ctrl && e.key === '`') {
                e.preventDefault();
                this.app.bottomPanel.switchPanel('terminal');
            }

            // Ctrl+Shift+B - Compilar
            if (ctrl && shift && e.key === 'B') {
                e.preventDefault();
                this.app.uvlm.compileActive();
            }

            // F5 - Executar
            if (e.key === 'F5') {
                e.preventDefault();
                this.app.uvlm.runActive();
            }

            // Ctrl+B - Sidebar
            if (ctrl && !shift && e.key === 'b') {
                e.preventDefault();
                document.getElementById('sidebar').classList.toggle('hidden');
            }

            // Ctrl+Shift+P - Command Palette
            if (ctrl && shift && e.key === 'P') {
                e.preventDefault();
                this.app.commandPalette.show();
            }

            // Ctrl+, - Settings
            if (ctrl && e.key === ',') {
                e.preventDefault();
                this.app.sidebar.switchPanel('settings');
            }
        };
    }
}
