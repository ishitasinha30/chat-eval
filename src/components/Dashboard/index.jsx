import { useState, useEffect, useRef } from 'react';
import { Download, BarChart2, MoreHorizontal, Eye, Edit2, Trash2 } from 'lucide-react';
import { DIMS } from '../../lib/constants';
import ExportModal from '../ExportModal';
import EvalViewModal from '../EvalViewModal';
import EditEvalModal from '../EditEvalModal';
import Toast from '../shared/Toast';

function scoreDot(v) {
  if (v == null) return <span style={{ color: 'var(--text-3)' }}>—</span>;
  if (v === -1) return <span style={{ fontSize: 10, color: 'var(--text-3)', background: 'var(--bg-2)', border: '1px solid var(--border)', padding: '0 4px', borderRadius: 3 }}>N/A</span>;
  const cls = v >= 4 ? 'hi' : v <= 2 ? 'lo' : 'mid';
  return <span className={`score-dot ${cls}`}>{v}</span>;
}

function ActionMenu({ onView, onEdit, onDelete }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function close(e) { if (!ref.current?.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        className="btn btn-icon btn-sm"
        onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
        title="Actions"
      >
        <MoreHorizontal size={14} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', right: 0, top: '100%', marginTop: 4, zIndex: 100,
          background: 'var(--bg)', border: '1px solid var(--border)',
          borderRadius: 'var(--r-md)', boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
          minWidth: 130, padding: '4px 0',
        }}>
          {[
            { label: 'View', icon: Eye, action: onView },
            { label: 'Edit', icon: Edit2, action: onEdit },
            { label: 'Delete', icon: Trash2, action: onDelete, danger: true },
          ].map(({ label, icon: Icon, action, danger }) => (
            <button
              key={label}
              onClick={e => { e.stopPropagation(); setOpen(false); action(); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                padding: '7px 14px', background: 'none', border: 'none',
                cursor: 'pointer', fontSize: 13, textAlign: 'left',
                color: danger ? 'var(--danger)' : 'var(--text)',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const [evals, setEvals] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [filters, setFilters] = useState({ brand: '', evaluator: '' });
  const [showExport, setShowExport] = useState(false);
  const [viewingEval, setViewingEval] = useState(null);
  const [editingEval, setEditingEval] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    const [data, profs] = await Promise.all([
      window.api.getEvals({}),
      window.api.getClientProfiles(),
    ]);
    setEvals(data);
    setProfiles(profs);
  }

  async function handleDelete(id) {
    if (!confirm('Delete this evaluation? This cannot be undone.')) return;
    await window.api.deleteEval(id);
    setEvals(e => e.filter(x => x.id !== id));
  }

  function handleEditSaved() {
    setEditingEval(null);
    load();
    setToast({ message: 'Eval updated.', type: 'success' });
  }

  // Brand list comes from actual eval data (not profiles) so it always matches the table
  const brands = [...new Set(evals.map(e => e.brand).filter(Boolean))].sort();
  const evaluators = [...new Set(evals.map(e => e.evaluator).filter(Boolean))].sort();

  const filtered = evals.filter(e => {
    if (filters.brand && e.brand !== filters.brand) return false;
    if (filters.evaluator && e.evaluator !== filters.evaluator) return false;
    return true;
  });

  const aiCount = filtered.filter(e => e.ai_scored).length;
  const avgOverall = filtered.length
    ? (filtered.reduce((s, e) => s + (e.overall_avg || 0), 0) / filtered.length).toFixed(1)
    : '—';

  const dimAvgs = DIMS.map(d => {
    const vals = filtered.map(e => e[d.id]).filter(v => v != null && v > 0);
    return { ...d, avg: vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : null };
  });

  if (evals.length === 0) return (
    <div className="empty">
      <BarChart2 />
      <p>No evaluations yet</p>
      <small>Save an eval from Single Eval or Batch Mode and it will appear here.</small>
    </div>
  );

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Stats */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-val">{filtered.length}</div>
          <div className="stat-lbl">Total evals</div>
        </div>
        <div className="stat-card">
          <div className="stat-val">{avgOverall}</div>
          <div className="stat-lbl">Avg overall score</div>
        </div>
        <div className="stat-card">
          <div className="stat-val">{aiCount}</div>
          <div className="stat-lbl">AI-scored</div>
        </div>
        <div className="stat-card">
          <div className="stat-val">{brands.length}</div>
          <div className="stat-lbl">Brands</div>
        </div>
      </div>

      {/* Dimension averages */}
      <div style={{ display: 'flex', gap: 6, padding: '10px 20px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
        {dimAvgs.map(d => (
          <div key={d.id} title={d.name} style={{
            display: 'flex', alignItems: 'center', gap: 5, padding: '3px 8px',
            background: 'var(--bg-2)', borderRadius: 'var(--r-sm)', fontSize: 12,
          }}>
            <span style={{ color: 'var(--text-3)' }}>{d.name.split(' ').slice(0, 2).join(' ')}</span>
            <span style={{ fontWeight: 600, color: d.avg != null && d.avg < 3 ? 'var(--danger)' : 'var(--text)' }}>
              {d.avg || '—'}
            </span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="filters">
        <select className="select input" style={{ fontSize: 12, padding: '5px 28px 5px 8px' }}
          value={filters.brand} onChange={e => setFilters(f => ({ ...f, brand: e.target.value }))}>
          <option value="">All brands</option>
          {brands.map(b => <option key={b}>{b}</option>)}
        </select>
        <select className="select input" style={{ fontSize: 12, padding: '5px 28px 5px 8px' }}
          value={filters.evaluator} onChange={e => setFilters(f => ({ ...f, evaluator: e.target.value }))}>
          <option value="">All evaluators</option>
          {evaluators.map(e => <option key={e}>{e}</option>)}
        </select>
        <span className="text-muted text-sm" style={{ flex: 1 }}>
          {filtered.length !== evals.length ? `${filtered.length} of ${evals.length} shown` : ''}
        </span>
        <button className="btn btn-sm" onClick={() => setShowExport(true)} disabled={filtered.length === 0}>
          <Download size={13} /> Export
        </button>
      </div>

      {/* Table */}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Chat ID</th>
              <th>Brand</th>
              <th>Evaluator</th>
              <th>Date</th>
              {DIMS.map(d => (
                <th key={d.id} title={d.name} style={{ minWidth: 40 }}>
                  {d.name.split(' ').slice(0, 2).join(' ')}
                </th>
              ))}
              <th>Avg</th>
              <th>Source</th>
              <th style={{ width: 44 }}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(ev => (
              <tr key={ev.id} style={{ cursor: 'pointer' }} onClick={() => setViewingEval(ev)}>
                <td style={{ fontWeight: 500 }}>{ev.chat_id || '—'}</td>
                <td>{ev.brand || <span className="text-muted">—</span>}</td>
                <td>{ev.evaluator || <span className="text-muted">—</span>}</td>
                <td style={{ color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
                  {ev.chat_date || ev.created_at?.slice(0, 10) || '—'}
                </td>
                {DIMS.map(d => <td key={d.id}>{scoreDot(ev[d.id])}</td>)}
                <td>{scoreDot(ev.overall_avg)}</td>
                <td>
                  <span className={`chip ${ev.ai_scored ? 'chip-ai' : ''}`}>
                    {ev.ai_scored ? 'AI' : 'Human'}
                  </span>
                </td>
                <td onClick={e => e.stopPropagation()}>
                  <ActionMenu
                    onView={() => setViewingEval(ev)}
                    onEdit={() => setEditingEval(ev)}
                    onDelete={() => handleDelete(ev.id)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {viewingEval && (
        <EvalViewModal ev={viewingEval} profiles={profiles} onClose={() => setViewingEval(null)} />
      )}

      {editingEval && (
        <EditEvalModal ev={editingEval} onSave={handleEditSaved} onClose={() => setEditingEval(null)} />
      )}

      {showExport && (
        <ExportModal
          evals={filtered}
          onClose={() => setShowExport(false)}
          onDone={() => { setShowExport(false); setToast({ message: 'Exported successfully.', type: 'success' }); }}
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onDone={() => setToast(null)} />}
    </div>
  );
}
