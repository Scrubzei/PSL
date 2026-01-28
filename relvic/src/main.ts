import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';

let mainWindow: BrowserWindow | null = null;
let plutoniumProcess: ChildProcess | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    backgroundColor: '#1a1a2e',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, '../src/index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
    // Kill Plutonium if it's running when we close
    if (plutoniumProcess) {
      plutoniumProcess.kill();
      plutoniumProcess = null;
    }
  });
}

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

// Handle selecting Plutonium executable
ipcMain.handle('select-plutonium', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    title: 'Select Plutonium Executable',
    filters: [
      { name: 'Executable', extensions: ['exe'] },
      { name: 'All Files', extensions: ['*'] },
    ],
    properties: ['openFile'],
  });

  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

// Handle launching Plutonium as child process
ipcMain.handle('launch-plutonium', async (_event, exePath: string) => {
  if (plutoniumProcess) {
    return { success: false, error: 'Plutonium is already running' };
  }

  try {
    plutoniumProcess = spawn(exePath, [], {
      detached: false, // Keep as child process
      stdio: 'pipe',
    });

    const pid = plutoniumProcess.pid;

    plutoniumProcess.on('exit', (code) => {
      console.log(`Plutonium exited with code ${code}`);
      mainWindow?.webContents.send('plutonium-exited', code);
      plutoniumProcess = null;
    });

    plutoniumProcess.on('error', (err) => {
      console.error('Failed to start Plutonium:', err);
      mainWindow?.webContents.send('plutonium-error', err.message);
      plutoniumProcess = null;
    });

    return { success: true, pid };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});

// Handle stopping Plutonium
ipcMain.handle('stop-plutonium', async () => {
  if (plutoniumProcess) {
    plutoniumProcess.kill();
    plutoniumProcess = null;
    return { success: true };
  }
  return { success: false, error: 'Plutonium is not running' };
});

// Get process info
ipcMain.handle('get-process-info', async () => {
  if (plutoniumProcess && plutoniumProcess.pid) {
    return {
      running: true,
      pid: plutoniumProcess.pid,
    };
  }
  return { running: false };
});
