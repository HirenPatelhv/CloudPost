import { app, BrowserWindow, nativeImage, Menu, ipcMain, shell, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure Electron app name is strictly CloudPost across all operating systems and APIs
app.name = 'CloudPost';
app.setName('CloudPost');

// Ensure Windows taskbar groups and displays the custom CloudPost icon instead of the default Electron icon
if (process.platform === 'win32') {
  app.setAppUserModelId('com.cloudpost.desktop');
}

let mainWindow;

function getAppIconPath() {
  const possiblePaths = [
    path.join(__dirname, '../build/icon.ico'),
    path.join(__dirname, '../public/icon.ico'),
    path.join(__dirname, '../dist/icon.ico'),
    path.join(__dirname, '../build/icons/512x512.png'),
    path.join(__dirname, '../build/icon.png'),
    path.join(__dirname, '../public/icon.png'),
    path.join(__dirname, '../dist/icon.png'),
    path.join(__dirname, '../build/icon.icns'),
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  return undefined;
}

function sendMenuAction(action) {
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send('menu:action', action);
  }
}

function semverCompare(v1, v2) {
  const p1 = (v1 || '0').replace(/^v/, '').split('.').map(n => parseInt(n, 10) || 0);
  const p2 = (v2 || '0').replace(/^v/, '').split('.').map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
    const a = p1[i] || 0;
    const b = p2[i] || 0;
    if (a > b) return 1;
    if (a < b) return -1;
  }
  return 0;
}

async function checkElectronAppUpdate(interactive = false) {
  try {
    const currentVer = app.getVersion() || '2.4.0';
    const serverBase = process.env.API_BASE_URL || 'http://localhost:3000';
    const checkUrl = `${serverBase}/api/desktop/check-update?version=${encodeURIComponent(currentVer)}&platform=${process.platform}&arch=${process.arch}`;
    
    const res = await fetch(checkUrl).then(r => r.json()).catch(() => null);
    if (!res) {
      if (interactive && mainWindow) {
        dialog.showMessageBox(mainWindow, {
          type: 'info',
          title: 'CloudPost Desktop Update Check',
          message: 'Update Server Not Reachable',
          detail: 'Could not connect to the update service. Please verify your network or server status.',
          buttons: ['OK']
        });
      }
      return;
    }

    if (res.hasUpdate) {
      // Strictly prevent downgrade: candidate must be strictly greater than currentVer
      if (semverCompare(res.latestVersion, currentVer) <= 0) {
        if (interactive && mainWindow) {
          dialog.showMessageBox(mainWindow, {
            type: 'info',
            title: 'CloudPost Desktop',
            message: 'You are on the latest version!',
            detail: `CloudPost Desktop v${currentVer} is up to date.\nDowngrading to older versions is blocked for security and data integrity.`,
            buttons: ['OK']
          });
        }
        return;
      }

      // Notify renderer window via IPC
      if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send('desktop:update-available', res);
      }

      if (interactive && mainWindow) {
        const { response: buttonIdx } = await dialog.showMessageBox(mainWindow, {
          type: 'info',
          title: 'Update Available',
          message: `CloudPost Desktop v${res.latestVersion} is available!`,
          detail: `${res.title || 'A new release is ready for installation.'}\n\nCurrent version: v${currentVer}\nTarget version: v${res.latestVersion}\n\n${res.releaseNotes ? 'Release notes:\n' + res.releaseNotes : ''}`,
          buttons: ['Download & Update', 'Remind Me Later'],
          defaultId: 0,
          cancelId: 1
        });

        if (buttonIdx === 0 && res.downloadUrl) {
          shell.openExternal(res.downloadUrl);
        }
      }
    } else {
      if (interactive && mainWindow) {
        dialog.showMessageBox(mainWindow, {
          type: 'info',
          title: 'CloudPost Desktop',
          message: 'You are on the latest version!',
          detail: `CloudPost Desktop v${currentVer} is up to date.`,
          buttons: ['OK']
        });
      }
    }
  } catch (err) {
    console.error('Error during desktop update check:', err);
  }
}

