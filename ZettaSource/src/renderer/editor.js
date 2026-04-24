// editor.js — CodeMirror 6 setup with UpperZetta syntax highlighting
// Uses CDN-loaded CodeMirror globals: CM.state, CM.view, CM.language, CM.commands

let editorView = null;
let currentFilePath = null;
let isDirty = false;

// ═══════════════════════════════════════════
// UPPERZETTA SYNTAX HIGHLIGHT (Simple Token-based)
// ═══════════════════════════════════════════

const UZ_KEYWORDS = new Set([
  'package','in','fun','return','class','public','componente',
  'if','else','while','for','let','void'
]);
const UZ_CONST_KW = new Set(['e.const']);
const UZ_TYPES    = new Set(['str','int','boolean','float','array','void']);
const UZ_BOOLEANS = new Set(['true','false','null']);
const UZ_BUILTIN  = 'System.print';

function uzHighlight(text) {
  // Returns an array of {from, to, cls} spans
  const spans = [];
  const len = text.length;
  let i = 0;

  const push = (from, to, cls) => spans.push({ from, to, cls });

  while (i < len) {
    // Line comment
    if (text[i] === '/' && text[i+1] === '/') {
      const end = text.indexOf('\n', i);
      push(i, end === -1 ? len : end, 'tok-comment');
      i = end === -1 ? len : end;
      continue;
    }
    // Block comment
    if (text[i] === '/' && text[i+1] === '*') {
      const end = text.indexOf('*/', i + 2);
      const to = end === -1 ? len : end + 2;
      push(i, to, 'tok-comment');
      i = to;
      continue;
    }
    // String
    if (text[i] === '"') {
      let j = i + 1;
      while (j < len && (text[j] !== '"' || text[j-1] === '\\')) j++;
      push(i, j + 1, 'tok-string');
      i = j + 1;
      continue;
    }
    // Number
    if (/[0-9]/.test(text[i])) {
      let j = i;
      while (j < len && /[0-9.]/.test(text[j])) j++;
      push(i, j, 'tok-number');
      i = j;
      continue;
    }
    // >> operator
    if (text[i] === '>' && text[i+1] === '>') {
      push(i, i + 2, 'tok-operator');
      i += 2;
      continue;
    }
    // Operators
    if (/[+\-*\/=<>!&|]/.test(text[i])) {
      push(i, i + 1, 'tok-operator');
      i++;
      continue;
    }
    // Words
    if (/[a-zA-Z_.]/.test(text[i])) {
      let j = i;
      while (j < len && /[a-zA-Z0-9_.]/.test(text[j])) j++;
      const word = text.slice(i, j);

      if (word === UZ_BUILTIN) push(i, j, 'tok-builtin');
      else if (word === 'e.const') push(i, j, 'tok-const-kw');
      else if (word.startsWith('package') && text.slice(i).startsWith('package in')) {
        push(i, j, 'tok-namespace');
      }
      else if (UZ_KEYWORDS.has(word)) push(i, j, 'tok-keyword');
      else if (UZ_TYPES.has(word)) push(i, j, 'tok-type');
      else if (UZ_BOOLEANS.has(word)) push(i, j, 'tok-bool');
      i = j;
      continue;
    }
    i++;
  }
  return spans;
}

// ═══════════════════════════════════════════
// CODEMIRROR SETUP
// ═══════════════════════════════════════════

