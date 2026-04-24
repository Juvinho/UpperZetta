import { Diagnostic } from "../../types/ide";

const declarationPattern = /^(let|var|const)\s+[A-Za-z_][\w]*(\s*:\s*[A-Za-z_][\w]*)?(\s*=\s*.+)?$/;
const functionPattern = /^fun\s+[A-Za-z_][\w]*\s*\([^)]*\)(\s*:\s*[A-Za-z_][\w]*)?\s*(:|\{)?$/;
const classPattern = /^(class|component)\s+[A-Z][\w]*(\s+extends\s+[A-Z][\w]*)?\s*(:|\{)?$/;
const importPattern = /^import\s+([A-Za-z_][\w]*\s+from\s+)?["'][^"']+["']$/;
const controlPattern = /^(if|else|for|while)(\s+.+)?\s*(:|\{)?$/;

interface BlockExpectation {
  line: number;
  indent: number;
  reason: string;
}

export function validateUzet(content: string, filePath?: string): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const blockExpectations: BlockExpectation[] = [];
  const braceStack: Array<{ line: number; column: number }> = [];
  const parenStack: Array<{ line: number; column: number }> = [];

  let previousIndent = 0;

  for (let index = 0; index < lines.length; index += 1) {
    const raw = lines[index] ?? "";
    const lineNumber = index + 1;

    if (raw.includes("\t")) {
      diagnostics.push(createDiagnostic(filePath, lineNumber, raw.indexOf("\t") + 1, "Tabs nao sao permitidas. Use espacos para indentacao.", "error"));
    }

    const stripped = stripInlineComment(raw);
    if (stripped.trim().length === 0) {
      continue;
    }

    const indent = countIndentation(raw);
    if (indent % 2 !== 0) {
      diagnostics.push(
        createDiagnostic(
          filePath,
          lineNumber,
          1,
          "Indentacao recomendada em multiplos de 2 espacos.",
          "warning"
        )
      );
    }

    if (indent > previousIndent + 6) {
      diagnostics.push(
        createDiagnostic(
          filePath,
          lineNumber,
          1,
          "Salto abrupto de indentacao detectado. Revise o bloco.",
          "warning"
        )
      );
    }

    if (blockExpectations.length > 0) {
      const expected = blockExpectations[blockExpectations.length - 1];
      if (lineNumber === expected.line + 1 && indent <= expected.indent) {
        diagnostics.push(
          createDiagnostic(
            filePath,
            lineNumber,
            1,
            `Esperado bloco indentado apos ${expected.reason} na linha ${expected.line}.`,
            "error"
          )
        );
      }

      if (indent > expected.indent) {
        blockExpectations.pop();
      }
    }

    const trimmed = stripped.trim();
    const keyword = trimmed.split(/\s+/)[0]?.toLowerCase();

    validateLineByKeyword(trimmed, keyword, lineNumber, filePath, diagnostics);

    if (trimmed.endsWith(":")) {
      blockExpectations.push({ line: lineNumber, indent, reason: "declaracao com ':'" });
    }

    for (let i = 0; i < stripped.length; i += 1) {
      const char = stripped[i] ?? "";
      if (char === "{") {
        braceStack.push({ line: lineNumber, column: i + 1 });
      } else if (char === "}") {
        if (braceStack.length === 0) {
          diagnostics.push(createDiagnostic(filePath, lineNumber, i + 1, "Chave de fechamento sem abertura correspondente.", "error"));
        } else {
          braceStack.pop();
        }
      }

      if (char === "(") {
        parenStack.push({ line: lineNumber, column: i + 1 });
      } else if (char === ")") {
        if (parenStack.length === 0) {
          diagnostics.push(createDiagnostic(filePath, lineNumber, i + 1, "Parentesis de fechamento sem abertura correspondente.", "error"));
        } else {
          parenStack.pop();
        }
      }
    }

    previousIndent = indent;
  }

  for (const openBrace of braceStack) {
    diagnostics.push(
      createDiagnostic(
        filePath,
        openBrace.line,
        openBrace.column,
        "Chave aberta sem fechamento.",
        "error"
      )
    );
  }

  for (const openParen of parenStack) {
    diagnostics.push(
      createDiagnostic(
        filePath,
        openParen.line,
        openParen.column,
        "Parentesis aberto sem fechamento.",
        "error"
      )
    );
  }

  return diagnostics;
}

function validateLineByKeyword(
  line: string,
  keyword: string,
  lineNumber: number,
  filePath: string | undefined,
  diagnostics: Diagnostic[]
): void {
  if (keyword === "let" || keyword === "var" || keyword === "const") {
    if (!declarationPattern.test(line)) {
      diagnostics.push(
        createDiagnostic(
          filePath,
          lineNumber,
          1,
          "Declaracao invalida. Formato esperado: let nome: Tipo = valor",
          "error"
        )
      );
    }
    return;
  }

  if (keyword === "fun") {
    if (!functionPattern.test(line)) {
      diagnostics.push(
        createDiagnostic(
          filePath,
          lineNumber,
          1,
          "Assinatura de funcao invalida. Use: fun nome(args):",
          "error"
        )
      );
    }
    return;
  }

  if (keyword === "class" || keyword === "component") {
    if (!classPattern.test(line)) {
      diagnostics.push(
        createDiagnostic(
          filePath,
          lineNumber,
          1,
          "Declaracao de classe/component invalida.",
          "error"
        )
      );
    }
    return;
  }

  if (keyword === "import") {
    if (!importPattern.test(line)) {
      diagnostics.push(
        createDiagnostic(
          filePath,
          lineNumber,
          1,
          "Import invalido. Exemplo: import \"./modulo.up\"",
          "error"
        )
      );
    }
    return;
  }

  if (keyword === "if" || keyword === "else" || keyword === "for" || keyword === "while") {
    if (!controlPattern.test(line)) {
      diagnostics.push(
        createDiagnostic(
          filePath,
          lineNumber,
          1,
          "Estrutura de controle invalida.",
          "error"
        )
      );
    }
  }
}

function stripInlineComment(line: string): string {
  let inDouble = false;
  let inSingle = false;

  for (let i = 0; i < line.length - 1; i += 1) {
    const current = line[i] ?? "";
    const next = line[i + 1] ?? "";

    if (current === '"' && !inSingle) {
      inDouble = !inDouble;
      continue;
    }

    if (current === "'" && !inDouble) {
      inSingle = !inSingle;
      continue;
    }

    if (!inDouble && !inSingle && current === "/" && next === "/") {
      return line.slice(0, i);
    }
  }

  return line;
}

function countIndentation(line: string): number {
  let count = 0;
  while (count < line.length && line[count] === " ") {
    count += 1;
  }

  return count;
}

function createDiagnostic(
  filePath: string | undefined,
  line: number,
  column: number,
  message: string,
  severity: "error" | "warning"
): Diagnostic {
  return {
    id: `${severity}-${line}-${column}-${message}`,
    filePath,
    message,
    severity,
    line,
    column,
    source: "uzet-validator"
  };
}
