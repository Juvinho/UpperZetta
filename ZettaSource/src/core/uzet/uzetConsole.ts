import { OutputEntry } from "../../types/ide";

function nowText(): string {
  return new Date().toLocaleTimeString();
}

function makeEntry(level: OutputEntry["level"], text: string): OutputEntry {
  return {
    id: `${level}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    level,
    text,
    timestamp: nowText()
  };
}

// MVP stub: executor simplificado para testes rapidos no painel.
// Substituir por runtime oficial Uzet na proxima iteracao.
export function runUzetConsoleCommand(input: string): OutputEntry[] {
  const trimmed = input.trim();
  if (!trimmed) {
    return [makeEntry("warning", "Digite um comando Uzet para executar.")];
  }

  if (trimmed.startsWith("print(")) {
    const inside = trimmed.replace(/^print\(/, "").replace(/\)\s*$/, "").trim();
    return [makeEntry("success", inside.replace(/^['\"]|['\"]$/g, ""))];
  }

  if (/^\d+(\s*[+\-*/]\s*\d+)+$/.test(trimmed)) {
    try {
      const result = Function(`return (${trimmed})`)();
      return [makeEntry("success", String(result))];
    } catch {
      return [makeEntry("error", "Expressao invalida no console Uzet.")];
    }
  }

  return [
    makeEntry("info", "Comando recebido pelo Uzet Console (stub)."),
    makeEntry("warning", "Runtime real ainda nao integrado para este comando.")
  ];
}
