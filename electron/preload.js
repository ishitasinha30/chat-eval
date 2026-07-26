const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Evals
  saveEval: (data) => ipcRenderer.invoke('db:saveEval', data),
  getEvals: (filters) => ipcRenderer.invoke('db:getEvals', filters),
  updateEval: (id, data) => ipcRenderer.invoke('db:updateEval', id, data),
  deleteEval: (id) => ipcRenderer.invoke('db:deleteEval', id),

  // Client profiles
  getClientProfiles: () => ipcRenderer.invoke('db:getClientProfiles'),
  saveClientProfile: (profile) => ipcRenderer.invoke('db:saveClientProfile', profile),
  deleteClientProfile: (brand) => ipcRenderer.invoke('db:deleteClientProfile', brand),

  // Excel
  parseTemplate: (filePath) => ipcRenderer.invoke('excel:parseTemplate', filePath),
  generateTemplate: (outputPath, opts) => ipcRenderer.invoke('excel:generateTemplate', outputPath, opts),
  exportToExcel: (data) => ipcRenderer.invoke('excel:exportToExcel', data),
  exportToCsv: (data) => ipcRenderer.invoke('excel:exportToCsv', data),

  // AI
  scoreTranscript: (data) => ipcRenderer.invoke('ai:scoreTranscript', data),
  runBulkAnalysis: (data) => ipcRenderer.invoke('ai:runBulkAnalysis', data),

  // Analysis runs
  saveAnalysisRun: (run) => ipcRenderer.invoke('analysis:save', run),
  getAnalysisRuns: (client) => ipcRenderer.invoke('analysis:getAll', client),
  getAnalysisRun: (id) => ipcRenderer.invoke('analysis:get', id),
  getPreviousAnalysisForClient: (client, beforeDate) => ipcRenderer.invoke('analysis:getPrevious', client, beforeDate),
  deleteAnalysisRun: (id) => ipcRenderer.invoke('analysis:delete', id),

  // Settings
  getSetting: (key) => ipcRenderer.invoke('settings:get', key),
  setSetting: (key, value) => ipcRenderer.invoke('settings:set', key, value),

  // File dialogs
  openFile: (options) => ipcRenderer.invoke('dialog:openFile', options),
  saveFile: (options) => ipcRenderer.invoke('dialog:saveFile', options),

  // Per-eval exports
  exportEvalPdf: (ev) => ipcRenderer.invoke('eval:exportPdf', ev),
});
