const { app, BrowserWindow, ipcMain } = require('electron');
const robot = require('robotjs');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });
  win.loadFile('index.html');
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.on('simulate-input', (event, data) => {
  if (data.type === 'mouse') {
    const screenSize = robot.getScreenSize();
    const x = Math.round(data.x * screenSize.width);
    const y = Math.round(data.y * screenSize.height);
    robot.moveMouse(x, y);
    robot.mouseClick();
  } else if (data.type === 'keyboard') {
    robot.keyTap(data.key);
  }
});