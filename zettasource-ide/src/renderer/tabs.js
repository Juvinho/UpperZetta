const { ipcRenderer } = window.require('electron');
const path = window.require('path');

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

export class Tabs {
    constructor(app) {
        this.app = app;
        this.container = document.getElementById('tabs-container');
        this.tabs = [];
        this.activeTabId = null;
        this.untitledCount = 0;
        this.minTabWidth = 120;
        this.maxTabWidth = 520;
        this.defaultTabWidth = 180;

        this.init();
    }

    init() {
        document.getElementById('new-tab-btn').onclick = () => this.createNew();
        document.addEventListener('click', () => this._hideTabMenu());
    }

    createNew(filePath = null, content = '') {
        const id = `tab-${Date.now()}`;
        const name = filePath ? filePath.split(/[\\/]/).pop() : `untitled-${++this.untitledCount}.uz`;

        const tab = {
            id,
            name,
            filePath,
            state: this.app.editor.createState(content),
            dirty: false,
            width: this.defaultTabWidth
        };

        this.tabs.push(tab);
        this.renderTabUI(tab);
        this.activate(id);
    }

    async open(filePath, content) {
        const existing = this.tabs.find(t => t.filePath === filePath);
        if (existing) { this.activate(existing.id); return; }
        this.createNew(filePath, content);
    }

    openDecrypted(displayName, content, options = {}) {
        const id = `tab-${Date.now()}`;
        const tab = {
            id,
            name: displayName,
            filePath: null,
            state: this.app.editor.createState(content),
            dirty: false,
            width: this.defaultTabWidth,
            sealed: options.originalUzsPath ? { path: options.originalUzsPath, password: options.password } : null
        };
        this.tabs.push(tab);
        this.renderTabUI(tab);
        this.activate(id);
    }

    activate(id) {
        const tab = this.tabs.find(t => t.id === id);
        if (!tab) return;

        this.activeTabId = id;
        this.app.editor.setState(tab.state);

        document.querySelectorAll('.tab').forEach(el => {
            el.classList.toggle('active', el.dataset.tabId === id);
        });

        document.getElementById('current-filename').textContent = `ZettaSource — ${tab.name}`;
        this._updateBreadcrumbs(tab);
    }

    activateNext() {
        const idx = this.tabs.findIndex(t => t.id === this.activeTabId);
        if (idx === -1 || this.tabs.length < 2) return;
        this.activate(this.tabs[(idx + 1) % this.tabs.length].id);
    }

    activatePrev() {
        const idx = this.tabs.findIndex(t => t.id === this.activeTabId);
        if (idx === -1 || this.tabs.length < 2) return;
        this.activate(this.tabs[(idx - 1 + this.tabs.length) % this.tabs.length].id);
    }

    close(id) {
        const index = this.tabs.findIndex(t => t.id === id);
        if (index === -1) return;

        const tab = this.tabs[index];
        if (tab.dirty) {
            const confirmed = window.confirm(`${tab.name} possui alterações não salvas. Fechar mesmo assim?`);
            if (!confirmed) return;
        }

        this.tabs.splice(index, 1);
        document.querySelector(`[data-tab-id="${id}"]`)?.remove();

        if (this.activeTabId === id) {
            const next = this.tabs[this.tabs.length - 1];
            if (next) this.activate(next.id);
            else {
                this.app.editor.clear();
                this._updateBreadcrumbs(null);
                document.getElementById('current-filename').textContent = 'ZettaSource IDE';
            }
        }
    }

    renderTabUI(tab) {
        const el = document.createElement('div');
        el.className = 'tab';
        el.dataset.tabId = tab.id;
        el.style.width = `${tab.width || this.defaultTabWidth}px`;
        el.innerHTML = `
            <span class="tab-name">${tab.name}</span>
            <span class="tab-close material-icons">close</span>
            <span class="tab-resizer" title="Arraste para redimensionar"></span>
        `;

        el.onclick = () => this.activate(tab.id);

        el.querySelector('.tab-close').onclick = (e) => {
            e.stopPropagation();
            this.close(tab.id);
        };

        el.querySelector('.tab-resizer').onmousedown = (event) => {
            this._startResizeTab(event, tab, el);
        };

        el.oncontextmenu = (e) => {
            e.preventDefault();
            e.stopPropagation();
            this._showTabContextMenu(e.clientX, e.clientY, tab);
        };

        this.container.appendChild(el);
    }

