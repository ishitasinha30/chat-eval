import { useState } from 'react';
import Modal from './shared/Modal';
import { Bot, Download, FileText, FileSpreadsheet } from 'lucide-react';
import { DIMS } from '../lib/constants';

function parseNote(raw) {
  if (!raw) return { text: '', screenshot: null };
  if (typeof raw === 'string') return { text: raw, screenshot: null };
  return { text: raw.text || '', screenshot: raw.screenshot || null };
}

function ReadOnlyStars({ score }) {
  return (
    <div className="stars" style={{ pointerEvents: 'none' }}>
      {[1,2,3,4,5].map(n => (
        <span key={n} className={`star-btn ${score >= n ? 'on' : ''}`}
          style={{ cursor: 'default', fontSize: 18 }}>★</span>
      ))}
    </div>
  );
}

export default function EvalViewModal({ ev, profiles = [], onClose }) {
  const [exporting, setExporting] = useState(null);

  async function handleExport(format) {
    setExporting(format);
    try {
      if (format === 'pdf') {
        await window.api.exportEvalPdf(ev);
      } else {
        const { filePath } = await window.api.saveFile({
          defaultPath: `eval-${ev.chat_id || ev.id}.${format === 'csv' ? 'csv' : 'xlsx'}`,
          filters: format === 'csv'
            ? [{ name: 'CSV', extensions: ['csv'] }]
            : [{ name: 'Excel', extensions: ['xlsx'] }],
        });
        if (filePath) {
          if (format === 'csv') await window.api.exportToCsv({ evals: [ev], outputPath: filePath });
          else await window.api.exportToExcel({ evals: [ev], outputPath: filePath });
        }
      }
    } catch (e) {
      alert(e.message || 'Export failed.');
    } finally {
      setExporting(null);
    }
  }
  const dimNotes = ev.dim_notes || {};
  const profile = profiles.find(p => p.brand === ev.brand) || null;

  const scored = DIMS.map(d => ev[d.id]).filter(v => v != null && v > 0);
  const avg = scored.length ? (scored.reduce((a, b) => a + b, 0) / scored.length).toFixed(1) : '—';

  const requiredFields = Array.isArray(profile?.required_lead_fields) && profile.required_lead_fields.length > 0
    ? profile.required_lead_fields.join(', ')
    : null;
  const escalationChannels = Array.isArray(profile?.escalation_channels) && profile.escalation_channels.length > 0
    ? profile.escalation_channels.join(', ')
    : null;

  return (
    <Modal
      title={`${ev.chat_id || 'Eval'} — ${ev.brand || ''}`}
      onClose={onClose}
      width={900}
      footer={
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: 'var(--text-3)', marginRight: 4 }}>Download:</span>
          <button className="btn btn-sm" onClick={() => handleExport('xlsx')} disabled={!!exporting}>
            {exporting === 'xlsx' ? <span className="spin" /> : <FileSpreadsheet size={12} />} Excel
          </button>
          <button className="btn btn-sm" onClick={() => handleExport('csv')} disabled={!!exporting}>
            {exporting === 'csv' ? <span className="spin" /> : <Download size={12} />} CSV
          </button>
          <button className="btn btn-sm" onClick={() => handleExport('pdf')} disabled={!!exporting}>
            {exporting === 'pdf' ? <span className="spin" /> : <FileText size={12} />} PDF
          </button>
          <div style={{ flex: 1 }} />
          <button className="btn" onClick={onClose}>Close</button>
        </div>
      }
    >
      {/* Metadata strip */}
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', paddingBottom: 12, borderBottom: '1px solid var(--border)', marginBottom: 12 }}>
        {[
          ['Brand', ev.brand],
          ['Bot', ev.bot_name],
          ['Evaluator', ev.evaluator],
          ['Date', ev.chat_date],
          ['Overall', avg],
        ].filter(([, v]) => v).map(([label, val]) => (
          <div key={label}>
            <div style={{ fontSize: 10, fontWeight: 550, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
            <div style={{ fontSize: 13, fontWeight: 500, marginTop: 2 }}>{val}</div>
          </div>
        ))}
        {ev.ai_scored && (
          <span className="chip chip-ai" style={{ alignSelf: 'center' }}>
            <Bot size={10} style={{ marginRight: 3 }} />AI scored
          </span>
        )}
      </div>

      {/* Lead qualification criteria banner */}
      {profile && (
        <div style={{
          background: 'var(--accent-bg)', border: '1px solid #c7d9f8', borderRadius: 'var(--r-md)',
          padding: '10px 14px', marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 5,
        }}>
          <div style={{ fontSize: 11, fontWeight: 550, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Client evaluation criteria — {ev.brand}
          </div>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: 12 }}>
            {requiredFields && (
              <div><span style={{ color: 'var(--text-3)' }}>Required lead fields: </span>{requiredFields}</div>
            )}
            {escalationChannels && (
              <div><span style={{ color: 'var(--text-3)' }}>Escalation: </span>{escalationChannels}</div>
            )}
            {profile.out_of_scope_policy && (
              <div><span style={{ color: 'var(--text-3)' }}>Out-of-scope policy: </span>{profile.out_of_scope_policy}</div>
            )}
          </div>
          {profile.notes && (
            <div style={{ fontSize: 11, color: 'var(--text-2)', fontStyle: 'italic' }}>Note: {profile.notes}</div>
          )}
        </div>
      )}

      {/* Two-column: transcript + scores */}
      <div style={{ display: 'flex', gap: 16, minHeight: 300 }}>
        {/* Transcript */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div className="label">Transcript</div>
          <textarea
            className="textarea input mono"
            value={ev.transcript || '(no transcript saved)'}
            readOnly
            style={{ flex: 1, minHeight: 260, background: 'var(--bg-2)', cursor: 'default', fontSize: 12 }}
          />
          {ev.notes && (
            <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Pre-eval note: {ev.notes}</div>
          )}
        </div>

        {/* Scores */}
        <div style={{ width: 310, display: 'flex', flexDirection: 'column', gap: 6, overflowY: 'auto', maxHeight: 480 }}>
          <div className="label">Dimension scores</div>
          {DIMS.map(dim => {
            const score = ev[dim.id];
            const { text: noteText, screenshot } = parseNote(dimNotes[dim.id]);
            return (
              <div key={dim.id} className="dim-card" style={{ padding: '8px 10px' }}>
                <div className="dim-name" style={{ fontSize: 12 }}>{dim.name}</div>
                {score === -1
                  ? <span style={{ fontSize: 12, color: 'var(--text-3)', fontStyle: 'italic' }}>N/A — not applicable</span>
                  : score != null
                    ? <ReadOnlyStars score={score} />
                    : <span className="text-muted text-sm">Not scored</span>
                }
                {noteText && (
                  <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 5, lineHeight: 1.4, fontStyle: 'italic' }}>
                    "{noteText}"
                  </div>
                )}
                {screenshot && (
                  <img src={screenshot} alt="screenshot"
                    style={{ marginTop: 6, maxWidth: '100%', maxHeight: 100, borderRadius: 'var(--r-sm)', border: '1px solid var(--border)', display: 'block' }} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}
