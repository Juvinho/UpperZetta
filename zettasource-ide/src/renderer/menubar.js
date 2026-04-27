const { ipcRenderer, shell } = window.require('electron');

export class Menubar {
    constructor(app) {
        this.app = app;
        this.container = document.getElementById('menubar');
        this.activeMenu = null;
        this.menus = {
            'Arquivo': [
                { label: 'Novo Arquivo', shortcut: 'Ctrl+N', action: () => this.app.tabs.createNew() },
                { label: 'Nova Janela', shortcut: 'Ctrl+Shift+N', action: () => ipcRenderer.send('window:new') },
                { type: 'divider' },
                { label: 'Abrir Arquivo...', shortcut: 'Ctrl+O', action: () => this.app.openFile() },
                { label: 'Abrir Pasta...', shortcut: 'Ctrl+K Ctrl+O', action: () => this.app.openFolder() },
                { type: 'divider' },
                { label: 'Salvar', shortcut: 'Ctrl+S', action: () => this.app.saveActive() },
                { label: 'Salvar Como...', shortcut: 'Ctrl+Shift+S', action: () => this.app.saveActiveAs() },
                { label: 'Salvar Todos', shortcut: 'Ctrl+K S', action: () => this.app.saveAll() },
                { type: 'divider' },
                { label: 'Selar Código-Fonte (.uzs)...', shortcut: 'Ctrl+Shift+E', action: () => window._openExportUZS?.() },
                { type: 'divider' },
                { label: 'Sair', shortcut: 'Alt+F4', action: () => window.close() }
            ],
            'Editar': [
                { label: 'Desfazer', shortcut: 'Ctrl+Z', action: () => this.app.editor.undo() },
                { label: 'Refazer', shortcut: 'Ctrl+Y', action: () => this.app.editor.redo() },
                { type: 'divider' },
                { label: 'Recortar', shortcut: 'Ctrl+X', action: () => document.execCommand('cut') },
                { label: 'Copiar', shortcut: 'Ctrl+C', action: () => document.execCommand('copy') },
                { label: 'Colar', shortcut: 'Ctrl+V', action: () => document.execCommand('paste') },
                { type: 'divider' },
                { label: 'Buscar', shortcut: 'Ctrl+F', action: () => this.app.editor.showSearch() },
                { label: 'Substituir', shortcut: 'Ctrl+H', action: () => this.app.editor.showReplace() }
            ],
            'Ver': [
                { label: 'Explorer', shortcut: 'Ctrl+Shift+E', action: () => this.app.toggleSidebar('explorer') },
                { label: 'Terminal', shortcut: 'Ctrl+`', action: () => this.app.toggleBottomPanel('terminal') },
                { type: 'divider' },
                { label: 'Command Palette', shortcut: 'Ctrl+Shift+P', action: () => this.app.commandPalette.show() },
                { label: 'Tema Escuro/Claro', action: () => this.app.toggleTheme() }
            ],
            'UVLM': [
                { label: 'Compilar Arquivo', shortcut: 'Ctrl+Shift+B', action: () => this.app.uvlm.compileActive() },
                { label: 'Executar', shortcut: 'F5', action: () => this.app.uvlm.runActive() },
                { type: 'divider' },
                { label: 'Compilar e Selar (.uzs)...', action: () => this.app.uvlm.compileAndSeal() },
                { type: 'divider' },
                { label: 'Configurar UVLM...', action: () => this.app.showSettings('uvlm') }
            ],
            'Ferramentas': [
                { label: 'Configurações', shortcut: 'Ctrl+,', action: () => this.app.showSettings() }
            ],
            'Ajuda': [
                { label: 'Documentação UpperZetta', action: () => shell.openExternal('https://github.com') },
                { label: 'Atalhos de Teclado', action: () => this.app.commandPalette.show() },
                { type: 'divider' },
                { label: 'Sobre ZettaSource', action: () => alert('ZettaSource IDE v2.0.0\nUpperZetta UVLM\n\nDesenvolvido com Electron + CodeMirror 6') }
            ]
        };

        this.init();
    }

    init() {
        for (const [name, items] of Object.entries(this.menus)) {
            const menuBtn = document.createElement('div');
            menuBtn.className = 'menu-item';
            menuBtn.textContent = name;
            menuBtn.onclick = (e) => {
                e.stopPropagation();
                this.toggleDropdown(name, menuBtn);
            };
            menuBtn.onmouseenter = () => {
                if (this.activeMenu) this.toggleDropdown(name, menuBtn);
            };
            this.container.appendChild(menuBtn);
        }

        window.onclick = () => this.closeDropdown();
    }

    toggleDropdown(name, btn) {
        this.closeDropdown();
        this.activeMenu = btn;
        btn.classList.add('active');

        const dropdown = document.createElement('div');
        dropdown.className = 'dropdown';
        const rect = btn.getBoundingClientRect();
        dropdown.style.left = rect.left + 'px';
        dropdown.style.top = rect.bottom + 'px';

        this.menus[name].forEach(item => {
            if (item.type === 'divider') {
                const div = document.createElement('div');
                div.className = 'dropdown-divider';
                dropdown.appendChild(div);
            } else {
                const div = document.createElement('div');
                div.className = 'dropdown-item';
                div.innerHTML = `
                    <span class="dropdown-label">${item.label}</span>
                    <span class="dropdown-shortcut">${item.shortcut || ''}</span>
                `;
                div.onclick = (e) => {
                    e.stopPropagation();
                    this.closeDropdown();
                    item.action();
                };
                dropdown.appendChild(div);
            }
        });

        document.body.appendChild(dropdown);
        this.currentDropdown = dropdown;
    }

    closeDropdown() {
        if (this.currentDropdown) {
            this.currentDropdown.remove();
            this.currentDropdown = null;
        }
        if (this.activeMenu) {
            this.activeMenu.classList.remove('active');
            this.activeMenu = null;
        }
    }
}
