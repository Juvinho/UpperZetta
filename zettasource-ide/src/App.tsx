import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { FileNode, WorkspaceData } from "../shared/contracts";
import { MonacoEditorPane } from "./components/editor/MonacoEditorPane";
import { SidebarExplorer } from "./components/explorer/SidebarExplorer";
import { ToastStack } from "./components/layout/ToastStack";
import { EditorTabs } from "./components/layout/EditorTabs";
import { StatusBar } from "./components/layout/StatusBar";
import { TopBar } from "./components/layout/TopBar";
import { BottomPanel } from "./components/panel/BottomPanel";
import { QuickOpenModal } from "./components/quickopen/QuickOpenModal";
import { WelcomeScreen } from "./components/welcome/WelcomeScreen";
import { compileTab, runTab } from "./core/compiler/compilerService";
import {
  checkoutBranch,
  commitChanges,
  getBranches,
  getDiff,
  getGitStatus,
  getRemote,
  pullChanges,
  pushChanges,
  stageFiles,
  unstageFiles
} from "./core/git/gitService";
import { createPullRequest, listOpenPullRequests, parseGitHubRemote } from "./core/github/githubService";
import {
  createWorkspaceFile,
  flattenFiles,
  isEditableFile,
  loadExampleWorkspace,
  openWorkspaceDialog,
  readWorkspaceFile,
  saveWorkspaceFile
} from "./core/filesystem/workspaceService";
import { createTerminal, killTerminal, subscribeTerminalData, toOutputEntry, writeTerminal } from "./core/terminal/terminalService";
import { applyTheme } from "./core/theme/themeSystem";
import { runUzetConsoleCommand } from "./core/uzet/uzetConsole";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useIdeDispatch, useIdeState } from "./state/ideStore";
import { EditorTab, OutputEntry } from "./types/ide";

const UNTITLED_TEMPLATE = [
  "component App:",
  "  const title: String = \"Hello from ZettaSource\"",
  "",
  "  fun run():",
  "    print(title)",
  ""
].join("\n");

function makeOutput(level: OutputEntry["level"], text: string): OutputEntry {
  const now = new Date();
  return {
    id: `${level}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    level,
    text,
    timestamp: now.toLocaleTimeString()
  };
}

function extensionOf(fileName: string): string {
  const dotIndex = fileName.lastIndexOf(".");
  if (dotIndex === -1) {
    return "";
  }

  return fileName.slice(dotIndex).toLowerCase();
}

function uniqueUntitledName(existingNames: string[], base = "untitled", extension = ".upz"): string {
  const used = new Set(existingNames.map((name) => name.toLowerCase()));
  let index = 1;
  while (used.has(`${base}-${index}${extension}`.toLowerCase())) {
    index += 1;
  }

  return `${base}-${index}${extension}`;
}

function makeToast(level: "info" | "success" | "warning" | "error", message: string) {
  return {
    id: `toast-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    level,
    message
  };
}

