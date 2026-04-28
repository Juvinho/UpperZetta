import { Sidebar } from './sidebar.js';
import { Tabs } from './tabs.js';
import { Editor } from './editor.js';
import { UVLM } from './uvlm.js';
import { TerminalWrapper } from './terminal.js';
import { BottomPanel } from './bottomPanel.js';
import { Keybindings } from './keybindings.js';
import { Menubar } from './menubar.js';
import { CommandPalette } from './commandPalette.js';
import { Settings } from './settings.js';
import { WelcomeScreen } from './welcome.js';
import { WindowControls } from './windowControls.js';
import { ExportUZS } from './exportUZS.js';
import { UZSOpener } from './uzsOpener.js';

const { ipcRenderer } = window.require('electron');
const Store = window.require('electron-store');
const path = window.require('path');

function fuzzyMatch(str, query) {
    return str.toLowerCase().includes(query.toLowerCase());
}

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

class App {
    constructor() {
        this.config = new Store();
        this.workspacePath = null;
        
        // Initialize Components
        this.editor = new Editor(this);
        this.tabs = new Tabs(this);
        this.menubar = new Menubar(this);
        this.sidebar = new Sidebar(this);
        this.bottomPanel = new BottomPanel(this);
        this.uvlm = new UVLM(this);
        this.terminal = new TerminalWrapper(this);
        this.commandPalette = new CommandPalette(this);
        this.settings = new Settings(this);
        this.welcome = new WelcomeScreen(this);
        this.exportUZS = new ExportUZS(this);
        this.uzsOpener = new UZSOpener(this);
        this.keybindings = new Keybindings(this);
        this.windowControls = new WindowControls(this);

        this.init();
    }

    async init() {
        this.initLayoutResizers();
        this.welcome.show();
        this.setStatus('UVLM: Idle', 'idle');
    }

    initLayoutResizers() {
        const mainContainer = document.getElementById('main-container');
        const sidebar = document.getElementById('sidebar');
        const sidebarResizer = document.getElementById('sidebar-resizer');
        const editorArea = document.getElementById('editor-area');
        const bottomPanel = document.getElementById('bottom-panel');
        const panelResizer = document.getElementById('panel-resizer');

        if (!mainContainer || !sidebar || !sidebarResizer || !editorArea || !bottomPanel || !panelResizer) {
            return;
        }

        const minSidebarWidth = 180;
        const minEditorWidth = 320;
        const minBottomPanelHeight = 120;
        const minEditorHeight = 120;

        const applySidebarWidth = (nextWidth) => {
            const maxSidebarWidth = Math.max(
                minSidebarWidth,
                mainContainer.clientWidth - minEditorWidth - sidebarResizer.offsetWidth
            );
            const width = clamp(nextWidth, minSidebarWidth, maxSidebarWidth);
            sidebar.style.width = `${width}px`;
            return width;
        };

        const applyBottomPanelHeight = (nextHeight) => {
            const maxBottomPanelHeight = Math.max(minBottomPanelHeight, editorArea.clientHeight - minEditorHeight);
            const height = clamp(nextHeight, minBottomPanelHeight, maxBottomPanelHeight);
            bottomPanel.style.height = `${height}px`;
            return height;
        };

        const savedSidebarWidth = Number(this.config.get('layout.sidebarWidth'));
        if (Number.isFinite(savedSidebarWidth) && savedSidebarWidth > 0) {
            applySidebarWidth(savedSidebarWidth);
        }

        const savedBottomPanelHeight = Number(this.config.get('layout.bottomPanelHeight'));
        if (Number.isFinite(savedBottomPanelHeight) && savedBottomPanelHeight > 0) {
            applyBottomPanelHeight(savedBottomPanelHeight);
        }

        sidebarResizer.addEventListener('mousedown', (event) => {
            event.preventDefault();
            document.body.classList.add('is-resizing-sidebar');

            const onMouseMove = (moveEvent) => {
                const left = mainContainer.getBoundingClientRect().left;
                const nextWidth = moveEvent.clientX - left;
                applySidebarWidth(nextWidth);
            };

            const onMouseUp = () => {
                document.body.classList.remove('is-resizing-sidebar');
                document.removeEventListener('mousemove', onMouseMove);
                this.config.set('layout.sidebarWidth', Math.round(sidebar.getBoundingClientRect().width));
            };

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp, { once: true });
        });

