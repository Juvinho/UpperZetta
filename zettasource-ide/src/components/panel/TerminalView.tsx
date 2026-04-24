import React, { useEffect, useRef } from "react";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import "xterm/css/xterm.css";
import { TerminalSession } from "../../types/ide";

interface TerminalViewProps {
  session?: TerminalSession;
  focused?: boolean;
  className?: string;
}

export function TerminalView({ session, focused, className }: TerminalViewProps): React.ReactElement {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const lastLenRef = useRef<number>(0);

  useEffect(() => {
    if (!containerRef.current) return;

    const term = new Terminal({
      cursorBlink: true,
      fontFamily:
        'ui-monospace, SFMono-Regular, Menlo, Monaco, "Roboto Mono", "Fira Code", monospace',
      fontSize: 13,
      scrollback: 10000,
      theme: {
        background: "#061019",
        foreground: "#cbd5e1",
        cursor: "#8bd5ff"
      }
    });

    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(containerRef.current);
    try {
      fit.fit();
      // tell backend about new size
      const dims = term.proposeDimensions ? term.proposeDimensions() : { cols: 80, rows: 24 };
      // Attempt to resize PTY if available via preload API
      try {
        // @ts-ignore global zettaApi
        if ((window as any).zettaApi?.resizeTerminalSession && session) {
          (window as any).zettaApi.resizeTerminalSession({ sessionId: session.id, cols: term.cols, rows: term.rows });
        }
      } catch {}
    } catch (err) {
      // ignore fit errors
    }

    termRef.current = term;
    fitRef.current = fit;

    const onData = term.onData(async (data) => {
      if (!session) return;
      try {
        // Send keystrokes/raw input to backend
        // @ts-ignore global zettaApi
        await (window as any).zettaApi.writeTerminal({ sessionId: session.id, input: data });
      } catch (err) {
        // fail silently
      }
    });

    return () => {
      onData.dispose();
      try {
        term.dispose();
      } catch {}
      termRef.current = null;
      fitRef.current = null;
    };
  }, [containerRef]);

  // write buffer updates to xterm
  useEffect(() => {
    const term = termRef.current;
    if (!term || !session) return;

    const buffer = session.buffer || [];
    const start = lastLenRef.current;
    for (let i = start; i < buffer.length; i++) {
      const entry = buffer[i];
      try {
        term.write(entry.text);
      } catch (err) {
        // ignore write errors
      }
    }
    lastLenRef.current = buffer.length;
    try {
      term.scrollToBottom();
    } catch {}
  }, [session?.buffer]);

  useEffect(() => {
    const term = termRef.current;
    const fit = fitRef.current;
    if (!term || !fit) return;

    const ro = new ResizeObserver(() => {
      try {
        fit.fit();
        // @ts-ignore global zettaApi
        if ((window as any).zettaApi?.resizeTerminalSession && session) {
          try {
            (window as any).zettaApi.resizeTerminalSession({ sessionId: session.id, cols: term.cols, rows: term.rows });
          } catch {}
        }
      } catch {}
    });

    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [session?.id]);

  return <div className={"terminal-view " + (className || "")} ref={containerRef} />;
}