export default function App(): React.ReactElement {
  const state = useIdeState();
  const dispatch = useIdeDispatch();
  const untitledCounter = useRef(1);

  const activeTab = useMemo(
    () => state.openTabs.find((tab) => tab.id === state.activeTabId),
    [state.openTabs, state.activeTabId]
  );

  const activeTerminalSession = useMemo(
    () => state.terminalSessions.find((session) => session.id === state.activeTerminalId),
    [state.terminalSessions, state.activeTerminalId]
  );

  const allFiles = useMemo(() => flattenFiles(state.tree), [state.tree]);
  const editableFiles = useMemo(() => allFiles.filter((node) => isEditableFile(node)), [allFiles]);

  const activeDiagnostics = useMemo(() => {
    if (!activeTab) {
      return [];
    }

    return state.diagnostics.filter((diagnostic) => {
      if (!diagnostic.filePath) {
        return true;
      }

      if (activeTab.path && diagnostic.filePath === activeTab.path) {
        return true;
      }

      return diagnostic.filePath === activeTab.name;
    });
  }, [activeTab, state.diagnostics]);

  useEffect(() => {
    applyTheme(state.theme);
  }, [state.theme]);

  useEffect(() => {
    const unsubscribe = subscribeTerminalData((event) => {
      const output = toOutputEntry(event);
      dispatch({ type: "terminal/append", sessionId: event.sessionId, item: output });
      if (event.stream === "system" && event.chunk.includes("process exited")) {
        dispatch({ type: "terminal/markStopped", sessionId: event.sessionId });
      }
    });

    return () => unsubscribe();
  }, [dispatch]);

  const pushToast = useCallback(
    (level: "info" | "success" | "warning" | "error", message: string) => {
      dispatch({ type: "toast/push", toast: makeToast(level, message) });
    },
    [dispatch]
  );

  const ensureTerminal = useCallback(
    async (cwd?: string) => {
      if (state.terminalSessions.length > 0) {
        return;
      }

      const session = await createTerminal(cwd, "Main");
      dispatch({ type: "terminal/addSession", session });
    },
    [dispatch, state.terminalSessions.length]
  );

  const refreshGitForPath = useCallback(
    async (workspacePath: string) => {
      dispatch({ type: "git/setLoading", loading: true });
      try {
        const [status, branches, remote] = await Promise.all([
          getGitStatus(workspacePath),
          getBranches(workspacePath),
          getRemote(workspacePath)
        ]);

        dispatch({
          type: "git/setState",
          branch: status.branch,
          upstream: status.upstream,
          aheadBy: status.aheadBy,
          behindBy: status.behindBy,
          files: status.entries,
          remoteUrl: remote
        });
        dispatch({ type: "git/setBranches", branches: branches.branches.map((item) => item.name) });

        if (!state.github.owner || !state.github.repo) {
          const parsed = parseGitHubRemote(remote);
          if (parsed) {
            dispatch({ type: "github/setFields", owner: parsed.owner, repo: parsed.repo, compareBranch: status.branch });
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Falha ao carregar status Git.";
        pushToast("warning", message);
      } finally {
        dispatch({ type: "git/setLoading", loading: false });
      }
    },
    [dispatch, pushToast, state.github.owner, state.github.repo]
  );

  const refreshGit = useCallback(async () => {
    if (!state.workspaceRoot) {
      return;
    }
    await refreshGitForPath(state.workspaceRoot);
  }, [refreshGitForPath, state.workspaceRoot]);

  const updateGitHubField = useCallback(
    (field: "owner" | "repo" | "baseBranch" | "compareBranch" | "prTitle" | "prBody", value: string) => {
      switch (field) {
        case "owner":
          dispatch({ type: "github/setFields", owner: value });
          return;
        case "repo":
          dispatch({ type: "github/setFields", repo: value });
          return;
        case "baseBranch":
          dispatch({ type: "github/setFields", baseBranch: value });
          return;
        case "compareBranch":
          dispatch({ type: "github/setFields", compareBranch: value });
          return;
        case "prTitle":
          dispatch({ type: "github/setFields", prTitle: value });
          return;
        case "prBody":
          dispatch({ type: "github/setFields", prBody: value });
          return;
      }
    },
    [dispatch]
  );

  const readAndOpenFile = useCallback(
    async (node: FileNode) => {
      if (node.type !== "file") {
        return;
      }

      const existing = state.openTabs.find((tab) => tab.path === node.path);
      if (existing) {
        dispatch({ type: "tabs/setActive", tabId: existing.id });
        return;
      }

      try {
        const file = await readWorkspaceFile(node.path);
        dispatch({
          type: "tabs/open",
          tab: {
            id: node.path,
            name: node.name,
            path: node.path,
            extension: node.extension ?? extensionOf(node.name),
            content: file.content,
            isDirty: false,
            isUntitled: false
          }
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Falha ao abrir arquivo.";
        dispatch({
          type: "compiler/output",
          output: [...state.compilerOutput, makeOutput("error", message)]
        });
        dispatch({ type: "panel/set", panel: "compiler" });
      }
    },
    [dispatch, state.compilerOutput, state.openTabs]
  );

  const applyWorkspace = useCallback(
    async (workspace: WorkspaceData) => {
      dispatch({ type: "workspace/set", rootPath: workspace.rootPath, tree: workspace.nodes });
      dispatch({ type: "compiler/output", output: [makeOutput("info", `Workspace carregado: ${workspace.rootPath}`)] });
      dispatch({ type: "terminal/output", output: [] });
      dispatch({ type: "diagnostics/set", diagnostics: [] });
      dispatch({ type: "compile/status", status: "idle" });
      dispatch({ type: "tabs/setActive", tabId: undefined });

      await ensureTerminal(workspace.rootPath);
      await refreshGitForPath(workspace.rootPath);

      const preferred = flattenFiles(workspace.nodes).find(
        (file) => file.type === "file" && [".uz", ".up", ".upz"].includes((file.extension ?? "").toLowerCase())
      );

      if (preferred) {
        await readAndOpenFile(preferred);
      }
    },
    [dispatch, ensureTerminal, readAndOpenFile, refreshGitForPath]
  );

  const handleOpenFolder = useCallback(async () => {
    const workspace = await openWorkspaceDialog();
    if (workspace) {
      await applyWorkspace(workspace);
      pushToast("success", "Workspace aberto.");
    }
  }, [applyWorkspace, pushToast]);

  const handleLoadExamples = useCallback(async () => {
    const workspace = await loadExampleWorkspace();
    await applyWorkspace(workspace);
    pushToast("info", "Exemplos carregados.");
  }, [applyWorkspace, pushToast]);

  const handleNewFile = useCallback(() => {
    const name = `untitled-${untitledCounter.current}.upz`;
    untitledCounter.current += 1;

    dispatch({
      type: "tabs/open",
      tab: {
        id: `untitled:${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
        name,
        extension: ".upz",
        content: UNTITLED_TEMPLATE,
        isDirty: true,
        isUntitled: true
      }
    });
  }, [dispatch]);

  const handleSave = useCallback(async () => {
    if (!activeTab) {
      return;
    }

    try {
      if (activeTab.path) {
        await saveWorkspaceFile(activeTab.path, activeTab.content);
        dispatch({ type: "tabs/markSaved", tabId: activeTab.id });
        dispatch({
          type: "terminal/output",
          output: [...state.terminalOutput, makeOutput("success", `Arquivo salvo: ${activeTab.name}`)]
        });
        dispatch({ type: "panel/set", panel: "terminal" });
        await refreshGit();
        return;
      }

      if (!state.workspaceRoot) {
        dispatch({
          type: "terminal/output",
          output: [
            ...state.terminalOutput,
            makeOutput("warning", "Abra uma pasta antes de salvar arquivos novos.")
          ]
        });
        dispatch({ type: "panel/set", panel: "terminal" });
        return;
      }

      const candidate = uniqueUntitledName(allFiles.map((file) => file.name), "file", ".upz");
      const savedPath = await createWorkspaceFile(state.workspaceRoot, candidate, activeTab.content);
      const refreshed = await window.zettaApi.readWorkspace(state.workspaceRoot);

      dispatch({ type: "tree/set", tree: refreshed.nodes });
      dispatch({
        type: "tabs/markSaved",
        tabId: activeTab.id,
        path: savedPath,
        name: candidate,
        extension: extensionOf(candidate)
      });
      dispatch({
        type: "terminal/output",
        output: [...state.terminalOutput, makeOutput("success", `Arquivo criado: ${candidate}`)]
      });
      dispatch({ type: "panel/set", panel: "terminal" });
      await refreshGit();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao salvar arquivo.";
      dispatch({
        type: "terminal/output",
        output: [...state.terminalOutput, makeOutput("error", message)]
      });
      dispatch({ type: "panel/set", panel: "terminal" });
      pushToast("error", message);
    }
  }, [activeTab, allFiles, dispatch, pushToast, refreshGit, state.terminalOutput, state.workspaceRoot]);

  const handleCompile = useCallback(() => {
    if (!activeTab) {
      dispatch({
        type: "compiler/output",
        output: [...state.compilerOutput, makeOutput("warning", "Nenhum arquivo ativo para compilar.")]
      });
      dispatch({ type: "panel/set", panel: "compiler" });
      return;
    }

    dispatch({ type: "compile/status", status: "compiling" });
    const result = compileTab(activeTab);

    dispatch({ type: "diagnostics/set", diagnostics: result.diagnostics });
    dispatch({ type: "compiler/output", output: [...state.compilerOutput, ...result.output] });
    dispatch({ type: "panel/set", panel: "compiler" });
    dispatch({ type: "compile/status", status: result.hasErrors ? "error" : "success" });
  }, [activeTab, dispatch, state.compilerOutput]);

  const handleRun = useCallback(() => {
    if (!activeTab) {
      dispatch({
        type: "terminal/output",
        output: [...state.terminalOutput, makeOutput("warning", "Nenhum arquivo ativo para executar.")]
      });
      dispatch({ type: "panel/set", panel: "terminal" });
      return;
    }

    dispatch({ type: "compile/status", status: "running" });
    const result = runTab(activeTab);
    dispatch({ type: "diagnostics/set", diagnostics: result.diagnostics });
    dispatch({ type: "terminal/output", output: [...state.terminalOutput, ...result.output] });
    dispatch({ type: "panel/set", panel: "terminal" });
    dispatch({ type: "compile/status", status: result.hasErrors ? "error" : "success" });
  }, [activeTab, dispatch, state.terminalOutput]);

  const openByPath = useCallback(
    async (path: string) => {
      const node = editableFiles.find((file) => file.path === path);
      if (node) {
        await readAndOpenFile(node);
      }
      dispatch({ type: "quickOpen/show", visible: false });
    },
    [dispatch, editableFiles, readAndOpenFile]
  );

  const handleCreateTerminalSession = useCallback(async () => {
    const session = await createTerminal(state.workspaceRoot, undefined);
    dispatch({ type: "terminal/addSession", session });
    dispatch({ type: "panel/set", panel: "terminal" });
  }, [dispatch, state.workspaceRoot]);

  const handleTerminalRunCommand = useCallback(
    async (sessionId: string, command: string) => {
      const ok = await writeTerminal(sessionId, command);
      if (!ok) {
        pushToast("error", "Nao foi possivel escrever no terminal.");
      }
    },
    [pushToast]
  );

  const handleTerminalStop = useCallback(
    async (sessionId: string) => {
      await killTerminal(sessionId);
      dispatch({ type: "terminal/markStopped", sessionId });
    },
    [dispatch]
  );

  const runConsole = useCallback(
    (input: string) => {
      const entries = runUzetConsoleCommand(input);
      dispatch({ type: "uzet/output", output: [...state.uzetConsoleOutput, ...entries] });
      dispatch({ type: "panel/set", panel: "terminal" });
    },
    [dispatch, state.uzetConsoleOutput]
  );

  const performGitCommit = useCallback(async () => {
    if (!state.workspaceRoot) {
      return;
    }

    if (!state.git.commitMessage.trim()) {
      pushToast("warning", "Digite uma mensagem de commit.");
      return;
    }

    try {
      await commitChanges(state.workspaceRoot, state.git.commitMessage.trim());
      dispatch({ type: "git/commitMessage", message: "" });
      pushToast("success", "Commit criado com sucesso.");
      await refreshGit();
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : "Commit falhou.");
    }
  }, [dispatch, pushToast, refreshGit, state.git.commitMessage, state.workspaceRoot]);

  useKeyboardShortcuts({
    onSave: handleSave,
    onQuickOpen: () => dispatch({ type: "quickOpen/show", visible: true }),
    onCompile: handleCompile,
    onRun: handleRun,
    onNewFile: handleNewFile,
    onOpenFolder: handleOpenFolder,
    onCloseTab: () => {
      if (state.activeTabId) {
        dispatch({ type: "tabs/close", tabId: state.activeTabId });
      }
    },
    onReopenTab: () => dispatch({ type: "tabs/reopenLastClosed" }),
      onToggleTerminal: () => dispatch({ type: "panel/set", panel: state.panelView === "terminal" ? "compiler" : "terminal" }),
      onNewTerminal: () => {
        void handleCreateTerminalSession();
      },
    onOpenGit: () => dispatch({ type: "panel/set", panel: "git" })
  });

  return (
    <div className="app-shell">
      <TopBar
        theme={state.theme}
        compileStatus={state.compileStatus}
        activeFileName={activeTab?.name}
        onNewFile={handleNewFile}
        onOpenFolder={handleOpenFolder}
        onSave={handleSave}
        onCompile={handleCompile}
        onRun={handleRun}
        onLoadExamples={handleLoadExamples}
        onOpenTerminalPanel={() => dispatch({ type: "panel/set", panel: "terminal" })}
        onOpenGitPanel={() => {
          dispatch({ type: "panel/set", panel: "git" });
          void refreshGit();
        }}
        onToggleTheme={() => dispatch({ type: "theme/toggle" })}
      />

      <div className="workbench-grid">
        <SidebarExplorer
          workspaceRoot={state.workspaceRoot}
          nodes={state.tree}
          activeFilePath={activeTab?.path}
          onOpenFile={readAndOpenFile}
          onNewFile={handleNewFile}
        />

        <section className="editor-section">
          <EditorTabs
            tabs={state.openTabs}
            activeTabId={state.activeTabId}
            onSelect={(tabId) => dispatch({ type: "tabs/setActive", tabId })}
            onClose={(tabId) => dispatch({ type: "tabs/close", tabId })}
            onCloseOthers={(tabId) => dispatch({ type: "tabs/closeOthers", tabId })}
            onCloseAll={() => dispatch({ type: "tabs/closeAll" })}
            onCloseRight={(tabId) => dispatch({ type: "tabs/closeRight", tabId })}
            onReorder={(fromTabId, toTabId) => dispatch({ type: "tabs/reorder", fromTabId, toTabId })}
          />

          <div className="editor-host">
            {activeTab ? (
              <MonacoEditorPane
                tab={activeTab}
                diagnostics={activeDiagnostics}
                theme={state.theme}
                onChange={(content) => dispatch({ type: "tabs/updateContent", tabId: activeTab.id, content })}
                onCursorChange={(line, column) => dispatch({ type: "cursor/set", line, column })}
              />
            ) : (
              <WelcomeScreen
                onOpenFolder={handleOpenFolder}
                onNewFile={handleNewFile}
                onLoadExamples={handleLoadExamples}
              />
            )}
          </div>

          <BottomPanel
            panelView={state.panelView}
            diagnostics={state.diagnostics}
            compilerOutput={state.compilerOutput}
            terminalOutput={state.terminalOutput}
            terminalSessions={state.terminalSessions}
            activeTerminalId={state.activeTerminalId}
            uzetConsoleOutput={state.uzetConsoleOutput}
            git={state.git}
            github={state.github}
            onChangePanel={(panel) => dispatch({ type: "panel/set", panel })}
            onTerminalSetActive={(sessionId) => dispatch({ type: "terminal/setActive", sessionId })}
            onTerminalCreateSession={() => {
              void handleCreateTerminalSession();
            }}
            onTerminalRunCommand={(sessionId, command) => {
              void handleTerminalRunCommand(sessionId, command);
            }}
            onTerminalStopSession={(sessionId) => {
              void handleTerminalStop(sessionId);
            }}
            onTerminalClearSession={(sessionId) => dispatch({ type: "terminal/clear", sessionId })}
            onUzetConsoleRun={runConsole}
            onUzetConsoleClear={() => dispatch({ type: "uzet/output", output: [] })}
            onGitRefresh={() => {
              void refreshGit();
            }}
            onGitStage={(path) => {
              if (!state.workspaceRoot) return;
              void stageFiles(state.workspaceRoot, [path]).then(() => refreshGit());
            }}
            onGitUnstage={(path) => {
              if (!state.workspaceRoot) return;
              void unstageFiles(state.workspaceRoot, [path]).then(() => refreshGit());
            }}
            onGitDiff={(path) => {
              if (!state.workspaceRoot) return;
              void getDiff(state.workspaceRoot, path).then((text) =>
                dispatch({ type: "git/selectDiff", path, text: text || "(sem diff textual)" })
              );
            }}
            onGitCommitMessage={(value) => dispatch({ type: "git/commitMessage", message: value })}
            onGitCommit={() => {
              void performGitCommit();
            }}
            onGitPull={() => {
              if (!state.workspaceRoot) return;
              void pullChanges(state.workspaceRoot).then((message) => {
                dispatch({ type: "git/lastSync", message: message || "pull concluido" });
                void refreshGit();
              });
            }}
            onGitPush={() => {
              if (!state.workspaceRoot) return;
              void pushChanges(state.workspaceRoot).then((message) => {
                dispatch({ type: "git/lastSync", message: message || "push concluido" });
                void refreshGit();
              });
            }}
            onGitCheckoutBranch={(branch) => {
              if (!state.workspaceRoot) return;
              void checkoutBranch(state.workspaceRoot, branch).then(() => refreshGit());
            }}
            onGithubTokenChange={(token) => dispatch({ type: "github/setToken", token })}
            onGithubFieldChange={updateGitHubField}
            onGithubCreatePr={() => {
              if (!state.github.token || !state.github.owner || !state.github.repo) {
                pushToast("warning", "Preencha token, owner e repo para criar PR.");
                return;
              }

              dispatch({ type: "github/setLoading", loading: true });
              void createPullRequest({
                token: state.github.token,
                owner: state.github.owner,
                repo: state.github.repo,
                base: state.github.baseBranch,
                head: state.github.compareBranch || state.git.branch,
                title: state.github.prTitle || `PR ${state.git.branch}`,
                body: state.github.prBody
              })
                .then((result) => {
                  dispatch({ type: "github/setOpenPrUrl", url: result.url });
                  pushToast("success", "Pull Request criada com sucesso.");
                })
                .catch((error) => {
                  pushToast("error", error instanceof Error ? error.message : "Falha ao criar PR.");
                })
                .finally(() => {
                  dispatch({ type: "github/setLoading", loading: false });
                });
            }}
            onGithubListPrs={() => {
              if (!state.github.token || !state.github.owner || !state.github.repo) {
                pushToast("warning", "Preencha token, owner e repo para listar PRs.");
                return;
              }

              dispatch({ type: "github/setLoading", loading: true });
              void listOpenPullRequests(state.github.token, state.github.owner, state.github.repo)
                .then((prs) => dispatch({ type: "github/setPrs", prs }))
                .catch((error) => pushToast("error", error instanceof Error ? error.message : "Falha ao listar PRs."))
                .finally(() => dispatch({ type: "github/setLoading", loading: false }));
            }}
            onOpenExternal={(url) => {
              if (!url) {
                return;
              }
              void window.zettaApi.openExternal(url);
            }}
          />
        </section>
      </div>

      <StatusBar
        activeTab={activeTab}
        cursor={state.cursor}
        compileStatus={state.compileStatus}
        gitBranch={state.git.branch}
        terminalName={activeTerminalSession?.name}
      />

      <QuickOpenModal
        visible={state.quickOpenVisible}
        query={state.quickOpenQuery}
        files={editableFiles}
        onClose={() => dispatch({ type: "quickOpen/show", visible: false })}
        onQueryChange={(query) => dispatch({ type: "quickOpen/query", query })}
        onSelect={openByPath}
      />

      <ToastStack toasts={state.toasts} onDismiss={(id) => dispatch({ type: "toast/remove", toastId: id })} />
    </div>
  );
}
