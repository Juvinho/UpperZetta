const { ipcRenderer } = window.require('electron');

export class Sidebar {
    constructor(app) {
        this.app = app;
        this.container = document.getElementById('sidebar-content');
        this.icons = document.querySelectorAll('.icon-btn');
        this.activePanel = 'explorer';

        this.init();
    }

    init() {
        this.icons.forEach(icon => {
            icon.onclick = () => {
                const target = icon.dataset.target;
                if (target === 'settings') {
                    this.app.showSettings();
                } else {
                    this.switchPanel(target);
                }
            };
        });

        // Initialize Explorer empty state
        this.renderExplorerEmpty();
    }

    switchPanel(panelName) {
        // Toggle visibility if clicking the same icon
        if (this.activePanel === panelName && !document.getElementById('sidebar').classList.contains('hidden')) {
            // Option to hide sidebar could go here
        }

        this.activePanel = panelName;
        this.icons.forEach(i => i.classList.toggle('active', i.dataset.target === panelName));
        
        this.renderActivePanel();
    }

    renderActivePanel() {
        this.container.innerHTML = '';
        const panel = document.createElement('div');
        panel.className = `sidebar-panel panel-${this.activePanel}`;

        switch (this.activePanel) {
            case 'explorer':
                if (this.app.workspacePath) this.renderFileTree(this.app.workspacePath);
                else this.renderExplorerEmpty();
                break;
            case 'outline':
                this.renderOutline();
                break;
            case 'search':
                this.renderSearch();
                break;
            case 'settings':
                this.renderSettings();
                break;
        }
    }

    renderExplorerEmpty() {
        this.container.innerHTML = `
            <div class="panel-header">EXPLORER</div>
            <div class="empty-state">
                <p>Nenhuma pasta aberta</p>
                <button class="btn-primary" id="btn-open-folder">Abrir Pasta</button>
            </div>
        `;
        document.getElementById('btn-open-folder').onclick = () => this.app.openFolder();
    }

    async renderFileTree(path) {
        const tree = await ipcRenderer.invoke('fs:readDir', path);
        this.container.innerHTML = `<div class="panel-header">EXPLORER: ${path.split(/[\\/]/).pop()}</div>`;
        const list = document.createElement('div');
        list.className = 'file-list';
        
        const renderLevel = (items, parent, depth = 0) => {
            items.forEach(item => {
                const div = document.createElement('div');
                div.className = 'tree-item' + (item.isDir ? ' is-dir' : '');
                div.style.paddingLeft = `${depth * 12}px`;

                const icon = document.createElement('span');
                icon.className = 'material-icons';
                icon.textContent = item.isDir ? 'folder' : this._fileIcon(item.name);

                const label = document.createElement('span');
                label.textContent = item.name;

                div.appendChild(icon);
                div.appendChild(label);

                let childContainer = null;
                if (item.isDir && item.children && item.children.length > 0) {
                    childContainer = document.createElement('div');
                    childContainer.className = 'child-container collapsed';
                    renderLevel(item.children, childContainer, depth + 1);
                }

                div.onclick = (e) => {
                    e.stopPropagation();
                    if (item.isDir) {
                        if (!childContainer) return;
                        const isOpen = !childContainer.classList.contains('collapsed');
                        childContainer.classList.toggle('collapsed', isOpen);
                        icon.textContent = isOpen ? 'folder' : 'folder_open';
                        div.classList.toggle('open', !isOpen);
                    } else {
                        this.app.openFile(item.path);
                    }
                };

                parent.appendChild(div);
                if (childContainer) parent.appendChild(childContainer);
            });
        };
        renderLevel(tree, list);
        this.container.appendChild(list);
    }

    renderOutline() {
        const activeTab = this.app.tabs.getActiveTab();
        if (!activeTab || !activeTab.name.endsWith('.uz')) {
            this.container.innerHTML = '<div class="panel-header">OUTLINE</div><p class="padding">Abra um arquivo .uz</p>';
            return;
        }
        
        const content = this.app.editor.getContent();
        const matches = [];
        const regex = /(package|fun|class|componente)\s+([a-zA-Z0-9_]+)/g;
        let match;
        while ((match = regex.exec(content)) !== null) {
            matches.push({ type: match[1], name: match[2], index: match.index });
        }

        this.container.innerHTML = '<div class="panel-header">OUTLINE</div>';
        matches.forEach(m => {
            const div = document.createElement('div');
            div.className = 'outline-item';
            div.innerHTML = `<span class="badge-${m.type}">${m.type[0].toUpperCase()}</span> ${m.name}`;
            div.onclick = () => {
                const line = content.substring(0, m.index).split('\n').length;
                this.app.editor.setCursor(line, 1);
            };
            this.container.appendChild(div);
        });
    }

    renderSearch() {
        this.container.innerHTML = `
            <div class="panel-header">BUSCA GLOBAL</div>
            <div class="search-box">
                <input type="text" id="global-search-input" placeholder="Buscar nos arquivos...">
                <div id="search-results"></div>
            </div>
        `;
        const input = document.getElementById('global-search-input');
        input.onkeydown = async (e) => {
            if (e.key === 'Enter') {
                const query = input.value;
                const results = await ipcRenderer.invoke('search:inFiles', {
                    query,
                    root: this.app.workspacePath
                });
                this.renderSearchResults(results);
            }
        };
    }

    renderSearchResults(results) {
        const container = document.getElementById('search-results');
        container.innerHTML = '';
        results.forEach(res => {
            const div = document.createElement('div');
            div.className = 'search-item';
            div.innerHTML = `
                <div class="search-file">${res.file}:${res.line}</div>
                <div class="search-text">${res.text}</div>
            `;
            div.onclick = () => {
                this.app.openFile(res.filePath);
                this.app.jumpToLine(res.line, 1);
            };
            container.appendChild(div);
        });
    }

    renderSettings() {
        this.container.innerHTML = `
            <div class="panel-header">CONFIGURAÇÕES</div>
            <div class="settings-list">
                <div class="setting-item">
                    <label>Tema</label>
                    <button id="toggle-theme">Toggle Dark/Light</button>
                </div>
                <div class="setting-item">
                    <label>Modo VIM</label>
                    <input type="checkbox" id="vim-mode">
                </div>
            </div>
        `;
        document.getElementById('toggle-theme').onclick = () => {
            document.body.classList.toggle('light-theme');
        };
        const vimCheck = document.getElementById('vim-mode');
        vimCheck.checked = this.app.config?.get('editor.vim') || false;
        vimCheck.onchange = () => {
            this.app.editor.toggleVim(vimCheck.checked);
        };
    }

    _fileIcon(name) {
        if (name.endsWith('.uz'))  return 'code';
        if (name.endsWith('.uzb')) return 'memory';
        if (name.endsWith('.uzs')) return 'lock';
        if (name.endsWith('.json')) return 'data_object';
        if (name.endsWith('.md'))  return 'article';
        return 'description';
    }

    loadFolder(path) {
        this.app.workspacePath = path;
        this.activePanel = 'explorer';
        this.renderActivePanel();
    }
}
