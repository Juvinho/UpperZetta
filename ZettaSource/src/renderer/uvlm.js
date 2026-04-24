// uvlm.js — UVLM Compiler integration

const ERROR_RE = /([^\s:]+\.uz):(\d+):(\d+)\s*(.*)/;

async function uvlmCompile() {
  if (!currentFilePath) { showErrorBanner('Nenhum arquivo aberto.'); return; }
  if (!currentFilePath.endsWith('.uz')) { showErrorBanner('Apenas arquivos .uz podem ser compilados.'); return; }

  // Auto-save
  await saveCurrentFile();

  clearOutput();
  switchPanel('output');

  setStatus('compiling', '⚙ Compilando...');
  appendOutput('Compilando: ' + currentFilePath, 'info');

  const cwd = currentWorkDir || currentFolderPath;
  const fileName = currentFilePath.replace(/\\/g, '/').split('/').pop();

  const result = await window.zs.runUVLM(['Main', currentFilePath], cwd);

  if (result.code === 0) {
    appendOutput(`✓ Compilado com sucesso | GLP ativo`, 'success');
    setStatus('ready', '⚡ UpperZetta 1.0');
    // Refresh file tree to show .uzb
    if (currentFolderPath) await openFolder(currentFolderPath);
  } else {
    appendOutput('✗ Falha na compilação', 'error');
    parseErrors(result.stderr || result.stdout);
    setStatus('error', '✗ Erro de compilação');
    showErrorBanner('Erro de compilação — veja o painel Problemas');
  }
}

async function uvlmRun() {
  if (!currentFilePath) return;
  await saveCurrentFile();
  switchPanel('terminal');
  togglePanel('show');

  const file = currentFilePath;
  appendTerminal(`java Main ${file}`, 'tok-keyword');

  const cwd = currentWorkDir || currentFolderPath;
  const result = await window.zs.runUVLM(['Main', file], cwd);

  if (result.code !== 0) {
    appendTerminal('Exit: ' + result.code, 'output-error');
  }
}

async function uvlmDisasm() {
  if (!currentFilePath) return;
  const file = currentFilePath.replace('.uz', '.uzb');
  switchPanel('output');
  clearOutput();
  appendOutput('Disassembling: ' + file, 'info');
  const result = await window.zs.runUVLM(['Main', file, '--disasm'], currentWorkDir || currentFolderPath);
  appendOutput(result.stdout || result.stderr, 'info');
}

async function uvlmGLPReport() {
  if (!currentFilePath) return;
  const file = currentFilePath.replace('.uz', '.uzb');
  switchPanel('glp');
  const result = await window.zs.runUVLM(['Main', file, '--emit-glp-report'], currentWorkDir || currentFolderPath);
  document.getElementById('glp-content').textContent = result.stdout || 'Nenhum relatório disponível.';
  togglePanel('show');
}

function parseErrors(text) {
  const list = document.getElementById('problems-list');
  list.innerHTML = '';
  const lines = text.split('\n');

  for (const line of lines) {
    const m = line.match(ERROR_RE);
    if (!m) continue;

    const [, file, ln, col, msg] = m;
    const isError = line.toLowerCase().includes('error');
    const item = document.createElement('div');
    item.className = 'problem-item';
    item.innerHTML = `
      <span class="${isError ? 'problem-icon-err' : 'problem-icon-warn'}">${isError ? '⊗' : '⚠'}</span>
      <span class="problem-msg">${msg}</span>
      <span class="problem-loc">${file}:${ln}:${col}</span>
    `;
    item.title = `Linha ${ln}, Coluna ${col}`;
    item.addEventListener('click', () => gotoLine(parseInt(ln)));
    list.appendChild(item);
  }

  if (list.children.length > 0) switchPanel('problems');
}

