import React, { createContext, Dispatch, useContext, useMemo, useReducer } from "react";
import { FileNode } from "../../shared/contracts";
import {
  CompileStatus,
  Diagnostic,
  EditorTab,
  GitFileStatus,
  IdeState,
  OutputEntry,
  PanelView,
  TerminalSession,
  ThemeMode,
  ToastEntry
} from "../types/ide";

type IdeAction =
  | { type: "workspace/set"; rootPath: string; tree: FileNode[] }
  | { type: "workspace/clear" }
  | { type: "tabs/open"; tab: EditorTab }
  | { type: "tabs/updateContent"; tabId: string; content: string }
  | { type: "tabs/markSaved"; tabId: string; path?: string; name?: string; extension?: string }
  | { type: "tabs/setActive"; tabId?: string }
  | { type: "tabs/close"; tabId: string }
  | { type: "tabs/closeOthers"; tabId: string }
  | { type: "tabs/closeAll" }
  | { type: "tabs/closeRight"; tabId: string }
  | { type: "tabs/reorder"; fromTabId: string; toTabId: string }
  | { type: "tabs/reopenLastClosed" }
  | { type: "tree/set"; tree: FileNode[] }
  | { type: "panel/set"; panel: PanelView }
  | { type: "theme/toggle" }
  | { type: "theme/set"; theme: ThemeMode }
  | { type: "cursor/set"; line: number; column: number }
  | { type: "diagnostics/set"; diagnostics: Diagnostic[] }
  | { type: "compiler/output"; output: OutputEntry[] }
  | { type: "terminal/output"; output: OutputEntry[] }
  | { type: "compile/status"; status: CompileStatus }
  | { type: "quickOpen/show"; visible: boolean }
  | { type: "quickOpen/query"; query: string }
  | { type: "terminal/sessionsSet"; sessions: TerminalSession[] }
  | { type: "terminal/addSession"; session: TerminalSession }
  | { type: "terminal/setActive"; sessionId?: string }
  | { type: "terminal/append"; sessionId: string; item: OutputEntry }
  | { type: "terminal/clear"; sessionId: string }
  | { type: "terminal/rename"; sessionId: string; name: string }
  | { type: "terminal/markStopped"; sessionId: string }
  | { type: "uzet/input"; value: string }
  | { type: "uzet/output"; output: OutputEntry[] }
  | { type: "git/setLoading"; loading: boolean }
  | {
      type: "git/setState";
      branch: string;
      upstream?: string;
      aheadBy: number;
      behindBy: number;
      files: GitFileStatus[];
      remoteUrl?: string;
    }
  | { type: "git/setBranches"; branches: string[] }
  | { type: "git/selectDiff"; path?: string; text?: string }
  | { type: "git/commitMessage"; message: string }
  | { type: "git/lastSync"; message: string }
  | { type: "github/setToken"; token: string }
  | {
      type: "github/setFields";
      owner?: string;
      repo?: string;
      baseBranch?: string;
      compareBranch?: string;
      prTitle?: string;
      prBody?: string;
    }
  | { type: "github/setLoading"; loading: boolean }
  | { type: "github/setPrs"; prs: Array<{ id: number; title: string; url: string; state: string }> }
  | { type: "github/setOpenPrUrl"; url?: string }
  | { type: "toast/push"; toast: ToastEntry }
  | { type: "toast/remove"; toastId: string };

const initialState: IdeState = {
  tree: [],
  openTabs: [],
  recentlyClosedTabs: [],
  panelView: "compiler",
  theme: "dark",
  diagnostics: [],
  compilerOutput: [],
  terminalOutput: [],
  compileStatus: "idle",
  cursor: {
    line: 1,
    column: 1
  },
  quickOpenVisible: false,
  quickOpenQuery: "",
  terminalSessions: [],
  uzetConsoleInput: "",
  uzetConsoleOutput: [],
  git: {
    branch: "-",
    aheadBy: 0,
    behindBy: 0,
    files: [],
    commitMessage: "",
    availableBranches: [],
    loading: false
  },
  github: {
    token: "",
    owner: "",
    repo: "",
    baseBranch: "main",
    compareBranch: "",
    prTitle: "",
    prBody: "",
    loading: false,
    prs: []
  },
  toasts: []
};

function reorderTabs(tabs: EditorTab[], fromTabId: string, toTabId: string): EditorTab[] {
  const fromIndex = tabs.findIndex((tab) => tab.id === fromTabId);
  const toIndex = tabs.findIndex((tab) => tab.id === toTabId);

  if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
    return tabs;
  }

  const mutable = [...tabs];
  const [moved] = mutable.splice(fromIndex, 1);
  mutable.splice(toIndex, 0, moved as EditorTab);
  return mutable;
}

