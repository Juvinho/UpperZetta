const path = window.require('path');

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

export class Tabs {
    constructor(app) {
        this.app = app;
        this.container = document.getElementById('tabs-container');
        this.tabs = []; // { id, name, filePath, state, dirty }
        this.activeTabId = null;
        this.untitledCount = 0;
        this.minTabWidth = 120;
        this.maxTabWidth = 520;
        this.defaultTabWidth = 180;

        this.init();
    }

    init() {
        document.getElementById('new-tab-btn').onclick = () => this.createNew();
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
        if (existing) {
            this.activate(existing.id);
            return;
        }
        this.createNew(filePath, content);
    }

    // Open decrypted content from a sealed file.
    // displayName shown in tab, filePath = null → save triggers Save As dialog unless 'sealed' info is present.
    openDecrypted(displayName, content, options = {}) {
        const id = `tab-${Date.now()}`;
        const tab = {
            id,
            name: displayName,
            filePath: null,
            state: this.app.editor.createState(content),
            dirty: false,
            width: this.defaultTabWidth,
            sealed: options.originalUzsPath ? {
                path: options.originalUzsPath,
                password: options.password
            } : null
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

        // UI Update
        document.querySelectorAll('.tab').forEach(el => {
            el.classList.toggle('active', el.dataset.tabId === id);
        });

        document.getElementById('current-filename').textContent = `ZettaSource — ${tab.name}`;
    }

    close(id) {
        const index = this.tabs.findIndex(t => t.id === id);
        if (index === -1) return;

        const tab = this.tabs[index];
        if (tab.dirty) {
            const confirm = window.confirm(`${tab.name} possui alterações não salvas. Fechar mesmo assim?`);
            if (!confirm) return;
        }

        this.tabs.splice(index, 1);
        const el = document.querySelector(`[data-tab-id="${id}"]`);
        if (el) el.remove();

        if (this.activeTabId === id) {
            const nextTab = this.tabs[this.tabs.length - 1];
            if (nextTab) this.activate(nextTab.id);
            else this.app.editor.clear();
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
            this.startResizeTab(event, tab, el);
        };

        this.container.appendChild(el);
    }

    startResizeTab(event, tab, el) {
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
