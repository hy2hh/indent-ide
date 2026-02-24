import { app, BrowserWindow, ipcMain } from 'electron';
import { join } from 'node:path';
import { setupFileSystemIpc } from './ipc/file-system.js';
import { setupContextEngineIpc } from './ipc/context-engine.js';
import { setupAgentIpc } from './ipc/agent.js';
import { setupTerminalIpc } from './ipc/terminal.js';

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: 'hidden',
    backgroundColor: '#1e1e2e',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Dev: load Vite dev server; Prod: load built files
  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL']);
    win.webContents.openDevTools();
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'));
  }

  return win;
}

app.whenReady().then(() => {
  // Register IPC handlers
  setupFileSystemIpc(ipcMain);
  setupContextEngineIpc(ipcMain);
  setupAgentIpc(ipcMain);
  setupTerminalIpc(ipcMain);

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
