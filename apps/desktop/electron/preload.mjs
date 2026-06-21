import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  isDesktop: true,
  platform: process.platform,
  onUpdateStatus(callback) {
    const handler = (_event, payload) => {
      callback(payload);
    };
    ipcRenderer.on('niha-desktop-update', handler);
    return () => ipcRenderer.removeListener('niha-desktop-update', handler);
  },
  checkForUpdates() {
    return ipcRenderer.invoke('niha-check-updates');
  },
  getAppVersion() {
    return ipcRenderer.invoke('niha-app-version');
  },
});
