import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
const { ipcRenderer } = window.require('electron');
const path = window.require('path');

export class TerminalWrapper {
    constructor(app) {
        this.app = app;
        this.container = document.getElementById('terminal-container');
        this.terminals = new Map();
        this.activeId = null;

        this.init();
    }

    init() {
        this.createTerminal();

        // Refit when terminal tab is clicked
        document.querySelectorAll('.panel-tab').forEach(btn => {
            if (btn.dataset.panel === 'terminal') {
                btn.addEventListener('click', () => {
                    setTimeout(() => {
                        const t = this.terminals.get(this.activeId);
                        if (t) { try { t.fitAddon.fit(); t.term.focus(); } catch (e) {} }
                    }, 10);
                });
            }
        });
    }

    async createTerminal(cwd) {
        const term = new Terminal({
            cursorBlink: true,
            cursorStyle: 'block',
            fontSize: 13,
            fontFamily: '"JetBrains Mono", "Cascadia Code", Consolas, monospace',
            scrollback: 10000,
            convertEol: false,
            allowTransparency: false,
            theme: {
                background: '#080808',
                foreground: '#D4D4D4',
                cursor: '#E53030',
                selectionBackground: '#3D1010',
                red:     '#E53030',
                green:   '#4EC94E',
                yellow:  '#E5A030',
                blue:    '#5591C7',
                cyan:    '#00D2D3',
                magenta: '#C792EA',
            },
        });

        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);

        const el = document.createElement('div');
        el.className = 'terminal-instance';
        this.container.appendChild(el);

        term.open(el);

        // Fit with delay to ensure DOM is rendered
        setTimeout(() => { try { fitAddon.fit(); } catch (e) {} }, 50);

        const { id, cwd: startCwd } = await ipcRenderer.invoke('terminal:create', { cwd });

        const state = {
            term,
            fitAddon,
            el,
            cwd: startCwd,
            lineBuffer: '',
            outputTimer: null,
            waitingForOutput: false,
        };

        this.terminals.set(id, state);

        term.write('\x1b[32mZettaSource Terminal\x1b[0m\r\n');
        term.write('\x1b[90mDica: use ./oa-uvlm_help para ver comandos da IDE\x1b[0m\r\n');
        this._showPrompt(state);

        ipcRenderer.on(`terminal:output:${id}`, (_, data) => {
            this._handleOutput(state, data);
        });

        ipcRenderer.on(`terminal:closed:${id}`, (_, code) => {
            term.write(`\r\n\x1b[90m[processo encerrado com código ${code}]\x1b[0m\r\n`);
        });

        term.onData(data => this._handleInput(id, state, data));

        const ro = new ResizeObserver(() => {
            try { fitAddon.fit(); } catch (e) {}
        });
        ro.observe(this.container);

