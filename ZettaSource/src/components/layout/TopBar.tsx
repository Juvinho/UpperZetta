import React from "react";
import { ZettaLogo } from "../../assets/logo";
import {
  IconCompile,
  IconExamples,
  IconGit,
  IconMoon,
  IconNewFile,
  IconOpenFolder,
  IconTerminal,
  IconRun,
  IconSave,
  IconSun
} from "../../assets/icons";
import { CompileStatus, ThemeMode } from "../../types/ide";

interface TopBarProps {
  theme: ThemeMode;
  compileStatus: CompileStatus;
  activeFileName?: string;
  onNewFile: () => void;
  onOpenFolder: () => void;
  onSave: () => void;
  onCompile: () => void;
  onRun: () => void;
  onToggleTheme: () => void;
  onLoadExamples: () => void;
  onOpenTerminalPanel: () => void;
  onOpenGitPanel: () => void;
}

interface ActionButtonProps {
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
  variant?: "default" | "emphasis" | "run";
  onClick: () => void;
  disabled?: boolean;
}

function ActionButton({ icon, label, shortcut, variant = "default", onClick, disabled }: ActionButtonProps): React.ReactElement {
  return (
    <button
      className={`action-button ${variant !== "default" ? variant : ""}`}
      onClick={onClick}
      disabled={disabled}
      title={shortcut ? `${label} (${shortcut})` : label}
    >
      <span className="action-icon">{icon}</span>
      <span className="action-label">{label}</span>
      {shortcut && <span className="action-shortcut">{shortcut}</span>}
    </button>
  );
}

export function TopBar(props: TopBarProps): React.ReactElement {
  const isBuilding = props.compileStatus === "compiling" || props.compileStatus === "running";

  return (
    <header className="topbar">
      <div className="brand-area">
        <ZettaLogo compact />
        <div className="brand-copy">
          <strong>ZettaSource</strong>
          <span>Upperzetta IDE</span>
        </div>
      </div>

      <div className="topbar-actions">
        <div className="action-group">
          <ActionButton icon={<IconNewFile size={14} />} label="Novo" shortcut="Ctrl+N" onClick={props.onNewFile} />
          <ActionButton icon={<IconOpenFolder size={14} />} label="Abrir" shortcut="Ctrl+O" onClick={props.onOpenFolder} />
          <ActionButton icon={<IconSave size={14} />} label="Salvar" shortcut="Ctrl+S" onClick={props.onSave} />
          <ActionButton icon={<IconExamples size={14} />} label="Exemplos" onClick={props.onLoadExamples} />
        </div>

        <div className="action-divider" />

        <div className="action-group">
          <ActionButton
            icon={<IconCompile size={14} />}
            label="Compilar"
            shortcut="Ctrl+B"
            variant="emphasis"
            onClick={props.onCompile}
            disabled={isBuilding}
          />
          <ActionButton
            icon={<IconRun size={14} />}
            label="Executar"
            shortcut="Ctrl+Enter"
            variant="run"
            onClick={props.onRun}
            disabled={isBuilding}
          />
        </div>

        <div className="action-divider" />

        <div className="action-group">
          <ActionButton icon={<IconTerminal size={14} />} label="Terminal" shortcut="Ctrl+`" onClick={props.onOpenTerminalPanel} />
          <ActionButton icon={<IconGit size={14} />} label="Git" shortcut="Ctrl+Shift+G" onClick={props.onOpenGitPanel} />
        </div>
      </div>

      <div className="topbar-context">
        <CompileStatusPill status={props.compileStatus} />

        {props.activeFileName && (
          <span className="active-file-label" title={props.activeFileName}>
            {props.activeFileName}
          </span>
        )}

        <button
          className="theme-toggle"
          onClick={props.onToggleTheme}
          title={props.theme === "dark" ? "Mudar para tema claro" : "Mudar para tema escuro"}
        >
          {props.theme === "dark" ? <IconSun size={14} /> : <IconMoon size={14} />}
        </button>
      </div>
    </header>
  );
}

function CompileStatusPill({ status }: { status: CompileStatus }): React.ReactElement {
  const labels: Record<CompileStatus, string> = {
    idle: "Idle",
    compiling: "Compilando...",
    running: "Executando...",
    success: "Build OK",
    error: "Erro"
  };

  return (
    <span className={`compile-pill ${status}`} role="status">
      {status === "compiling" || status === "running" ? (
        <span className="compile-spinner" />
      ) : null}
      {labels[status]}
    </span>
  );
}
