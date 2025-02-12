const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Existing methods for website blocking...
  blockWebsites: (websites) => ipcRenderer.invoke('block-websites', websites),
  unblockWebsites: () => ipcRenderer.invoke('unblock-websites'),
  getBlockedWebsites: () => ipcRenderer.invoke('get-blocked-websites'),

  // New methods for application blocking:
  startAppBlocking: (appNames) => ipcRenderer.invoke('start-app-blocking', appNames),
  stopAppBlocking: () => ipcRenderer.invoke('stop-app-blocking'),
  getRunningProcesses: () => ipcRenderer.invoke('get-running-processes'),
});