// app.js — Main application orchestration: tabs, keyboard, command palette

const tabs = new Map(); // filePath → { content, dirty }
let tabOrder = [];

// ═══════════════════════════════════════════
// TAB MANAGEMENT
// ═══════════════════════════════════════════

function openTab(filePath, content) {
  const existing = document.querySelector(`.tab[data-path="${CSS.escape(filePath)}"]`);
  if (existing) {
    activateTab(filePath);
    return;
  }

  tabs.set(filePath, { content, dirty: false });
  tabOrder.push(filePath);

  const name = filePath.replace(/\\/g, '/').split('/').pop();
  const tab = document.createElement('div');
  tab.className = 'tab';
  tab.dataset.path = filePath;
  tab.title = filePath;

  const nameEl = document.createElement('span');
  nameEl.className = 'tab-name';
  nameEl.textContent = (filePath.endsWith('.uzs') ? '🔒 ' : '') + name;

  const closeBtn = document.createElement('button');
  closeBtn.className = 'tab-close';
  closeBtn.textContent = '×';
  closeBtn.addEventListener('click', e => { e.stopPropagation(); closeTab(filePath); });

  tab.appendChild(nameEl);
  tab.appendChild(closeBtn);
  tab.addEventListener('click', () => activateTab(filePath));
  document.getElementById('tab-list').appendChild(tab);

  activateTab(filePath);
}

function activateTab(filePath) {
  currentFilePath = filePath;
  isDirty = false;

  document.querySelectorAll('.tab').forEach(t => {
    t.classList.toggle('active', t.dataset.path === filePath);
  });

  // Restore content
  const entry = tabs.get(filePath);
  if (entry && editorView) {
    editorSetValueSafe(entry.content);
    const pkg = extractPackage(entry.content);
    document.getElementById('status-package').textContent = pkg || '—';
  }

  document.getElementById('welcome-screen').classList.add('hidden');
}

function closeTab(filePath) {
  const tab = document.querySelector(`.tab[data-path="${CSS.escape(filePath)}"]`);
  if (tab) tab.remove();
  tabs.delete(filePath);
  tabOrder = tabOrder.filter(p => p !== filePath);

  if (currentFilePath === filePath) {
    if (tabOrder.length > 0) {
      activateTab(tabOrder[tabOrder.length - 1]);
    } else {
      currentFilePath = null;
      editorSetValueSafe('');
      document.getElementById('welcome-screen').classList.remove('hidden');
    }
  }
}

// ═══════════════════════════════════════════
// SAVE
// ═══════════════════════════════════════════

async function saveCurrentFile() {
  if (!currentFilePath) return;
  const content = editorGetValue();
  await window.zs.writeFile(currentFilePath, content);
  tabs.set(currentFilePath, { content, dirty: false });
  markCurrentTabClean();
  setStatus('ready', 'UVLM Ready');
  updateStatusBar();
}

async function saveCurrentFileAs() {
  const name = currentFilePath ? currentFilePath.split(/[\\/]/).pop() : 'arquivo.uz';
  const newPath = await window.zs.saveFileDialog(name);
  if (!newPath) return;
  currentFilePath = newPath;
  await saveCurrentFile();
  openTab(newPath, editorGetValue());
}

function updateStatusBar() {
  const content = editorGetValue();
  const pkg = extractPackage(content);
  document.getElementById('status-package').textContent = pkg || '—';
}

// ═══════════════════════════════════════════
// COMMAND PALETTE
// ═══════════════════════════════════════════

