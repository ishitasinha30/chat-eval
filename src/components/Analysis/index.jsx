import { useState, useEffect } from 'react';
import { TrendingUp, Trash2, Sparkles } from 'lucide-react';
import RunAnalysisModal from './RunAnalysisModal';
import AnalysisReport from './AnalysisReport';
import Toast from '../shared/Toast';

function scoreColor(v) {
  if (v == null) return 'var(--text-3)';
  if (v < 2.5) return '#ef4444';
  if (v < 3.5) return '#ca8a04';
  return '#16a34a';
}

function scoreBg(v) {
  if (v == null) return 'var(--bg-2)';
  if (v < 2.5) return '#fee2e2';
  if (v < 3.5) return '#fef3c7';
  return '#dcfce7';
}

export default function Analysis() {
  const [runs, setRuns] = useState([]);
  const [selectedRun, setSelectedRun] = useState(null);
  const [previousRun, setPreviousRun] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    const data = await window.api.getAnalysisRuns();
    setRuns(data);
  }

  async function handleSelectRun(run) {
    setSelectedRun(run);
    // Fetch the run immediately before this one for regression arrows
    try {
      const prev = await window.api.getPreviousAnalysisForClient(run.client, run.generated_at);
      setPreviousRun(prev || null);
    } catch {
      setPreviousRun(null);
    }
  }

  async function handleDelete(id, e) {
    e.stopPropagation();
    if (!confirm('Delete this analysis run? This cannot be undone.')) return;
    await window.api.deleteAnalysisRun(id);
    setRuns(r => r.filter(x => x.id !== id));
    if (selectedRun?.id === id) setSelectedRun(null);
  }

  function handleRunDone() {
    setShowModal(false);
    load().then(() => {
      // Auto-open the newest run
      window.api.getAnalysisRuns().then(data => {
        if (data[0]) handleSelectRun(data[0]);
      });
    });
    setToast({ message: 'Analysis complete. Report saved.', type: 'success' });
  }

  if (selectedRun) {
    return (
      <>
        <AnalysisReport
          run={selectedRun}
          previousRun={previousRun}
          onBack={() => { setSelectedRun(null); setPreviousRun(null); }}
        />
        {toast && <Toast message={toast.message} type={toast.type} onDone={() => setToast(null)} />}
      </>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0,
      }}>
        <div>
          <div style={{ fontWeight: 650, fontSize: 15 }}>Bulk Analysis</div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
            Pattern analysis across evaluated chats — for prompt engineers
          </div>
        </div>
        <button className="btn btn-ai" onClick={() => setShowModal(true)}>
          <Sparkles size={13} /> Run new analysis
        </button>
      </div>

      {/* List */}
      {runs.length === 0 ? (
        <div className="empty">
          <TrendingUp />
          <p>No analyses yet</p>
          <small>Run your first bulk analysis to identify failure patterns across chats.</small>
          <button className="btn btn-ai" style={{ marginTop: 12 }} onClick={() => setShowModal(true)}>
            <Sparkles size={13} /> Run analysis
          </button>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Client</th>
                <th>Label</th>
                <th>Date range</th>
                <th>Chats</th>
                <th>Avg score</th>
                <th>Weakest</th>
                <th>By</th>
                <th>Generated</th>
                <th style={{ width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {runs.map(run => (
                <tr key={run.id} style={{ cursor: 'pointer' }} onClick={() => handleSelectRun(run)}>
                  <td style={{ fontWeight: 600 }}>{run.client}</td>
                  <td style={{ color: run.label ? 'var(--text)' : 'var(--text-3)', fontStyle: run.label ? 'normal' : 'italic' }}>
                    {run.label || 'unlabelled'}
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-3)' }}>
                    {run.date_from || '—'} → {run.date_to || 'present'}
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 600 }}>{run.chats_analysed}</td>
                  <td>
                    <span style={{
                      display: 'inline-block', fontWeight: 700, fontSize: 13,
                      color: scoreColor(run.avg_score),
                      background: scoreBg(run.avg_score),
                      borderRadius: 5, padding: '2px 8px', minWidth: 36, textAlign: 'center',
                    }}>
                      {run.avg_score != null ? Number(run.avg_score).toFixed(1) : '—'}
                    </span>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--danger)' }}>{run.weakest_dimension || '—'}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-3)' }}>{run.triggered_by || '—'}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
                    {run.generated_at?.slice(0, 16)}
                  </td>
                  <td onClick={e => e.stopPropagation()}>
                    <button className="btn btn-icon btn-sm btn-danger" onClick={e => handleDelete(run.id, e)} title="Delete">
                      <Trash2 size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <RunAnalysisModal onDone={handleRunDone} onClose={() => setShowModal(false)} />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onDone={() => setToast(null)} />}
    </div>
  );
}
