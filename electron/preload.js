// جسر بسيط بين الصفحة والتحديث التلقائي بنسخة الحاسبة
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('ibraDesktop', {
  updater: !process.env.PORTABLE_EXECUTABLE_DIR,
  check: () => ipcRenderer.invoke('upd:check'),
  onStatus: (cb) => ipcRenderer.on('upd:status', (_e, s) => cb(s))
});
