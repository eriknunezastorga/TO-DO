const { app, BrowserWindow, ipcMain, dialog, Notification, Tray, Menu } = require('electron');
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

ipcMain.handle('notify', (_event, title, message, taskId) => {
  if (Notification.isSupported()) {
    const n = new Notification({ title, body: message });
    if (taskId && mainWindow) {
      n.on('click', () => {
        mainWindow.show();
        mainWindow.focus();
        mainWindow.webContents.send('open-task', taskId);
      });
    }
    n.show();
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

ipcMain.handle('app:version', () => app.getVersion());

ipcMain.handle('update:check', async () => {
  if (!app.isPackaged) return { devMode: true };
  try {
    const res = await autoUpdater.checkForUpdates();
    return { updateInfo: res ? res.updateInfo : null };
  } catch (e) {
    return { error: e.message };
  }
});

ipcMain.handle('update:install', () => {
  if (app.isPackaged) {
    isQuitting = true;
    autoUpdater.quitAndInstall();
  }
});

// =========================================================
// WINDOW & TRAY
// =========================================================

let mainWindow = null;
let tray = null;
let isQuitting = false;

function createWindow() {
  mainWindow = new BrowserWindow({
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

  mainWindow.loadFile('Simpel.html');
  mainWindow.setMenuBarVisibility(false);

  // Hide to tray on close instead of quitting
  mainWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });
}

function createTray() {
  tray = new Tray(path.join(__dirname, 'build', 'icon.png'));
  tray.setToolTip('Simpel');

  const buildMenu = () => {
    const openAtLogin = app.getLoginItemSettings().openAtLogin;
    return Menu.buildFromTemplate([
      {
        label: 'Öppna Simpel',
        click: () => { mainWindow.show(); mainWindow.focus(); }
      },
      { type: 'separator' },
      {
        label: 'Starta med Windows',
        type: 'checkbox',
        checked: openAtLogin,
        click: (item) => {
          app.setLoginItemSettings({ openAtLogin: item.checked, openAsHidden: true });
          tray.setContextMenu(buildMenu());
        }
      },
      { type: 'separator' },
      {
        label: 'Avsluta',
        click: () => { isQuitting = true; app.quit(); }
      }
    ]);
  };

  tray.setContextMenu(buildMenu());
  tray.on('double-click', () => { mainWindow.show(); mainWindow.focus(); });
}

function sendToRenderer(channel, payload) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, payload);
  }
}

function setupAutoUpdater() {
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('update-available', (info) => {
    sendToRenderer('update:available', { version: info && info.version });
    if (Notification.isSupported()) {
      new Notification({
        title: 'Simpel — Uppdatering hittad',
        body: 'En ny version laddas ner i bakgrunden...',
      }).show();
    }
  });

  autoUpdater.on('download-progress', (progress) => {
    sendToRenderer('update:progress', { percent: progress && progress.percent });
  });

  autoUpdater.on('update-downloaded', (info) => {
    sendToRenderer('update:downloaded', { version: info && info.version });
    if (Notification.isSupported()) {
      new Notification({
        title: 'Simpel — Uppdatering klar',
        body: 'Starta om appen för att installera den nya versionen.',
      }).show();
    }
  });

  autoUpdater.on('error', (err) => {
    sendToRenderer('update:error', { message: err && err.message });
  });

  // Check on startup, then every 4 hours
  autoUpdater.checkForUpdates().catch(() => {});
  setInterval(() => autoUpdater.checkForUpdates().catch(() => {}), 4 * 60 * 60 * 1000);
}

app.whenReady().then(() => {
  ensureOllama().catch(() => {});
  createWindow();
  createTray();
  if (app.isPackaged) setupAutoUpdater();
});

// Keep app alive in tray — only quit via tray menu
app.on('window-all-closed', () => {});
