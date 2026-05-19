const { app, BrowserWindow, ipcMain, dialog, Notification, Tray, Menu, shell } = require('electron');
const fs    = require('fs');
const path  = require('path');
const http  = require('http');
const https = require('https');
const { spawn } = require('child_process');

const UPDATE_REPO_OWNER = 'eriknunezastorga';
const UPDATE_REPO_NAME  = 'Simpel';

function fetchLatestRelease(owner, repo) {
  return new Promise((resolve, reject) => {
    const req = https.get({
      hostname: 'api.github.com',
      path: `/repos/${owner}/${repo}/releases/latest`,
      headers: {
        'User-Agent': 'Simpel',
        'Accept': 'application/vnd.github+json',
      },
    }, (res) => {
      if (res.statusCode === 404) { res.resume(); resolve(null); return; }
      if (res.statusCode < 200 || res.statusCode >= 300) {
        res.resume();
        reject(new Error(`GitHub API svarade ${res.statusCode}`));
        return;
      }
      let body = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch (e) { reject(new Error('Kunde inte tolka GitHub-svaret')); }
      });
    });
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(new Error('Timeout mot GitHub')); });
  });
}

function compareSemver(a, b) {
  const norm = v => String(v).replace(/^v/i, '').split(/[-+]/)[0].split('.').map(n => parseInt(n, 10) || 0);
  const aa = norm(a), bb = norm(b);
  for (let i = 0; i < Math.max(aa.length, bb.length); i++) {
    const x = aa[i] || 0, y = bb[i] || 0;
    if (x > y) return 1;
    if (x < y) return -1;
  }
  return 0;
}

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
  const currentVersion = app.getVersion();
  try {
    const release = await fetchLatestRelease(UPDATE_REPO_OWNER, UPDATE_REPO_NAME);
    if (!release || !release.tag_name) {
      return { upToDate: true, currentVersion };
    }
    const latestVersion = String(release.tag_name).replace(/^v/i, '');
    if (compareSemver(latestVersion, currentVersion) <= 0) {
      return { upToDate: true, currentVersion, latestVersion };
    }
    const exeAsset = (release.assets || []).find(a => /\.exe$/i.test(a.name));
    return {
      updateAvailable: true,
      currentVersion,
      latestVersion,
      downloadUrl: exeAsset ? exeAsset.browser_download_url : release.html_url,
      releaseUrl:  release.html_url,
      assetName:   exeAsset ? exeAsset.name : null,
    };
  } catch (e) {
    return { error: e.message };
  }
});

ipcMain.handle('update:download', async (_e, url) => {
  if (typeof url !== 'string' || !/^https:\/\/github\.com\//.test(url)) {
    return { ok: false, error: 'Ogiltig URL' };
  }
  try {
    await shell.openExternal(url);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
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

app.whenReady().then(() => {
  ensureOllama().catch(() => {});
  createWindow();
  createTray();
});

// Keep app alive in tray — only quit via tray menu
app.on('window-all-closed', () => {});
