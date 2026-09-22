/**
 * CloudPost Desktop Preload Script
 * 
 * Securely bridges native Electron desktop capabilities to the renderer window:
 * - Flags environment as Desktop Native Tool
 * - Provides system and architecture information
 * - Dispatches native menu actions (New Request, Import, Export, Tabs)
 * - Enables native open/save dialogs with zero CORS restrictions
 */

const { contextBridge, ipcRenderer } = require('electron');

// Explicit flags for desktop platform detection
window.__IS_DESKTOP_TOOL__ = true;
window.isDesktop = true;

// Expose safe desktop bridge API
window.electronAPI = {
  isDesktop: true,
  platform: process.platform,
  arch: process.arch,
  versions: {
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
  },
  getInfo: () => ipcRenderer.invoke('desktop:get-info'),
  showOpenDialog: (options) => ipcRenderer.invoke('desktop:show-open-dialog', options),
  showSaveDialog: (options) => ipcRenderer.invoke('desktop:show-save-dialog', options),
  openExternal: (url) => ipcRenderer.invoke('desktop:open-external', url),
  onMenuAction: (callback) => {
    const handler = (_event, action) => {
      try {
        callback(action);
      } catch (err) {
        console.error('Error handling desktop menu action:', err);
      }
    };
    ipcRenderer.on('menu:action', handler);
    return () => {
      ipcRenderer.removeListener('menu:action', handler);
    };
  },
};