const COMMANDS = [
  { label: 'Abrir Arquivo', kbd: 'Ctrl+P', action: async () => { const p = await window.zs.openFileDialog(); if (p) openFile(p); } },
  { label: 'Abrir Pasta', kbd: 'Ctrl+Shift+O', action: async () => { const p = await window.zs.openFolderDialog(); if (p) openFolder(p); } },
  { label: 'Salvar', kbd: 'Ctrl+S', action: saveCurrentFile },
  { label: 'Compilar UVLM', kbd: 'Ctrl+Shift+B', action: uvlmCompile },
  { label: 'Executar', kbd: 'F5', action: uvlmRun },
  { label: 'Disassemble .uzb', kbd: 'Ctrl+Shift+D', action: uvlmDisasm },
  { label: 'GLP Report', kbd: 'Ctrl+Shift+G', action: uvlmGLPReport },
  { label: 'Toggle Sidebar', kbd: 'Ctrl+B', action: () => document.getElementById('sidebar').classList.toggle('collapsed') },
  { label: 'Toggle Painel Inferior', kbd: 'Ctrl+J', action: togglePanel },
  { label: 'Toggle Terminal', kbd: 'Ctrl+`', action: () => { switchPanel('terminal'); togglePanel('show'); } },
  { label: 'Toggle Tema', kbd: '', action: toggleTheme },
  { label: 'Buscar no Arquivo', kbd: 'Ctrl+F', action: openFindBar },
  { label: 'Ir para Linha', kbd: 'Ctrl+G', action: openGotoLine },
  { label: 'Fechar Tab', kbd: 'Ctrl+W', action: () => { if (currentFilePath) closeTab(currentFilePath); } },
  { label: 'Selar Arquivo (.uzs)', kbd: '', action: () => window.zs.onMenu('menu:seal', () => {}) },
];

let cpSelectedIndex = 0;
let cpFiltered = [...COMMANDS];

function openCommandPalette() {
  document.getElementById('command-palette-overlay').classList.remove('hidden');
  document.getElementById('cp-input').value = '';
  document.getElementById('cp-input').focus();
  renderCPResults(COMMANDS);
}

function closeCommandPalette() {
  document.getElementById('command-palette-overlay').classList.add('hidden');
}

function renderCPResults(cmds) {
  const el = document.getElementById('cp-results');
  el.innerHTML = '';
  cpFiltered = cmds;
  cpSelectedIndex = 0;
  cmds.forEach((cmd, i) => {
    const item = document.createElement('div');
    item.className = 'cp-item' + (i === 0 ? ' selected' : '');
    item.innerHTML = `<span class="cp-label">${cmd.label}</span><span class="cp-kbd">${cmd.kbd}</span>`;
    item.addEventListener('click', () => { cmd.action(); closeCommandPalette(); });
    el.appendChild(item);
  });
}

// ═══════════════════════════════════════════
// FIND BAR
// ═══════════════════════════════════════════

function openFindBar() {
  const bar = document.getElementById('find-bar');
  bar.classList.remove('hidden');
  document.getElementById('find-input').focus();
  document.getElementById('find-input').select();
}

function closeFindBar() {
  document.getElementById('find-bar').classList.add('hidden');
}

// ═══════════════════════════════════════════
// GOTO LINE
// ═══════════════════════════════════════════

function openGotoLine() {
  const overlay = document.getElementById('goto-overlay');
  overlay.classList.remove('hidden');
  const input = document.getElementById('goto-input');
  input.value = '';
  input.focus();
}

// ═══════════════════════════════════════════
// THEME TOGGLE
// ═══════════════════════════════════════════

function toggleTheme() {
  document.body.classList.toggle('theme-dark');
  document.body.classList.toggle('theme-light');
}

// ═══════════════════════════════════════════
// KEYBOARD SHORTCUTS
// ═══════════════════════════════════════════

document.addEventListener('keydown', async (e) => {
  const ctrl = e.ctrlKey || e.metaKey;

  if (ctrl && e.shiftKey && e.key === 'P') { e.preventDefault(); openCommandPalette(); return; }
  if (ctrl && e.key === 's') { e.preventDefault(); ctrl && e.shiftKey ? saveCurrentFileAs() : saveCurrentFile(); return; }
  if (ctrl && e.key === 'p') { e.preventDefault(); const p = await window.zs.openFileDialog(); if (p) openFile(p); return; }
  if (ctrl && e.shiftKey && e.key === 'B') { e.preventDefault(); uvlmCompile(); return; }
  if (e.key === 'F5') { e.preventDefault(); uvlmRun(); return; }
  if (ctrl && e.shiftKey && e.key === 'D') { e.preventDefault(); uvlmDisasm(); return; }
  if (ctrl && e.shiftKey && e.key === 'G') { e.preventDefault(); uvlmGLPReport(); return; }
  if (ctrl && e.key === 'b') { e.preventDefault(); document.getElementById('sidebar').classList.toggle('collapsed'); return; }
  if (ctrl && e.key === 'j') { e.preventDefault(); togglePanel(); return; }
  if (ctrl && e.key === 'f') { e.preventDefault(); openFindBar(); return; }
  if (ctrl && e.key === 'g') { e.preventDefault(); openGotoLine(); return; }
  if (ctrl && e.key === 'w') { e.preventDefault(); if (currentFilePath) closeTab(currentFilePath); return; }
  if (ctrl && e.key === '`') { e.preventDefault(); switchPanel('terminal'); togglePanel('show'); return; }
  if (e.key === 'Escape') {
    closeCommandPalette();
    closeFindBar();
    document.getElementById('goto-overlay').classList.add('hidden');
    document.getElementById('uzs-overlay').classList.add('hidden');
    document.getElementById('error-banner').classList.add('hidden');
    return;
  }
});

