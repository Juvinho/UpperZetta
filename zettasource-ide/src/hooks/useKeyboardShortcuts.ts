import { useEffect } from "react";

interface ShortcutHandlers {
  onSave: () => void;
  onQuickOpen: () => void;
  onCompile: () => void;
  onRun: () => void;
  onNewFile: () => void;
  onOpenFolder: () => void;
  onCloseTab: () => void;
  onReopenTab: () => void;
  onToggleTerminal: () => void;
  onOpenGit: () => void;
  onNewTerminal?: () => void;
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const usesCommandKey = event.metaKey || event.ctrlKey;
      if (!usesCommandKey) {
        return;
      }

      const key = event.key.toLowerCase();

      if (key === "s") {
        event.preventDefault();
        handlers.onSave();
        return;
      }

      if (key === "p") {
        event.preventDefault();
        handlers.onQuickOpen();
        return;
      }

      if (key === "b") {
        event.preventDefault();
        handlers.onCompile();
        return;
      }

      if (key === "n") {
        event.preventDefault();
        handlers.onNewFile();
        return;
      }

      if (key === "o") {
        event.preventDefault();
        handlers.onOpenFolder();
        return;
      }

      if (key === "w") {
        event.preventDefault();
        handlers.onCloseTab();
        return;
      }

      if (key === "g" && event.shiftKey) {
        event.preventDefault();
        handlers.onOpenGit();
        return;
      }

      if (event.key === "`") {
        event.preventDefault();
        handlers.onToggleTerminal();
        return;
      }

      if (event.key === "`" && event.shiftKey) {
        event.preventDefault();
        if (handlers.onNewTerminal) handlers.onNewTerminal();
        return;
      }

      if (key === "t" && event.shiftKey) {
        event.preventDefault();
        handlers.onReopenTab();
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        handlers.onRun();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handlers]);
}
