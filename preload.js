const { contextBridge, ipcRenderer } = require('electron');

// Expose a secure API to the renderer (Simpel.html) via window.electronApi.
// contextIsolation keeps Node.js out of the renderer while still allowing
// controlled access to the main process via ipcRenderer.invoke().
contextBridge.exposeInMainWorld('electronApi', {
  load:           ()       => ipcRenderer.invoke('load'),
  save:           (data)   => ipcRenderer.invoke('save', data),
  get_data_path:  ()       => ipcRenderer.invoke('get_data_path'),
  notify:         (t, m, id) => ipcRenderer.invoke('notify', t, m, id),
  export_dialog:  (data)   => ipcRenderer.invoke('export_dialog', data),
  import_dialog:  ()       => ipcRenderer.invoke('import_dialog'),
  ensure_ollama:  ()       => ipcRenderer.invoke('ensure_ollama'),
  onOpenTask:     (cb)     => ipcRenderer.on('open-task', (_e, id) => cb(id)),
  app_version:    ()       => ipcRenderer.invoke('app:version'),
  update_check:   ()       => ipcRenderer.invoke('update:check'),
  update_install: ()       => ipcRenderer.invoke('update:install'),
  onUpdateEvent:  (cb)     => {
    ipcRenderer.on('update:available',  (_e, d) => cb('available',  d));
    ipcRenderer.on('update:progress',   (_e, d) => cb('progress',   d));
    ipcRenderer.on('update:downloaded', (_e, d) => cb('downloaded', d));
    ipcRenderer.on('update:error',      (_e, d) => cb('error',      d));
  },
});
