import { useState } from 'react';
import Modal from './shared/Modal';
import { FileSpreadsheet, FileText } from 'lucide-react';

export default function ExportModal({ evals, onClose, onDone }) {
  const [mode, setMode] = useState('excel');
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  async function handleExport() {
    setExporting(true);
    setError('');
    try {
      if (mode === 'excel') {
        const result = await window.api.saveFile({
          title: 'Export eval scores',
          defaultPath: 'chateval_scores.xlsx',
          filters: [{ name: 'Excel', extensions: ['xlsx'] }],
        });
        if (result.canceled) { setExporting(false); return; }

        // Optionally pick an existing template to append to
        const templateResult = await window.api.openFile({
          title: 'Open ChatEval template to append to (optional — cancel to create new)',
          properties: ['openFile'],
          filters: [{ name: 'Excel', extensions: ['xlsx'] }],
        });
        const templatePath = !templateResult.canceled && templateResult.filePaths[0]
          ? templateResult.filePaths[0]
          : null;

        await window.api.exportToExcel({ evals, templatePath, outputPath: result.filePath });
      } else {
        const result = await window.api.saveFile({
          title: 'Export as CSV',
          defaultPath: 'chateval_scores.csv',
          filters: [{ name: 'CSV', extensions: ['csv'] }],
        });
        if (result.canceled) { setExporting(false); return; }
        await window.api.exportToCsv({ evals, outputPath: result.filePath });
      }
      onDone();
    } catch (e) {
      setError(e.message);
    } finally {
      setExporting(false);
    }
  }

  return (
    <Modal
      title={`Export ${evals.length} eval${evals.length !== 1 ? 's' : ''}`}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleExport} disabled={exporting}>
            {exporting ? <span className="spin" /> : null}
            {exporting ? 'Exporting…' : 'Export'}
          </button>
        </>
      }
    >
      {error && <p style={{ color: 'var(--danger)', fontSize: 12 }}>{error}</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button
          onClick={() => setMode('excel')}
          style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
            border: `1.5px solid ${mode === 'excel' ? 'var(--accent)' : 'var(--border)'}`,
            borderRadius: 'var(--r-md)', background: mode === 'excel' ? 'var(--accent-bg)' : 'var(--bg)',
            cursor: 'pointer', textAlign: 'left',
          }}
        >
          <FileSpreadsheet size={20} color={mode === 'excel' ? 'var(--accent)' : 'var(--text-3)'} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 500 }}>Excel template (.xlsx)</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
              Appends rows to the eval_scores sheet of the ChatEval template
            </div>
          </div>
        </button>

        <button
          onClick={() => setMode('csv')}
          style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
            border: `1.5px solid ${mode === 'csv' ? 'var(--accent)' : 'var(--border)'}`,
            borderRadius: 'var(--r-md)', background: mode === 'csv' ? 'var(--accent-bg)' : 'var(--bg)',
            cursor: 'pointer', textAlign: 'left',
          }}
        >
          <FileText size={20} color={mode === 'csv' ? 'var(--accent)' : 'var(--text-3)'} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 500 }}>CSV file</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
              All columns as comma-separated values — use in any BI tool
            </div>
          </div>
        </button>
      </div>
    </Modal>
  );
}
