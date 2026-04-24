import {
  CreateFilePayload,
  FileReadResult,
  GitBranchCheckoutPayload,
  GitBranchesResult,
  GitCommitPayload,
  GitDiffPayload,
  GitPathsPayload,
  GitStatusResult,
  SaveFilePayload,
  TerminalDataEvent,
  TerminalSessionCreatePayload,
  TerminalSessionInfo,
  TerminalSignalPayload,
  TerminalWritePayload,
  WorkspaceData
} from "../../shared/contracts";

declare global {
  interface Window {
    zettaApi: {
      openFolderDialog: () => Promise<string | null>;
      readWorkspace: (rootPath: string) => Promise<WorkspaceData>;
      loadExampleWorkspace: () => Promise<WorkspaceData>;
      readFile: (filePath: string) => Promise<FileReadResult>;
      saveFile: (payload: SaveFilePayload) => Promise<boolean>;
      createFile: (payload: CreateFilePayload) => Promise<string>;

      createTerminalSession: (payload: TerminalSessionCreatePayload) => Promise<TerminalSessionInfo>;
      listTerminalSessions: () => Promise<TerminalSessionInfo[]>;
      writeTerminal: (payload: TerminalWritePayload) => Promise<boolean>;
      killTerminalSession: (payload: TerminalSignalPayload) => Promise<boolean>;
      onTerminalData: (handler: (event: TerminalDataEvent) => void) => () => void;

      gitStatus: (cwd: string) => Promise<GitStatusResult>;
      gitStage: (payload: GitPathsPayload) => Promise<boolean>;
      gitUnstage: (payload: GitPathsPayload) => Promise<boolean>;
      gitCommit: (payload: GitCommitPayload) => Promise<boolean>;
      gitPull: (cwd: string) => Promise<string>;
      gitPush: (cwd: string) => Promise<string>;
      gitBranches: (cwd: string) => Promise<GitBranchesResult>;
      gitCheckout: (payload: GitBranchCheckoutPayload) => Promise<boolean>;
      gitDiff: (payload: GitDiffPayload) => Promise<string>;
      gitRemote: (cwd: string) => Promise<string>;

      openExternal: (url: string) => Promise<boolean>;
    };
  }
}

export {};