function createWindow() {
  const iconPath = getAppIconPath();
  const appIcon = iconPath ? nativeImage.createFromPath(iconPath) : undefined;

  // Set macOS Dock Icon if running on macOS
  if (process.platform === 'darwin' && app.dock && appIcon) {
    app.dock.setIcon(appIcon);
  }

  const preloadPath = path.join(__dirname, 'preload.cjs');

  mainWindow = new BrowserWindow({
    width: 1320,
    height: 840,
    minWidth: 960,
    minHeight: 640,
    icon: iconPath || appIcon,
    title: 'CloudPost - API Development & Testing',
    backgroundColor: '#0c0e17',
    show: false, // Prevents white flash on load
    webPreferences: {
      preload: fs.existsSync(preloadPath) ? preloadPath : undefined,
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false, // Disables CORS inside the desktop app for direct API calls
      allowRunningInsecureContent: true
    }
  });

  // Display window when DOM is ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Set native desktop application menu with CloudPost identity & keyboard shortcuts
  const menuTemplate = [
    {
      label: 'CloudPost',
      submenu: [
        {
          label: 'About CloudPost',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About CloudPost Desktop',
              message: `CloudPost Desktop v${app.getVersion() || '1.0.0'}`,
              detail: 'API Development, Testing & Database Sync Platform.\nNative CORS-Free Direct HTTP & WebSocket Execution.',
              buttons: ['OK']
            });
          }
        },
        {
          label: 'Check for Updates...',
          click: () => checkElectronAppUpdate(true)
        },
        { type: 'separator' },
        {
          label: 'Preferences / Settings',
          accelerator: 'CmdOrCtrl+,',
          click: () => sendMenuAction('settings')
        },
        { type: 'separator' },
        { label: 'Quit CloudPost', accelerator: 'CmdOrCtrl+Q', click: () => app.quit() }
      ]
    },
    {
      label: 'File',
      submenu: [
        {
          label: 'New Request',
          accelerator: 'CmdOrCtrl+N',
          click: () => sendMenuAction('new-request')
        },
        {
          label: 'New Folder...',
          accelerator: 'CmdOrCtrl+Shift+F',
          click: () => sendMenuAction('new-folder')
        },
        {
          label: 'New Collection...',
          accelerator: 'CmdOrCtrl+Shift+N',
          click: () => sendMenuAction('new-collection')
        },
        {
          label: 'Run Collection...',
          accelerator: 'CmdOrCtrl+Shift+R',
          click: () => sendMenuAction('open-runner')
        },
        { type: 'separator' },
        {
          label: 'Import Collection...',
          accelerator: 'CmdOrCtrl+O',
          click: () => sendMenuAction('import')
        },
        {
          label: 'Export Data...',
          accelerator: 'CmdOrCtrl+E',
          click: () => sendMenuAction('export')
        },
        { type: 'separator' },
        {
          label: 'Close Tab',
          accelerator: 'CmdOrCtrl+W',
          click: () => sendMenuAction('close-tab')
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'API Tools',
      submenu: [
        {
          label: 'REST Request Builder',
          click: () => sendMenuAction('new-request')
        },
        {
          label: 'Collection Runner & Tests',
          accelerator: 'CmdOrCtrl+Alt+R',
          click: () => sendMenuAction('open-runner')
        },
        {
          label: 'WebSocket Tester',
          click: () => sendMenuAction('open-websocket')
        },
        {
          label: 'SSE Stream Tester',
          click: () => sendMenuAction('open-sse')
        },
        {
          label: 'GraphQL Explorer',
          click: () => sendMenuAction('open-graphql')
        },
        {
          label: 'gRPC Protocol Explorer',
          click: () => sendMenuAction('open-grpc')
        },
        {
          label: 'Mock Server Engine',
          click: () => sendMenuAction('open-mock-server')
        },
        {
          label: 'Response Diff Inspector',
          click: () => sendMenuAction('open-diff')
        },
        {
          label: 'API Reference Docs',
          click: () => sendMenuAction('open-docs')
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Keyboard Shortcuts',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'Keyboard Shortcuts',
              message: 'CloudPost Desktop Shortcuts',
              detail: '• Ctrl/Cmd + N: New Request Tab\n• Ctrl/Cmd + W: Close Active Tab\n• Ctrl/Cmd + O: Import Collection\n• Ctrl/Cmd + E: Export Collection\n• Ctrl/Cmd + \\: Toggle Sidebar\n• Ctrl/Cmd + Enter: Send Request',
              buttons: ['OK']
            });
          }
        },
        {
          label: 'Check for Updates...',
          click: () => checkElectronAppUpdate(true)
        },
        {
          label: 'CloudPost Platform Documentation',
          click: () => sendMenuAction('open-docs')
        }
      ]
    }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate));

  if (iconPath) {
    mainWindow.setIcon(iconPath);
  } else if (appIcon) {
    mainWindow.setIcon(appIcon);
  }

  // Auto-check for updates on startup after window loads
  mainWindow.webContents.once('did-finish-load', () => {
    setTimeout(() => {
      checkElectronAppUpdate(false);
    }, 2500);
  });

  // Open any external web links in the user's default external browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('file:') && !url.includes('localhost:3000') && !url.includes('127.0.0.1:3000')) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  const isDev = process.env.ELECTRON_ENV === 'development';

  // Explicitly tag User Agent and query so desktop tool omits web-only SaaS features
  mainWindow.webContents.setUserAgent(mainWindow.webContents.getUserAgent() + ' CloudPostDesktop/1.0 Electron');

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000?app_mode=desktop');
  } else {
    const distPath = path.join(__dirname, '../dist/index.html');
    if (fs.existsSync(distPath)) {
      mainWindow.loadFile(distPath, { query: { app_mode: 'desktop' } });
    } else {
      mainWindow.loadURL('http://localhost:3000?app_mode=desktop');
    }
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Native IPC handlers for desktop capabilities
ipcMain.handle('desktop:get-info', () => ({
  name: 'CloudPost Desktop',
  version: app.getVersion() || '2.4.0',
  platform: process.platform,
  arch: process.arch,
  isDesktop: true,
  capabilities: [
    'Zero CORS restrictions',
    'Direct local socket & HTTP execution',
    'Offline database support',
    'Native OS dialogs & menu integration'
  ]
}));

ipcMain.handle('desktop:show-open-dialog', async (_event, options) => {
  if (!mainWindow) return { canceled: true, filePaths: [] };
  return await dialog.showOpenDialog(mainWindow, options || {
    title: 'Import Collections or Requests',
    properties: ['openFile'],
    filters: [
      { name: 'JSON Collections', extensions: ['json'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
});

ipcMain.handle('desktop:show-save-dialog', async (_event, options) => {
  if (!mainWindow) return { canceled: true };
  return await dialog.showSaveDialog(mainWindow, options || {
    title: 'Export Collections or Requests',
    defaultPath: 'cloudpost-collection.json',
    filters: [
      { name: 'JSON Files', extensions: ['json'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
});

ipcMain.handle('desktop:open-external', async (_event, url) => {
  if (url && (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('mailto:'))) {
    await shell.openExternal(url);
    return true;
  }
  return false;
});

ipcMain.handle('desktop:check-update', async () => {
  await checkElectronAppUpdate(true);
  return true;
});

ipcMain.handle('desktop:get-version', () => {
  return app.getVersion() || '2.4.0';
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
