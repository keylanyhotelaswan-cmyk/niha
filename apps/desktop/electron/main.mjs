import { app, BrowserWindow, shell, ipcMain } from 'electron';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { repoRoot, startPrintBridge, stopPrintBridge, waitForPrintBridge } from './bridge-lifecycle.mjs';
import { startUiServer, stopUiServer } from './ui-server.mjs';
import { initAutoUpdater, checkForUpdatesNow } from './updater.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const isDev = !app.isPackaged;
const VITE_DEV_URL = process.env.NIHA_VITE_DEV_URL ?? 'http://localhost:5173';

/** @type {BrowserWindow | null} */
let mainWindow = null;

function resolvePaths() {
  if (isDev) {
    return {
      webDist: join(repoRoot, 'apps/web/dist'),
      bridgeEntry: join(repoRoot, 'apps/print-bridge/src/server.mjs'),
      bridgeCwd: join(repoRoot, 'apps/print-bridge'),
    };
  }

  const resources = process.resourcesPath;
  return {
    webDist: join(resources, 'web/dist'),
    bridgeEntry: join(resources, 'print-bridge/src/server.mjs'),
    bridgeCwd: join(resources, 'print-bridge'),
  };
}

async function createWindow() {
  const paths = resolvePaths();

  startPrintBridge({
    entry: paths.bridgeEntry,
    cwd: paths.bridgeCwd,
  });

  const bridgeReady = await waitForPrintBridge();
  if (!bridgeReady) {
    console.warn('[niha-desktop] Print Bridge did not respond on time — printing may fail until it starts.');
  }

  let startUrl = VITE_DEV_URL;
  if (!isDev) {
    const uiPort = await startUiServer(paths.webDist);
    startUrl = `http://127.0.0.1:${uiPort}/`;
  }

  mainWindow = new BrowserWindow({
    width: 1366,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: `Niha v${app.getVersion()}`,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      partition: 'persist:niha',
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  await mainWindow.loadURL(startUrl);

  if (isDev && process.env.NIHA_DESKTOP_DEVTOOLS === '1') {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  initAutoUpdater(mainWindow);
}

ipcMain.handle('niha-check-updates', () => checkForUpdatesNow());
ipcMain.handle('niha-app-version', () => app.getVersion());

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  stopUiServer();
  stopPrintBridge();
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('before-quit', () => {
  stopUiServer();
  stopPrintBridge();
});
