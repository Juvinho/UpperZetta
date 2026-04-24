// Lightweight adapter that abstracts the desktop bridge (Electron preload or Tauri)
// Current implementation uses `window.zettaApi` (Electron preload). For Tauri v2,
// implement the same functions using `@tauri-apps/api` and export them here.

import { TerminalSessionCreatePayload, TerminalDataEvent, TerminalSignalPayload, TerminalWritePayload } from "../../../shared/contracts";

export async function createSession(payload: TerminalSessionCreatePayload) {
  // @ts-ignore global injected API
  return await (window as any).zettaApi.createTerminalSession(payload);
}

export async function listSessions() {
  // @ts-ignore
  return await (window as any).zettaApi.listTerminalSessions();
}

export async function writeSession(payload: TerminalWritePayload) {
  // @ts-ignore
  return await (window as any).zettaApi.writeTerminal(payload);
}

export async function killSession(payload: TerminalSignalPayload) {
  // @ts-ignore
  return await (window as any).zettaApi.killTerminalSession(payload);
}

export async function resizeSession(payload: { sessionId: string; cols: number; rows: number }) {
  // @ts-ignore
  if ((window as any).zettaApi?.resizeTerminalSession) {
    return (window as any).zettaApi.resizeTerminalSession(payload);
  }
  return false;
}

export function onData(handler: (event: TerminalDataEvent) => void) {
  // @ts-ignore
  return (window as any).zettaApi.onTerminalData(handler);
}
