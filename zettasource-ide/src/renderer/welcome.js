const { ipcRenderer } = window.require('electron');
const path = window.require('path');

export class WelcomeScreen {
    constructor(app) {
        this.app = app;
        this.overlay = null;
    }

    show() {
        if (this.overlay) this.overlay.remove();

        this.overlay = document.createElement('div');
        this.overlay.id = 'welcome-overlay';
        this.overlay.innerHTML = `
            <div class="welcome-container">
                <div class="welcome-left">
                    <img src="assets/UpperZetta.png" class="welcome-logo">
                    <h1>ZettaSource</h1>
                    <p class="version">v2.0.0</p>
                    
                    <div class="recent-projects">
                        <h3>Projetos Recentes</h3>
                        <div id="recent-list">
                            <p class="empty-msg">Nenhum projeto recente</p>
                        </div>
                        <button class="welcome-btn secondary" id="btn-open-folder">Abrir Pasta...</button>
                    </div>
                </div>
                <div class="welcome-right">
                    <h3>Criar Novo Projeto</h3>
                    <div class="project-form">
                        <input type="text" id="proj-name" placeholder="Nome do projeto">
                        <div class="template-grid">
                            <div class="template-item active" data-template="vazio">
                                <span class="material-icons">folder_open</span>
                                <span>Vazio</span>
                            </div>
                            <div class="template-item" data-template="componente">
                                <span class="material-icons">widgets</span>
                                <span>Componente</span>
                            </div>
                            <div class="template-item" data-template="classe">
                                <span class="material-icons">class</span>
                                <span>Classe</span>
                            </div>
                            <div class="template-item" data-template="fullstack">
                                <span class="material-icons">layers</span>
                                <span>Fullstack</span>
                            </div>
                        </div>
                        <button class="welcome-btn primary" id="btn-create-proj">Criar Projeto</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(this.overlay);

        // Bind events
        this.overlay.querySelector('#btn-open-folder').onclick = () => {
            this.app.openFolder();
            this.hide();
        };

        this.overlay.querySelector('#btn-create-proj').onclick = () => {
            const name = document.getElementById('proj-name').value;
            const template = this.overlay.querySelector('.template-item.active').getAttribute('data-template');
            this.createProject(name, template);
        };

        this.overlay.querySelectorAll('.template-item').forEach(item => {
            item.onclick = () => {
                this.overlay.querySelectorAll('.template-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
            };
        });
    }

    hide() {
        if (this.overlay) {
            this.overlay.remove();
            this.overlay = null;
        }
    }

    async createProject(name, template) {
        if (!name) return alert('Digite um nome para o projeto.');
        
        const result = await ipcRenderer.invoke('show-open-dialog', {
            properties: ['openDirectory'],
            title: 'Selecione onde criar o projeto'
        });

        if (!result.canceled) {
            const root = path.join(result.filePaths[0], name);
            await ipcRenderer.invoke('fs:mkdir', root);
            
            // Create zettasource.json
            const config = {
                name: name,
                version: "1.0.0",
                main: "main.uz",
                uvlm: { outDir: "out/", args: [] }
            };
            await ipcRenderer.invoke('fs:writeFile', { filePath: path.join(root, 'zettasource.json'), content: JSON.stringify(config, null, 4) });

            // Template specific files
            let content = 'fun main() {\n    System.print("Hello World");\n}';
            if (template === 'componente') {
                content = 'componente App {\n    fun render() {\n        System.print("Hello Component");\n    }\n}';
            } else if (template === 'classe') {
                content = 'class App {\n    fun main() {\n        System.print("Hello Class");\n    }\n}';
            }
            await ipcRenderer.invoke('fs:writeFile', { filePath: path.join(root, 'main.uz'), content });

            this.app.sidebar.loadFolder(root);
            this.hide();
        }
    }
}
