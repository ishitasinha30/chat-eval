import { useState } from 'react';
import { Upload, ChevronLeft, ChevronRight, CheckCircle, Sparkles, Save, Download } from 'lucide-react';
import { DIMS } from '../../lib/constants';
import Toast from '../shared/Toast';

const EMPTY_SCORES = () => ({});
const EMPTY_NOTES = () => ({});

export default function BatchMode() {
  const [stage, setStage] = useState('upload'); // upload | choose | manual | ai-progress | review
  const [transcripts, setTranscripts] = useState([]);
  const [profilesFromFile, setProfilesFromFile] = useState([]);
  const [mode, setMode] = useState('manual'); // manual | ai
  const [current, setCurrent] = useState(0);
  const [evalData, setEvalData] = useState([]); // [{scores, dimNotes, aiScored, aiReasons}]
  const [aiProgress, setAiProgress] = useState(0);
  const [toast, setToast] = useState(null);
  const [saving, setSaving] = useState(false);

  async function handleUpload() {
    const result = await window.api.openFile({
      title: 'Open ChatEval Excel template',
      properties: ['openFile'],
      filters: [{ name: 'Excel', extensions: ['xlsx', 'xls'] }],
    });
    if (result.canceled || !result.filePaths[0]) return;
    try {
      const { transcripts: ts, profiles: ps } = await window.api.parseTemplate(result.filePaths[0]);
      if (ts.length === 0) { setToast({ message: 'No transcripts found in the file.', type: 'error' }); return; }
      setTranscripts(ts);
      setProfilesFromFile(ps);
      setEvalData(ts.map(() => ({ scores: {}, dimNotes: {}, aiScored: false, aiReasons: {} })));
      setStage('choose');
    } catch (e) {
      setToast({ message: e.message, type: 'error' });
    }
  }

  function getProfile(brand) {
    return profilesFromFile.find(p => p.brand === brand) || null;
  }

  async function startAi() {
    const apiKey = await window.api.getSetting('apiKey');
    if (!apiKey) { setToast({ message: 'Add your Anthropic API key in Settings first.', type: 'error' }); return; }
    setStage('ai-progress');
    setAiProgress(0);
    const updated = [...evalData];
    for (let i = 0; i < transcripts.length; i++) {
      try {
        const t = transcripts[i];
        const result = await window.api.scoreTranscript({
          transcript: t.transcript,
          clientProfile: getProfile(t.brand),
          apiKey,
        });
        const scores = {};
        const reasons = {};
        for (const [dim, data] of Object.entries(result)) {
          scores[dim] = data.score;
          reasons[dim] = data.reason;
        }
        updated[i] = { scores, dimNotes: {}, aiScored: true, aiReasons: reasons };
      } catch {
        // Leave empty on error — evaluator can fill in manually
      }
      setAiProgress(i + 1);
      setEvalData([...updated]);
    }
    setStage('review');
  }

  function setScore(idx, dimId, val) {
    setEvalData(ed => {
      const n = [...ed];
      n[idx] = { ...n[idx], scores: { ...n[idx].scores, [dimId]: val }, aiScored: false };
      return n;
    });
  }

  function setNote(idx, dimId, val) {
    setEvalData(ed => {
      const n = [...ed];
      n[idx] = { ...n[idx], dimNotes: { ...n[idx].dimNotes, [dimId]: val } };
      return n;
    });
  }

  function currentAvg(idx) {
    const vals = Object.values(evalData[idx]?.scores || {}).filter(v => v > 0);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  }

  async function saveAll() {
    setSaving(true);
    let saved = 0;
    try {
      for (let i = 0; i < transcripts.length; i++) {
        const t = transcripts[i];
        const ed = evalData[i];
        const vals = Object.values(ed.scores).filter(v => v > 0);
        if (vals.length === 0) continue;
        const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
        await window.api.saveEval({
          chat_id: t.chat_id || `CHT-${Date.now()}-${i}`,
          brand: t.brand, bot_name: t.bot_name, chat_date: t.chat_date,
          evaluator: t.evaluator, transcript: t.transcript, notes: t.notes,
          ...ed.scores,
          overall_avg: Math.round(avg * 10) / 10,
          dim_notes: ed.dimNotes,
          ai_scored: ed.aiScored,
        });
        saved++;
      }
      setToast({ message: `${saved} eval${saved !== 1 ? 's' : ''} saved.`, type: 'success' });
      setStage('upload');
      setTranscripts([]);
      setEvalData([]);
    } catch (e) {
      setToast({ message: e.message, type: 'error' });
    } finally {
      setSaving(false);
    }
  }

  // ── Upload stage ───────────────────────────────────────────────────────────
  async function handleDownloadTemplate() {
    const result = await window.api.saveFile({
      title: 'Save ChatEval template',
      defaultPath: 'ChatEval_Template.xlsx',
      filters: [{ name: 'Excel', extensions: ['xlsx'] }],
    });
    if (result.canceled) return;
    try {
      await window.api.generateTemplate(result.filePath);
      setToast({ message: 'Template saved — fill in the transcripts sheet and upload it here.', type: 'success' });
    } catch (e) {
      setToast({ message: e.message, type: 'error' });
    }
  }

  if (stage === 'upload') return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
      <div style={{ maxWidth: 420, width: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>Batch upload</div>
          <p className="text-muted text-sm">
            Upload the ChatEval Excel template with multiple transcripts. The app reads the{' '}
            <em>transcripts</em> and <em>client_profiles</em> sheets.
          </p>
        </div>

        <label className="upload-zone" onClick={handleUpload} style={{ cursor: 'pointer' }}>
          <Upload size={28} color="var(--text-3)" />
          <p>Click to open Excel template</p>
          <small>Supports .xlsx files</small>
        </label>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          <span className="text-muted text-sm">don't have the template?</span>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        </div>

        <button className="btn" onClick={handleDownloadTemplate}>
          <Download size={14} /> Download blank template
        </button>
      </div>
      {toast && <Toast message={toast.message} type={toast.type} onDone={() => setToast(null)} />}
    </div>
  );

  // ── Choose mode ────────────────────────────────────────────────────────────
  if (stage === 'choose') return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
      <div style={{ maxWidth: 460, width: '100%', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>{transcripts.length} transcripts loaded</div>
          <p className="text-muted text-sm" style={{ marginTop: 4 }}>
            {[...new Set(transcripts.map(t => t.brand))].join(', ')}
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { id: 'manual', icon: '📋', title: 'Manual mode', desc: 'Step through each chat one by one and score it yourself.' },
            { id: 'ai', icon: '✨', title: 'AI auto-score all', desc: 'Claude scores every transcript. You review and can override before saving.' },
          ].map(opt => (
            <button key={opt.id} onClick={() => setMode(opt.id)} style={{
              display: 'flex', alignItems: 'flex-start', gap: 14, padding: '14px 16px',
              border: `1.5px solid ${mode === opt.id ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: 'var(--r-md)', background: mode === opt.id ? 'var(--accent-bg)' : 'var(--bg)',
              cursor: 'pointer', textAlign: 'left',
            }}>
              <span style={{ fontSize: 20 }}>{opt.icon}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{opt.title}</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{opt.desc}</div>
              </div>
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn" onClick={() => setStage('upload')}>Back</button>
          <button className="btn btn-primary" onClick={() => {
            if (mode === 'ai') startAi();
            else { setCurrent(0); setStage('manual'); }
          }}>
            {mode === 'ai' ? <><Sparkles size={13} /> Start AI scoring</> : 'Start scoring'}
          </button>
        </div>
      </div>
    </div>
  );

  // ── AI progress ────────────────────────────────────────────────────────────
  if (stage === 'ai-progress') return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
      <div style={{ maxWidth: 400, width: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 600 }}>Scoring with AI…</div>
        <div className="progress-bar-wrap">
          <div className="progress-bar" style={{ width: `${(aiProgress / transcripts.length) * 100}%` }} />
        </div>
        <p className="text-muted text-sm">{aiProgress} / {transcripts.length} transcripts scored</p>
      </div>
    </div>
  );

  // ── Manual scoring ─────────────────────────────────────────────────────────
  if (stage === 'manual') {
    const t = transcripts[current];
    const ed = evalData[current];
    const avg = currentAvg(current);

    return (
      <div className="batch-layout">
        {/* Sidebar list */}
        <div className="batch-sidebar">
          <div className="panel-head">
            <span className="panel-head-title">{transcripts.length} transcripts</span>
          </div>
          <div className="batch-list">
            {transcripts.map((t, i) => {
              const done = Object.values(evalData[i]?.scores || {}).some(v => v > 0);
              return (
                <div key={i} className={`batch-item ${i === current ? 'current' : ''} ${done ? 'done' : ''}`}
                  onClick={() => setCurrent(i)}>
                  <span className="batch-item-num">{i + 1}</span>
                  <div className="batch-item-info">
                    <div className="batch-item-id">{t.chat_id || `Chat ${i + 1}`}</div>
                    <div className="batch-item-meta">{t.brand} · {t.evaluator}</div>
                  </div>
                  {done && <CheckCircle size={14} color="var(--success)" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Main scoring area */}
        <div className="batch-main">
          <div className="panel-head">
            <span className="panel-head-title">{t.chat_id || `Chat ${current + 1}`} — {t.brand}</span>
          </div>
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
            {/* Transcript */}
            <div style={{ width: '50%', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
              <div className="panel-body">
                <textarea className="textarea input mono tall"
                  value={t.transcript} readOnly
                  style={{ flex: 1, minHeight: 200, background: 'var(--bg-2)', cursor: 'default' }} />
                {t.notes && (
                  <div style={{ fontSize: 12, color: 'var(--text-3)', padding: '4px 0' }}>
                    Note: {t.notes}
                  </div>
                )}
              </div>
            </div>

            {/* Scoring */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div className="panel-body">
                <div className="dim-cards">
                  {DIMS.map(dim => {
                    const score = ed?.scores[dim.id] || 0;
                    return (
                      <div key={dim.id} className={`dim-card ${score > 0 ? 'has-score' : ''}`}>
                        <div className="dim-top"><span className="dim-name">{dim.name}</span></div>
                        <div className="dim-hint">{dim.note}</div>
                        <div className="stars">
                          {[1,2,3,4,5].map(n => (
                            <button key={n} className={`star-btn ${score >= n ? 'on' : ''}`}
                              onClick={() => setScore(current, dim.id, score === n ? 0 : n)}>★</button>
                          ))}
                        </div>
                        <textarea className="dim-note-inp" placeholder="Evaluator note…"
                          value={ed?.dimNotes[dim.id] || ''}
                          onChange={e => setNote(current, dim.id, e.target.value)} />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Nav footer */}
          <div className="batch-nav">
            <button className="btn btn-sm" onClick={() => setCurrent(c => Math.max(0, c - 1))} disabled={current === 0}>
              <ChevronLeft size={14} /> Prev
            </button>
            <span className="text-muted text-sm" style={{ flex: 1, textAlign: 'center' }}>
              {current + 1} of {transcripts.length}
            </span>
            {current < transcripts.length - 1 ? (
              <button className="btn btn-sm btn-primary" onClick={() => setCurrent(c => c + 1)}>
                Next <ChevronRight size={14} />
              </button>
            ) : (
              <button className="btn btn-sm btn-primary" onClick={() => setStage('review')}>
                Review all <ChevronRight size={14} />
              </button>
            )}
          </div>
        </div>

        {toast && <Toast message={toast.message} type={toast.type} onDone={() => setToast(null)} />}
      </div>
    );
  }

  // ── Review / save ──────────────────────────────────────────────────────────
  if (stage === 'review') {
    const readyCount = evalData.filter(ed => Object.values(ed.scores).some(v => v > 0)).length;
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div className="panel-head" style={{ padding: '10px 20px' }}>
          <span className="panel-head-title">Review — {readyCount} of {transcripts.length} scored</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-sm" onClick={() => setStage('manual')}>
              <ChevronLeft size={13} /> Back to scoring
            </button>
            <button className="btn btn-sm btn-primary" onClick={saveAll} disabled={saving || readyCount === 0}>
              {saving ? <span className="spin" /> : <Save size={13} />}
              {saving ? 'Saving…' : `Save ${readyCount} eval${readyCount !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Chat ID</th>
                <th>Brand</th>
                <th>Evaluator</th>
                {DIMS.map(d => <th key={d.id} title={d.name}>{d.name.split(' ')[0]}</th>)}
                <th>Avg</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              {transcripts.map((t, i) => {
                const ed = evalData[i];
                const avg = currentAvg(i);
                const dotClass = avg == null ? '' : avg >= 4 ? 'hi' : avg <= 2 ? 'lo' : 'mid';
                return (
                  <tr key={i}>
                    <td>{t.chat_id || `Chat ${i + 1}`}</td>
                    <td>{t.brand}</td>
                    <td>{t.evaluator}</td>
                    {DIMS.map(d => (
                      <td key={d.id}>
                        {ed.scores[d.id] ? (
                          <span className={`score-dot ${ed.scores[d.id] >= 4 ? 'hi' : ed.scores[d.id] <= 2 ? 'lo' : 'mid'}`}>
                            {ed.scores[d.id]}
                          </span>
                        ) : '—'}
                      </td>
                    ))}
                    <td>
                      {avg != null ? <span className={`score-dot ${dotClass}`}>{avg.toFixed(1)}</span> : '—'}
                    </td>
                    <td>
                      <span className={`chip ${ed.aiScored ? 'chip-ai' : ''}`}>
                        {ed.aiScored ? 'AI' : 'Human'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {toast && <Toast message={toast.message} type={toast.type} onDone={() => setToast(null)} />}
      </div>
    );
  }

  return null;
}
