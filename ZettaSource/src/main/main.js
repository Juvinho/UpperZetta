const { app, BrowserWindow, Menu, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn, exec } = require('child_process');

let mainWindow;
let uvlmProcess = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 500,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#0D0D0D',
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Build application menu
  const menuTemplate = [
    {
      label: 'Arquivo',
      submenu: [
        { label: 'Novo Arquivo', accelerator: 'CmdOrCtrl+N', click: () => mainWindow.webContents.send('menu:new-file') },
        { label: 'Abrir Arquivo...', accelerator: 'CmdOrCtrl+P', click: () => openFilePicker() },
        { label: 'Abrir Pasta...', accelerator: 'CmdOrCtrl+Shift+O', click: () => openFolderPicker() },
        { type: 'separator' },
        { label: 'Salvar', accelerator: 'CmdOrCtrl+S', click: () => mainWindow.webContents.send('menu:save') },
        { label: 'Salvar como...', accelerator: 'CmdOrCtrl+Shift+S', click: () => mainWindow.webContents.send('menu:save-as') },
        { type: 'separator' },
        { label: 'Sair', accelerator: 'CmdOrCtrl+Q', click: () => app.quit() }
      ]
    },
    {
      label: 'Editar',
      submenu: [
        { label: 'Desfazer', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
        { label: 'Refazer', accelerator: 'CmdOrCtrl+Y', role: 'redo' },
        { type: 'separator' },
        { label: 'Recortar', accelerator: 'CmdOrCtrl+X', role: 'cut' },
        { label: 'Copiar', accelerator: 'CmdOrCtrl+C', role: 'copy' },
        { label: 'Colar', accelerator: 'CmdOrCtrl+V', role: 'paste' },
        { type: 'separator' },
        { label: 'Buscar', accelerator: 'CmdOrCtrl+F', click: () => mainWindow.webContents.send('menu:find') },
        { label: 'Ir para linha...', accelerator: 'CmdOrCtrl+G', click: () => mainWindow.webContents.send('menu:goto-line') }
      ]
    },
    {
      label: 'Ver',
      submenu: [
        { label: 'Sidebar', accelerator: 'CmdOrCtrl+B', click: () => mainWindow.webContents.send('menu:toggle-sidebar') },
        { label: 'Painel Inferior', accelerator: 'CmdOrCtrl+J', click: () => mainWindow.webContents.send('menu:toggle-panel') },
        { label: 'Terminal', accelerator: 'CmdOrCtrl+`', click: () => mainWindow.webContents.send('menu:toggle-terminal') },
        { type: 'separator' },
        { label: 'Tema Claro/Escuro', click: () => mainWindow.webContents.send('menu:toggle-theme') },
        { type: 'separator' },
        { label: 'Aumentar Fonte', accelerator: 'CmdOrCtrl+Plus', click: () => mainWindow.webContents.send('menu:font-size-up') },
        { label: 'Diminuir Fonte', accelerator: 'CmdOrCtrl+-', click: () => mainWindow.webContents.send('menu:font-size-down') }
      ]
    },
    {
      label: 'UVLM',
      submenu: [
        { label: 'Compilar', accelerator: 'CmdOrCtrl+Shift+B', click: () => mainWindow.webContents.send('menu:compile') },
        { label: 'Executar', accelerator: 'F5', click: () => mainWindow.webContents.send('menu:run') },
        { label: 'Disassemble .uzb', accelerator: 'CmdOrCtrl+Shift+D', click: () => mainWindow.webContents.send('menu:disasm') },
        { label: 'GLP Report', accelerator: 'CmdOrCtrl+Shift+G', click: () => mainWindow.webContents.send('menu:glp-report') },
        { type: 'separator' },
        { label: 'Selar arquivo (.uzs)...', click: () => mainWindow.webContents.send('menu:seal') },
        { label: 'Desselar arquivo...', click: () => mainWindow.webContents.send('menu:unseal') }
      ]
    },
    {
      label: 'Ferramentas',
      submenu: [
        { label: 'Paleta de Comandos', accelerator: 'CmdOrCtrl+Shift+P', click: () => mainWindow.webContents.send('menu:command-palette') },
        { type: 'separator' },
        { label: 'DevTools', click: () => mainWindow.webContents.openDevTools() }
      ]
    },
    {
      label: 'Ajuda',
      submenu: [
        { label: 'Sobre o ZettaSource', click: () => mainWindow.webContents.send('menu:about') },
        { label: 'Documentação UpperZetta', click: () => shell.openExternal('https://github.com') }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);
}

// IPC handlers for file system operations
ipcMain.handle('fs:read-file', async (event, filePath) => {
  return fs.readFileSync(filePath, 'utf8');
});

ipcMain.handle('fs:write-file', async (event, filePath, content) => {
  fs.writeFileSync(filePath, content, 'utf8');
  return true;
});

ipcMain.handle('fs:read-dir', async (event, dirPath) => {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  return entries.map(e => ({
    name: e.name,
    isDirectory: e.isDirectory(),
    path: path.join(dirPath, e.name)
  }));
});

ipcMain.handle('fs:open-file-dialog', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'UpperZetta', extensions: ['uz', 'up', 'upz', 'uzs', 'uzb'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('fs:open-folder-dialog', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('fs:save-file-dialog', async (event, defaultName) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: defaultName,
    filters: [{ name: 'UpperZetta', extensions: ['uz'] }]
  });
  return result.canceled ? null : result.filePath;
});

// UVLM process handlers
ipcMain.handle('uvlm:run-command', async (event, args, cwd) => {
  return new Promise((resolve) => {
    const process = spawn('java', ['Main', ...args], {
      cwd: cwd || app.getPath('userData'),
      shell: true
    });

    let stdout = '';
    let stderr = '';

    process.stdout.on('data', (data) => {
      stdout += data.toString();
      mainWindow.webContents.send('uvlm:output', data.toString());
    });

    process.stderr.on('data', (data) => {
      stderr += data.toString();
      mainWindow.webContents.send('uvlm:output-err', data.toString());
    });

    process.on('close', (code) => {
      resolve({ code, stdout, stderr });
    });
  });
});

// Window controls
ipcMain.on('window:minimize', () => mainWindow.minimize());
ipcMain.on('window:maximize', () => {
  if (mainWindow.isMaximized()) mainWindow.unmaximize();
  else mainWindow.maximize();
});
ipcMain.on('window:close', () => mainWindow.close());

function openFilePicker() {
  dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [{ name: 'UpperZetta', extensions: ['uz', 'up', 'upz', 'uzs', 'uzb'] }, { name: 'All Files', extensions: ['*'] }]
  }).then(r => { if (!r.canceled) mainWindow.webContents.send('file:open', r.filePaths[0]); });
}

function openFolderPicker() {
  dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  }).then(r => { if (!r.canceled) mainWindow.webContents.send('folder:open', r.filePaths[0]); });
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
