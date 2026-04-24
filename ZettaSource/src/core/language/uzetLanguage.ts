import type * as monaco from "monaco-editor";
import { createUzetSnippetSuggestions } from "./uzetSnippets";

export const UZET_LANGUAGE_ID = "uzet";

const UZET_KEYWORDS = [
  "let",
  "var",
  "const",
  "fun",
  "class",
  "if",
  "else",
  "for",
  "while",
  "return",
  "import",
  "component",
  "print",
  "true",
  "false",
  "null",
  "in",
  "extends"
];

let languageRegistered = false;

export function registerUzetLanguage(monacoInstance: typeof monaco): void {
  if (languageRegistered) {
    return;
  }

  monacoInstance.languages.register({
    id: UZET_LANGUAGE_ID,
    aliases: ["Upperzetta", "Uzet"],
    extensions: [".uz", ".up", ".upz"],
    mimetypes: ["text/x-uzet"]
  });

  monacoInstance.languages.setLanguageConfiguration(UZET_LANGUAGE_ID, {
    comments: {
      lineComment: "//",
      blockComment: ["/*", "*/"]
    },
    brackets: [
      ["{", "}"],
      ["[", "]"],
      ["(", ")"]
    ],
    autoClosingPairs: [
      { open: "{", close: "}" },
      { open: "[", close: "]" },
      { open: "(", close: ")" },
      { open: "\"", close: "\"" },
      { open: "'", close: "'" }
    ],
    surroundingPairs: [
      { open: "{", close: "}" },
      { open: "[", close: "]" },
      { open: "(", close: ")" },
      { open: "\"", close: "\"" },
      { open: "'", close: "'" }
    ],
    indentationRules: {
      increaseIndentPattern: /^.*(:|\{|\[)\s*$/,
      decreaseIndentPattern: /^\s*(\}|\]|else\b|catch\b|finally\b)/
    },
    onEnterRules: [
      {
        beforeText: /^\s*(fun|if|else|for|while|class|component).*:\s*$/,
        action: { indentAction: monacoInstance.languages.IndentAction.Indent }
      }
    ]
  });

  monacoInstance.languages.setMonarchTokensProvider(UZET_LANGUAGE_ID, {
    defaultToken: "",
    tokenPostfix: ".uzet",
    keywords: UZET_KEYWORDS,
    typeKeywords: ["String", "Int", "Float", "Bool", "List", "Map", "Void"],
    operators: ["=", "+", "-", "*", "/", "==", "!=", "<=", ">=", "<", ">", "=>", ":"],

    tokenizer: {
      root: [
        [/\/\*/, "comment", "@comment"],
        [/\/\/.*$/, "comment"],
        [/\b(fun)(\s+)([a-zA-Z_][\w]*)/, ["keyword", "white", "entity.name.function"]],
        [/\b(class|component)(\s+)([A-Z][\w]*)/, ["keyword", "white", "type.identifier"]],
        [/\b[A-Z][\w]*(?=\s*\()/, "entity.name.function"],
        [/\b[a-zA-Z_][\w]*(?=\s*\()/, "entity.name.function"],
        [/\b\d+(?:\.\d+)?\b/, "number"],
        [/"([^"\\]|\\.)*$/, "string.invalid"],
        [/"/, "string", "@string_double"],
        [/'([^'\\]|\\.)*$/, "string.invalid"],
        [/'/, "string", "@string_single"],
        [/[{}()\[\]]/, "delimiter.bracket"],
        [/[,:]/, "delimiter"],
        [/[a-zA-Z_][\w]*/, {
          cases: {
            "@keywords": "keyword",
            "@typeKeywords": "type",
            "@default": "identifier"
          }
        }],
        [/[+\-*\/=!<>]+/, "operator"],
        [/\s+/, "white"]
      ],
      comment: [
        [/[^/*]+/, "comment"],
        [/\/\*/, "comment", "@push"],
        [/\*\//, "comment", "@pop"],
        [/[/*]/, "comment"]
      ],
      string_double: [
        [/[^\\"]+/, "string"],
        [/\\./, "string.escape"],
        [/"/, "string", "@pop"]
      ],
      string_single: [
        [/[^\\']+/, "string"],
        [/\\./, "string.escape"],
        [/'/, "string", "@pop"]
      ]
    }
  });

  monacoInstance.languages.registerCompletionItemProvider(UZET_LANGUAGE_ID, {
    triggerCharacters: [".", " "],
    provideCompletionItems(model, position) {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn
      };

      const keywordSuggestions = UZET_KEYWORDS.map((keyword) => ({
        label: keyword,
        kind: monacoInstance.languages.CompletionItemKind.Keyword,
        insertText: keyword,
        detail: "Keyword Uzet",
        range
      }));

      const typeSuggestions = ["String", "Int", "Float", "Bool", "List", "Map", "Void"].map(
        (typeName) => ({
          label: typeName,
          kind: monacoInstance.languages.CompletionItemKind.Class,
          insertText: typeName,
          detail: "Tipo Uzet",
          range
        })
      );

      const snippetSuggestions = createUzetSnippetSuggestions(monacoInstance, range);

      return {
        suggestions: [...keywordSuggestions, ...typeSuggestions, ...snippetSuggestions]
      };
    }
  });

  languageRegistered = true;
}

export function getUzetMonacoTheme(theme: "dark" | "light"): monaco.editor.IStandaloneThemeData {
  if (theme === "light") {
    return {
      base: "vs",
      inherit: true,
      rules: [
        { token: "keyword", foreground: "005f8c", fontStyle: "bold" },
        { token: "type", foreground: "006c5f" },
        { token: "string", foreground: "9a4d00" },
        { token: "number", foreground: "0f62fe" },
        { token: "comment", foreground: "68707d", fontStyle: "italic" },
        { token: "entity.name.function", foreground: "6f3cc3" }
      ],
      colors: {
        "editor.background": "#f7fafc",
        "editor.foreground": "#17212e",
        "editorLineNumber.foreground": "#8a96a7",
        "editorLineNumber.activeForeground": "#2f445e",
        "editorCursor.foreground": "#007d8c",
        "editorIndentGuide.background1": "#d9e1ea"
      }
    };
  }

  return {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "keyword", foreground: "53b4ff", fontStyle: "bold" },
      { token: "type", foreground: "58e3c5" },
      { token: "string", foreground: "f7ad62" },
      { token: "number", foreground: "8dc4ff" },
      { token: "comment", foreground: "6f8096", fontStyle: "italic" },
      { token: "entity.name.function", foreground: "9dbfff" }
    ],
    colors: {
      "editor.background": "#0f1722",
      "editor.foreground": "#d6e2f0",
      "editorLineNumber.foreground": "#586a80",
      "editorLineNumber.activeForeground": "#9aabc1",
      "editorCursor.foreground": "#2ef5b9",
      "editorIndentGuide.background1": "#2a3a4e"
    }
  };
}