function reducer(state: IdeState, action: IdeAction): IdeState {
  switch (action.type) {
    case "workspace/set":
      return {
        ...state,
        workspaceRoot: action.rootPath,
        tree: action.tree
      };

    case "workspace/clear":
      return {
        ...initialState,
        theme: state.theme
      };

    case "tree/set":
      return {
        ...state,
        tree: action.tree
      };

    case "tabs/open": {
      const existing = state.openTabs.find((tab) => tab.id === action.tab.id || (tab.path && tab.path === action.tab.path));
      if (existing) {
        return {
          ...state,
          activeTabId: existing.id
        };
      }

      return {
        ...state,
        openTabs: [...state.openTabs, action.tab],
        activeTabId: action.tab.id
      };
    }

    case "tabs/updateContent":
      return {
        ...state,
        openTabs: state.openTabs.map((tab) =>
          tab.id === action.tabId
            ? {
                ...tab,
                content: action.content,
                isDirty: true
              }
            : tab
        )
      };

    case "tabs/markSaved":
      return {
        ...state,
        openTabs: state.openTabs.map((tab) => {
          if (tab.id !== action.tabId) {
            return tab;
          }

          return {
            ...tab,
            isDirty: false,
            isUntitled: false,
            path: action.path ?? tab.path,
            name: action.name ?? tab.name,
            extension: action.extension ?? tab.extension
          };
        })
      };

    case "tabs/setActive":
      return {
        ...state,
        activeTabId: action.tabId
      };

    case "tabs/close": {
      const closing = state.openTabs.find((tab) => tab.id === action.tabId);
      const nextTabs = state.openTabs.filter((tab) => tab.id !== action.tabId);
      const nextActive =
        state.activeTabId === action.tabId
          ? nextTabs.length > 0
            ? nextTabs[nextTabs.length - 1]?.id
            : undefined
          : state.activeTabId;

      return {
        ...state,
        openTabs: nextTabs,
        activeTabId: nextActive,
        recentlyClosedTabs: closing ? [closing, ...state.recentlyClosedTabs].slice(0, 20) : state.recentlyClosedTabs
      };
    }

    case "tabs/closeOthers": {
      const keep = state.openTabs.find((tab) => tab.id === action.tabId);
      if (!keep) {
        return state;
      }

      const recently = state.openTabs.filter((tab) => tab.id !== action.tabId);
      return {
        ...state,
        openTabs: [keep],
        activeTabId: keep.id,
        recentlyClosedTabs: [...recently, ...state.recentlyClosedTabs].slice(0, 20)
      };
    }

    case "tabs/closeAll":
      return {
        ...state,
        openTabs: [],
        activeTabId: undefined,
        recentlyClosedTabs: [...state.openTabs, ...state.recentlyClosedTabs].slice(0, 20)
      };

    case "tabs/closeRight": {
      const pivotIndex = state.openTabs.findIndex((tab) => tab.id === action.tabId);
      if (pivotIndex === -1) {
        return state;
      }

      const toClose = state.openTabs.slice(pivotIndex + 1);
      const keep = state.openTabs.slice(0, pivotIndex + 1);
      const stillExists = keep.some((tab) => tab.id === state.activeTabId);

      return {
        ...state,
        openTabs: keep,
        activeTabId: stillExists ? state.activeTabId : keep[keep.length - 1]?.id,
        recentlyClosedTabs: [...toClose, ...state.recentlyClosedTabs].slice(0, 20)
      };
    }

    case "tabs/reorder":
      return {
        ...state,
        openTabs: reorderTabs(state.openTabs, action.fromTabId, action.toTabId)
      };

    case "tabs/reopenLastClosed": {
      const [nextTab, ...remaining] = state.recentlyClosedTabs;
      if (!nextTab) {
        return state;
      }

      return {
        ...state,
        openTabs: [...state.openTabs, nextTab],
        activeTabId: nextTab.id,
        recentlyClosedTabs: remaining
      };
    }

    case "panel/set":
      return {
        ...state,
        panelView: action.panel
      };

    case "theme/toggle":
      return {
        ...state,
        theme: state.theme === "dark" ? "light" : "dark"
      };

    case "theme/set":
      return {
        ...state,
        theme: action.theme
      };

    case "cursor/set":
      return {
        ...state,
        cursor: {
          line: action.line,
          column: action.column
        }
      };

    case "diagnostics/set":
      return {
        ...state,
        diagnostics: action.diagnostics
      };

    case "compiler/output":
      return {
        ...state,
        compilerOutput: action.output
      };

    case "terminal/output":
      return {
        ...state,
        terminalOutput: action.output
      };

    case "compile/status":
      return {
        ...state,
        compileStatus: action.status
      };

    case "quickOpen/show":
      return {
        ...state,
        quickOpenVisible: action.visible,
        quickOpenQuery: action.visible ? state.quickOpenQuery : ""
      };

    case "quickOpen/query":
      return {
        ...state,
        quickOpenQuery: action.query
      };

    case "terminal/sessionsSet":
      return {
        ...state,
        terminalSessions: action.sessions,
        activeTerminalId: state.activeTerminalId ?? action.sessions[0]?.id
      };

    case "terminal/addSession":
      return {
        ...state,
        terminalSessions: [...state.terminalSessions, action.session],
        activeTerminalId: action.session.id
      };

    case "terminal/setActive":
      return {
        ...state,
        activeTerminalId: action.sessionId
      };

    case "terminal/append":
      return {
        ...state,
        terminalSessions: state.terminalSessions.map((session) =>
          session.id === action.sessionId
            ? {
                ...session,
                buffer: [...session.buffer, action.item].slice(-400)
              }
            : session
        )
      };

    case "terminal/clear":
      return {
        ...state,
        terminalSessions: state.terminalSessions.map((session) =>
          session.id === action.sessionId ? { ...session, buffer: [] } : session
        )
      };

    case "terminal/rename":
      return {
        ...state,
        terminalSessions: state.terminalSessions.map((session) =>
          session.id === action.sessionId ? { ...session, name: action.name } : session
        )
      };

    case "terminal/markStopped":
      return {
        ...state,
        terminalSessions: state.terminalSessions.map((session) =>
          session.id === action.sessionId ? { ...session, running: false } : session
        )
      };

    case "uzet/input":
      return {
        ...state,
        uzetConsoleInput: action.value
      };

    case "uzet/output":
      return {
        ...state,
        uzetConsoleOutput: action.output
      };

    case "git/setLoading":
      return {
        ...state,
        git: {
          ...state.git,
          loading: action.loading
        }
      };

    case "git/setState":
      return {
        ...state,
        git: {
          ...state.git,
          branch: action.branch,
          upstream: action.upstream,
          aheadBy: action.aheadBy,
          behindBy: action.behindBy,
          files: action.files,
          remoteUrl: action.remoteUrl
        }
      };

    case "git/setBranches":
      return {
        ...state,
        git: {
          ...state.git,
          availableBranches: action.branches
        }
      };

    case "git/selectDiff":
      return {
        ...state,
        git: {
          ...state.git,
          selectedDiffPath: action.path,
          selectedDiffText: action.text
        }
      };

    case "git/commitMessage":
      return {
        ...state,
        git: {
          ...state.git,
          commitMessage: action.message
        }
      };

    case "git/lastSync":
      return {
        ...state,
        git: {
          ...state.git,
          lastSyncMessage: action.message
        }
      };

    case "github/setToken":
      return {
        ...state,
        github: {
          ...state.github,
          token: action.token
        }
      };

    case "github/setFields":
      return {
        ...state,
        github: {
          ...state.github,
          owner: action.owner ?? state.github.owner,
          repo: action.repo ?? state.github.repo,
          baseBranch: action.baseBranch ?? state.github.baseBranch,
          compareBranch: action.compareBranch ?? state.github.compareBranch,
          prTitle: action.prTitle ?? state.github.prTitle,
          prBody: action.prBody ?? state.github.prBody
        }
      };

    case "github/setLoading":
      return {
        ...state,
        github: {
          ...state.github,
          loading: action.loading
        }
      };

    case "github/setPrs":
      return {
        ...state,
        github: {
          ...state.github,
          prs: action.prs
        }
      };

    case "github/setOpenPrUrl":
      return {
        ...state,
        github: {
          ...state.github,
          openPrUrl: action.url
        }
      };

    case "toast/push":
      return {
        ...state,
        toasts: [...state.toasts, action.toast]
      };

    case "toast/remove":
      return {
        ...state,
        toasts: state.toasts.filter((toast) => toast.id !== action.toastId)
      };

    default:
      return state;
  }
}

const IdeStateContext = createContext<IdeState | undefined>(undefined);
const IdeDispatchContext = createContext<Dispatch<IdeAction> | undefined>(undefined);

export function IdeProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [state, dispatch] = useReducer(reducer, initialState);
  const memoizedState = useMemo(() => state, [state]);

  return (
    <IdeStateContext.Provider value={memoizedState}>
      <IdeDispatchContext.Provider value={dispatch}>{children}</IdeDispatchContext.Provider>
    </IdeStateContext.Provider>
  );
}

export function useIdeState(): IdeState {
  const context = useContext(IdeStateContext);
  if (!context) {
    throw new Error("useIdeState deve ser usado dentro de IdeProvider.");
  }

  return context;
}

export function useIdeDispatch(): Dispatch<IdeAction> {
  const context = useContext(IdeDispatchContext);
  if (!context) {
    throw new Error("useIdeDispatch deve ser usado dentro de IdeProvider.");
  }

  return context;
}
