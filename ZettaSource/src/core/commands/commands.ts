export const COMMANDS = {
  NEW_FILE: "new-file",
  OPEN_FOLDER: "open-folder",
  SAVE_FILE: "save-file",
  CLOSE_TAB: "close-tab",
  REOPEN_TAB: "reopen-tab",
  COMPILE: "compile",
  RUN: "run",
  TOGGLE_TERMINAL: "toggle-terminal",
  OPEN_GIT_PANEL: "open-git-panel",
  TOGGLE_THEME: "toggle-theme",
  QUICK_OPEN: "quick-open"
} as const;

export type CommandId = (typeof COMMANDS)[keyof typeof COMMANDS];

export const shortcutLabels: Record<CommandId, string> = {
  [COMMANDS.NEW_FILE]: "Ctrl/Cmd+N",
  [COMMANDS.OPEN_FOLDER]: "Ctrl/Cmd+O",
  [COMMANDS.SAVE_FILE]: "Ctrl/Cmd+S",
  [COMMANDS.CLOSE_TAB]: "Ctrl/Cmd+W",
  [COMMANDS.REOPEN_TAB]: "Ctrl/Cmd+Shift+T",
  [COMMANDS.COMPILE]: "Ctrl/Cmd+B",
  [COMMANDS.RUN]: "Ctrl/Cmd+Enter",
  [COMMANDS.TOGGLE_TERMINAL]: "Ctrl/Cmd+`",
  [COMMANDS.OPEN_GIT_PANEL]: "Ctrl/Cmd+Shift+G",
  [COMMANDS.TOGGLE_THEME]: "Ctrl/Cmd+J",
  [COMMANDS.QUICK_OPEN]: "Ctrl/Cmd+P"
};
