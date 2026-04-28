const { ipcRenderer } = window.require('electron');
const path = window.require('path');

export class Sidebar {
    constructor(app) {
        this.app = app;
        this.container = document.getElementById('sidebar-content');
        this.icons = document.querySelectorAll('.icon-btn');
        this.activePanel = 'explorer';
        this._watcherAttached = false;
        this._contextMenu = null;

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

        this.renderExplorerEmpty();

        document.addEventListener('click', () => this._hideContextMenu());
    }

    // ── Context Menu ──────────────────────────────────────────────────────────

    _hideContextMenu() {
        if (this._contextMenu) {
            this._contextMenu.remove();
            this._contextMenu = null;
        }
    }

    _showContextMenu(x, y, items) {
        this._hideContextMenu();
        const menu = document.createElement('div');
        menu.className = 'ctx-menu';
        menu.style.left = `${x}px`;
        menu.style.top = `${y}px`;

        items.forEach(item => {
            if (item.divider) {
                const d = document.createElement('div');
                d.className = 'ctx-divider';
                menu.appendChild(d);
                return;
            }
            const el = document.createElement('div');
            el.className = 'ctx-item' + (item.danger ? ' danger' : '');
            el.innerHTML = `<span class="material-icons ctx-icon">${item.icon || 'circle'}</span><span>${item.label}</span>`;
            el.onclick = (e) => {
                e.stopPropagation();
                this._hideContextMenu();
                item.action();
            };
            menu.appendChild(el);
        });

        document.body.appendChild(menu);
        this._contextMenu = menu;

        const rect = menu.getBoundingClientRect();
        if (rect.right > window.innerWidth)  menu.style.left = `${x - rect.width}px`;
        if (rect.bottom > window.innerHeight) menu.style.top  = `${y - rect.height}px`;
    }

    // ── Panel Switching ───────────────────────────────────────────────────────

    switchPanel(panelName) {
        this.activePanel = panelName;
        this.icons.forEach(i => i.classList.toggle('active', i.dataset.target === panelName));
        this.renderActivePanel();
    }

