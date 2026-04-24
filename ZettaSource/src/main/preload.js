const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('zs', {
  // File system
  readFile: (p) => ipcRenderer.invoke('fs:read-file', p),
  writeFile: (p, c) => ipcRenderer.invoke('fs:write-file', p, c),
  readDir: (p) => ipcRenderer.invoke('fs:read-dir', p),
  openFileDialog: () => ipcRenderer.invoke('fs:open-file-dialog'),
  openFolderDialog: () => ipcRenderer.invoke('fs:open-folder-dialog'),
  saveFileDialog: (name) => ipcRenderer.invoke('fs:save-file-dialog', name),
  // UVLM
  runUVLM: (args, cwd) => ipcRenderer.invoke('uvlm:run-command', args, cwd),
  onUVLMOutput: (cb) => ipcRenderer.on('uvlm:output', (_, d) => cb(d)),
  onUVLMOutputErr: (cb) => ipcRenderer.on('uvlm:output-err', (_, d) => cb(d, true)),
  // Window
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close'),
  // Menu events
  onMenu: (channel, cb) => ipcRenderer.on(channel, cb),
  // File open
  onFileOpen: (cb) => ipcRenderer.on('file:open', (_, p) => cb(p)),
  onFolderOpen: (cb) => ipcRenderer.on('folder:open', (_, p) => cb(p))
});
