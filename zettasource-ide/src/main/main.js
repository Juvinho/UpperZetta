const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const Store = require('electron-store');
const { UVLMRunner } = require('./uvlm');

const store = new Store();
const terminals = new Map();
let terminalCounter = 0;
let mainWindow;
let uvlm = null;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        minWidth: 800,
        minHeight: 500,
        frame: false,
        titleBarStyle: 'hidden',
        backgroundColor: '#0F0F0F',
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true
        },
        icon: path.join(__dirname, '../../build-resources/icon.ico')
    });

    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

    // --- UVLM Init ---
    mainWindow.webContents.on('did-finish-load', async () => {
        uvlm = new UVLMRunner(mainWindow.webContents);
        await uvlm.init();
    });

    // --- WINDOW CONTROLS ---
    ipcMain.on('window:minimize', () => mainWindow.minimize());
    ipcMain.on('window:maximize', () => {
        if (mainWindow.isMaximized()) mainWindow.unmaximize();
        else mainWindow.maximize();
    });
    ipcMain.on('window:close', () => mainWindow.close());
    ipcMain.on('window:fullscreen', () => {
        mainWindow.setFullScreen(!mainWindow.isFullScreen());
    });

    mainWindow.on('maximize', () => mainWindow.webContents.send('window:maximized', true));
    mainWindow.on('unmaximize', () => mainWindow.webContents.send('window:maximized', false));

    // --- TERMINAL IPC ---
    ipcMain.handle('terminal:create', (event, { cwd }) => {
        const id = ++terminalCounter;
        const isWindows = process.platform === 'win32';
        const workDir = cwd || app.getPath('home');

        let shellCmd, shellArgs;
        if (isWindows) {
            // -Command - reads commands line by line from stdin, outputs to stdout
            shellCmd = 'powershell.exe';
            shellArgs = ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', '-'];
        } else {
            shellCmd = process.env.SHELL || '/bin/bash';
            shellArgs = ['-s']; // read from stdin
        }

        const proc = spawn(shellCmd, shellArgs, {
            cwd: workDir,
            env: { ...process.env, TERM: 'dumb' },
            stdio: ['pipe', 'pipe', 'pipe']
        });

        terminals.set(id, proc);
        const webContents = event.sender;

        proc.stdout.on('data', data => {
            if (!webContents.isDestroyed())
                webContents.send(`terminal:output:${id}`, data.toString('utf8'));
        });
        proc.stderr.on('data', data => {
            if (!webContents.isDestroyed())
                webContents.send(`terminal:output:${id}`, '\x1b[31m' + data.toString('utf8') + '\x1b[0m');
        });
        proc.on('close', code => {
            terminals.delete(id);
            if (!webContents.isDestroyed()) webContents.send(`terminal:closed:${id}`, code);
        });

        return { id, shell: shellCmd, cwd: workDir };
    });

    ipcMain.on('terminal:input', (event, { id, data }) => {
        const proc = terminals.get(id);
        if (proc && proc.stdin.writable) proc.stdin.write(data);
    });

    ipcMain.on('terminal:resize', () => { /* no-op: spawn-based terminal has no pty resize */ });

    ipcMain.on('terminal:kill', (event, { id }) => {
        const proc = terminals.get(id);
        if (proc) {
            proc.kill();
            terminals.delete(id);
        }
    });

    // --- DIALOG IPC ---
    ipcMain.handle('dialog:openFolder', async () => {
        const result = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory'] });
        return result.canceled ? null : result.filePaths[0];
    });

    ipcMain.handle('dialog:openFile', async (_, options) => {
        const result = await dialog.showOpenDialog(mainWindow, {
            properties: ['openFile'],
            filters: options?.filters || []
        });
        return result.canceled ? null : result.filePaths[0];
    });

    ipcMain.handle('dialog:saveFile', async (_, options) => {
        const result = await dialog.showSaveDialog(mainWindow, {
            defaultPath: options?.defaultPath || 'untitled.uz',
            filters: options?.filters || [{ name: 'UpperZetta', extensions: ['uz'] }]
        });
        return result.canceled ? null : result.filePath;
    });

    ipcMain.handle('dialog:confirm', async (_, opts) => {
        const result = await dialog.showMessageBox(mainWindow, opts);
        return result.response;
    });

    // --- FILE SYSTEM IPC ---
    ipcMain.handle('fs:readFile', async (_, filePath) => fs.readFileSync(filePath, 'utf8'));
    ipcMain.handle('fs:writeFile', async (_, { filePath, content }) => {
        fs.writeFileSync(filePath, content, 'utf8');
        return true;
    });
    ipcMain.handle('fs:mkdir', async (_, dirPath) => {
        if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
        return true;
    });
    ipcMain.handle('fs:readDir', async (_, dirPath) => {
        function walk(dir, depth = 0) {
            if (depth > 5) return [];
            try {
                const entries = fs.readdirSync(dir, { withFileTypes: true });
                return entries
                    .filter(e => !['node_modules', '.git', 'out', 'dist'].includes(e.name))
                    .map(e => ({
                        name: e.name,
                        path: path.join(dir, e.name),
                        isDir: e.isDirectory(),
                        children: e.isDirectory() ? walk(path.join(dir, e.name), depth + 1) : []
                    }));
            } catch (e) { return []; }
        }
        return walk(dirPath);
    });

    // --- GLOBAL SEARCH IPC ---
    ipcMain.handle('search:inFiles', async (_, { query, root, caseSensitive, useRegex }) => {
        const results = [];
        function search(dir) {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory() && !['node_modules', '.git', 'out'].includes(entry.name)) {
                    search(fullPath);
                } else if (entry.isFile() && /\.(uz|uzs|txt|md|json)$/.test(entry.name)) {
                    const content = fs.readFileSync(fullPath, 'utf8');
                    const lines = content.split('\n');
                    lines.forEach((line, i) => {
                        const flags = caseSensitive ? 'g' : 'gi';
                        const regex = useRegex ? new RegExp(query, flags) : new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
                        if (regex.test(line)) {
                            results.push({ file: entry.name, filePath: fullPath, line: i + 1, text: line.trim() });
                        }
                    });
                }
            }
        }
        try { search(root); } catch (e) { console.error(e); }
        return results;
    });

    // --- UVLM IPC ---
    ipcMain.handle('uvlm:compile', async (_, { filePath }) => uvlm.compile(filePath));
    ipcMain.handle('uvlm:run', async (_, { uzbPath }) => uvlm.run(uzbPath));
    ipcMain.handle('uvlm:buildAndRun', async (_, { filePath }) => uvlm.buildAndRun(filePath));
    ipcMain.on('uvlm:stop', () => { if (uvlm) uvlm.stop(); });
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
