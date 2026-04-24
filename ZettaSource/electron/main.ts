import { app, BrowserWindow, dialog, ipcMain, shell } from "electron";
import path from "node:path";
import { promises as fs } from "node:fs";
import { ChildProcessWithoutNullStreams, execFile, spawn } from "node:child_process";
import {
  CreateFilePayload,
  FileNode,
  GitBranchCheckoutPayload,
  GitBranchesResult,
  GitCommitPayload,
  GitDiffPayload,
  GitPathsPayload,
  GitStatusEntry,
  GitStatusResult,
  SaveFilePayload,
  TerminalDataEvent,
  TerminalSessionCreatePayload,
  TerminalSessionInfo,
  TerminalSignalPayload,
  TerminalWritePayload,
  WorkspaceData
} from "../shared/contracts";

const IGNORED_DIRECTORIES = new Set([".git", "node_modules", "dist", "dist-electron", "release"]);

let mainWindow: BrowserWindow | null = null;

const terminalSessions = new Map<
  string,
  {
    info: TerminalSessionInfo;
    process: any;
  }
>();

let nodePty: any = null;
try {
  // optional dependency: if node-pty is installed we'll use a proper PTY for better terminal behavior
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  nodePty = require("node-pty");
} catch (err) {
  nodePty = null;
}

function createWindow(): void {
  const devServerUrl = process.env.VITE_DEV_SERVER_URL;

  const iconPath = devServerUrl
    ? path.join(__dirname, "..", "..", "build-resources", "icon.png")
    : path.join(process.resourcesPath, "build-resources", "icon.ico");

  mainWindow = new BrowserWindow({
    width: 1540,
    height: 960,
    minWidth: 1080,
    minHeight: 680,
    title: "ZettaSource",
    icon: iconPath,
    backgroundColor: "#0b1118",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });
  if (devServerUrl) {
    mainWindow.loadURL(devServerUrl).catch((error) => {
      console.error("Falha ao carregar servidor de desenvolvimento:", error);
    });
    return;
  }

  const rendererFile = path.join(__dirname, "..", "..", "dist", "index.html");
  mainWindow.loadFile(rendererFile).catch((error) => {
    console.error("Falha ao carregar build do renderer:", error);
  });
}

function emitTerminalData(event: TerminalDataEvent): void {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  mainWindow.webContents.send("terminal:data", event);
}

function resolveShell(): { executable: string; args: string[] } {
  if (process.platform === "win32") {
    return {
      executable: process.env.ComSpec || "powershell.exe",
      args: []
    };
  }

  return {
    executable: process.env.SHELL || "/bin/bash",
    args: []
  };
}

