import { contextBridge, ipcRenderer } from "electron";
import {
  CreateFilePayload,
  GitBranchCheckoutPayload,
  GitCommitPayload,
  GitDiffPayload,
  GitPathsPayload,
  SaveFilePayload,
  TerminalSessionCreatePayload,
  TerminalSignalPayload,
  TerminalWritePayload
} from "../shared/contracts";

const zettaApi = {
  openFolderDialog: () => ipcRenderer.invoke("dialog:openFolder") as Promise<string | null>,
  readWorkspace: (rootPath: string) => ipcRenderer.invoke("workspace:read", rootPath),
  loadExampleWorkspace: () => ipcRenderer.invoke("workspace:loadExamples"),
  readFile: (filePath: string) => ipcRenderer.invoke("file:read", filePath),
  saveFile: (payload: SaveFilePayload) => ipcRenderer.invoke("file:save", payload),
  createFile: (payload: CreateFilePayload) => ipcRenderer.invoke("file:create", payload),

  createTerminalSession: (payload: TerminalSessionCreatePayload) =>
    ipcRenderer.invoke("terminal:create", payload),
  listTerminalSessions: () => ipcRenderer.invoke("terminal:list"),
  writeTerminal: (payload: TerminalWritePayload) => ipcRenderer.invoke("terminal:write", payload),
  killTerminalSession: (payload: TerminalSignalPayload) => ipcRenderer.invoke("terminal:kill", payload),
  resizeTerminalSession: (payload: { sessionId: string; cols: number; rows: number }) =>
    ipcRenderer.invoke("terminal:resize", payload),
  onTerminalData: (handler: (event: unknown) => void) => {
    const listener = (_event: unknown, payload: unknown) => handler(payload);
    ipcRenderer.on("terminal:data", listener);
    return () => {
      ipcRenderer.removeListener("terminal:data", listener);
    };
  },

  gitStatus: (cwd: string) => ipcRenderer.invoke("git:status", cwd),
  gitStage: (payload: GitPathsPayload) => ipcRenderer.invoke("git:stage", payload),
  gitUnstage: (payload: GitPathsPayload) => ipcRenderer.invoke("git:unstage", payload),
  gitCommit: (payload: GitCommitPayload) => ipcRenderer.invoke("git:commit", payload),
  gitPull: (cwd: string) => ipcRenderer.invoke("git:pull", cwd),
  gitPush: (cwd: string) => ipcRenderer.invoke("git:push", cwd),
  gitBranches: (cwd: string) => ipcRenderer.invoke("git:branches", cwd),
  gitCheckout: (payload: GitBranchCheckoutPayload) => ipcRenderer.invoke("git:checkout", payload),
  gitDiff: (payload: GitDiffPayload) => ipcRenderer.invoke("git:diff", payload),
  gitRemote: (cwd: string) => ipcRenderer.invoke("git:remote", cwd),

  openExternal: (url: string) => ipcRenderer.invoke("system:openExternal", url)
};

contextBridge.exposeInMainWorld("zettaApi", zettaApi);
