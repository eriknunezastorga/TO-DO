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
  app_version:     ()       => ipcRenderer.invoke('app:version'),
  update_check:    ()       => ipcRenderer.invoke('update:check'),
  update_download: (url)    => ipcRenderer.invoke('update:download', url),
  get_email_config: ()       => ipcRenderer.invoke('get_email_config'),
  save_email_config: (cfg)   => ipcRenderer.invoke('save_email_config', cfg),
  send_email:       (s, b)   => ipcRenderer.invoke('send_email', s, b),
  test_email:       (cfg)    => ipcRenderer.invoke('test_email', cfg),
});
