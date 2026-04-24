import { ThemeMode } from "../../types/ide";

const THEME_ATTRIBUTE = "data-zetta-theme";

export function applyTheme(theme: ThemeMode): void {
  document.documentElement.setAttribute(THEME_ATTRIBUTE, theme);
}

export function nextTheme(theme: ThemeMode): ThemeMode {
  return theme === "dark" ? "light" : "dark";
}

export function compileStatusLabel(status: "idle" | "compiling" | "running" | "success" | "error"): string {
  switch (status) {
    case "idle":
      return "Idle";
    case "compiling":
      return "Compiling";
    case "running":
      return "Running";
    case "success":
      return "Build OK";
    case "error":
      return "Build Error";
    default:
      return "Idle";
  }
}
