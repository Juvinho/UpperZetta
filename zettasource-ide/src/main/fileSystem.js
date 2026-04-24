const { ipcMain } = require('electron');
const fs = require('fs-extra');
const path = require('path');

ipcMain.handle('fs-read-file', async (event, filePath) => {
    try {
        return await fs.readFile(filePath, 'utf8');
    } catch (err) {
        return { error: err.message };
    }
});

ipcMain.handle('fs-write-file', async (event, filePath, content) => {
    try {
        await fs.writeFile(filePath, content, 'utf8');
        return { success: true };
    } catch (err) {
        return { error: err.message };
    }
});

ipcMain.handle('fs-read-dir', async (event, dirPath) => {
    try {
        const files = await fs.readdir(dirPath);
        const stats = await Promise.all(files.map(async (file) => {
            const fullPath = path.join(dirPath, file);
            const stat = await fs.stat(fullPath);
            return {
                name: file,
                path: fullPath,
                isDirectory: stat.isDirectory(),
                size: stat.size,
                extension: path.extname(file).toLowerCase()
            };
        }));
        return stats;
    } catch (err) {
        return { error: err.message };
    }
});

ipcMain.handle('fs-exists', async (event, filePath) => {
    return await fs.pathExists(filePath);
});

ipcMain.handle('fs-mkdir', async (event, dirPath) => {
    try {
        await fs.ensureDir(dirPath);
        return { success: true };
    } catch (err) {
        return { error: err.message };
    }
});

ipcMain.handle('fs-rename', async (event, oldPath, newPath) => {
    try {
        await fs.rename(oldPath, newPath);
        return { success: true };
    } catch (err) {
        return { error: err.message };
    }
});

ipcMain.handle('fs-delete', async (event, filePath) => {
    try {
        await fs.remove(filePath);
        return { success: true };
    } catch (err) {
        return { error: err.message };
    }
});
