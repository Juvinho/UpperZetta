const { ipcRenderer } = window.require('electron');

export class WindowControls {
    constructor(app) {
        this.app = app;
        this.init();
    }

    init() {
        // Minimize
        document.getElementById('win-min').onclick = () => {
            ipcRenderer.send('window:minimize');
        };

        // Maximize / Restore
        document.getElementById('win-max').onclick = () => {
            ipcRenderer.send('window:maximize');
        };

        // Close with dirty check
        document.getElementById('win-close').onclick = async () => {
            const dirtyTabs = this.app.tabs.tabs.filter(t => t.dirty);

            if (dirtyTabs.length > 0) {
                const names = dirtyTabs.map(t => t.name).join(', ');
                const answer = await ipcRenderer.invoke('dialog:confirm', {
                    type: 'warning',
                    title: 'Fechar ZettaSource',
                    message: `Os seguintes arquivos têm alterações não salvas:\n${names}`,
                    buttons: ['Salvar e Fechar', 'Fechar sem Salvar', 'Cancelar'],
                    defaultId: 0,
                    cancelId: 2
                });

                if (answer === 0) {
                    await this.app.saveAll();
                    ipcRenderer.send('window:close');
                } else if (answer === 1) {
                    ipcRenderer.send('window:close');
                }
            } else {
                ipcRenderer.send('window:close');
            }
        };

        // F11 - Fullscreen
        document.addEventListener('keydown', (e) => {
            if (e.key === 'F11') {
                e.preventDefault();
                ipcRenderer.send('window:fullscreen');
            }
        });

        // Maximize/Unmaximize events from Main — CSS swaps SVG icons via body.maximized
        ipcRenderer.on('window:maximized', (_, isMax) => {
            document.body.classList.toggle('maximized', isMax);
            document.getElementById('win-max').title = isMax ? 'Restaurar' : 'Maximizar';
        });
    }
}
