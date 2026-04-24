import type * as monaco from "monaco-editor";

interface UzetSnippet {
  label: string;
  detail: string;
  insertText: string;
}

const snippets: UzetSnippet[] = [
  {
    label: "fun",
    detail: "Criar funcao Uzet",
    insertText: "fun ${1:name}(${2:args})${3:: String}:\n  ${4:return null}"
  },
  {
    label: "class",
    detail: "Criar classe Uzet",
    insertText: "class ${1:Name}:\n  fun init(${2:args}):\n    ${3:print(\"ready\")}"
  },
  {
    label: "if",
    detail: "Bloco if/else",
    insertText: "if ${1:condition}:\n  ${2:print(\"ok\")}\nelse:\n  ${3:print(\"fallback\")}" 
  },
  {
    label: "for",
    detail: "Loop for",
    insertText: "for ${1:item} in ${2:items}:\n  ${3:print(item)}"
  },
  {
    label: "component",
    detail: "Componente Uzet",
    insertText: "component ${1:App}:\n  const title: String = \"${2:Zetta}\"\n  fun render():\n    print(title)"
  }
];

export function createUzetSnippetSuggestions(
  monacoInstance: typeof monaco,
  range: monaco.IRange
): monaco.languages.CompletionItem[] {
  return snippets.map((snippet) => ({
    label: snippet.label,
    kind: monacoInstance.languages.CompletionItemKind.Snippet,
    detail: snippet.detail,
    insertText: snippet.insertText,
    insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    range
  }));
}