    _showTabContextMenu(x, y, tab) {
        this._hideTabMenu();

        const menu = document.createElement('div');
        menu.id = 'tab-ctx-menu';
        menu.className = 'ctx-menu';
        menu.style.left = `${x}px`;
        menu.style.top  = `${y}px`;

        const items = [
            {
                label: 'Fechar',
                action: () => this.close(tab.id)
            },
            {
                label: 'Fechar Outros',
                action: () => {
                    [...this.tabs].filter(t => t.id !== tab.id).forEach(t => this.close(t.id));
                }
            },
            {
                label: 'Fechar à Direita',
                action: () => {
                    const idx = this.tabs.findIndex(t => t.id === tab.id);
                    [...this.tabs].slice(idx + 1).forEach(t => this.close(t.id));
                }
            },
            {
                label: 'Fechar Todos',
                action: () => {
                    [...this.tabs].forEach(t => this.close(t.id));
                }
            },
            { divider: true },
        ];

        if (tab.filePath) {
            items.push(
                { label: 'Copiar Caminho',       action: () => navigator.clipboard.writeText(tab.filePath) },
                { label: 'Copiar Caminho Relativo', action: () => {
                    const rel = this.app.workspacePath
                        ? path.relative(this.app.workspacePath, tab.filePath).replace(/\\/g, '/')
                        : tab.filePath;
                    navigator.clipboard.writeText(rel);
                }},
                { label: 'Revelar no Explorer', action: () => ipcRenderer.invoke('fs:revealInExplorer', tab.filePath) },
            );
        }

        items.forEach(item => {
            if (item.divider) {
                const d = document.createElement('div');
                d.className = 'ctx-divider';
                menu.appendChild(d);
                return;
            }
            const el = document.createElement('div');
            el.className = 'ctx-item';
            el.textContent = item.label;
            el.onclick = (e) => { e.stopPropagation(); this._hideTabMenu(); item.action(); };
            menu.appendChild(el);
        });

        document.body.appendChild(menu);

        const rect = menu.getBoundingClientRect();
        if (rect.right  > window.innerWidth)  menu.style.left = `${x - rect.width}px`;
        if (rect.bottom > window.innerHeight)  menu.style.top  = `${y - rect.height}px`;
    }

    _hideTabMenu() {
        document.getElementById('tab-ctx-menu')?.remove();
    }

    _updateBreadcrumbs(tab) {
        const el = document.getElementById('breadcrumbs');
        if (!el) return;
        if (!tab || !tab.filePath) {
            el.innerHTML = tab ? `<span class="crumb crumb-active">${tab?.name || ''}</span>` : '';
            return;
        }
        const parts = tab.filePath.replace(/\\/g, '/').split('/');
        el.innerHTML = parts.map((part, i) => {
            const isLast = i === parts.length - 1;
            return `<span class="crumb${isLast ? ' crumb-active' : ''}">${part}</span>${isLast ? '' : '<span class="crumb-sep">›</span>'}`;
        }).join('');
    }

    _startResizeTab(event, tab, el) {
        event.preventDefault();
        event.stopPropagation();

        const startX = event.clientX;
        const startWidth = el.getBoundingClientRect().width;
        document.body.classList.add('is-resizing-tab');

        const onMouseMove = (moveEvent) => {
            const delta = moveEvent.clientX - startX;
            const nextWidth = clamp(startWidth + delta, this.minTabWidth, this.maxTabWidth);
            tab.width = nextWidth;
            el.style.width = `${nextWidth}px`;
        };

        const onMouseUp = () => {
            document.body.classList.remove('is-resizing-tab');
            document.removeEventListener('mousemove', onMouseMove);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp, { once: true });
    }

    markDirty(id) {
        const tab = this.tabs.find(t => t.id === id);
        if (tab && !tab.dirty) {
            tab.dirty = true;
            document.querySelector(`[data-tab-id="${id}"]`)?.classList.add('dirty');
        }
    }

    markClean(id) {
        const tab = this.tabs.find(t => t.id === id);
        if (tab) {
            tab.dirty = false;
            document.querySelector(`[data-tab-id="${id}"]`)?.classList.remove('dirty');
        }
    }

    updateTabUI(tab) {
        const el = document.querySelector(`[data-tab-id="${tab.id}"] .tab-name`);
        if (el) el.textContent = tab.name;
    }

    getActiveTab() {
        return this.tabs.find(t => t.id === this.activeTabId);
    }
}