    renderActivePanel() {
        this.container.innerHTML = '';
        switch (this.activePanel) {
            case 'explorer':
                if (this.app.workspacePath) this.renderFileTree(this.app.workspacePath);
                else this.renderExplorerEmpty();
                break;
            case 'outline':  this.renderOutline();  break;
            case 'search':   this.renderSearch();   break;
            case 'settings': this.renderSettings(); break;
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

    // ── File Tree ─────────────────────────────────────────────────────────────

    async renderFileTree(rootPath) {
        const tree = await ipcRenderer.invoke('fs:readDir', rootPath);
        const folderName = rootPath.split(/[\\/]/).pop();

        this.container.innerHTML = '';

        const header = document.createElement('div');
        header.className = 'panel-header explorer-header';
        header.innerHTML = `
            <span class="explorer-title" title="${rootPath}">${folderName.toUpperCase()}</span>
            <div class="explorer-actions">
                <span class="material-icons explorer-action-btn" id="btn-new-file"    title="Novo Arquivo (N)">note_add</span>
                <span class="material-icons explorer-action-btn" id="btn-new-folder"  title="Nova Pasta">create_new_folder</span>
                <span class="material-icons explorer-action-btn" id="btn-refresh-tree" title="Atualizar">refresh</span>
            </div>
        `;
        this.container.appendChild(header);

        const list = document.createElement('div');
        list.className = 'file-list';
        list.id = 'file-tree-list';

        header.querySelector('#btn-new-file').onclick = (e) => {
            e.stopPropagation();
            this._startInlineCreate(list, rootPath, false, 0);
        };
        header.querySelector('#btn-new-folder').onclick = (e) => {
            e.stopPropagation();
            this._startInlineCreate(list, rootPath, true, 0);
        };
        header.querySelector('#btn-refresh-tree').onclick = (e) => {
            e.stopPropagation();
            this.renderFileTree(rootPath);
        };

        list.oncontextmenu = (e) => {
            if (e.target === list) {
                e.preventDefault();
                this._showContextMenu(e.clientX, e.clientY, [
                    { label: 'Novo Arquivo',  icon: 'note_add',          action: () => this._startInlineCreate(list, rootPath, false, 0) },
                    { label: 'Nova Pasta',    icon: 'create_new_folder', action: () => this._startInlineCreate(list, rootPath, true, 0) },
                    { divider: true },
                    { label: 'Revelar no Explorer', icon: 'folder_open', action: () => ipcRenderer.invoke('fs:revealInExplorer', rootPath) },
                ]);
            }
        };

        this._renderLevel(tree, list, rootPath, 0);
        this.container.appendChild(list);
    }

    _renderLevel(items, parent, parentPath, depth) {
        items.forEach(item => {
            const div = document.createElement('div');
            div.className = 'tree-item' + (item.isDir ? ' is-dir' : '');
            div.style.paddingLeft = `${8 + depth * 14}px`;
            div.dataset.path = item.path;

            const icon = document.createElement('span');
            icon.className = 'material-icons tree-icon';
            icon.textContent = item.isDir ? 'folder' : this._fileIcon(item.name);

            const label = document.createElement('span');
            label.className = 'tree-label';
            label.textContent = item.name;

            div.appendChild(icon);
            div.appendChild(label);

            let childContainer = null;
            if (item.isDir) {
                childContainer = document.createElement('div');
                childContainer.className = 'child-container collapsed';
                if (item.children && item.children.length > 0) {
                    this._renderLevel(item.children, childContainer, item.path, depth + 1);
                }
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
                    document.querySelectorAll('.tree-item.selected').forEach(el => el.classList.remove('selected'));
                    div.classList.add('selected');
                    this.app.openFile(item.path);
                }
            };

            div.ondblclick = (e) => {
                if (!item.isDir) return;
                e.stopPropagation();
            };

            div.oncontextmenu = (e) => {
                e.preventDefault();
                e.stopPropagation();
                document.querySelectorAll('.tree-item.selected').forEach(el => el.classList.remove('selected'));
                div.classList.add('selected');

                const expandFolder = () => {
                    if (childContainer && childContainer.classList.contains('collapsed')) {
                        childContainer.classList.remove('collapsed');
                        icon.textContent = 'folder_open';
                        div.classList.add('open');
                    }
                };

                const common = [
                    { divider: true },
                    { label: 'Renomear',        icon: 'drive_file_rename_outline', action: () => this._startInlineRename(div, label, item) },
                    { label: 'Deletar',         icon: 'delete_outline', danger: true, action: () => this._deleteItem(item) },
                    { divider: true },
                    { label: 'Copiar Caminho',  icon: 'content_copy',  action: () => navigator.clipboard.writeText(item.path) },
                    { label: 'Revelar no Explorer', icon: 'folder_open', action: () => ipcRenderer.invoke('fs:revealInExplorer', item.path) },
                ];

                if (item.isDir) {
                    this._showContextMenu(e.clientX, e.clientY, [
                        { label: 'Novo Arquivo', icon: 'note_add', action: () => { expandFolder(); this._startInlineCreate(childContainer || parent, item.path, false, depth + 1); } },
                        { label: 'Nova Pasta',   icon: 'create_new_folder', action: () => { expandFolder(); this._startInlineCreate(childContainer || parent, item.path, true, depth + 1); } },
                        ...common,
                    ]);
                } else {
                    this._showContextMenu(e.clientX, e.clientY, [
                        { label: 'Abrir', icon: 'open_in_new', action: () => this.app.openFile(item.path) },
                        ...common,
                    ]);
                }
            };

            parent.appendChild(div);
            if (childContainer) parent.appendChild(childContainer);
        });
    }

    // ── Inline Create ─────────────────────────────────────────────────────────

    _startInlineCreate(container, parentPath, isDir, depth) {
        container.querySelectorAll('.tree-inline-input').forEach(el => el.remove());

        const row = document.createElement('div');
        row.className = 'tree-item tree-inline-input';
        row.style.paddingLeft = `${8 + depth * 14}px`;

        const icon = document.createElement('span');
        icon.className = 'material-icons tree-icon';
        icon.textContent = isDir ? 'create_new_folder' : 'note_add';

        const input = document.createElement('input');
        input.className = 'tree-rename-input';
        input.placeholder = isDir ? 'nova-pasta' : 'arquivo.uz';

        row.appendChild(icon);
        row.appendChild(input);
        container.insertBefore(row, container.firstChild);
        input.focus();

        let committed = false;
        const commit = async () => {
            if (committed) return;
            committed = true;
            const name = input.value.trim();
            row.remove();
            if (!name) return;
            const fullPath = path.join(parentPath, name);
            if (isDir) {
                await ipcRenderer.invoke('fs:createDir', fullPath);
            } else {
                await ipcRenderer.invoke('fs:createFile', fullPath);
                await this.app.openFile(fullPath);
            }
        };

        input.onkeydown = (e) => {
            if (e.key === 'Enter')  { e.preventDefault(); commit(); }
            if (e.key === 'Escape') { row.remove(); }
        };
        input.onblur = () => setTimeout(() => { if (!committed && document.body.contains(row)) { committed = true; row.remove(); } }, 200);
    }

    // ── Inline Rename ─────────────────────────────────────────────────────────

    _startInlineRename(div, labelEl, item) {
        const oldName = item.name;
        const input = document.createElement('input');
        input.className = 'tree-rename-input';
        input.value = oldName;
        labelEl.replaceWith(input);
        input.focus();
        input.select();

        let committed = false;
        const commit = async () => {
            if (committed) return;
            committed = true;
            const newName = input.value.trim();
            if (!newName || newName === oldName) { input.replaceWith(labelEl); return; }
            const newPath = path.join(path.dirname(item.path), newName);
            await ipcRenderer.invoke('fs:rename', { oldPath: item.path, newPath });
        };

        input.onkeydown = (e) => {
            if (e.key === 'Enter')  { e.preventDefault(); commit(); }
            if (e.key === 'Escape') { input.replaceWith(labelEl); committed = true; }
        };
        input.onblur = () => setTimeout(commit, 200);
    }

    // ── Delete ────────────────────────────────────────────────────────────────

    async _deleteItem(item) {
        const type = item.isDir ? 'pasta' : 'arquivo';
        const confirmed = window.confirm(`Deletar ${type} "${item.name}"?\nEsta ação não pode ser desfeita.`);
        if (!confirmed) return;
        await ipcRenderer.invoke('fs:unlink', item.path);
    }

    // ── Outline ───────────────────────────────────────────────────────────────

    renderOutline() {
        const activeTab = this.app.tabs.getActiveTab();
        if (!activeTab) {
            this.container.innerHTML = '<div class="panel-header">OUTLINE</div><p class="sidebar-empty">Abra um arquivo .uz</p>';
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

        if (matches.length === 0) {
            const p = document.createElement('p');
            p.className = 'sidebar-empty';
            p.textContent = 'Nenhum símbolo encontrado';
            this.container.appendChild(p);
            return;
        }

        matches.forEach(m => {
            const div = document.createElement('div');
            div.className = 'outline-item';
            div.innerHTML = `<span class="outline-badge badge-${m.type}">${m.type[0].toUpperCase()}</span><span>${m.name}</span>`;
            div.onclick = () => {
                const line = content.substring(0, m.index).split('\n').length;
                this.app.editor.setCursor(line, 1);
            };
            this.container.appendChild(div);
        });
    }

    // ── Search ────────────────────────────────────────────────────────────────

    renderSearch() {
        this.container.innerHTML = `
            <div class="panel-header">BUSCA GLOBAL</div>
            <div class="search-box">
                <input type="text" id="global-search-input" placeholder="Buscar nos arquivos... (Enter)">
                <div id="search-results"></div>
            </div>
        `;
        const input = document.getElementById('global-search-input');
        input.focus();
        input.onkeydown = async (e) => {
            if (e.key === 'Enter') {
                const query = input.value.trim();
                if (!query || !this.app.workspacePath) return;
                const results = await ipcRenderer.invoke('search:inFiles', { query, root: this.app.workspacePath });
                this._renderSearchResults(results);
            }
        };
    }

    _renderSearchResults(results) {
        const container = document.getElementById('search-results');
        container.innerHTML = '';
        if (results.length === 0) {
            container.innerHTML = '<p class="sidebar-empty">Nenhum resultado</p>';
            return;
        }
        const label = document.createElement('p');
        label.className = 'sidebar-empty';
        label.textContent = `${results.length} resultado(s)`;
        container.appendChild(label);
        results.forEach(res => {
            const div = document.createElement('div');
            div.className = 'search-item';
            div.innerHTML = `<div class="search-file">${res.file}:${res.line}</div><div class="search-text">${res.text}</div>`;
            div.onclick = () => { this.app.openFile(res.filePath); this.app.jumpToLine(res.line, 1); };
            container.appendChild(div);
        });
    }

    // ── Settings ──────────────────────────────────────────────────────────────

    renderSettings() {
        this.container.innerHTML = `
            <div class="panel-header">CONFIGURAÇÕES</div>
            <div class="settings-list">
                <div class="setting-item">
                    <label>Tema</label>
                    <button id="toggle-theme" class="btn-ghost">Toggle Dark/Light</button>
                </div>
                <div class="setting-item">
                    <label>Modo VIM</label>
                    <input type="checkbox" id="vim-mode">
                </div>
            </div>
        `;
        document.getElementById('toggle-theme').onclick = () => document.body.classList.toggle('light-theme');
        const vimCheck = document.getElementById('vim-mode');
        vimCheck.checked = this.app.config?.get('editor.vim') || false;
        vimCheck.onchange = () => this.app.editor.toggleVim(vimCheck.checked);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    _fileIcon(name) {
        if (name.endsWith('.uz'))   return 'code';
        if (name.endsWith('.uzb'))  return 'memory';
        if (name.endsWith('.uzs'))  return 'lock';
        if (name.endsWith('.json')) return 'data_object';
        if (name.endsWith('.md'))   return 'article';
        if (name.endsWith('.txt'))  return 'notes';
        if (name.endsWith('.js') || name.endsWith('.ts')) return 'javascript';
        if (name.endsWith('.css'))  return 'style';
        if (name.endsWith('.html')) return 'html';
        return 'description';
    }

    loadFolder(folderPath) {
        this.app.workspacePath = folderPath;
        this.activePanel = 'explorer';

        ipcRenderer.send('fs:watchDir', folderPath);

        if (!this._watcherAttached) {
            this._watcherAttached = true;
            ipcRenderer.on('fs:workspace-changed', () => {
                if (this.activePanel === 'explorer' && this.app.workspacePath) {
                    this.renderFileTree(this.app.workspacePath);
                }
            });
        }

        this.renderActivePanel();
    }
}
