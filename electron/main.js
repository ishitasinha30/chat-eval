const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');

const { initDb, saveEval, getEvals, updateEval, deleteEval, getClientProfiles, saveClientProfile, deleteClientProfile, saveAnalysisRun, getAnalysisRuns, getAnalysisRun, getPreviousAnalysisForClient, deleteAnalysisRun } = require('./db');
const { parseTemplate, exportToExcel, exportToCsv, generateTemplate } = require('./excel');
const { scoreTranscript, runBulkAnalysis } = require('./ai');
const { exportEvalPdf } = require('./pdfExport');
const { getSetting, setSetting } = require('./settings');

const isDev = !app.isPackaged;

function createWindow() {
  const win = new BrowserWindow({
    width: 1240,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    title: 'ChatEval',
    backgroundColor: '#ffffff',
    show: false,
  });

  win.once('ready-to-show', () => win.show());

  if (isDev) {
    win.loadURL('http://localhost:5173');
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Minimal menu — keeps Cmd+C/V/Z working
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { role: 'appMenu' },
    { role: 'editMenu' },
    { role: 'windowMenu' },
  ]));
}

app.whenReady().then(() => {
  initDb();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ── IPC handlers ──────────────────────────────────────────────────────────────

ipcMain.handle('db:saveEval', (_, data) => saveEval(data));
ipcMain.handle('db:updateEval', (_, id, data) => updateEval(id, data));
ipcMain.handle('db:getEvals', (_, filters) => getEvals(filters));
ipcMain.handle('db:deleteEval', (_, id) => deleteEval(id));
ipcMain.handle('db:getClientProfiles', () => getClientProfiles());
ipcMain.handle('db:saveClientProfile', (_, profile) => saveClientProfile(profile));
ipcMain.handle('db:deleteClientProfile', (_, brand) => deleteClientProfile(brand));

ipcMain.handle('excel:parseTemplate', async (_, filePath) => parseTemplate(filePath));
ipcMain.handle('excel:generateTemplate', async (_, outputPath, opts) => generateTemplate(outputPath, opts));
ipcMain.handle('excel:exportToExcel', async (_, data) => exportToExcel(data.evals, data.templatePath, data.outputPath));
ipcMain.handle('excel:exportToCsv', async (_, data) => exportToCsv(data.evals, data.outputPath));

ipcMain.handle('ai:scoreTranscript', async (_, data) => scoreTranscript(data));
ipcMain.handle('ai:runBulkAnalysis', async (_, data) => runBulkAnalysis(data));

ipcMain.handle('analysis:save', (_, run) => saveAnalysisRun(run));
ipcMain.handle('analysis:getAll', (_, client) => getAnalysisRuns(client));
ipcMain.handle('analysis:get', (_, id) => getAnalysisRun(id));
ipcMain.handle('analysis:getPrevious', (_, client, beforeDate) => getPreviousAnalysisForClient(client, beforeDate));
ipcMain.handle('analysis:delete', (_, id) => deleteAnalysisRun(id));

ipcMain.handle('settings:get', (_, key) => getSetting(key));
ipcMain.handle('settings:set', (_, key, value) => setSetting(key, value));

ipcMain.handle('dialog:openFile', async (_, options) => dialog.showOpenDialog(options));
ipcMain.handle('dialog:saveFile', async (_, options) => dialog.showSaveDialog(options));

ipcMain.handle('eval:exportPdf', async (_, ev) => {
  const { filePath } = await dialog.showSaveDialog({
    defaultPath: `eval-${ev.chat_id || ev.id || 'export'}.pdf`,
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
  });
  if (!filePath) return false;
  return exportEvalPdf(ev, filePath);
});
