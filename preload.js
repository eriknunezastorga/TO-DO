const { contextBridge, ipcRenderer } = require('electron');

// Expose a secure API to the renderer (Simpel.html) via window.electronApi.
// contextIsolation keeps Node.js out of the renderer while still allowing
// controlled access to the main process via ipcRenderer.invoke().
contextBridge.exposeInMainWorld('electronApi', {
  load:          ()       => ipcRenderer.invoke('load'),
  save:          (data)   => ipcRenderer.invoke('save', data),
  get_data_path: ()       => ipcRenderer.invoke('get_data_path'),
  notify:        (t, m)   => ipcRenderer.invoke('notify', t, m),
  export_dialog: (data)   => ipcRenderer.invoke('export_dialog', data),
  import_dialog: ()       => ipcRenderer.invoke('import_dialog'),
  ensure_ollama: ()       => ipcRenderer.invoke('ensure_ollama'),
});
