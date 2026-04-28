const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const Store = require('electron-store');
const { UVLMRunner } = require('./uvlm');

const store = new Store();
const terminals = new Map();
let terminalCounter = 0;
let mainWindow;
let uvlm = null;
let workspaceWatcher = null;

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
    ipcMain.on('window:new', () => {
        const win = new BrowserWindow({
            width: 1280, height: 800, minWidth: 800, minHeight: 500,
            frame: false, titleBarStyle: 'hidden', backgroundColor: '#0F0F0F',
            webPreferences: { nodeIntegration: true, contextIsolation: false },
            icon: path.join(__dirname, '../../build-resources/icon.ico')
        });
        win.loadFile(path.join(__dirname, '../renderer/index.html'));
    });
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
    ipcMain.handle('fs:readFile', async (_, filePath, encoding = 'utf8') => {
        return fs.readFileSync(filePath, encoding === 'buffer' ? null : encoding);
    });
    ipcMain.handle('fs:writeFile', async (_, { filePath, content, encoding = 'utf8' }) => {
        if (encoding === 'base64') {
            fs.writeFileSync(filePath, Buffer.from(content, 'base64'));
        } else {
            fs.writeFileSync(filePath, content, encoding);
        }
        return true;
    });
    ipcMain.handle('fs:copyFile', async (_, { src, dest }) => {
        fs.copyFileSync(src, dest);
        return true;
    });
    ipcMain.handle('fs:unlink', async (_, filePath) => {
        if (fs.existsSync(filePath)) {
            const stat = fs.statSync(filePath);
            if (stat.isDirectory()) {
                fs.rmSync(filePath, { recursive: true, force: true });
            } else {
                fs.unlinkSync(filePath);
            }
        }
        return true;
    });
    ipcMain.handle('fs:rename', async (_, { oldPath, newPath }) => {
        fs.renameSync(oldPath, newPath);
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

    // --- FILE CREATE / LIST / REVEAL IPC ---
    ipcMain.handle('fs:createFile', async (_, filePath) => {
        if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, '', 'utf8');
        return true;
    });
    ipcMain.handle('fs:createDir', async (_, dirPath) => {
        if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
        return true;
    });
    ipcMain.handle('fs:listAll', async (_, rootPath) => {
        const results = [];
        function walk(dir) {
            let entries;
            try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
            for (const e of entries) {
                if (['node_modules', '.git', 'out', 'dist'].includes(e.name)) continue;
                const fullPath = path.join(dir, e.name);
                if (e.isDirectory()) walk(fullPath);
                else results.push({ name: e.name, path: fullPath, rel: path.relative(rootPath, fullPath).replace(/\\/g, '/') });
            }
        }
        walk(rootPath);
        return results;
    });
    ipcMain.handle('fs:revealInExplorer', async (_, filePath) => {
        shell.showItemInFolder(filePath);
    });

    // --- FILE WATCHER IPC ---
    ipcMain.on('fs:watchDir', (event, dirPath) => {
        if (workspaceWatcher) {
            workspaceWatcher.close();
            workspaceWatcher = null;
        }
        if (!dirPath) return;
        try {
            let debounceTimer = null;
            workspaceWatcher = fs.watch(dirPath, { recursive: true }, () => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    if (!event.sender.isDestroyed()) {
                        event.sender.send('fs:workspace-changed');
                    }
                }, 300);
            });
            workspaceWatcher.on('error', (err) => console.error('[fs:watchDir]', err));
        } catch (e) {
            console.error('[fs:watchDir]', e);
        }
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

    // ── DeviceKey IPC ────────────────────────────────────────────────────────
    ipcMain.handle('uvlm:keyExport', async (_, { outputPath }) =>
        uvlm ? uvlm.keyExport(outputPath) : { success: false, error: 'UVLM não pronto.' }
    );
    ipcMain.handle('uvlm:keyImport', async (_, { keyFilePath }) =>
        uvlm ? uvlm.keyImport(keyFilePath) : { success: false, error: 'UVLM não pronto.' }
    );
    ipcMain.handle('uvlm:keyShow', async () =>
        uvlm ? uvlm.keyShow() : { success: false, key: null }
    );
    ipcMain.handle('uvlm:sealFile', async (_, { filePath, password, content }) =>
        uvlm ? uvlm.sealFile(filePath, password, content ?? null)
             : { success: false, error: 'UVLM não pronto.' }
    );

    // --- UZS UNSEAL ---
    ipcMain.handle('uvlm:unsealUZS', async (_, { filePath, password }) => {
        try {
            const uzsBuffer = fs.readFileSync(filePath);
            if (uzsBuffer.length < 4) return { success: false, error: 'Arquivo UZS inválido.' };

            // UZS1 (DeviceKey format) → delegate to Java
            const magic = uzsBuffer.slice(0, 4).toString('ascii');
            if (magic === 'UZS1') {
                if (!uvlm) return { success: false, error: 'UVLM não inicializado.' };
                return await uvlm.unsealFile(filePath, password);
            }

            // UZS! (AES-256-GCM, no DeviceKey) → Node.js path
            if (magic !== 'UZS!') {
                return { success: false, error: 'Não é um arquivo .uzs válido.' };
            }

            let salt, iv, payloadStart;
            let metadata = null;

            {
                // Formato UZS!: magic(4) + mirror(4) + version(2) + salt(16) + iv(12) + reserved(6) + metadata(N) + ciphertext
                if (uzsBuffer.length < 44) return { success: false, error: 'Arquivo UZS corrompido.' };
                salt = uzsBuffer.slice(10, 26);
                iv = uzsBuffer.slice(26, 38);

                // Extrair metadados (string null-terminated)
                payloadStart = 44;
                let metaEnd = payloadStart;
                while (metaEnd < uzsBuffer.length && uzsBuffer[metaEnd] !== 0x00) {
                    metaEnd++;
                }
                
                try {
                    const metaStr = uzsBuffer.slice(payloadStart, metaEnd).toString('utf8');
                    metadata = JSON.parse(metaStr);
                } catch (e) {
                    console.warn('[UZS] Falha ao ler metadados:', e.message);
                }
                
                payloadStart = metaEnd < uzsBuffer.length ? metaEnd + 1 : metaEnd; // Pular o nulo quando existir
            }

            // Derivação de chave PBKDF2-SHA512 (600k iters, formato UZS!)
            const key = await new Promise((res, rej) =>
                crypto.pbkdf2(password, salt, 600000, 32, 'sha512', (e, k) => e ? rej(e) : res(k))
            );

            let decrypted;
            try {
                const payload    = uzsBuffer.slice(payloadStart);
                const authTag    = payload.slice(payload.length - 16);
                const ciphertext = payload.slice(0, payload.length - 16);
                const decipher   = crypto.createDecipheriv('aes-256-gcm', key, iv);
                decipher.setAuthTag(authTag);
                decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
            } catch (_) {
                return { success: false, error: 'Senha incorreta.' };
            }

            // UZS! payload has 64 bytes of random padding before the source
            if (decrypted.length < 64) return { success: false, error: 'Conteúdo do arquivo corrompido.' };
            const sourceBuffer = decrypted.slice(64);

            const isBytecode = metadata?.type === 'bytecode' ||
                               (sourceBuffer.length >= 8 && sourceBuffer.slice(0, 8).toString('ascii') === 'UZB!!BZU');

            // Binary bytecode cannot be safely round-tripped as a UTF-8 string over IPC
            // (lone surrogate chars from invalid UTF-8 sequences cause structured-clone to hang).
            // Transmit bytecode as base64; plain source as UTF-8.
            if (isBytecode) {
                return { success: true, source: sourceBuffer.toString('base64'), isBytecode, metadata, encoding: 'base64' };
            }

            const source = sourceBuffer.toString('utf8');
            return { success: true, source, isBytecode: false, metadata, encoding: 'utf8' };
        } catch (e) {
            return { success: false, error: e.message };
        }
    });

    ipcMain.handle('uvlm:getStatus', () => uvlm?.currentStatus || 'idle');

    ipcMain.handle('uvlm:getVersion', async () => {
        if (!uvlm) return 'UpperZetta UVLM 1.0';
        return uvlm.getVersion();
    });

    ipcMain.handle('uvlm:clean', async (_, { dir }) => {
        let count = 0;
        try {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const e of entries) {
                if (!e.isDirectory() && e.name.endsWith('.uzb')) {
                    fs.unlinkSync(path.join(dir, e.name));
                    count++;
                }
            }
        } catch (e) { console.error('[uvlm:clean]', e); }
        return count;
    });

    ipcMain.handle('uvlm:exportUZS', async (_, { filePath, password, customContent }) => {
        try {
            let targetFilePath = filePath;
            let sourceCode = customContent;

            if (!sourceCode) {
                // Se o usuário tentar selar um .uzb, tentamos encontrar o .uz original para manter o código editável
                if (filePath.endsWith('.uzb')) {
                    const sourcePath = filePath.replace('.uzb', '.uz');
                    if (fs.existsSync(sourcePath)) {
                        targetFilePath = sourcePath;
                    }
                }
                sourceCode = fs.readFileSync(targetFilePath, 'utf8');
            }
            const isBytecode = sourceCode.startsWith('UZB!!BZU');
            
            // PBKDF2-SHA512, 600 000 iters, 32-byte key
            const salt = crypto.randomBytes(16);
            const key = await new Promise((res, rej) =>
                crypto.pbkdf2(password, salt, 600000, 32, 'sha512', (err, k) => err ? rej(err) : res(k))
            );

            // AES-256-GCM
            const iv = crypto.randomBytes(12);
            const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
            
            // Adicionar 64 bytes de padding aleatório
            const padding = crypto.randomBytes(64);
            const plaintext = Buffer.concat([padding, Buffer.from(sourceCode, 'utf8')]);
            
            const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
            const authTag = cipher.getAuthTag();

            // Metadata: agora indicamos se o que está lá dentro é fonte ou bytecode
            const metadataObj = {
                type: isBytecode ? 'bytecode' : 'source',
                original_file: path.basename(targetFilePath),
                sealed_at: new Date().toISOString()
            };
            const metadataStr = JSON.stringify(metadataObj);
            const metadataBuf = Buffer.concat([Buffer.from(metadataStr, 'utf8'), Buffer.from([0x00])]);

            // Formato UZS!: magic(4) + mirror(4) + version(2) + salt(16) + iv(12) + reserved(6) + metadata(N) + ciphertext + authTag(16)
            const magic = Buffer.from('UZS!');
            const mirror = Buffer.from('!SZU');
            const version = Buffer.alloc(2); version.writeUInt16BE(1);
            const reserved = Buffer.alloc(6);

            const uzsData = Buffer.concat([
                magic, mirror, version, salt, iv, reserved, metadataBuf, encrypted, authTag
            ]);

            const uzsPath = filePath.replace(/\.uz[sb]?$/, '.uzs');
            fs.writeFileSync(uzsPath, uzsData);

            return { success: true, uzsPath, isSource: !isBytecode };
        } catch (e) {
            return { success: false, error: e.message };
        }
    });
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
