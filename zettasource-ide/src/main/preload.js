const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('zs', {
  // ── Window ──────────────────────────────────────────────────
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close:    () => ipcRenderer.send('window:close'),
  onMaximized: (cb) => ipcRenderer.on('window:maximized', (_, v) => cb(v)),

  // ── File System ─────────────────────────────────────────────
  openFileDialog:   (opts) => ipcRenderer.invoke('fs:open-file-dialog', opts),
  openFolderDialog: ()     => ipcRenderer.invoke('fs:open-folder-dialog'),
  saveFileDialog:   (opts) => ipcRenderer.invoke('fs:save-file-dialog', opts),

  readFile:   (p)      => ipcRenderer.invoke('fs:read-file', p),
  writeFile:  (p, c)   => ipcRenderer.invoke('fs:write-file', p, c),
  createFile: (p, c)   => ipcRenderer.invoke('fs:create-file', p, c),
  deleteFile: (p)      => ipcRenderer.invoke('fs:delete-file', p),
  renameFile: (o, n)   => ipcRenderer.invoke('fs:rename', o, n),
  mkdir:      (p)      => ipcRenderer.invoke('fs:mkdir', p),
  readDir:    (p)      => ipcRenderer.invoke('fs:read-dir', p),

  // ── Config ──────────────────────────────────────────────────
  configGet:    (k, def) => ipcRenderer.invoke('config:get', k, def),
  configSet:    (k, v)   => ipcRenderer.invoke('config:set', k, v),
  configGetAll: ()       => ipcRenderer.invoke('config:get-all'),

  // ── UVLM ────────────────────────────────────────────────────
  uvlmCompile: (filePath)   => ipcRenderer.send('uvlm:compile', filePath),
  uvlmRun:     (uzbPath)    => ipcRenderer.send('uvlm:run', uzbPath),
  uvlmStop:    ()           => ipcRenderer.send('uvlm:stop'),
  uvlmDisasm:  (uzbPath)    => ipcRenderer.send('uvlm:disasm', uzbPath),
  uvlmGlp:     (uzbPath)    => ipcRenderer.send('uvlm:glp', uzbPath),
  getJarPath:  ()           => ipcRenderer.invoke('uvlm:get-jar-path'),

  onUvlmOutput: (cb) => {
    const fn = (_, d) => cb(d);
    ipcRenderer.on('uvlm:output', fn);
    return () => ipcRenderer.removeListener('uvlm:output', fn);
  },
  onUvlmDone: (cb) => {
    const fn = (_, d) => cb(d);
    ipcRenderer.on('uvlm:done', fn);
    return () => ipcRenderer.removeListener('uvlm:done', fn);
  },

  // ── Terminal (node-pty) ─────────────────────────────────────
  createTerminal: (cwd) => ipcRenderer.invoke('terminal:create', cwd),
  writeTerminal:  (id, data) => ipcRenderer.send('terminal:write', id, data),
  resizeTerminal: (id, cols, rows) => ipcRenderer.send('terminal:resize', id, cols, rows),
  killTerminal:   (id) => ipcRenderer.send('terminal:kill', id),

  onTerminalData: (id, cb) => {
    const fn = (_, data) => cb(data);
    ipcRenderer.on(`terminal:data:${id}`, fn);
    return () => ipcRenderer.removeListener(`terminal:data:${id}`, fn);
  },
  onTerminalExit: (id, cb) => {
    const fn = () => cb();
    ipcRenderer.once(`terminal:exit:${id}`, fn);
    return () => ipcRenderer.removeListener(`terminal:exit:${id}`, fn);
  },

  // ── Shell ───────────────────────────────────────────────────
  openExternal: (url) => ipcRenderer.send('shell:open-external', url),

  // ── Legacy compat (some old calls still reference these) ────
  onMenu:        (ch, cb) => ipcRenderer.on(ch, cb),
  onFileOpen:    (cb)     => ipcRenderer.on('file:open',   (_, p) => cb(p)),
  onFolderOpen:  (cb)     => ipcRenderer.on('folder:open', (_, p) => cb(p)),
});
