const { app, BrowserWindow, shell, Menu, dialog, ipcMain } = require('electron');
const path = require('path');

if (!app.requestSingleInstanceLock()) app.quit();

let win;
function createWindow() {
  win = new BrowserWindow({
    width: 1150, height: 800, minWidth: 380, minHeight: 600,
    title: 'فواتح ومناسبات IBRA',
    backgroundColor: '#06100a',
    icon: path.join(__dirname, '..', 'resources', 'icon.ico'),
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, nodeIntegration: false, spellcheck: false, preload: path.join(__dirname, 'preload.js') }
  });
  Menu.setApplicationMenu(null);
  win.loadFile(path.join(__dirname, '..', 'www', 'index.html'));
  // الروابط الخارجية (واتساب، تليكرام، الموقع) تفتح بالمتصفح
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith('file://')) { e.preventDefault(); shell.openExternal(url); }
  });
}

/* ---------- التحديث التلقائي (نسخة التنصيب فقط) ---------- */
const send = (s) => { if (win && !win.isDestroyed()) win.webContents.send('upd:status', s); };
let updater = null, asked = false;
function setupUpdater() {
  if (!app.isPackaged || process.env.PORTABLE_EXECUTABLE_DIR) return;   // النسخة المحمولة تتحدث من زر التنزيل
  try { updater = require('electron-updater').autoUpdater; } catch (e) { return; }
  updater.autoDownload = true;
  updater.autoInstallOnAppQuit = true;
  updater.on('checking-for-update', () => send({ state: 'checking' }));
  updater.on('update-available', (i) => send({ state: 'downloading', version: i.version, percent: 0 }));
  updater.on('update-not-available', () => send({ state: 'latest' }));
  updater.on('download-progress', (p) => send({ state: 'downloading', percent: Math.round(p.percent) }));
  updater.on('error', (e) => send({ state: 'error', message: String(e && e.message || e).slice(0, 200) }));
  updater.on('update-downloaded', async (i) => {
    send({ state: 'ready', version: i.version });
    if (asked) return; asked = true;
    const r = await dialog.showMessageBox(win, {
      type: 'info', buttons: ['إعادة التشغيل الآن', 'لاحقاً'], defaultId: 0, cancelId: 1,
      title: 'تحديث جديد', message: `نزل الإصدار ${i.version} من فواتح ومناسبات`,
      detail: 'أعد تشغيل التطبيق حتى يتثبت التحديث. بياناتك تبقى. إذا اخترت لاحقاً يتثبت تلقائياً لمن تسكّر التطبيق.'
    });
    if (r.response === 0) setImmediate(() => updater.quitAndInstall());
  });
  const check = () => updater.checkForUpdates().catch(() => {});
  setTimeout(check, 5000);                       // أول ما يشتغل
  setInterval(check, 6 * 60 * 60 * 1000);        // وكل 6 ساعات
}
ipcMain.handle('upd:check', async () => {
  if (!updater) return { state: 'unsupported' };
  try { const r = await updater.checkForUpdates(); return { state: r && r.isUpdateAvailable ? 'downloading' : 'latest' }; }
  catch (e) { return { state: 'error', message: String(e && e.message || e) }; }
});

app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
app.whenReady().then(() => { createWindow(); setupUpdater(); });
app.on('window-all-closed', () => app.quit());
