const { ipcRenderer } = window.require('electron');

export class UVLM {
    constructor(app) {
        this.app = app;
        this.init();
    }

    init() {
        // Listen for output from main process
        ipcRenderer.on('uvlm:output', (_, { type, text }) => {
            this.app.bottomPanel.logOutput(text, type);
        });

        // Listen for status changes
        ipcRenderer.on('uvlm:status', (_, status) => {
            this.app.setStatus(this.getStatusText(status), status);
        });
    }

    getStatusText(status) {
        const map = {
            idle: 'UVLM: Pronto',
            building: 'Compilando...',
            running: 'Rodando...',
            error: 'UVLM: Erro'
        };
        return map[status] || 'UVLM: Idle';
    }

    async compileActive() {
        const tab = this.app.tabs.getActiveTab();
        if (!tab || !tab.filePath) {
            alert('Salve o arquivo antes de compilar.');
            return;
        }

        if (tab.dirty) await this.app.saveActive();
        
        this.app.bottomPanel.switchPanel('output');
        return await ipcRenderer.invoke('uvlm:compile', { filePath: tab.filePath });
    }

    async runActive() {
        const tab = this.app.tabs.getActiveTab();
        if (!tab || !tab.filePath) {
            alert('Salve o arquivo antes de rodar.');
            return;
        }

        if (tab.dirty) await this.app.saveActive();

        this.app.bottomPanel.switchPanel('output');
        return await ipcRenderer.invoke('uvlm:buildAndRun', { filePath: tab.filePath });
    }

    stop() {
        ipcRenderer.send('uvlm:stop');
    }
}
