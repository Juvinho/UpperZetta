import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
const { ipcRenderer } = window.require('electron');
const path = window.require('path');

export class TerminalWrapper {
    constructor(app) {
        this.app = app;
        this.container = document.getElementById('terminal-container');
        this.terminals = new Map(); // id -> { term, fitAddon, el, cwd, lineBuffer, outputTimer }
        this.activeId = null;

        this.init();
    }

    init() {
        this.createTerminal();
    }

    async createTerminal(cwd) {
        const term = new Terminal({
            cursorBlink: true,
            cursorStyle: 'block',
            fontSize: 13,
            fontFamily: 'JetBrains Mono, Consolas, monospace',
            theme: {
                background: '#080808',
                foreground: '#D4D4D4',
                cursor: '#E53030',
                selectionBackground: '#3D1010',
                red: '#E53030',
                green: '#4EC94E',
                yellow: '#E5A030',
                blue: '#5591C7',
            },
            scrollback: 5000,
            convertEol: false,
        });

        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);

        const el = document.createElement('div');
        el.className = 'terminal-instance';
        this.container.appendChild(el);

        term.open(el);

        // Force explicit height so xterm-viewport can size correctly
        requestAnimationFrame(() => {
            fitAddon.fit();
        });

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

        // Show banner and first prompt
        term.write('\x1b[32mZettaSource Terminal\x1b[0m — PowerShell (sem PTY)\r\n');
        this._showPrompt(state);

        // Receive output from shell
        ipcRenderer.on(`terminal:output:${id}`, (_, data) => {
            this._handleOutput(state, data);
        });

        // Shell closed
        ipcRenderer.on(`terminal:closed:${id}`, (_, code) => {
            term.write(`\r\n\x1b[90m[processo encerrado com código ${code}]\x1b[0m\r\n`);
        });

        // Keyboard input — local echo + line buffering
        term.onData(data => this._handleInput(id, state, data));

        // Resize
        const ro = new ResizeObserver(() => {
            fitAddon.fit();
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
        if (!data || data.trim() === '') return;

        const { term } = state;

        // Clear any pending prompt timer
        if (state.outputTimer) {
            clearTimeout(state.outputTimer);
            state.outputTimer = null;
        }

        // Write output — normalize line endings
        const out = data.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n/g, '\r\n');
        term.write(out);

        // Show next prompt after output settles (200ms of silence = done)
        state.outputTimer = setTimeout(() => {
            state.outputTimer = null;
            this._showPrompt(state);
        }, 200);
    }

    _handleInput(id, state, data) {
        const { term } = state;
        const code = data.charCodeAt(0);

        if (state.waitingForOutput) return; // Block input while command is running

        if (data === '\r' || data === '\n') {
            // Enter pressed
            const cmd = state.lineBuffer.trim();
            state.lineBuffer = '';
            term.write('\r\n');

            if (cmd === 'clear' || cmd === 'cls') {
                term.clear();
                this._showPrompt(state);
                return;
            }

            if (!cmd) {
                this._showPrompt(state);
                return;
            }

            // Track cd commands to update prompt
            const cdMatch = cmd.match(/^(?:cd|Set-Location|sl)\s+(.+)/i);
            if (cdMatch) {
                const target = cdMatch[1].trim().replace(/^["']|["']$/g, '');
                state.cwd = path.resolve(state.cwd || '.', target);
            }

            state.waitingForOutput = true;
            ipcRenderer.send('terminal:input', { id, data: cmd + '\n' });

        } else if (code === 127 || data === '\x08') {
            // Backspace
            if (state.lineBuffer.length > 0) {
                state.lineBuffer = state.lineBuffer.slice(0, -1);
                term.write('\b \b');
            }

        } else if (data === '\x03') {
            // Ctrl+C — send interrupt
            state.lineBuffer = '';
            term.write('^C\r\n');
            ipcRenderer.send('terminal:input', { id, data: '\x03' });
            this._showPrompt(state);

        } else if (data.startsWith('\x1b')) {
            // Escape sequences (arrow keys etc) — ignore for now

        } else if (code >= 32) {
            // Printable character — local echo
            state.lineBuffer += data;
            term.write(data);
        }
    }

    setActive(id) {
        for (const [tid, { el }] of this.terminals) {
            el.style.display = tid === id ? 'flex' : 'none';
        }
        this.activeId = id;
        const t = this.terminals.get(id);
        if (t) {
            t.fitAddon.fit();
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
