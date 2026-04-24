import React, { useEffect, useMemo, useState } from "react";
import "./terminal.css";
import { useIdeDispatch } from "../../state/ideStore";
import { IconTerminal, IconTrash, IconNewFile, IconRefresh, IconExternal, IconOutput } from "../../assets/icons";
import { OutputEntry, TerminalSession } from "../../types/ide";
import { TerminalView } from "./TerminalView";

interface TerminalPanelProps {
  sessions: TerminalSession[];
  activeSessionId?: string;
  uzetConsoleOutput: OutputEntry[];
  onSetActive: (sessionId: string) => void;
  onCreateSession: () => void;
  onRunCommand: (sessionId: string, command: string) => void;
  onStopSession: (sessionId: string) => void;
  onClearSession: (sessionId: string) => void;
  onRunUzetConsole: (command: string) => void;
  onClearUzetConsole: () => void;
}

export function TerminalPanel(props: TerminalPanelProps): React.ReactElement {
  const [searchOpen, setSearchOpen] = useState(false);
  const [maximized, setMaximized] = useState(false);

  // panes: array of sessionIds per column (simple split implementation)
  const [panes, setPanes] = useState<string[][]>(() => {
    const first = props.activeSessionId || props.sessions[0]?.id;
    return first ? [[first]] : [[]];
  });

  useEffect(() => {
    // keep the first pane pointing to active session
    if (props.activeSessionId) {
      setPanes((p) => {
        const next = [...p];
        if (!next[0]) next[0] = [];
        next[0][0] = props.activeSessionId as string;
        return next;
      });
    }
  }, [props.activeSessionId]);

  const sessionsById = useMemo(() => {
    const map = new Map<string, TerminalSession>();
    for (const s of props.sessions) map.set(s.id, s);
    return map;
  }, [props.sessions]);

  const dispatch = useIdeDispatch();

  const handleSplit = () => {
    // create a visual split using the same session (shared view) for MVP
    const active = props.activeSessionId || props.sessions[0]?.id;
    if (!active) return;
    setPanes((p) => (p.length === 1 ? [p[0], [active]] : p));
  };

  const handleClosePane = (index: number) => {
    setPanes((p) => p.filter((_, i) => i !== index));
  };

  const handleAddSession = () => {
    props.onCreateSession();
  };

  return (
    <div className={"terminal-panel-wrap terminal-panel-new " + (maximized ? "maximized" : "") }>
      <div className="terminal-toolbar enhanced">
        <div className="terminal-session-tabs">
          {props.sessions.map((session) => (
            <button
              key={session.id}
              className={session.id === props.activeSessionId ? "terminal-session-tab active" : "terminal-session-tab"}
              onClick={() => props.onSetActive(session.id)}
              title={session.cwd}
            >
              <IconTerminal size={12} />
              {session.name}
              {session.running ? <span className="dot-running" /> : <span className="dot-stopped" />}
            </button>
          ))}

          <button className="terminal-session-tab add" onClick={handleAddSession} title="Novo terminal">
            <IconNewFile size={12} />
          </button>
        </div>

        <div className="terminal-tools">
          <button className="mini-button" onClick={() => props.activeSessionId && props.onStopSession(props.activeSessionId)}>
            Stop
          </button>
          <button className="mini-button" onClick={() => props.activeSessionId && props.onClearSession(props.activeSessionId)}>
            <IconTrash size={12} />
            Clear
          </button>
          <button className="mini-button" onClick={() => {
            const active = props.activeSessionId;
            if (!active) return;
            const current = sessionsById.get(active);
            const name = window.prompt("Renomear terminal", current?.name || "");
            if (name && name.trim()) {
              dispatch({ type: "terminal/rename", sessionId: active, name: name.trim() });
            }
          }}>
            Rename
          </button>
          <button className="mini-button" onClick={handleSplit} title="Split">
            <IconRefresh size={12} />
          </button>
          <button className="mini-button" onClick={() => setMaximized((v) => !v)} title="Maximize">
            <IconExternal size={12} />
          </button>
          <button className="mini-button" onClick={() => setSearchOpen((v) => !v)} title="Search">
            <IconOutput size={12} />
          </button>
        </div>
      </div>

      <div className="terminal-content-grid new-grid" style={{ gridTemplateColumns: `repeat(${panes.length}, 1fr)` }}>
        {panes.map((pane, idx) => (
          <div key={`pane-${idx}`} className="terminal-pane">
            <div className="pane-header">
              <span>Pane {idx + 1}</span>
              <div className="pane-controls">
                <button className="mini-button" onClick={() => handleClosePane(idx)}>Close</button>
              </div>
            </div>

            <div className="pane-body">
              {pane.length === 0 ? (
                <div className="panel-empty">Nenhuma sessão neste painel.</div>
              ) : (
                pane.map((sessionId) => (
                  <div key={`view-${sessionId}`} className="terminal-view-host">
                    <TerminalView session={sessionsById.get(sessionId)} />
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      <section className="terminal-uzet-console small">
        <header>
          <strong>Uzet Console</strong>
          <span>Stub MVP</span>
        </header>
        <div className="terminal-scroll">
          {props.uzetConsoleOutput.length ? (
            props.uzetConsoleOutput.map((entry) => (
              <div key={entry.id} className={`terminal-line ${entry.level}`}>
                <span className="terminal-time">[{entry.timestamp}]</span>
                <span>{entry.text}</span>
              </div>
            ))
          ) : (
            <div className="panel-empty">Sem execucoes ainda no Uzet Console.</div>
          )}
        </div>
        <div className="terminal-input-row">
          <button className="mini-button" onClick={props.onClearUzetConsole}>
            <IconTrash size={12} />
            Clear
          </button>
        </div>
      </section>
    </div>
  );
}
