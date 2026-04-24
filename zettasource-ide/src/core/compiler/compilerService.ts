import { validateUzet } from "../parser/uzetValidator";
import { Diagnostic, EditorTab, OutputEntry } from "../../types/ide";

export interface CompileResult {
  diagnostics: Diagnostic[];
  output: OutputEntry[];
  compiledCode: string;
  hasErrors: boolean;
}

export interface RunResult {
  output: OutputEntry[];
  diagnostics: Diagnostic[];
  hasErrors: boolean;
}

export function compileTab(tab: EditorTab): CompileResult {
  const diagnostics = validateUzet(tab.content, tab.path);
  const now = new Date();
  const hasErrors = diagnostics.some((diagnostic) => diagnostic.severity === "error");

  const output: OutputEntry[] = [];
  output.push(entry("info", `Compilando ${tab.name}...`, now));

  if (hasErrors) {
    output.push(entry("error", `${countSeverity(diagnostics, "error")} erro(s) encontrados.`, now));
  } else {
    output.push(entry("success", "Compilacao concluida com sucesso.", now));
  }

  const warningCount = countSeverity(diagnostics, "warning");
  if (warningCount > 0) {
    output.push(entry("warning", `${warningCount} aviso(s) de qualidade encontrados.`, now));
  }

  const compiledCode = toPseudoOutput(tab.content, tab.name);
  output.push(entry("info", `Output size: ${compiledCode.length} bytes`, now));

  return {
    diagnostics,
    output,
    compiledCode,
    hasErrors
  };
}

export function runTab(tab: EditorTab): RunResult {
  const compileResult = compileTab(tab);
  if (compileResult.hasErrors) {
    return {
      output: [
        ...compileResult.output,
        entry("error", "Execucao interrompida: corrija os erros de compilacao.", new Date())
      ],
      diagnostics: compileResult.diagnostics,
      hasErrors: true
    };
  }

  const runtimeOutput = simulateRuntime(tab.content);
  return {
    output: [...compileResult.output, ...runtimeOutput],
    diagnostics: compileResult.diagnostics,
    hasErrors: false
  };
}

function toPseudoOutput(source: string, fileName: string): string {
  const lines = source.split(/\r?\n/);
  const transformed = lines.map((line) => {
    let out = line;
    out = out.replace(/^\s*fun\s+/g, "function ");
    out = out.replace(/^\s*component\s+/g, "class ");
    out = out.replace(/\bprint\s*\(/g, "console.log(");
    return out;
  });

  return [
    "// ZettaSource Compiler Output (MVP)",
    `// Source: ${fileName}`,
    "// TODO: replace with official Uzet compiler integration",
    "",
    ...transformed
  ].join("\n");
}

function simulateRuntime(source: string): OutputEntry[] {
  const now = new Date();
  const output: OutputEntry[] = [entry("info", "Runtime Uzet (simulado) iniciado.", now)];
  const lines = source.split(/\r?\n/);

  for (const line of lines) {
    const match = line.match(/\bprint\s*\((.*)\)\s*$/);
    if (match) {
      const raw = match[1] ?? "";
      const cleaned = raw.trim().replace(/^['\"]|['\"]$/g, "");
      output.push(entry("success", cleaned.length > 0 ? cleaned : "print()", now));
    }
  }

  if (output.length === 1) {
    output.push(entry("info", "Nenhuma chamada print detectada no arquivo.", now));
  }

  output.push(entry("success", "Execucao finalizada.", now));
  return output;
}

function entry(level: OutputEntry["level"], text: string, date: Date): OutputEntry {
  return {
    id: `${level}-${date.getTime()}-${Math.random().toString(16).slice(2, 8)}`,
    level,
    text,
    timestamp: date.toLocaleTimeString()
  };
}

function countSeverity(diagnostics: Diagnostic[], severity: Diagnostic["severity"]): number {
  return diagnostics.filter((diagnostic) => diagnostic.severity === severity).length;
}
