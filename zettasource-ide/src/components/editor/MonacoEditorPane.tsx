import React, { useEffect, useMemo, useRef } from "react";
import Editor, { Monaco } from "@monaco-editor/react";
import type * as MonacoEditor from "monaco-editor";
import { Diagnostic, EditorTab, ThemeMode } from "../../types/ide";
import { inferLanguageFromExtension } from "../../core/filesystem/workspaceService";
import { getUzetMonacoTheme, registerUzetLanguage } from "../../core/language/uzetLanguage";

interface MonacoEditorPaneProps {
  tab: EditorTab;
  diagnostics: Diagnostic[];
  theme: ThemeMode;
  onChange: (content: string) => void;
  onCursorChange: (line: number, column: number) => void;
}

export function MonacoEditorPane(props: MonacoEditorPaneProps): React.ReactElement {
  const editorRef = useRef<MonacoEditor.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);

  const language = useMemo(() => inferLanguageFromExtension(props.tab.extension), [props.tab.extension]);

  useEffect(() => {
    const monacoInstance = monacoRef.current;
    const editor = editorRef.current;
    if (!monacoInstance || !editor) {
      return;
    }

    const model = editor.getModel();
    if (!model) {
      return;
    }

    const markers = props.diagnostics.map((diagnostic) => ({
      startLineNumber: diagnostic.line,
      endLineNumber: diagnostic.line,
      startColumn: diagnostic.column,
      endColumn: Math.max(diagnostic.column + 1, diagnostic.column + 1),
      message: diagnostic.message,
      severity:
        diagnostic.severity === "error"
          ? monacoInstance.MarkerSeverity.Error
          : monacoInstance.MarkerSeverity.Warning,
      source: diagnostic.source
    }));

    monacoInstance.editor.setModelMarkers(model, "uzet-diagnostics", markers);
  }, [props.diagnostics]);

  useEffect(() => {
    const monacoInstance = monacoRef.current;
    const editor = editorRef.current;
    if (!monacoInstance || !editor) {
      return;
    }

    const refreshLayout = () => {
      monacoInstance.editor.remeasureFonts();
      editor.render(true);
    };

    // Fontes web podem carregar apos o mount e deslocar visualmente o cursor.
    refreshLayout();

    const fontSet = document.fonts;
    if (!fontSet) {
      return;
    }

    const onFontsLoaded = () => refreshLayout();

    void fontSet.ready.then(onFontsLoaded);
    fontSet.addEventListener("loadingdone", onFontsLoaded);

    return () => {
      fontSet.removeEventListener("loadingdone", onFontsLoaded);
    };
  }, [props.tab.id]);

  return (
    <div className="editor-pane">
      <Editor
        height="100%"
        language={language}
        path={props.tab.path ?? props.tab.id}
        value={props.tab.content}
        theme={props.theme === "dark" ? "zetta-dark" : "zetta-light"}
        beforeMount={(monaco) => {
          registerUzetLanguage(monaco);
          monaco.editor.defineTheme("zetta-dark", getUzetMonacoTheme("dark"));
          monaco.editor.defineTheme("zetta-light", getUzetMonacoTheme("light"));
        }}
        onMount={(editor, monaco) => {
          editorRef.current = editor;
          monacoRef.current = monaco;

          editor.onDidChangeCursorPosition((event) => {
            props.onCursorChange(event.position.lineNumber, event.position.column);
          });
        }}
        onChange={(value) => props.onChange(value ?? "")}
        options={{
          fontFamily: "Cascadia Mono, JetBrains Mono, Consolas, monospace",
          fontSize: 14,
          lineHeight: 22,
          fontLigatures: false,
          minimap: { enabled: false },
          smoothScrolling: true,
          padding: { top: 14 },
          lineNumbersMinChars: 4,
          glyphMargin: false,
          automaticLayout: true,
          autoIndent: "advanced",
          tabSize: 2,
          insertSpaces: true,
          renderLineHighlight: "all",
          cursorBlinking: "blink",
          cursorSmoothCaretAnimation: "off",
          roundedSelection: true,
          scrollBeyondLastLine: false
        }}
      />
    </div>
  );
}
