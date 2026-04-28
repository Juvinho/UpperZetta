export class Keybindings {
    constructor(app) {
        this.app = app;
        this.init();
    }

    init() {
        window.onkeydown = async (e) => {
            const ctrl  = e.ctrlKey || e.metaKey;
            const shift = e.shiftKey;

            // Ctrl+N — Novo arquivo
            if (ctrl && !shift && e.key === 'n') {
                e.preventDefault();
                this.app.tabs.createNew();
            }

            // Ctrl+O — Abrir arquivo
            if (ctrl && !shift && e.key === 'o') {
                e.preventDefault();
                this.app.openFile();
            }

            // Ctrl+K Ctrl+O — Abrir Pasta
            if (ctrl && e.key === 'k') {
                this._waitingForO = true;
                setTimeout(() => this._waitingForO = false, 1000);
            }
            if (ctrl && this._waitingForO && e.key === 'o') {
                e.preventDefault();
                this.app.openFolder();
            }

            // Ctrl+P — Quick Open
            if (ctrl && !shift && e.key === 'p') {
                e.preventDefault();
                this.app.quickOpen();
            }

            // Ctrl+S — Salvar
            if (ctrl && !shift && e.key === 's') {
                e.preventDefault();
                this.app.saveActive();
            }

            // Ctrl+Shift+S — Salvar Como
            if (ctrl && shift && e.key === 'S') {
                e.preventDefault();
                this.app.saveActiveAs();
            }

            // Ctrl+W — Fechar Tab
            if (ctrl && !shift && e.key === 'w') {
                e.preventDefault();
                if (this.app.tabs.activeTabId) this.app.tabs.close(this.app.tabs.activeTabId);
            }

            // Ctrl+` — Terminal
            if (ctrl && e.key === '`') {
                e.preventDefault();
                this.app.bottomPanel.switchPanel('terminal');
            }

            // Ctrl+Shift+B — Compilar
            if (ctrl && shift && e.key === 'B') {
                e.preventDefault();
                this.app.uvlm.compileActive();
            }

            // F5 — Executar
            if (e.key === 'F5') {
                e.preventDefault();
                this.app.uvlm.runActive();
            }

            // Ctrl+B — Toggle Sidebar
            if (ctrl && !shift && e.key === 'b') {
                e.preventDefault();
                document.getElementById('sidebar').classList.toggle('hidden');
            }

            // Ctrl+Shift+P — Command Palette
            if (ctrl && shift && e.key === 'P') {
                e.preventDefault();
                this.app.commandPalette.show();
            }

            // Ctrl+Shift+E — Exportar .uzs
            if (ctrl && shift && e.key === 'E') {
                e.preventDefault();
                window._openExportUZS?.();
            }

            // Ctrl+, — Settings
            if (ctrl && e.key === ',') {
                e.preventDefault();
                this.app.sidebar.switchPanel('settings');
            }

            // Alt+Z — Word Wrap Toggle
            if (e.altKey && e.key === 'z') {
                e.preventDefault();
                this.app.editor.toggleWordWrap();
            }

            // Ctrl+Tab — Next tab
            if (ctrl && e.key === 'Tab' && !shift) {
                e.preventDefault();
                this.app.tabs.activateNext();
            }

            // Ctrl+Shift+Tab — Prev tab
            if (ctrl && shift && e.key === 'Tab') {
                e.preventDefault();
                this.app.tabs.activatePrev();
            }
        };
    }
}