        this.setActive(id);
        return id;
    }

    _showPrompt(state) {
        const cwd = state.cwd || '~';
        const dir = path.basename(cwd) || cwd;
        state.term.write(`\r\n\x1b[33m${dir}\x1b[0m \x1b[36m>\x1b[0m `);
        state.waitingForOutput = false;
    }

    _handleOutput(state, data) {
        const { term } = state;

        if (state.outputTimer) {
            clearTimeout(state.outputTimer);
            state.outputTimer = null;
        }

        if (data && data.trim() !== '') {
            const out = data.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n/g, '\r\n');
            term.write(out);
        }

        // Always schedule the prompt — even blank output means the process is alive
        state.outputTimer = setTimeout(() => {
            state.outputTimer = null;
            this._showPrompt(state);
        }, 200);
    }

    _handleInput(id, state, data) {
        const { term } = state;
        const code = data.charCodeAt(0);

        // Always let Ctrl+C through, even while waiting
        if (data === '\x03') {
            state.lineBuffer = '';
            if (state.outputTimer) { clearTimeout(state.outputTimer); state.outputTimer = null; }
            state.waitingForOutput = false;
            term.write('^C\r\n');
            ipcRenderer.send('terminal:input', { id, data: '\x03' });
            this._showPrompt(state);
            return;
        }

        if (state.waitingForOutput) return;

        if (data === '\r' || data === '\n') {
            const cmd = state.lineBuffer.trim();
            state.lineBuffer = '';
            term.write('\r\n');

            if (cmd === 'clear' || cmd === 'cls') {
                term.clear();
                this._showPrompt(state);
                return;
            }

            if (cmd.startsWith('./oa-uvlm_')) {
                this._handleUVLMCommand(state, cmd);
                return;
            }

            if (!cmd) {
                this._showPrompt(state);
                return;
            }

            const cdMatch = cmd.match(/^(?:cd|Set-Location|sl)\s+(.+)/i);
            if (cdMatch) {
                const target = cdMatch[1].trim().replace(/^["']|["']$/g, '');
                state.cwd = path.resolve(state.cwd || '.', target);
            }

            state.waitingForOutput = true;
            ipcRenderer.send('terminal:input', { id, data: cmd + '\n' });

        } else if (code === 127 || data === '\x08') {
            if (state.lineBuffer.length > 0) {
                state.lineBuffer = state.lineBuffer.slice(0, -1);
                term.write('\b \b');
            }

        } else if (data.startsWith('\x1b')) {
            // Escape sequences (arrows etc) — ignore in dumb terminal

        } else if (code >= 32) {
            state.lineBuffer += data;
            term.write(data);
        }
    }

    async _handleUVLMCommand(state, fullCmd) {
        const { term } = state;
        const subcmd = fullCmd.replace('./oa-uvlm_', '').split(' ')[0];

        switch (subcmd) {
            case 'run': {
                const tab = this.app.tabs.getActiveTab();
                if (!tab?.filePath) {
                    term.write('\x1b[31m[ZS] Nenhum arquivo ativo para executar.\x1b[0m\r\n');
                    break;
                }
                if (tab.dirty) await this.app.saveActive();
                term.write('\x1b[32m[ZS] Compilando e executando...\x1b[0m\r\n');
                this.app.bottomPanel.switchPanel('output');
                ipcRenderer.invoke('uvlm:buildAndRun', { filePath: tab.filePath });
                break;
            }

            case 'build': {
                const tab = this.app.tabs.getActiveTab();
                if (!tab?.filePath) {
                    term.write('\x1b[31m[ZS] Nenhum arquivo ativo para compilar.\x1b[0m\r\n');
                    break;
                }
                if (tab.dirty) await this.app.saveActive();
                term.write('\x1b[34m[ZS] Compilando...\x1b[0m\r\n');
                this.app.bottomPanel.switchPanel('output');
                ipcRenderer.invoke('uvlm:compile', { filePath: tab.filePath });
                break;
            }

            case 'stop':
                term.write('\x1b[33m[ZS] Parando execução...\x1b[0m\r\n');
                ipcRenderer.send('uvlm:stop');
                break;

            case 'clean': {
                const dir = this.app.workspacePath;
                if (!dir) {
                    term.write('\x1b[31m[ZS] Nenhuma pasta de projeto aberta.\x1b[0m\r\n');
                    break;
                }
                term.write('\x1b[33m[ZS] Removendo arquivos .uzb...\x1b[0m\r\n');
                const removed = await ipcRenderer.invoke('uvlm:clean', { dir });
                term.write(`\x1b[32m[ZS] ${removed} arquivo(s) removido(s)\x1b[0m\r\n`);
                break;
            }

            case 'export':
                term.write('\x1b[35m[ZS] Abrindo exportação .uzs...\x1b[0m\r\n');
                if (window._openExportUZS) window._openExportUZS();
                else term.write('\x1b[31m[ZS] Módulo de exportação não carregado.\x1b[0m\r\n');
                break;

            case 'status': {
                const status = await ipcRenderer.invoke('uvlm:getStatus');
                const c = { idle: '32', building: '33', running: '36', error: '31' }[status] || '37';
                term.write(`\x1b[${c}m[UVLM] Status: ${status.toUpperCase()}\x1b[0m\r\n`);
                break;
            }

            case 'version': {
                const ver = await ipcRenderer.invoke('uvlm:getVersion');
                term.write(`\x1b[36m[UVLM] ${ver}\x1b[0m\r\n`);
                break;
            }

            case 'help':
                term.write([
                    '\x1b[1m\x1b[36m[ZettaSource UVLM Commands]\x1b[0m',
                    ' \x1b[33m./oa-uvlm_run\x1b[0m      Compilar e executar arquivo ativo',
                    ' \x1b[33m./oa-uvlm_build\x1b[0m    Compilar sem executar',
                    ' \x1b[33m./oa-uvlm_stop\x1b[0m     Parar execução em andamento',
                    ' \x1b[33m./oa-uvlm_clean\x1b[0m    Remover arquivos .uzb do projeto',
                    ' \x1b[33m./oa-uvlm_export\x1b[0m   Exportar como .uzs (arquivo selado)',
                    ' \x1b[33m./oa-uvlm_status\x1b[0m   Ver status atual do UVLM',
                    ' \x1b[33m./oa-uvlm_version\x1b[0m  Ver versão do UVLM',
                    ' \x1b[33m./oa-uvlm_help\x1b[0m     Esta mensagem',
                ].join('\r\n') + '\r\n');
                break;

            default:
                term.write(`\x1b[31m[ZS] Comando desconhecido: ${fullCmd}\x1b[0m\r\n`);
                term.write('    Use \x1b[33m./oa-uvlm_help\x1b[0m para ver os comandos disponíveis\r\n');
        }

        this._showPrompt(state);
    }

    setActive(id) {
        for (const [tid, { el }] of this.terminals) {
            el.style.display = tid === id ? 'flex' : 'none';
        }
        this.activeId = id;
        const t = this.terminals.get(id);
        if (t) {
            try { t.fitAddon.fit(); } catch (e) {}
            t.term.focus();
        }
    }

    focus() {
        const t = this.terminals.get(this.activeId);
        if (t) t.term.focus();
    }

    clear() {
        const t = this.terminals.get(this.activeId);
        if (t) t.term.clear();
    }
}
