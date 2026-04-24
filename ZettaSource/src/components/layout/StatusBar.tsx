import React from "react";
import { compileStatusLabel } from "../../core/theme/themeSystem";
import { CompileStatus, CursorPosition, EditorTab } from "../../types/ide";

interface StatusBarProps {
  activeTab?: EditorTab;
  cursor: CursorPosition;
  compileStatus: CompileStatus;
  gitBranch?: string;
  terminalName?: string;
}

function byteSize(content: string): string {
  const bytes = new TextEncoder().encode(content).length;
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

export function StatusBar({ activeTab, cursor, compileStatus, gitBranch, terminalName }: StatusBarProps): React.ReactElement {
  const extension = activeTab?.extension ?? "";
  const isUzet = [".uz", ".up", ".upz"].includes(extension.toLowerCase());
  const language = isUzet ? "Uzet (Upperzetta)" : extension ? "Plain Text" : "";
  const fileStatus = activeTab
    ? activeTab.isDirty
      ? "modified"
      : "saved"
    : "none";

  return (
    <footer className="status-bar">
      <div className="status-left">
        {language && (
          <span className={`status-item status-lang${isUzet ? " uzet" : ""}`}>
            {isUzet && (
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ marginRight: 4 }}>
                <rect x="0.5" y="0.5" width="9" height="9" rx="2" fill="var(--brand-1)" opacity="0.3" stroke="var(--brand-1)" strokeWidth="0.8" />
                <path d="M2 3h6v1.5L3.5 7H8v1.5H2V7l4.5-2.5H2V3Z" fill="var(--brand-1)" />
              </svg>
            )}
            {language}
          </span>
        )}

        {extension && (
          <span className="status-item status-ext">{extension}</span>
        )}

        {activeTab && (
          <span className={`status-item status-file-status ${fileStatus}`}>
            {fileStatus === "modified" ? (
              <>
                <span className="status-dot modified" />
                Modificado
              </>
            ) : (
              <>
                <span className="status-dot saved" />
                Salvo
              </>
            )}
          </span>
        )}

        {activeTab?.content && (
          <span className="status-item status-size">
            {byteSize(activeTab.content)}
          </span>
        )}

        {gitBranch ? <span className="status-item">Git: {gitBranch}</span> : null}
        {terminalName ? <span className="status-item">Terminal: {terminalName}</span> : null}
      </div>

      <div className="status-right">
        {activeTab && (
          <span className="status-item status-cursor">
            Ln {cursor.line}, Col {cursor.column}
          </span>
        )}

        <span className="status-item status-encoding">UTF-8</span>
        <span className="status-item status-eol">LF</span>

        <span className={`status-item status-compile ${compileStatus}`}>
          {compileStatus === "compiling" || compileStatus === "running" ? (
            <span className="status-spinner" />
          ) : null}
          {compileStatusLabel(compileStatus)}
        </span>
      </div>
    </footer>
  );
}
