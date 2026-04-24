const { ipcRenderer } = window.require('electron');

const OUTPUT_COLORS = {
    BUILD:   '#5591C7',
    PROGRAM: '#D4D4D4',
    RUN:     '#4EC94E',
    ERROR:   '#E53030',
    WARN:    '#E5A030',
    EXIT:    '#6A6A6A',
};

const OUTPUT_PREFIXES = {
    BUILD:   '[BUILD]  ',
    PROGRAM: '         ',
    RUN:     '[RUN]    ',
    ERROR:   '[ERRO]   ',
    WARN:    '[AVISO]  ',
    EXIT:    '[EXIT]   ',
};

export class BottomPanel {
    constructor(app) {
        this.app = app;
        this.container = document.getElementById('bottom-panel');
        this.tabs = document.querySelectorAll('.panel-tab');
        this.views = document.querySelectorAll('.panel-view');
        this.activePanel = 'terminal';
        this.outputContent = null;

        this.init();
    }

    init() {
        // Build #output-content inside #output-container
        const outputContainer = document.getElementById('output-container');
        outputContainer.style.flexDirection = 'column';
        outputContainer.style.padding = '0';

        const toolbar = document.createElement('div');
        toolbar.className = 'output-toolbar';
        toolbar.innerHTML = `
            <span class="output-toolbar-label">OUTPUT UVLM</span>
            <button class="output-clear-btn" title="Limpar output">clear_all</button>
        `;
        outputContainer.appendChild(toolbar);

        this.outputContent = document.createElement('div');
        this.outputContent.id = 'output-content';
        outputContainer.appendChild(this.outputContent);

        toolbar.querySelector('.output-clear-btn').onclick = () => {
            this.outputContent.innerHTML = '';
        };

        outputContainer.oncontextmenu = (e) => {
            e.preventDefault();
            if (confirm('Limpar output?')) this.outputContent.innerHTML = '';
        };

        // Panel tab clicks
        this.tabs.forEach(tab => {
            tab.onclick = () => this.switchPanel(tab.dataset.panel);
        });

        document.getElementById('close-panel-btn').onclick = () => {
            this.container.classList.toggle('hidden');
        };

        // Listen to UVLM events
        ipcRenderer.on('uvlm:output', (_, { type, text }) => {
            this.logOutput(text, type);
        });

        ipcRenderer.on('uvlm:clear', () => {
            if (this.outputContent) this.outputContent.innerHTML = '';
        });

        ipcRenderer.on('uvlm:status', (_, status) => {
            this.app.setStatus(this._statusText(status), status);
        });
    }

    _statusText(status) {
        return { idle: 'UVLM: Pronto', building: 'Compilando...', running: 'Rodando...', error: 'UVLM: Erro' }[status] || 'UVLM: Idle';
    }

    switchPanel(name) {
        this.activePanel = name;
        this.container.classList.remove('hidden');

        this.tabs.forEach(t => t.classList.toggle('active', t.dataset.panel === name));
        this.views.forEach(v => v.classList.toggle('active', v.id === `${name}-container`));

        if (name === 'terminal') {
            this.app.terminal.focus();
        }
        if (name === 'output') {
            // Scroll to bottom on switch
            if (this.outputContent) {
                this.outputContent.scrollTop = this.outputContent.scrollHeight;
            }
        }
    }

    logOutput(text, type = 'BUILD') {
        if (!this.outputContent) return;

        const line = document.createElement('div');
        line.className = 'output-line';
        line.style.color = OUTPUT_COLORS[type] || '#D4D4D4';

        const prefix = document.createElement('span');
        prefix.className = 'output-prefix';
        prefix.textContent = OUTPUT_PREFIXES[type] || '         ';

        const content = document.createElement('span');
        content.textContent = text;

        line.appendChild(prefix);
        line.appendChild(content);

        // Error lines with UZ-XXXX:line:col are clickable
        const match = text.match(/UZ-\d+:(\d+):(\d+)/);
        if (match) {
            line.classList.add('output-line-clickable');
            line.title = `Ir para linha ${match[1]}, coluna ${match[2]}`;
            line.addEventListener('click', () => {
                this.app.jumpToLine(parseInt(match[1]), parseInt(match[2]));
            });
        }

        this.outputContent.appendChild(line);
        this.outputContent.scrollTop = this.outputContent.scrollHeight;
    }

    renderProblems(problems) {
        const container = document.getElementById('problems-container');
        container.innerHTML = '';
        const badge = document.getElementById('error-count');

        if (problems.length === 0) {
            container.innerHTML = '<div style="padding:10px; color:#4EC94E">✓ Nenhum problema encontrado</div>';
            badge.textContent = '0';
            badge.style.display = 'none';
            return;
        }

        problems.forEach(p => {
            const div = document.createElement('div');
            div.className = `problem-item problem-${p.severity}`;
            div.style.cssText = 'padding:4px 10px; cursor:pointer; border-bottom:1px solid #252525;';
            div.innerHTML = `
                <span style="color:${p.severity === 'error' ? '#E53030' : '#E5A030'}">${p.severity === 'error' ? '⊗' : '⚠'}</span>
                <span style="color:#808080; margin-left:10px">${p.file}:${p.line}</span>
                <span style="margin-left:10px">${p.message}</span>
            `;
            div.onclick = () => {
                this.app.openFile(p.filePath);
                this.app.jumpToLine(p.line, p.col);
            };
            container.appendChild(div);
        });

        const errors = problems.filter(p => p.severity === 'error').length;
        badge.textContent = errors;
        badge.style.display = errors > 0 ? 'inline' : 'none';
    }
}
