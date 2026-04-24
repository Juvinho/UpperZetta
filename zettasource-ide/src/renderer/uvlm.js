const { ipcRenderer } = window.require('electron');

export class UVLM {
    constructor(app) {
        this.app = app;
        this.init();
    }

    init() {
        // Listeners owned by bottomPanel.js — nothing to register here
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
    
    async compileAndSeal() {
        const tab = this.app.tabs.getActiveTab();
        if (!tab || !tab.filePath) {
            alert('Abra um arquivo .uz para compilar e selar.');
            return;
        }

        const compileResult = await this.compileActive();
        if (compileResult) {
            // Se compilou com sucesso, abre o diálogo de exportação
            window._openExportUZS?.();
        }
    }

    stop() {
        ipcRenderer.send('uvlm:stop');
    }
}
