const { ipcRenderer } = window.require('electron');

export class BottomPanel {
    constructor(app) {
        this.app = app;
        this.container = document.getElementById('bottom-panel');
        this.tabs = document.querySelectorAll('.panel-tab');
        this.views = document.querySelectorAll('.panel-view');
        this.activePanel = 'terminal';
        
        this.init();
    }

    init() {
        this.tabs.forEach(tab => {
            tab.onclick = () => {
                const panel = tab.dataset.panel;
                this.switchPanel(panel);
            };
        });

        document.getElementById('close-panel-btn').onclick = () => {
            this.container.classList.toggle('hidden');
        };

        // Initialize Output Clear
        const outputContainer = document.getElementById('output-container');
        outputContainer.oncontextmenu = (e) => {
            e.preventDefault();
            if (confirm('Limpar Output?')) outputContainer.innerHTML = '';
        };
    }

    switchPanel(name) {
        this.activePanel = name;
        this.container.classList.remove('hidden');

        this.tabs.forEach(t => t.classList.toggle('active', t.dataset.panel === name));
        this.views.forEach(v => v.classList.toggle('active', v.id === `${name}-container`));

        if (name === 'terminal') {
            this.app.terminal.focus();
        }
    }

    logOutput(text, type = 'BUILD') {
        const colors = {
            BUILD: '#5591C7',
            RUN: '#4EC94E',
            ERROR: '#E53030',
            WARN: '#E5A030',
            EXIT: '#6A6A6A'
        };

        const container = document.getElementById('output-container');
        const line = document.createElement('div');
        line.style.color = colors[type] || '#D4D4D4';
        line.style.fontFamily = 'monospace';
        line.style.fontSize = '12px';
        line.textContent = `[${type}] ${text}`;
        
        // Link errors
        const match = text.match(/UZ-\d+:(\d+):(\d+)/);
        if (match) {
            line.style.cursor = 'pointer';
            line.style.textDecoration = 'underline';
            line.onclick = () => {
                this.app.jumpToLine(parseInt(match[1]), parseInt(match[2]));
            };
        }

        container.appendChild(line);
        container.scrollTop = container.scrollHeight;
    }

    renderProblems(problems) {
        const container = document.getElementById('problems-container');
        container.innerHTML = '';

        if (problems.length === 0) {
            container.innerHTML = '<div style="padding:10px; color:#4EC94E">✓ Nenhum problema encontrado</div>';
            return;
        }

        problems.forEach(p => {
            const div = document.createElement('div');
            div.className = `problem-item problem-${p.severity}`;
            div.style.padding = '4px 10px';
            div.style.cursor = 'pointer';
            div.style.borderBottom = '1px solid #252525';
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

        // Update badge
        const badge = document.getElementById('error-count');
        const errors = problems.filter(p => p.severity === 'error').length;
        badge.textContent = errors;
        badge.style.display = errors > 0 ? 'inline' : 'none';
    }
}