function gotoLine(lineNum) {
  if (!editorView) return;
  if (editorView._ta) {
    const lines = editorView._ta.value.split('\n');
    let pos = 0;
    for (let i = 0; i < Math.min(lineNum - 1, lines.length); i++) pos += lines[i].length + 1;
    editorView._ta.focus();
    editorView._ta.setSelectionRange(pos, pos);
    return;
  }
  try {
    const { EditorView } = CM.view;
    const doc = editorView.state.doc;
    const line = doc.line(Math.min(lineNum, doc.lines));
    editorView.dispatch({
      selection: { anchor: line.from },
      effects: EditorView.scrollIntoView(line.from, { y: 'center' })
    });
    editorView.focus();
  } catch(e) {}
}

// ═══════════════════════════════════════════
// UZS SEAL/UNSEAL (via external java process)
// ═══════════════════════════════════════════

function openUZSDialog(filePath) {
  // Read metadata via peek (no password needed)
  window.zs.runUVLM(['Main', 'peek', filePath], currentWorkDir || currentFolderPath).then(result => {
    const meta = {};
    const raw = (result.stdout || '').replace('Metadata: ', '');
    try {
      const m = JSON.parse(raw);
      meta.pkg = m.package || '—';
      meta.date = m.sealed_at ? m.sealed_at.substring(0, 10) : '—';
    } catch(e) {
      meta.pkg = '—'; meta.date = '—';
    }
    document.getElementById('uzs-package').textContent = meta.pkg;
    document.getElementById('uzs-date').textContent = meta.date;
    document.getElementById('uzs-error').classList.add('hidden');
    document.getElementById('uzs-overlay').classList.remove('hidden');
    document.getElementById('uzs-password').value = '';
    document.getElementById('uzs-password').focus();
    document.getElementById('uzs-overlay').dataset.file = filePath;
  });
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('uzs-cancel').addEventListener('click', () => {
    document.getElementById('uzs-overlay').classList.add('hidden');
  });

  document.getElementById('uzs-toggle-pass').addEventListener('click', () => {
    const p = document.getElementById('uzs-password');
    p.type = p.type === 'password' ? 'text' : 'password';
  });

  document.getElementById('uzs-unlock').addEventListener('click', async () => {
    const overlay = document.getElementById('uzs-overlay');
    const filePath = overlay.dataset.file;
    const password = document.getElementById('uzs-password').value;
    if (!password) return;

    document.getElementById('uzs-progress').classList.remove('hidden');
    document.getElementById('uzs-unlock').disabled = true;
    document.getElementById('uzs-error').classList.add('hidden');

    // Run unseal (content shown in terminal — never written to disk in real UZS flow)
    // In CLI mode we display it; in UI mode we load into editor memory
    const result = await window.zs.runUVLM(['Main', 'unseal', filePath, password], currentWorkDir || currentFolderPath);

    document.getElementById('uzs-progress').classList.add('hidden');
    document.getElementById('uzs-unlock').disabled = false;

    if (result.stdout.includes('CONTEÚDO DECIFRADO')) {
      const marker = '--- CONTEÚDO DECIFRADO ---\n';
      const content = result.stdout.substring(result.stdout.indexOf(marker) + marker.length);
      overlay.classList.add('hidden');
      loadFileInEditor(filePath, content);
      setStatus('sealed', '🔒 Selado — Ativo em Memória');
    } else {
      const errEl = document.getElementById('uzs-error');
      errEl.textContent = 'Senha incorreta ou arquivo inválido.';
      errEl.classList.remove('hidden');
    }
  });

  document.getElementById('uzs-password').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('uzs-unlock').click();
  });
});

// ═══════════════════════════════════════════
// STATUS HELPERS
// ═══════════════════════════════════════════

function setStatus(state, message) {
  const bar = document.getElementById('status-bar');
  bar.classList.remove('status-compiling', 'status-error', 'status-sealed');
  if (state === 'compiling') bar.classList.add('status-compiling');
  else if (state === 'error') bar.classList.add('status-error');
  else if (state === 'sealed') bar.classList.add('status-sealed');
  document.getElementById('status-uvlm').textContent = message || 'UVLM Ready';
}

function showErrorBanner(msg) {
  const banner = document.getElementById('error-banner');
  document.getElementById('error-banner-text').textContent = msg;
  banner.classList.remove('hidden');
  setTimeout(() => banner.classList.add('hidden'), 5000);
}
