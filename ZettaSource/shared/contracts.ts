export type NodeType = "file" | "directory";

export interface FileNode {
  id: string;
  name: string;
  path: string;
  type: NodeType;
  extension?: string;
  children?: FileNode[];
}

export interface WorkspaceData {
  rootPath: string;
  nodes: FileNode[];
}

export interface FileReadResult {
  path: string;
  content: string;
}

export interface SaveFilePayload {
  path: string;
  content: string;
}

export interface CreateFilePayload {
  directoryPath: string;
  fileName: string;
  content?: string;
}

export interface TerminalSessionInfo {
  id: string;
  name: string;
  cwd: string;
  shell: string;
  running: boolean;
}

export interface TerminalSessionCreatePayload {
  cwd?: string;
  name?: string;
}

export interface TerminalWritePayload {
  sessionId: string;
  input: string;
}

export interface TerminalSignalPayload {
  sessionId: string;
}

export interface TerminalDataEvent {
  sessionId: string;
  stream: "stdout" | "stderr" | "system";
  chunk: string;
  timestamp: number;
}

export interface GitStatusEntry {
  path: string;
  indexStatus: string;
  workTreeStatus: string;
  staged: boolean;
  untracked: boolean;
  deleted: boolean;
  renamed: boolean;
}

export interface GitStatusResult {
  branch: string;
  upstream?: string;
  entries: GitStatusEntry[];
  aheadBy: number;
  behindBy: number;
}

export interface GitPathPayload {
  cwd: string;
  path: string;
}

export interface GitPathsPayload {
  cwd: string;
  paths: string[];
}

export interface GitCommitPayload {
  cwd: string;
  message: string;
}

export interface GitBranchCheckoutPayload {
  cwd: string;
  branch: string;
}

export interface GitDiffPayload {
  cwd: string;
  path: string;
}

export interface GitBranchInfo {
  name: string;
  current: boolean;
}

export interface GitBranchesResult {
  currentBranch: string;
  branches: GitBranchInfo[];
}
