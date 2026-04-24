const path = window.require('path');

export class Tabs {
    constructor(app) {
        this.app = app;
        this.container = document.getElementById('tabs-container');
        this.tabs = []; // { id, name, filePath, state, dirty }
        this.activeTabId = null;
        this.untitledCount = 0;

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
            dirty: false
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
        el.innerHTML = `
            <span class="tab-name">${tab.name}</span>
            <span class="tab-close material-icons">close</span>
        `;

        el.onclick = () => this.activate(tab.id);
        el.querySelector('.tab-close').onclick = (e) => {
            e.stopPropagation();
            this.close(tab.id);
        };

        this.container.appendChild(el);
    }

    markDirty(id) {
        const tab = this.tabs.find(t => t.id === id);
        if (tab && !tab.dirty) {
            tab.dirty = true;
            document.querySelector(`[data-tab-id="${id}"]`).classList.add('dirty');
        }
    }

    markClean(id) {
        const tab = this.tabs.find(t => t.id === id);
        if (tab) {
            tab.dirty = false;
            document.querySelector(`[data-tab-id="${id}"]`).classList.remove('dirty');
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
