// sidebar.js — File Explorer

let currentFolderPath = null;
let expandedDirs = new Set();
let activeFilePath = null;

async function openFolder(folderPath) {
  if (!folderPath) return;
  currentFolderPath = folderPath;
  document.getElementById('sidebar-no-folder').classList.add('hidden');
  document.getElementById('file-tree').classList.remove('hidden');
  await renderTree(folderPath, document.getElementById('file-tree'), 0);
}

async function renderTree(dirPath, container, depth) {
  try {
    const entries = await window.zs.readDir(dirPath);
    container.innerHTML = '';

    // Folders first, then files
    entries.sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue; // skip hidden

      const item = document.createElement('div');
      item.className = 'tree-item';
      item.style.paddingLeft = `${8 + depth * 12}px`;
      item.dataset.path = entry.path;

      const ext = entry.name.split('.').pop().toLowerCase();
      if (!entry.isDirectory) item.dataset.ext = ext;

      const arrow = document.createElement('span');
      arrow.className = 'tree-arrow';

      const name = document.createElement('span');
      name.className = 'tree-name';

      if (entry.isDirectory) {
        const isExpanded = expandedDirs.has(entry.path);
        arrow.textContent = isExpanded ? '▼' : '▶';
        name.textContent = entry.name;

        const subContainer = document.createElement('div');
        subContainer.className = 'tree-sub';
        if (!isExpanded) subContainer.style.display = 'none';

        item.appendChild(arrow);
        item.appendChild(name);
        container.appendChild(item);
        container.appendChild(subContainer);

        if (isExpanded) {
          await renderTree(entry.path, subContainer, depth + 1);
        }

        item.addEventListener('click', async (e) => {
          e.stopPropagation();
          if (expandedDirs.has(entry.path)) {
            expandedDirs.delete(entry.path);
            arrow.textContent = '▶';
            subContainer.style.display = 'none';
          } else {
            expandedDirs.add(entry.path);
            arrow.textContent = '▼';
            subContainer.style.display = '';
            if (subContainer.children.length === 0) {
              await renderTree(entry.path, subContainer, depth + 1);
            }
          }
        });
      } else {
        // File
        const prefix = entry.name.endsWith('.uzs') ? '🔒 ' : '';
        arrow.textContent = '';
        name.textContent = prefix + entry.name;

        item.appendChild(arrow);
        item.appendChild(name);
        container.appendChild(item);

        if (entry.path === activeFilePath) item.classList.add('active');

        item.addEventListener('click', () => openFile(entry.path));
        item.addEventListener('dblclick', () => openFile(entry.path));
      }
    }
  } catch (err) {
    console.error('Tree error:', err);
  }
}

async function openFile(filePath) {
  if (!filePath) return;
  activeFilePath = filePath;

  // Update sidebar active state
  document.querySelectorAll('.tree-item').forEach(el => {
    el.classList.toggle('active', el.dataset.path === filePath);
  });

  const ext = filePath.split('.').pop().toLowerCase();

  if (ext === 'uzs') {
    openUZSDialog(filePath);
    return;
  }

  try {
    const content = await window.zs.readFile(filePath);
    loadFileInEditor(filePath, content);
  } catch (err) {
    showErrorBanner('Não foi possível abrir: ' + filePath);
  }
}

function loadFileInEditor(filePath, content) {
  currentFilePath = filePath;
  isDirty = false;

  // Update welcome screen
  document.getElementById('welcome-screen').classList.add('hidden');

  // Update editor content
  editorSetValueSafe(content);

  // Create or activate tab
  openTab(filePath, content);

  // Update status bar package
  const pkg = extractPackage(content);
  document.getElementById('status-package').textContent = pkg || '—';

  // Focus editor
  if (editorView && editorView.focus) editorView.focus();
}

function extractPackage(content) {
  const m = content.match(/package\s+in\s+([^\s;]+)/);
  return m ? m[1] : null;
}

// Initialize sidebar
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-open-folder').addEventListener('click', async () => {
    const path = await window.zs.openFolderDialog();
    if (path) openFolder(path);
  });

  document.getElementById('btn-open-folder-empty').addEventListener('click', async () => {
    const path = await window.zs.openFolderDialog();
    if (path) openFolder(path);
  });

  // Sidebar resize
  const sidebarResize = document.getElementById('sidebar-resize');
  const sidebar = document.getElementById('sidebar');
  let resizing = false, startX = 0, startW = 0;

  sidebarResize.addEventListener('mousedown', e => {
    resizing = true;
    startX = e.clientX;
    startW = sidebar.offsetWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  });
  document.addEventListener('mousemove', e => {
    if (!resizing) return;
    const newW = Math.max(120, Math.min(480, startW + (e.clientX - startX)));
    sidebar.style.width = newW + 'px';
  });
  document.addEventListener('mouseup', () => {
    if (resizing) { resizing = false; document.body.style.cursor = ''; document.body.style.userSelect = ''; }
  });

  // IPC: folder opened from menu
  window.zs.onFolderOpen(path => openFolder(path));
  window.zs.onFileOpen(path => openFile(path));
});
