// terminal.js — Integrated terminal + output panel

let terminalHistory = [];
let historyIdx = -1;
let currentWorkDir = null;

document.addEventListener('DOMContentLoaded', () => {
  const termInput = document.getElementById('terminal-input');
  const termOutput = document.getElementById('terminal-output');
  const panelTabs = document.querySelectorAll('.panel-tab');
  const panelPanes = document.querySelectorAll('.panel-pane');
  const bottomPanel = document.getElementById('bottom-panel');
  const panelResize = document.getElementById('panel-resize');

  // Panel tab switching
  panelTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.panel;
      panelTabs.forEach(t => t.classList.toggle('active', t.dataset.panel === target));
      panelPanes.forEach(p => p.classList.toggle('active', p.id === `panel-${target}`));
    });
  });

  // Toggle panel
  document.getElementById('btn-toggle-panel').addEventListener('click', togglePanel);

  // Panel resize
  let panelResizing = false, startY = 0, startH = 0;
  panelResize.addEventListener('mousedown', e => {
    panelResizing = true;
    startY = e.clientY;
    startH = bottomPanel.offsetHeight;
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
  });
  document.addEventListener('mousemove', e => {
    if (!panelResizing) return;
    const delta = startY - e.clientY;
    const newH = Math.max(60, Math.min(window.innerHeight * 0.6, startH + delta));
    bottomPanel.style.height = newH + 'px';
  });
  document.addEventListener('mouseup', () => {
    if (panelResizing) { panelResizing = false; document.body.style.cursor = ''; document.body.style.userSelect = ''; }
  });

  // Terminal input
  termInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const cmd = termInput.value.trim();
      if (!cmd) return;
      terminalHistory.unshift(cmd);
      historyIdx = -1;
      termInput.value = '';
      appendTerminal(`→ ${cmd}`, 'tok-keyword');
      runTerminalCommand(cmd);
    } else if (e.key === 'ArrowUp') {
      historyIdx = Math.min(historyIdx + 1, terminalHistory.length - 1);
      termInput.value = terminalHistory[historyIdx] || '';
    } else if (e.key === 'ArrowDown') {
      historyIdx = Math.max(historyIdx - 1, -1);
      termInput.value = historyIdx === -1 ? '' : terminalHistory[historyIdx];
    }
  });

  // UVLM output stream
  window.zs.onUVLMOutput((data) => appendTerminal(data));
  window.zs.onUVLMOutputErr((data, isErr) => appendTerminal(data, isErr ? 'output-error' : ''));
});

function togglePanel(force) {
  const panel = document.getElementById('bottom-panel');
  const shouldCollapse = force === 'hide' ? true : (force === 'show' ? false : !panel.classList.contains('collapsed'));
  panel.classList.toggle('collapsed', shouldCollapse);
}

function switchPanel(name) {
  const panelTabs = document.querySelectorAll('.panel-tab');
  const panelPanes = document.querySelectorAll('.panel-pane');
  panelTabs.forEach(t => t.classList.toggle('active', t.dataset.panel === name));
  panelPanes.forEach(p => p.classList.toggle('active', p.id === `panel-${name}`));
  togglePanel('show');
}

function appendTerminal(text, cls = '') {
  const el = document.getElementById('terminal-output');
  const line = document.createElement('span');
  line.className = cls;
  line.textContent = text;
  el.appendChild(line);
  el.scrollTop = el.scrollHeight;
}

function appendOutput(text, type = 'info') {
  const el = document.getElementById('output-content');
  const line = document.createElement('div');
  line.className = `output-line output-${type}`;
  line.textContent = text;
  el.appendChild(line);
  el.scrollTop = el.scrollHeight;
}

function clearOutput() {
  document.getElementById('output-content').innerHTML = '';
  document.getElementById('problems-list').innerHTML = '';
}

async function runTerminalCommand(cmd) {
  const cwd = currentWorkDir || currentFolderPath;
  const parts = cmd.split(' ');
  try {
    const result = await window.zs.runUVLM(parts, cwd);
    if (result.code !== 0) {
      appendTerminal(`Exit code: ${result.code}`, 'output-error');
    }
  } catch (err) {
    appendTerminal(`Error: ${err.message}`, 'output-error');
  }
}
