import { TerminalDataEvent } from "../../../shared/contracts";
import { OutputEntry, TerminalSession } from "../../types/ide";
import * as adapter from "./terminalAdapter";

export async function createTerminal(cwd?: string, name?: string): Promise<TerminalSession> {
  const info = await adapter.createSession({ cwd, name });
  return {
    ...info,
    buffer: []
  };
}

export async function writeTerminal(sessionId: string, command: string): Promise<boolean> {
  // send a full-line command (used by UI run button)
  return adapter.writeSession({ sessionId, input: `${command}\n` });
}

export async function killTerminal(sessionId: string): Promise<boolean> {
  return adapter.killSession({ sessionId });
}

export function toOutputEntry(event: TerminalDataEvent): OutputEntry {
  const date = new Date(event.timestamp);
  return {
    id: `${event.sessionId}-${event.timestamp}-${Math.random().toString(16).slice(2, 8)}`,
    level: event.stream === "stderr" ? "error" : event.stream === "system" ? "warning" : "info",
    text: event.chunk,
    timestamp: date.toLocaleTimeString()
  };
}

export function subscribeTerminalData(handler: (event: TerminalDataEvent) => void): () => void {
  return adapter.onData(handler);
}