function createEditor(container) {
  // If CodeMirror CDN bundles are not available (network issue), fall back to textarea
  if (typeof CM === 'undefined' || !CM.view) {
    return createFallbackEditor(container);
  }

  const { EditorState } = CM.state;
  const { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter, drawSelection } = CM.view;
  const { defaultKeymap, history, historyKeymap, indentWithTab } = CM.commands;
  const { bracketMatching, syntaxHighlighting, HighlightStyle } = CM.language;
  const { tags } = CM.lezerHighlight || {};

  // Update listener
  const updateListener = EditorView.updateListener.of(update => {
    if (update.docChanged) {
      if (!isDirty) {
        isDirty = true;
        markCurrentTabDirty();
      }
      updateCursorStatus(update.view);
    }
    if (update.selectionSet) {
      updateCursorStatus(update.view);
    }
  });

  const theme = EditorView.theme({
    '&': { height: '100%', background: 'var(--bg)' },
    '.cm-content': { fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' },
    '.cm-gutters': { background: 'var(--bg)', border: 'none', borderRight: '1px solid var(--border)' },
    '.cm-lineNumbers .cm-gutterElement': { color: 'var(--text-faint)', padding: '0 8px 0 0', textAlign: 'right', fontSize: '12px' },
    '.cm-activeLineGutter': { color: 'var(--text-muted)', background: 'transparent' },
    '.cm-activeLine': { background: 'rgba(255,255,255,0.025)' },
    '.cm-cursor': { borderLeft: '2px solid var(--accent)' },
    '.cm-selectionBackground': { background: 'var(--accent-dim)' },
    '&.cm-focused .cm-selectionBackground': { background: 'var(--accent-dim)' },
    '.cm-scroller': { overflow: 'auto' }
  }, { dark: true });

  const state = EditorState.create({
    doc: '',
    extensions: [
      lineNumbers(),
      highlightActiveLine(),
      highlightActiveLineGutter(),
      drawSelection(),
      history(),
      bracketMatching(),
      keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
      theme,
      updateListener,
      EditorView.lineWrapping
    ]
  });

  editorView = new EditorView({ state, parent: container });
  return editorView;
}

function createFallbackEditor(container) {
  // Lightweight fallback: styled textarea with manual highlighting overlay
  container.style.position = 'relative';
  container.style.height = '100%';
  
  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'height:100%;display:flex;overflow:hidden;';
  
  // Line numbers
  const gutter = document.createElement('div');
  gutter.id = 'fallback-gutter';
  gutter.style.cssText = `
    width:48px;flex-shrink:0;background:var(--bg);border-right:1px solid var(--border);
    overflow:hidden;padding:0 8px 0 0;text-align:right;font-family:'JetBrains Mono',monospace;
    font-size:12px;color:var(--text-faint);line-height:1.6;padding-top:0;
    white-space:pre;pointer-events:none;user-select:none;
  `;
  
  // Editor textarea
  const ta = document.createElement('textarea');
  ta.id = 'fallback-editor';
  ta.spellcheck = false;
  ta.autocomplete = 'off';
  ta.style.cssText = `
    flex:1;background:var(--bg);color:var(--text);border:none;outline:none;resize:none;
    font-family:'JetBrains Mono',monospace;font-size:13px;line-height:1.6;
    padding:0 0 60px 16px;caret-color:var(--accent);tab-size:4;
    white-space:pre;overflow-wrap:normal;overflow-x:auto;
  `;
  
  wrapper.appendChild(gutter);
  wrapper.appendChild(ta);
  container.appendChild(wrapper);
  
  function updateGutter() {
    const lines = ta.value.split('\n').length;
    gutter.textContent = Array.from({length: lines}, (_, i) => i + 1).join('\n');
  }

  ta.addEventListener('input', () => {
    updateGutter();
    if (!isDirty) { isDirty = true; markCurrentTabDirty(); }
    const pos = ta.selectionStart;
    const before = ta.value.substring(0, pos);
    const ln = before.split('\n').length;
    const col = before.split('\n').pop().length + 1;
    document.getElementById('status-cursor').textContent = `Ln ${ln}, Col ${col}`;
  });
  
  ta.addEventListener('keydown', e => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const s = ta.selectionStart;
      ta.value = ta.value.substring(0, s) + '    ' + ta.value.substring(ta.selectionEnd);
      ta.selectionStart = ta.selectionEnd = s + 4;
    }
  });
  
  updateGutter();
  
  // Proxy interface to match CM view
  editorView = {
    _ta: ta,
    getValue: () => ta.value,
    setValue: (v) => { ta.value = v; updateGutter(); },
    focus: () => ta.focus()
  };
  return editorView;
}

// ═══════════════════════════════════════════
// EDITOR API
// ═══════════════════════════════════════════

function editorGetValue() {
  if (!editorView) return '';
  if (editorView._ta) return editorView._ta.value;
  return editorView.state.doc.toString();
}

function editorSetValue(text) {
  if (!editorView) return;
  if (editorView._ta) { editorView._ta.value = text; return; }
  const { EditorState } = CM.state;
  editorView.setState(EditorState.create({
    doc: text,
    extensions: editorView.state.facet(CM.state.EditorState.extensions || [])
  }));
}

function editorSetValueSafe(text) {
  if (!editorView) return;
  if (editorView._ta) { editorView._ta.value = text; return; }
  editorView.dispatch({
    changes: { from: 0, to: editorView.state.doc.length, insert: text }
  });
}

function updateCursorStatus(view) {
  if (!view || !view.state) return;
  const sel = view.state.selection.main;
  const line = view.state.doc.lineAt(sel.head);
  const col = sel.head - line.from + 1;
  document.getElementById('status-cursor').textContent = `Ln ${line.number}, Col ${col}`;
}

function markCurrentTabDirty() {
  const activeTab = document.querySelector('.tab.active');
  if (activeTab && !activeTab.querySelector('.tab-dot')) {
    const dot = document.createElement('span');
    dot.className = 'tab-dot';
    dot.textContent = '•';
    activeTab.insertBefore(dot, activeTab.querySelector('.tab-close'));
  }
}

function markCurrentTabClean() {
  isDirty = false;
  const activeTab = document.querySelector('.tab.active');
  if (activeTab) {
    const dot = activeTab.querySelector('.tab-dot');
    if (dot) dot.remove();
  }
}

// Initialize editor on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('editor-container');
  createEditor(container);
});