        panelResizer.addEventListener('mousedown', (event) => {
            event.preventDefault();
            document.body.classList.add('is-resizing-panel');

            const onMouseMove = (moveEvent) => {
                const editorRect = editorArea.getBoundingClientRect();
                const nextHeight = editorRect.bottom - moveEvent.clientY;
                applyBottomPanelHeight(nextHeight);
            };

            const onMouseUp = () => {
                document.body.classList.remove('is-resizing-panel');
                document.removeEventListener('mousemove', onMouseMove);
                this.config.set('layout.bottomPanelHeight', Math.round(bottomPanel.getBoundingClientRect().height));
            };

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp, { once: true });
        });

        window.addEventListener('resize', () => {
            applySidebarWidth(sidebar.getBoundingClientRect().width);
            applyBottomPanelHeight(bottomPanel.getBoundingClientRect().height);
        });
    }

    async openFolder() {
        const path = await ipcRenderer.invoke('dialog:openFolder');
        if (path) {
            this.workspacePath = path;
            this.sidebar.loadFolder(path);
            this.welcome.hide();
        }
    }

    async openFile(filePath = null) {
        if (!filePath) {
            filePath = await ipcRenderer.invoke('dialog:openFile', {
                filters: [{ name: 'UpperZetta', extensions: ['uz', 'uzs', 'uzb'] }]
            });
        }
        if (!filePath) {
            return;
        }

        const extension = path.extname(filePath).toLowerCase();

        try {
            if (extension === '.uzs') {
                await this.uzsOpener.open(filePath);
            } else {
                const content = await ipcRenderer.invoke('fs:readFile', filePath);
                this.tabs.open(filePath, content);
            }
            this.welcome.hide();
        } catch (error) {
            if (error?.message === 'cancelled') {
                return;
            }
            this.logError(error instanceof Error ? error.message : 'Falha ao abrir arquivo.');
        }
    }

    async saveActive() {
        const activeTab = this.tabs.getActiveTab();
        if (!activeTab) return;

        const content = this.editor.getContent();

        // Fluxo Reversível: Se a aba veio de um .uzs, salvamos de volta no .uzs
        if (activeTab.sealed) {
            this.setStatus('Protegendo e salvando...', 'building');
            const result = await ipcRenderer.invoke('uvlm:exportUZS', {
                filePath: activeTab.sealed.path,
                password: activeTab.sealed.password,
                customContent: content // Precisamos garantir que o backend aceite conteúdo customizado
            });

            if (result.success) {
                this.tabs.markClean(activeTab.id);
                this.setStatus('Arquivo selado atualizado', 'success');
            } else {
                this.logError('Erro ao re-selar arquivo: ' + result.error);
            }
            return;
        }

        let filePath = activeTab.filePath;
        if (!filePath) {
            filePath = await ipcRenderer.invoke('dialog:saveFile');
            if (!filePath) return;
        }

        await ipcRenderer.invoke('fs:writeFile', { filePath, content });
        
        activeTab.filePath = filePath;
        activeTab.name = filePath.split(/[\\/]/).pop();
        this.tabs.markClean(activeTab.id);
        this.tabs.updateTabUI(activeTab);
        this.setStatus('Salvo com sucesso', 'success');
    }

    async saveActiveAs() {
        const activeTab = this.tabs.getActiveTab();
        if (!activeTab) return;

        const filePath = await ipcRenderer.invoke('dialog:saveFile');
        if (!filePath) return;

        const content = this.editor.getContent();
        await ipcRenderer.invoke('fs:writeFile', { filePath, content });
        
        activeTab.filePath = filePath;
        activeTab.name = filePath.split(/[\\/]/).pop();
        this.tabs.markClean(activeTab.id);
        this.tabs.updateTabUI(activeTab);
    }

    setStatus(text, status) {
        const statusBar = document.getElementById('statusbar');
        const statusText = document.getElementById('uvlm-status');
        
        const colors = {
            idle: '#E53030',
            building: '#E5A030',
            running: '#4EC94E',
            error: '#FF4444',
            success: '#4EC94E'
        };

        statusText.textContent = text;
        statusBar.style.backgroundColor = colors[status] || colors.idle;
    }

    toggleSidebar(panelName) {
        this.sidebar.switchPanel(panelName);
    }

    toggleBottomPanel(name) {
        this.bottomPanel.switchPanel(name);
    }

    showSettings(category) {
        this.settings.show(category);
    }

    toggleTheme() {
        document.body.classList.toggle('light-theme');
    }

    async saveAll() {
        for (const tab of this.tabs.tabs) {
            if (!tab.dirty) continue;
            const content = tab.state.doc.toString();
            if (tab.sealed) {
                await ipcRenderer.invoke('uvlm:exportUZS', {
                    filePath: tab.sealed.path,
                    password: tab.sealed.password,
                    customContent: content
                });
                this.tabs.markClean(tab.id);
            } else if (tab.filePath) {
                await ipcRenderer.invoke('fs:writeFile', { filePath: tab.filePath, content });
                this.tabs.markClean(tab.id);
            }
        }
        this.setStatus('Todos salvos', 'success');
    }

    logError(msg) {
        this.bottomPanel.switchPanel('output');
        this.bottomPanel.logOutput(msg, 'ERROR');
        this.setStatus('Erro detectado', 'error');
    }

    jumpToLine(line, col) {
        this.editor.setCursor(line, col);
    }

    async quickOpen() {
        if (!this.workspacePath) return;
        document.getElementById('quick-open')?.remove();

        const files = await ipcRenderer.invoke('fs:listAll', this.workspacePath);

        const overlay = document.createElement('div');
        overlay.id = 'quick-open';
        overlay.className = 'quick-open-overlay';
        overlay.innerHTML = `
            <div class="quick-open-box">
                <input type="text" id="qo-input" placeholder="Buscar arquivo...">
                <div id="qo-results"></div>
            </div>
        `;
        document.body.appendChild(overlay);

        const input   = document.getElementById('qo-input');
        const results = document.getElementById('qo-results');
        let selected  = 0;
        let filtered  = [];

        const render = (items) => {
            filtered = items.slice(0, 30);
            selected = 0;
            results.innerHTML = '';
            filtered.forEach((file, i) => {
                const div = document.createElement('div');
                div.className = 'qo-item' + (i === 0 ? ' active' : '');
                div.innerHTML = `<span class="qo-name">${file.name}</span><span class="qo-path">${file.rel}</span>`;
                div.onclick = () => { this.openFile(file.path); overlay.remove(); };
                results.appendChild(div);
            });
        };

        const filter = (q) => {
            if (!q) return files;
            return files
                .filter(f => fuzzyMatch(f.name, q) || fuzzyMatch(f.rel, q))
                .sort((a, b) => {
                    const an = a.name.toLowerCase().indexOf(q.toLowerCase());
                    const bn = b.name.toLowerCase().indexOf(q.toLowerCase());
                    return an - bn;
                });
        };

        render(files);
        input.focus();

        input.oninput = () => render(filter(input.value));

        input.onkeydown = (e) => {
            const items = results.querySelectorAll('.qo-item');
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                items[selected]?.classList.remove('active');
                selected = Math.min(selected + 1, items.length - 1);
                items[selected]?.classList.add('active');
                items[selected]?.scrollIntoView({ block: 'nearest' });
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                items[selected]?.classList.remove('active');
                selected = Math.max(selected - 1, 0);
                items[selected]?.classList.add('active');
                items[selected]?.scrollIntoView({ block: 'nearest' });
            } else if (e.key === 'Enter') {
                if (filtered[selected]) { this.openFile(filtered[selected].path); overlay.remove(); }
            } else if (e.key === 'Escape') {
                overlay.remove();
            }
        };

        overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
    }
}

window.app = new App();
