import { createRequire } from 'node:module';
import { app, dialog } from 'electron';

const require = createRequire(import.meta.url);
const { autoUpdater } = require('electron-updater');
/** @type {import('electron').BrowserWindow | null} */
let targetWindow = null;

function sendStatus(status, detail) {
  if (!targetWindow || targetWindow.isDestroyed()) return;
  targetWindow.webContents.send('niha-desktop-update', { status, detail });
}

async function promptInstall(version) {
  if (!targetWindow || targetWindow.isDestroyed()) return;

  const { response } = await dialog.showMessageBox(targetWindow, {
    type: 'info',
    buttons: ['إعادة التشغيل الآن', 'لاحقاً'],
    defaultId: 0,
    cancelId: 1,
    title: 'تحديث Niha',
    message: `يتوفر إصدار جديد (${version})`,
    detail: 'سيتم تثبيت التحديث وإعادة تشغيل البرنامج. يُفضّل إغلاق أي طلب مفتوح قبل المتابعة.',
  });

  if (response === 0) {
    autoUpdater.quitAndInstall(false, true);
  }
}

/**
 * @param {import('electron').BrowserWindow} mainWindow
 */
export function initAutoUpdater(mainWindow) {
  if (!app.isPackaged) return;

  targetWindow = mainWindow;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => sendStatus('checking'));
  autoUpdater.on('update-available', (info) => sendStatus('available', info.version));
  autoUpdater.on('update-not-available', () => sendStatus('idle'));
  autoUpdater.on('download-progress', (progress) => {
    sendStatus('downloading', Math.round(progress.percent ?? 0));
  });
  autoUpdater.on('update-downloaded', (info) => {
    sendStatus('ready', info.version);
    promptInstall(info.version).catch((err) => {
      console.error('[niha-updater] install prompt failed', err);
    });
  });
  autoUpdater.on('error', (err) => {
    console.error('[niha-updater]', err?.message ?? err);
    sendStatus('error');
  });

  const check = () => {
    autoUpdater.checkForUpdates().catch((err) => {
      console.error('[niha-updater] check failed', err?.message ?? err);
    });
  };

  setTimeout(check, 10_000);
  setInterval(check, 4 * 60 * 60 * 1000);
}

export function checkForUpdatesNow() {
  if (!app.isPackaged) return Promise.resolve(null);
  return autoUpdater.checkForUpdates();
}
