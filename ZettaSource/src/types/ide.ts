import { FileNode } from "../../shared/contracts";

export type ThemeMode = "dark" | "light";
export type PanelView = "terminal" | "diagnostics" | "compiler" | "git";
export type CompileStatus = "idle" | "compiling" | "running" | "success" | "error";

export interface EditorTab {
  id: string;
  name: string;
  path?: string;
  extension: string;
  content: string;
  isDirty: boolean;
  isUntitled: boolean;
}

export interface CursorPosition {
  line: number;
  column: number;
}

export interface Diagnostic {
  id: string;
  filePath?: string;
  message: string;
  severity: "error" | "warning";
  line: number;
  column: number;
  source: string;
}

export interface OutputEntry {
  id: string;
  level: "info" | "success" | "warning" | "error";
  text: string;
  timestamp: string;
}

export interface TerminalSession {
  id: string;
  name: string;
  cwd: string;
  shell: string;
  running: boolean;
  buffer: OutputEntry[];
}

export interface GitFileStatus {
  path: string;
  indexStatus: string;
  workTreeStatus: string;
  staged: boolean;
  untracked: boolean;
  deleted: boolean;
  renamed: boolean;
}

export interface GitState {
  branch: string;
  upstream?: string;
  aheadBy: number;
  behindBy: number;
  files: GitFileStatus[];
  remoteUrl?: string;
  selectedDiffPath?: string;
  selectedDiffText?: string;
  commitMessage: string;
  availableBranches: string[];
  loading: boolean;
  lastSyncMessage?: string;
}

export interface GitHubState {
  token: string;
  owner: string;
  repo: string;
  baseBranch: string;
  compareBranch: string;
  prTitle: string;
  prBody: string;
  openPrUrl?: string;
  loading: boolean;
  prs: Array<{ id: number; title: string; url: string; state: string }>;
}

export interface ToastEntry {
  id: string;
  level: "info" | "success" | "warning" | "error";
  message: string;
}

export interface IdeState {
  workspaceRoot?: string;
  tree: FileNode[];
  openTabs: EditorTab[];
  recentlyClosedTabs: EditorTab[];
  activeTabId?: string;
  panelView: PanelView;
  theme: ThemeMode;
  diagnostics: Diagnostic[];
  compilerOutput: OutputEntry[];
  terminalOutput: OutputEntry[];
  compileStatus: CompileStatus;
  cursor: CursorPosition;
  quickOpenVisible: boolean;
  quickOpenQuery: string;
  terminalSessions: TerminalSession[];
  activeTerminalId?: string;
  uzetConsoleInput: string;
  uzetConsoleOutput: OutputEntry[];
  git: GitState;
  github: GitHubState;
  toasts: ToastEntry[];
}
