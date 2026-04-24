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

const { ipcRenderer } = window.require('electron');
const Store = window.require('electron-store');
const path = window.require('path');

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
        this.keybindings = new Keybindings(this);
        this.windowControls = new WindowControls(this);

        this.init();
    }

    async init() {
        this.welcome.show();
        this.setStatus('UVLM: Idle', 'idle');
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
        if (filePath) {
            const content = await ipcRenderer.invoke('fs:readFile', filePath);
            this.tabs.open(filePath, content);
            this.welcome.hide();
        }
    }

    async saveActive() {
        const activeTab = this.tabs.getActiveTab();
        if (!activeTab) return;

        let filePath = activeTab.filePath;
        if (!filePath) {
            filePath = await ipcRenderer.invoke('dialog:saveFile');
            if (!filePath) return;
        }

        const content = this.editor.getContent();
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
            if (tab.dirty && tab.filePath) {
                const content = tab.state.doc.toString();
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
}

window.app = new App();