// ═══════════════════════════════════════════
// DOM INIT
// ═══════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  // Window controls
  document.getElementById('btn-minimize').addEventListener('click', () => window.zs.minimize());
  document.getElementById('btn-maximize').addEventListener('click', () => window.zs.maximize());
  document.getElementById('btn-close').addEventListener('click', () => window.zs.close());

  // Error banner close
  document.getElementById('error-banner-close').addEventListener('click', () => {
    document.getElementById('error-banner').classList.add('hidden');
  });

  // Command Palette input
  document.getElementById('cp-input').addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    const filtered = COMMANDS.filter(c => c.label.toLowerCase().includes(q));
    renderCPResults(filtered);
  });

  document.getElementById('cp-input').addEventListener('keydown', (e) => {
    const items = document.querySelectorAll('.cp-item');
    if (e.key === 'ArrowDown') { cpSelectedIndex = Math.min(cpSelectedIndex + 1, items.length - 1); }
    else if (e.key === 'ArrowUp') { cpSelectedIndex = Math.max(cpSelectedIndex - 1, 0); }
    else if (e.key === 'Enter') {
      if (cpFiltered[cpSelectedIndex]) { cpFiltered[cpSelectedIndex].action(); closeCommandPalette(); }
      return;
    }
    items.forEach((it, i) => it.classList.toggle('selected', i === cpSelectedIndex));
  });

  document.getElementById('command-palette-overlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('command-palette-overlay')) closeCommandPalette();
  });

  // Find bar
  document.getElementById('find-close').addEventListener('click', closeFindBar);

  // Goto line
  document.getElementById('goto-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const n = parseInt(document.getElementById('goto-input').value);
      if (!isNaN(n)) { gotoLine(n); document.getElementById('goto-overlay').classList.add('hidden'); }
    }
    if (e.key === 'Escape') document.getElementById('goto-overlay').classList.add('hidden');
  });

  // Menu events
  window.zs.onMenu('menu:save', saveCurrentFile);
  window.zs.onMenu('menu:save-as', saveCurrentFileAs);
  window.zs.onMenu('menu:compile', uvlmCompile);
  window.zs.onMenu('menu:run', uvlmRun);
  window.zs.onMenu('menu:disasm', uvlmDisasm);
  window.zs.onMenu('menu:glp-report', uvlmGLPReport);
  window.zs.onMenu('menu:toggle-sidebar', () => document.getElementById('sidebar').classList.toggle('collapsed'));
  window.zs.onMenu('menu:toggle-panel', togglePanel);
  window.zs.onMenu('menu:toggle-terminal', () => { switchPanel('terminal'); togglePanel('show'); });
  window.zs.onMenu('menu:toggle-theme', toggleTheme);
  window.zs.onMenu('menu:command-palette', openCommandPalette);
  window.zs.onMenu('menu:find', openFindBar);
  window.zs.onMenu('menu:goto-line', openGotoLine);
  window.zs.onMenu('menu:new-file', () => {
    const content = 'package in novo.modulo;\n\ncomponente Home {\n    fun render() {\n        System.print("Olá, UpperZetta!");\n    }\n}\n';
    const fakePath = `novo_${Date.now()}.uz`;
    editorSetValueSafe(content);
    openTab(fakePath, content);
    document.getElementById('welcome-screen').classList.add('hidden');
  });
});
