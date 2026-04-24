import React from "react";
import { IconDiagnostics, IconGit, IconOutput, IconTerminal } from "../../assets/icons";
import { Diagnostic, GitState, GitHubState, OutputEntry, PanelView, TerminalSession } from "../../types/ide";
import { GitPanel } from "./GitPanel";
import { TerminalPanel } from "./TerminalPanel";

interface BottomPanelProps {
  panelView: PanelView;
  diagnostics: Diagnostic[];
  compilerOutput: OutputEntry[];
  terminalOutput: OutputEntry[];
  terminalSessions: TerminalSession[];
  activeTerminalId?: string;
  uzetConsoleOutput: OutputEntry[];
  git: GitState;
  github: GitHubState;
  onChangePanel: (panel: PanelView) => void;
  onTerminalSetActive: (sessionId: string) => void;
  onTerminalCreateSession: () => void;
  onTerminalRunCommand: (sessionId: string, command: string) => void;
  onTerminalStopSession: (sessionId: string) => void;
  onTerminalClearSession: (sessionId: string) => void;
  onUzetConsoleRun: (command: string) => void;
  onUzetConsoleClear: () => void;
  onGitRefresh: () => void;
  onGitStage: (path: string) => void;
  onGitUnstage: (path: string) => void;
  onGitDiff: (path: string) => void;
  onGitCommitMessage: (value: string) => void;
  onGitCommit: () => void;
  onGitPull: () => void;
  onGitPush: () => void;
  onGitCheckoutBranch: (branch: string) => void;
  onGithubTokenChange: (token: string) => void;
  onGithubFieldChange: (field: "owner" | "repo" | "baseBranch" | "compareBranch" | "prTitle" | "prBody", value: string) => void;
  onGithubCreatePr: () => void;
  onGithubListPrs: () => void;
  onOpenExternal: (url: string) => void;
}

export function BottomPanel(props: BottomPanelProps): React.ReactElement {
  const errorCount = props.diagnostics.filter((item) => item.severity === "error").length;
  const warningCount = props.diagnostics.filter((item) => item.severity === "warning").length;

  return (
    <section className="bottom-panel">
      <div className="panel-tabs">
        <button
          className={props.panelView === "terminal" ? "panel-tab active" : "panel-tab"}
          onClick={() => props.onChangePanel("terminal")}
        >
          <IconTerminal size={13} /> Terminal
        </button>

        <button
          className={props.panelView === "compiler" ? "panel-tab active" : "panel-tab"}
          onClick={() => props.onChangePanel("compiler")}
        >
          <IconOutput size={13} /> Compiler Output
        </button>

        <button
          className={props.panelView === "diagnostics" ? "panel-tab active" : "panel-tab"}
          onClick={() => props.onChangePanel("diagnostics")}
        >
          <IconDiagnostics size={13} /> Diagnostics
          <span className="panel-badge error">{errorCount}</span>
          <span className="panel-badge warning">{warningCount}</span>
        </button>

        <button
          className={props.panelView === "git" ? "panel-tab active" : "panel-tab"}
          onClick={() => props.onChangePanel("git")}
        >
          <IconGit size={13} /> Git
          <span className="panel-badge warning">{props.git.files.length}</span>
        </button>
      </div>

      <div className="panel-content">
        {props.panelView === "terminal" ? (
          <TerminalPanel
            sessions={props.terminalSessions}
            activeSessionId={props.activeTerminalId}
            uzetConsoleOutput={props.uzetConsoleOutput}
            onSetActive={props.onTerminalSetActive}
            onCreateSession={props.onTerminalCreateSession}
            onRunCommand={props.onTerminalRunCommand}
            onStopSession={props.onTerminalStopSession}
            onClearSession={props.onTerminalClearSession}
            onRunUzetConsole={props.onUzetConsoleRun}
            onClearUzetConsole={props.onUzetConsoleClear}
          />
        ) : null}

        {props.panelView === "compiler" ? <OutputList items={props.compilerOutput} /> : null}
        {props.panelView === "diagnostics" ? <DiagnosticsList diagnostics={props.diagnostics} /> : null}
        {props.panelView === "git" ? (
          <GitPanel
            git={props.git}
            github={props.github}
            onRefresh={props.onGitRefresh}
            onStage={props.onGitStage}
            onUnstage={props.onGitUnstage}
            onSelectDiff={props.onGitDiff}
            onCommitMessage={props.onGitCommitMessage}
            onCommit={props.onGitCommit}
            onPull={props.onGitPull}
            onPush={props.onGitPush}
            onCheckoutBranch={props.onGitCheckoutBranch}
            onTokenChange={props.onGithubTokenChange}
            onGithubFieldChange={props.onGithubFieldChange}
            onCreatePr={props.onGithubCreatePr}
            onListPrs={props.onGithubListPrs}
            onOpenRemote={() => props.onOpenExternal(props.git.remoteUrl || "")}
            onOpenPr={props.onOpenExternal}
          />
        ) : null}
      </div>
    </section>
  );
}

function OutputList({ items }: { items: OutputEntry[] }): React.ReactElement {
  if (items.length === 0) {
    return <div className="panel-empty">Sem mensagens ainda.</div>;
  }

  return (
    <div className="output-list">
      {items.map((item) => (
        <div key={item.id} className={`output-item ${item.level}`}>
          <span className="output-time">[{item.timestamp}]</span>
          <span className="output-text">{item.text}</span>
        </div>
      ))}
    </div>
  );
}

function DiagnosticsList({ diagnostics }: { diagnostics: Diagnostic[] }): React.ReactElement {
  if (diagnostics.length === 0) {
    return <div className="panel-empty">Nenhum erro encontrado.</div>;
  }

  return (
    <div className="diagnostics-list">
      {diagnostics.map((diagnostic) => (
        <div key={diagnostic.id} className={`diagnostic-item ${diagnostic.severity}`}>
          <span className="diagnostic-severity">{diagnostic.severity.toUpperCase()}</span>
          <span className="diagnostic-message">{diagnostic.message}</span>
          <span className="diagnostic-location">
            Ln {diagnostic.line}, Col {diagnostic.column}
          </span>
        </div>
      ))}
    </div>
  );
}
