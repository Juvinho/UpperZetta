export class CommandPalette {
    constructor(app) {
        this.app = app;
        this.el = null;
        this.input = null;
        this.results = null;
        this.commands = [];
        this.built = false;
    }

    buildUI() {
        if (this.built) return;
        this.built = true;

        const overlay = document.createElement('div');
        overlay.id = 'command-palette';
        overlay.className = 'hidden';
        overlay.innerHTML = `
            <div class="palette-inner">
                <input type="text" id="palette-input" placeholder="Digite um comando...">
                <div id="palette-results"></div>
            </div>
        `;
        document.body.appendChild(overlay);

        this.el = overlay;
        this.input = document.getElementById('palette-input');
        this.results = document.getElementById('palette-results');

        for (const [category, items] of Object.entries(this.app.menubar.menus)) {
            items.forEach(item => {
                if (item.type !== 'divider') {
                    this.commands.push({
                        label: `${category}: ${item.label}`,
                        shortcut: item.shortcut,
                        action: item.action
                    });
                }
            });
        }

        this.input.oninput = () => this.filter();
        this.input.onkeydown = (e) => {
            if (e.key === 'Escape') this.hide();
            if (e.key === 'Enter') this.executeActive();
        };

        overlay.onclick = (e) => { if (e.target === overlay) this.hide(); };
    }

    show() {
        this.buildUI();
        this.el.classList.remove('hidden');
        this.input.value = '';
        this.filter();
        this.input.focus();
    }

    hide() {
        if (this.el) this.el.classList.add('hidden');
    }

    filter() {
        const query = this.input.value.toLowerCase();
        const filtered = this.commands.filter(c => c.label.toLowerCase().includes(query));
        
        this.results.innerHTML = '';
        filtered.forEach((cmd, i) => {
            const div = document.createElement('div');
            div.className = 'palette-item' + (i === 0 ? ' active' : '');
            div.innerHTML = `
                <span>${cmd.label}</span>
                <span class="palette-shortcut">${cmd.shortcut || ''}</span>
            `;
            div.onclick = () => {
                cmd.action();
                this.hide();
            };
            this.results.appendChild(div);
        });
    }

    executeActive() {
        const active = this.results.querySelector('.palette-item.active');
        if (active) active.click();
    }
}
