import { app, BrowserWindow } from 'electron';
import path from 'node:path';

const here = import.meta.dirname;

function createWindow() {
  const win = new BrowserWindow({
    width: 1500, height: 950, title: 'Hypercomplex Algebra Viewer', backgroundColor: '#14171c',
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  const dev = process.env.VITE_DEV_SERVER_URL;
  if (dev) win.loadURL(dev);
  else win.loadFile(path.join(here, '..', '..', 'dist', 'index.html'));
}
app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