function createTerminalSession(payload: TerminalSessionCreatePayload): TerminalSessionInfo {
  const sessionId = `term-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const shellConfig = resolveShell();
  const cwd = payload.cwd && payload.cwd.trim().length > 0 ? payload.cwd : process.cwd();

  // Use node-pty if available to provide a proper TTY (better for interactive programs).
  // Otherwise fall back to child_process.spawn (less featureful but safe).
  let processHandle: any;
  if (nodePty && nodePty.spawn) {
    try {
      processHandle = nodePty.spawn(shellConfig.executable, shellConfig.args, {
        name: process.platform === "win32" ? "powershell" : "xterm-256color",
        cwd,
        env: process.env,
        cols: 80,
        rows: 24
      });

      processHandle.onData((data: string) => {
        emitTerminalData({
          sessionId,
          stream: "stdout",
          chunk: data,
          timestamp: Date.now()
        });
      });

      // node-pty exposes onExit in modern versions
      if (typeof processHandle.onExit === "function") {
        processHandle.onExit(({ exitCode, signal }: any) => {
          const existing = terminalSessions.get(sessionId);
          if (existing) {
            existing.info.running = false;
          }
          emitTerminalData({
            sessionId,
            stream: "system",
            chunk: `\n[process exited: code=${String(exitCode)} signal=${String(signal)}]\n`,
            timestamp: Date.now()
          });
        });
      }
    } catch (err) {
      // fallback to spawn below if pty spawn fails
      processHandle = spawn(shellConfig.executable, shellConfig.args, {
        cwd,
        stdio: "pipe",
        windowsHide: true,
        env: process.env
      });
    }
  } else {
    processHandle = spawn(shellConfig.executable, shellConfig.args, {
      cwd,
      stdio: "pipe",
      windowsHide: true,
      env: process.env
    });

    processHandle.stdout.on("data", (chunk: Buffer) => {
      emitTerminalData({
        sessionId,
        stream: "stdout",
        chunk: chunk.toString("utf8"),
        timestamp: Date.now()
      });
    });

    processHandle.stderr.on("data", (chunk: Buffer) => {
      emitTerminalData({
        sessionId,
        stream: "stderr",
        chunk: chunk.toString("utf8"),
        timestamp: Date.now()
      });
    });

    processHandle.on("close", (code, signal) => {
      const existing = terminalSessions.get(sessionId);
      if (existing) {
        existing.info.running = false;
      }

      emitTerminalData({
        sessionId,
        stream: "system",
        chunk: `\n[process exited: code=${String(code)} signal=${String(signal)}]\n`,
        timestamp: Date.now()
      });
    });
  }

  const info: TerminalSessionInfo = {
    id: sessionId,
    name: payload.name || `Terminal ${terminalSessions.size + 1}`,
    cwd,
    shell: shellConfig.executable,
    running: true
  };

  processHandle.stdout.on("data", (chunk: Buffer) => {
    emitTerminalData({
      sessionId,
      stream: "stdout",
      chunk: chunk.toString("utf8"),
      timestamp: Date.now()
    });
  });

  processHandle.stderr.on("data", (chunk: Buffer) => {
    emitTerminalData({
      sessionId,
      stream: "stderr",
      chunk: chunk.toString("utf8"),
      timestamp: Date.now()
    });
  });

  processHandle.on("close", (code, signal) => {
    const existing = terminalSessions.get(sessionId);
    if (existing) {
      existing.info.running = false;
    }

    emitTerminalData({
      sessionId,
      stream: "system",
      chunk: `\n[process exited: code=${String(code)} signal=${String(signal)}]\n`,
      timestamp: Date.now()
    });
  });

  terminalSessions.set(sessionId, {
    info,
    process: processHandle
  });

  emitTerminalData({
    sessionId,
    stream: "system",
    chunk: `[started ${info.shell} in ${info.cwd}]\n`,
    timestamp: Date.now()
  });

  return info;
}

function terminateTerminalSession(payload: TerminalSignalPayload): boolean {
  const session = terminalSessions.get(payload.sessionId);
  if (!session) {
    return false;
  }

  if (!session.info.running) {
    terminalSessions.delete(payload.sessionId);
    return true;
  }

  session.process.kill();
  session.info.running = false;
  terminalSessions.delete(payload.sessionId);
  return true;
}

function writeToTerminal(payload: TerminalWritePayload): boolean {
  const session = terminalSessions.get(payload.sessionId);
  if (!session || !session.info.running) {
    return false;
  }

  session.process.stdin.write(payload.input);
  return true;
}

async function buildWorkspaceTree(rootPath: string): Promise<WorkspaceData> {
  const nodes = await readDirectoryRecursive(rootPath);
  return {
    rootPath,
    nodes
  };
}

async function readDirectoryRecursive(directoryPath: string): Promise<FileNode[]> {
  const entries = await fs.readdir(directoryPath, { withFileTypes: true });
  const nodes: FileNode[] = [];

  for (const entry of entries) {
    if (entry.name.startsWith(".")) {
      continue;
    }

    if (entry.isDirectory() && IGNORED_DIRECTORIES.has(entry.name)) {
      continue;
    }

    const absolutePath = path.join(directoryPath, entry.name);

    if (entry.isDirectory()) {
      const children = await readDirectoryRecursive(absolutePath);
      nodes.push({
        id: absolutePath,
        name: entry.name,
        path: absolutePath,
        type: "directory",
        children
      });
      continue;
    }

    const extension = path.extname(entry.name).toLowerCase();
    nodes.push({
      id: absolutePath,
      name: entry.name,
      path: absolutePath,
      type: "file",
      extension
    });
  }

  return nodes.sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === "directory" ? -1 : 1;
    }

    return a.name.localeCompare(b.name);
  });
}

function runGit(cwd: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    execFile("git", args, { cwd, windowsHide: true, maxBuffer: 8 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr || error.message));
        return;
      }

      resolve({ stdout, stderr });
    });
  });
}

function parseGitStatus(raw: string): GitStatusResult {
  const lines = raw.replace(/\r\n/g, "\n").split("\n").filter((line) => line.length > 0);
  const header = lines[0] || "## HEAD";

  let branch = "HEAD";
  let upstream: string | undefined;
  let aheadBy = 0;
  let behindBy = 0;

  if (header.startsWith("## ")) {
    const payload = header.slice(3);
    const parts = payload.split("...");
    branch = parts[0]?.trim() || "HEAD";

    if (parts[1]) {
      const [upstreamPart] = parts[1].split("[");
      upstream = upstreamPart.trim();

      const details = parts[1].match(/\[(.*)\]/)?.[1] || "";
      const aheadMatch = details.match(/ahead\s+(\d+)/);
      const behindMatch = details.match(/behind\s+(\d+)/);
      aheadBy = aheadMatch ? Number(aheadMatch[1]) : 0;
      behindBy = behindMatch ? Number(behindMatch[1]) : 0;
    }
  }

  const entries: GitStatusEntry[] = lines.slice(1).map((line) => {
    const indexStatus = line[0] || " ";
    const workTreeStatus = line[1] || " ";
    const rawPath = line.slice(3).trim();
    const pathPart = rawPath.includes(" -> ") ? rawPath.split(" -> ").pop() || rawPath : rawPath;

    return {
      path: pathPart,
      indexStatus,
      workTreeStatus,
      staged: indexStatus !== " " && indexStatus !== "?",
      untracked: indexStatus === "?" || workTreeStatus === "?",
      deleted: indexStatus === "D" || workTreeStatus === "D",
      renamed: indexStatus === "R" || workTreeStatus === "R"
    };
  });

  return {
    branch,
    upstream,
    entries,
    aheadBy,
    behindBy
  };
}

app.whenReady().then(() => {
  ipcMain.handle("dialog:openFolder", async () => {
    const result = await dialog.showOpenDialog({
      title: "Abrir pasta no ZettaSource",
      properties: ["openDirectory"]
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    return result.filePaths[0] ?? null;
  });

  ipcMain.handle("workspace:read", async (_event, rootPath: string) => {
    return buildWorkspaceTree(rootPath);
  });

  ipcMain.handle("workspace:loadExamples", async () => {
    const examplesPath = path.join(app.getAppPath(), "examples");
    return buildWorkspaceTree(examplesPath);
  });

  ipcMain.handle("file:read", async (_event, filePath: string) => {
    const content = await fs.readFile(filePath, "utf8");
    return {
      path: filePath,
      content
    };
  });

  ipcMain.handle("file:save", async (_event, payload: SaveFilePayload) => {
    await fs.mkdir(path.dirname(payload.path), { recursive: true });
    await fs.writeFile(payload.path, payload.content, "utf8");
    return true;
  });

  ipcMain.handle("file:create", async (_event, payload: CreateFilePayload) => {
    const targetPath = path.join(payload.directoryPath, payload.fileName);
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.writeFile(targetPath, payload.content ?? "", { flag: "wx" });
    return targetPath;
  });

  ipcMain.handle("terminal:create", async (_event, payload: TerminalSessionCreatePayload) => {
    return createTerminalSession(payload);
  });

  ipcMain.handle("terminal:list", async () => {
    return Array.from(terminalSessions.values()).map((session) => session.info);
  });

  ipcMain.handle("terminal:write", async (_event, payload: TerminalWritePayload) => {
    return writeToTerminal(payload);
  });

  ipcMain.handle("terminal:kill", async (_event, payload: TerminalSignalPayload) => {
    return terminateTerminalSession(payload);
  });

  ipcMain.handle("terminal:resize", async (_event, payload: { sessionId: string; cols: number; rows: number }) => {
    const session = terminalSessions.get(payload.sessionId);
    if (!session) return false;
    try {
      if (session.process && typeof session.process.resize === "function") {
        session.process.resize(payload.cols, payload.rows);
        return true;
      }
    } catch (err) {
      console.error("Failed to resize PTY:", err);
    }
    return false;
  });

  ipcMain.handle("git:status", async (_event, cwd: string) => {
    const { stdout } = await runGit(cwd, ["status", "--porcelain=1", "-b"]);
    return parseGitStatus(stdout);
  });

  ipcMain.handle("git:stage", async (_event, payload: GitPathsPayload) => {
    await runGit(payload.cwd, ["add", "--", ...payload.paths]);
    return true;
  });

  ipcMain.handle("git:unstage", async (_event, payload: GitPathsPayload) => {
    await runGit(payload.cwd, ["restore", "--staged", "--", ...payload.paths]);
    return true;
  });

  ipcMain.handle("git:commit", async (_event, payload: GitCommitPayload) => {
    await runGit(payload.cwd, ["commit", "-m", payload.message]);
    return true;
  });

  ipcMain.handle("git:pull", async (_event, cwd: string) => {
    const { stdout, stderr } = await runGit(cwd, ["pull"]);
    return `${stdout}${stderr}`.trim();
  });

  ipcMain.handle("git:push", async (_event, cwd: string) => {
    const { stdout, stderr } = await runGit(cwd, ["push"]);
    return `${stdout}${stderr}`.trim();
  });

  ipcMain.handle("git:branches", async (_event, cwd: string): Promise<GitBranchesResult> => {
    const current = (await runGit(cwd, ["branch", "--show-current"])).stdout.trim();
    const list = (await runGit(cwd, ["branch", "--format=%(refname:short)"])).stdout
      .replace(/\r\n/g, "\n")
      .split("\n")
      .map((name) => name.trim())
      .filter((name) => name.length > 0);

    return {
      currentBranch: current,
      branches: list.map((name) => ({ name, current: name === current }))
    };
  });

  ipcMain.handle("git:checkout", async (_event, payload: GitBranchCheckoutPayload) => {
    await runGit(payload.cwd, ["checkout", payload.branch]);
    return true;
  });

  ipcMain.handle("git:diff", async (_event, payload: GitDiffPayload) => {
    const { stdout } = await runGit(payload.cwd, ["diff", "--", payload.path]);
    return stdout;
  });

  ipcMain.handle("git:remote", async (_event, cwd: string) => {
    try {
      const { stdout } = await runGit(cwd, ["remote", "get-url", "origin"]);
      return stdout.trim();
    } catch {
      return "";
    }
  });

  ipcMain.handle("system:openExternal", async (_event, url: string) => {
    if (!url || url.trim().length === 0) {
      return false;
    }

    await shell.openExternal(url);
    return true;
  });

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("before-quit", () => {
  for (const session of terminalSessions.values()) {
    if (session.info.running) {
      session.process.kill();
    }
  }
  terminalSessions.clear();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
