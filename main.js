const { app, BrowserWindow, ipcMain, dialog, Notification } = require('electron');
const { autoUpdater } = require('electron-updater');
const fs   = require('fs');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

// =========================================================
// DATA PATH
// =========================================================

function dataPath() {
  const dir = path.join(process.env.APPDATA || app.getPath('userData'), 'Simpel');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, 'data.json');
}

// =========================================================
// OLLAMA HELPERS
// =========================================================

function ollamaRunning() {
  return new Promise(resolve => {
    const req = http.get('http://localhost:11434', res => {
      resolve(res.statusCode < 500);
      res.resume();
    });
    req.on('error', () => resolve(false));
    req.setTimeout(2000, () => { req.destroy(); resolve(false); });
  });
}

async function ensureOllama() {
  if (await ollamaRunning()) return true;
  try {
    const proc = spawn('ollama', ['serve'], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    });
    proc.unref();
  } catch (_) {
    return false;
  }
  // Wait 2 seconds then re-check
  await new Promise(r => setTimeout(r, 2000));
  return ollamaRunning();
}

// =========================================================
// IPC HANDLERS
// =========================================================

ipcMain.handle('load', () => {
  const p = dataPath();
  if (!fs.existsSync(p)) return { tasks: [], projects: [], notes: [] };
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (_) {
    return { tasks: [], projects: [], notes: [] };
  }
});

ipcMain.handle('save', (_event, data) => {
  try {
    fs.writeFileSync(dataPath(), JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (_) {
    return false;
  }
});

ipcMain.handle('get_data_path', () => dataPath());

ipcMain.handle('notify', (_event, title, message) => {
  if (Notification.isSupported()) {
    new Notification({ title, body: message }).show();
  }
});

ipcMain.handle('export_dialog', async (_event, data) => {
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: 'Exportera Simpel-data',
    defaultPath: 'Simpel_export.json',
    filters: [{ name: 'JSON-fil', extensions: ['json'] }],
  });
  if (canceled || !filePath) return { ok: false };
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return { ok: true, path: filePath };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

ipcMain.handle('import_dialog', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: 'Importera Simpel-data',
    filters: [{ name: 'JSON-fil', extensions: ['json'] }],
    properties: ['openFile'],
  });
  if (canceled || !filePaths.length) return { ok: false };
  try {
    const data = JSON.parse(fs.readFileSync(filePaths[0], 'utf8'));
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

ipcMain.handle('ensure_ollama', () => ensureOllama());

// =========================================================
// WINDOW
// =========================================================

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 920,
    minHeight: 640,
    title: 'Simpel',
    icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  win.loadFile('Simpel.html');
  win.setMenuBarVisibility(false);
}

function setupAutoUpdater() {
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('update-available', () => {
    if (Notification.isSupported()) {
      new Notification({
        title: 'Simpel — Uppdatering hittad',
        body: 'En ny version laddas ner i bakgrunden...',
      }).show();
    }
  });

  autoUpdater.on('update-downloaded', () => {
    dialog.showMessageBox({
      type: 'info',
      title: 'Uppdatering redo',
      message: 'En ny version av Simpel har laddats ner.',
      detail: 'Starta om appen nu för att installera uppdateringen.',
      buttons: ['Starta om nu', 'Senare'],
      defaultId: 0,
    }).then(({ response }) => {
      if (response === 0) autoUpdater.quitAndInstall();
    });
  });

  // Check on startup, then every 4 hours
  autoUpdater.checkForUpdates().catch(() => {});
  setInterval(() => autoUpdater.checkForUpdates().catch(() => {}), 4 * 60 * 60 * 1000);
}

app.whenReady().then(() => {
  ensureOllama().catch(() => {});
  createWindow();
  if (app.isPackaged) setupAutoUpdater();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
