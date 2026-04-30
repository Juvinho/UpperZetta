import { EditorView, basicSetup } from 'codemirror';
import { EditorState, Compartment, StateEffect } from '@codemirror/state';
import { keymap, drawSelection, highlightActiveLine, dropCursor,
         rectangularSelection, crosshairCursor,
         lineNumbers, highlightActiveLineGutter } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import { syntaxHighlighting, HighlightStyle, LanguageSupport, StreamLanguage, indentUnit, indentService } from "@codemirror/language";
import { tags } from "@lezer/highlight";
import { vim } from '@replit/codemirror-vim';

// UpperZetta color palette
const uzHighlighting = HighlightStyle.define([
    { tag: tags.keyword,                     color: '#E53030', fontWeight: 'bold' },
    { tag: tags.typeName,                    color: '#5591C7' },
    { tag: tags.string,                      color: '#4EC94E' },
    { tag: tags.number,                      color: '#E5A030' },
    { tag: tags.lineComment,                 color: '#6A6A6A', fontStyle: 'italic' },
    { tag: tags.function(tags.variableName), color: '#FF9F43' },
    { tag: tags.className,                   color: '#C792EA' },
    { tag: tags.bool,                        color: '#5591C7', fontWeight: 'bold' },
    { tag: tags.operator,                    color: '#E53030' },
    { tag: tags.special(tags.variableName),  color: '#00D2D3' },
]);

// UpperZetta StreamLanguage parser
const UZ_KEYWORDS = new Set([
    'fun','let','const','if','else','while','for','return',
    'class','componente','new','package','in','import','extends',
    'super','this','break','continue',
]);
const UZ_TYPES    = new Set(['str','int','float','boolean','void','Array','Object','e']);
const UZ_BOOLS    = new Set(['true','false','null']);
const UZ_BUILTINS = new Set(['System','Math','console','print']);

const uzParser = StreamLanguage.define({
    startState: () => ({ afterFun: false, afterClass: false }),

    token(stream, state) {
        if (stream.eatSpace()) return null;

        // Line comment
        if (stream.match('//')) { stream.skipToEnd(); return 'comment'; }

        // String (double-quoted with escape support)
        if (stream.peek() === '"') {
            stream.next();
            while (!stream.eol()) {
                const ch = stream.next();
                if (ch === '\\') stream.next();
                else if (ch === '"') break;
            }
            return 'string';
        }

        // Number (int or float)
        if (stream.match(/^[0-9]+(\.[0-9]+)?/)) return 'number';

        // Word / identifier
        if (stream.match(/^[a-zA-Z_][a-zA-Z0-9_]*/)) {
            const w = stream.current();

            if (state.afterFun) {
                state.afterFun = false;
                return 'funDef';
            }
            if (state.afterClass) {
                state.afterClass = false;
                return 'clsDef';
            }

            if (UZ_KEYWORDS.has(w)) {
                state.afterFun   = w === 'fun';
                state.afterClass = w === 'class' || w === 'componente';
                return 'keyword';
            }
            if (UZ_TYPES.has(w))    return 'type';
            if (UZ_BOOLS.has(w))    return 'atom';
            if (UZ_BUILTINS.has(w)) return 'builtin';

            // identifier followed by '(' → function call
            if (stream.peek() === '(') return 'funcCall';
            return null;
        }

        // Operators (longest match first)
        if (stream.match(/^(>>|==|!=|<=|>=|&&|\|\|)/)) return 'operator';
        if (stream.match(/^[=<>+\-*\/!%&|^~]/))        return 'operator';

        stream.next();
        return null;
    },

    tokenTable: {
        funDef:   tags.function(tags.variableName),
        clsDef:   tags.className,
        type:     tags.typeName,
        builtin:  tags.special(tags.variableName),
        funcCall: tags.function(tags.variableName),
    },
});

const uzLanguage = new LanguageSupport(uzParser);

// 4-space indent unit
const uzIndentUnit = indentUnit.of("    ");

// Auto-indent based on { / } context
const uzIndentService = indentService.of((cx, pos) => {
    const line = cx.lineAt(pos, -1);
    if (line.from === 0) return null;

    const prevLine = cx.lineAt(line.from - 1, 1);
    const prevText = prevLine.text;
    const prevIndent = (/^(\s*)/.exec(prevText) || ['', ''])[1].length;
    const curText = line.text;

    if (prevText.trimEnd().endsWith('{')) {
        if (curText.trimStart().startsWith('}')) return prevIndent;
        return prevIndent + cx.unit;
    }
    if (curText.trimStart().startsWith('}')) {
        return Math.max(0, prevIndent - cx.unit);
    }
    return prevIndent;
});

// Enter between { and } → create indented line, keep } on line below
const uzEnterBraces = {
    key: "Enter",
    run(view) {
        const { state } = view;
        const sel = state.selection.main;
        if (!sel.empty) return false;
        const pos = sel.from;
        const charBefore = state.doc.sliceString(pos - 1, pos);
        const charAfter  = state.doc.sliceString(pos, pos + 1);
        if (charBefore !== '{' || charAfter !== '}') return false;
        const line = state.doc.lineAt(pos);
        const baseIndent = (/^(\s*)/.exec(line.text) || ['', ''])[1];
        const inner = baseIndent + '    ';
        const insert = '\n' + inner + '\n' + baseIndent;
        view.dispatch({
            changes: { from: pos, to: pos, insert },
            selection: { anchor: pos + inner.length + 1 }
        });
        return true;
    }
};

export class Editor {
    constructor(app) {
        this.app = app;
        this.container = document.getElementById('editor-container');
        this.view = null;
        this.vimCompartment  = new Compartment();
        this.wrapCompartment = new Compartment();
        this._wordWrap = false;

        this.init();
    }

    init() {
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

        document.getElementById('word-wrap-toggle')?.addEventListener('click', () => this.toggleWordWrap());
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
                uzIndentUnit,
                uzIndentService,
                keymap.of([
                    uzEnterBraces,
                    ...defaultKeymap,
                    ...historyKeymap,
                    ...searchKeymap,
                    indentWithTab
                ]),
                uzLanguage,
                syntaxHighlighting(uzHighlighting),
                this.vimCompartment.of([]),
                this.wrapCompartment.of([])
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

    toggleWordWrap(force) {
        this._wordWrap = force !== undefined ? force : !this._wordWrap;
        this.view.dispatch({
            effects: this.wrapCompartment.reconfigure(this._wordWrap ? EditorView.lineWrapping : [])
        });
        const btn = document.getElementById('word-wrap-toggle');
        if (btn) btn.textContent = this._wordWrap ? 'Word Wrap' : 'No Wrap';
    }

    updateCursorPos() {
        const head = this.view.state.selection.main.head;
        const line = this.view.state.doc.lineAt(head);
        const col  = head - line.from + 1;
        document.getElementById('cursor-pos').textContent = `Ln ${line.number}, Col ${col}`;
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
