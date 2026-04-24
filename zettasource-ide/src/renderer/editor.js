import { EditorView, basicSetup } from 'codemirror';
import { EditorState, Compartment } from '@codemirror/state';
import { keymap, drawSelection, highlightActiveLine, dropCursor,
         rectangularSelection, crosshairCursor,
         lineNumbers, highlightActiveLineGutter } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import { syntaxHighlighting, HighlightStyle, LanguageSupport, LRLanguage } from "@codemirror/language";
import { tags } from "@lezer/highlight";
import { vim } from '@replit/codemirror-vim';

// UpperZetta Syntax Highlighting
const uzHighlighting = HighlightStyle.define([
  { tag: tags.keyword,        color: '#E53030', fontWeight: 'bold' },   // fun, let, if, else, while, for, return, class, componente
  { tag: tags.typeName,       color: '#5591C7' },                        // str, int, boolean, void
  { tag: tags.string,         color: '#4EC94E' },                        // "texto"
  { tag: tags.number,         color: '#E5A030' },                        // 21, 16
  { tag: tags.lineComment,    color: '#6A6A6A', fontStyle: 'italic' },   // // comentário
  { tag: tags.function(tags.variableName), color: '#FF9F43' },           // nome após fun
  { tag: tags.className,      color: '#C792EA' },                        // nomes de class/componente
  { tag: tags.bool,           color: '#5591C7', fontWeight: 'bold' },    // true, false
  { tag: tags.operator,       color: '#E53030' },                        // >> = == != < > <= >=
  { tag: tags.moduleKeyword,  color: '#888888', fontStyle: 'italic' },   // package in
  { tag: tags.special(tags.variableName), color: '#00D2D3' },            // System.print, e.const
]);

export class Editor {
    constructor(app) {
        this.app = app;
        this.container = document.getElementById('editor-container');
        this.view = null;
        this.vimCompartment = new Compartment();
        
        this.init();
    }

    init() {
        // Initial empty view
        this.view = new EditorView({
            parent: this.container,
            dispatch: (tr) => {
                this.view.update([tr]);
                if (tr.docChanged) {
                    this.app.tabs.markDirty(this.app.tabs.activeTabId);
                }
                this.updateCursorPos();
            }
        });
    }

    createState(content) {
        return EditorState.create({
            doc: content,
            extensions: [
                basicSetup,
                lineNumbers(),
                highlightActiveLineGutter(),
                highlightActiveLine(),
                history(),
                drawSelection(),
                dropCursor(),
                rectangularSelection(),
                crosshairCursor(),
                highlightSelectionMatches(),
                keymap.of([
                    ...defaultKeymap,
                    ...historyKeymap,
                    ...searchKeymap,
                    indentWithTab
                ]),
                syntaxHighlighting(uzHighlighting),
                this.vimCompartment.of([]) // Start with VIM off
            ]
        });
    }

    setState(state) {
        if (!this.view) return;
        this.view.setState(state);
    }

    clear() {
        this.view.setState(this.createState(''));
    }

    getContent() {
        return this.view.state.doc.toString();
    }

    toggleVim(enabled) {
        this.view.dispatch({
            effects: this.vimCompartment.reconfigure(enabled ? vim() : [])
        });
    }

    updateCursorPos() {
        const head = this.view.state.selection.main.head;
        const line = this.view.state.doc.lineAt(head);
        const col = head - line.from + 1;
        document.getElementById('cursor-pos').textContent = `Line ${line.number}, Col ${col}`;
    }

    setCursor(line, col) {
        const lineData = this.view.state.doc.line(line);
        const pos = lineData.from + Math.min(col - 1, lineData.length);
        this.view.dispatch({
            selection: { main: pos },
            scrollIntoView: true
        });
        this.view.focus();
    }

    undo() { /* handled by CM keymap */ }
    redo() { /* handled by CM keymap */ }
    showSearch() { /* handled by CM keymap Ctrl+F */ }
    showReplace() { /* handled by CM keymap Ctrl+H */ }
}
