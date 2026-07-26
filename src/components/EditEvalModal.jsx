import { useState, useRef, useEffect } from 'react';
import { ImagePlus, X, Bot } from 'lucide-react';
import Modal from './shared/Modal';
import { DIMS } from '../lib/constants';

// dim_notes can be { dimId: string } or { dimId: { text, screenshot } }
function parseNote(raw) {
  if (!raw) return { text: '', screenshot: null };
  if (typeof raw === 'string') return { text: raw, screenshot: null };
  return { text: raw.text || '', screenshot: raw.screenshot || null };
}

function serializeDimNotes(dimNotes, dimScreenshots) {
  const result = {};
  const allKeys = new Set([...Object.keys(dimNotes), ...Object.keys(dimScreenshots)]);
  for (const key of allKeys) {
    const text = dimNotes[key] || '';
    const screenshot = dimScreenshots[key] || null;
    if (text || screenshot) {
      result[key] = screenshot ? { text, screenshot } : text;
    }
  }
  return result;
}

export default function EditEvalModal({ ev, onSave, onClose }) {
  const rawNotes = ev.dim_notes || {};

  const [scores, setScores] = useState(() => {
    const s = {};
    for (const d of DIMS) s[d.id] = ev[d.id] || 0;
    return s;
  });

  const [dimNotes, setDimNotes] = useState(() => {
    const n = {};
    for (const d of DIMS) n[d.id] = parseNote(rawNotes[d.id]).text;
    return n;
  });

  const [dimScreenshots, setDimScreenshots] = useState(() => {
    const s = {};
    for (const d of DIMS) {
      const sc = parseNote(rawNotes[d.id]).screenshot;
      if (sc) s[d.id] = sc;
    }
    return s;
  });

  const [chatId, setChatId] = useState(ev.chat_id || '');
  const [brand, setBrand] = useState(ev.brand || '');
  const [botName, setBotName] = useState(ev.bot_name || '');
  const [chatDate, setChatDate] = useState(ev.chat_date || '');
  const [evaluator, setEvaluator] = useState(ev.evaluator || '');
  const [notes, setNotes] = useState(ev.notes || '');
  const [profiles, setProfiles] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const fileRefs = useRef({});

  useEffect(() => {
    window.api.getClientProfiles().then(setProfiles);
  }, []);

  function handleBrandChange(selectedBrand) {
    setBrand(selectedBrand);
    const profile = profiles.find(p => p.brand === selectedBrand);
    if (profile?.bot_persona_name) setBotName(profile.bot_persona_name);
  }

  function setScore(dimId, val) {
    setScores(s => ({ ...s, [dimId]: val }));
  }

  function attachImage(dimId, file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => setDimScreenshots(s => ({ ...s, [dimId]: e.target.result }));
    reader.readAsDataURL(file);
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      const vals = Object.values(scores).filter(v => v > 0);
      const avg = vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : null;
      const sc = (v) => (v === -1 ? -1 : v || null); // preserve N/A (-1), coerce 0 to null
      await window.api.updateEval(ev.id, {
        chat_id: chatId || null,
        brand: brand || null,
        bot_name: botName || null,
        chat_date: chatDate || null,
        lead_capture: sc(scores.lead_capture),
        lead_qualification: sc(scores.lead_qualification),
        clarification: sc(scores.clarification),
        consistency: sc(scores.consistency),
        persona: sc(scores.persona),
        escalation: sc(scores.escalation),
        out_of_scope: sc(scores.out_of_scope),
        ux_tone: sc(scores.ux_tone),
        overall_avg: avg,
        dim_notes: serializeDimNotes(dimNotes, dimScreenshots),
        evaluator,
        notes,
        ai_scored: ev.ai_scored,
      });
      onSave();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={`Edit — ${ev.chat_id || 'Eval'}`}
      onClose={onClose}
      width={760}
      footer={
        <>
          {error && <span style={{ fontSize: 12, color: 'var(--danger)', flex: 1 }}>{error}</span>}
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <span className="spin" /> : null}
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </>
      }
    >
      {/* Editable metadata */}
      <div className="field-row" style={{ marginBottom: 6 }}>
        <div className="field">
          <label className="label">Chat ID</label>
          <input className="input" value={chatId} onChange={e => setChatId(e.target.value)} placeholder="CHT-001" />
        </div>
        <div className="field">
          <label className="label">Brand</label>
          <select className="input select" value={brand} onChange={e => handleBrandChange(e.target.value)}>
            <option value="">— select brand —</option>
            {/* Always include current value first so it's never lost while profiles are loading */}
            {brand && <option key="__current__" value={brand}>{brand}</option>}
            {profiles.filter(p => p.brand !== brand).map(p => (
              <option key={p.brand} value={p.brand}>{p.brand}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="label">Bot persona</label>
          <select className="input select" value={botName} onChange={e => setBotName(e.target.value)}>
            <option value="">— select bot —</option>
            {/* Always include current value first so it's never lost while profiles are loading */}
            {botName && <option key="__current__" value={botName}>{botName}</option>}
            {profiles.map(p => p.bot_persona_name).filter(Boolean)
              .filter((v, i, a) => a.indexOf(v) === i && v !== botName)
              .map(n => <option key={n} value={n}>{n}</option>)
            }
          </select>
        </div>
      </div>
      <div className="field-row" style={{ marginBottom: 10 }}>
        <div className="field">
          <label className="label">Chat date</label>
          <input type="date" className="input" value={chatDate} onChange={e => setChatDate(e.target.value)} />
        </div>
        <div className="field">
          <label className="label">Evaluator</label>
          <input className="input" value={evaluator} onChange={e => setEvaluator(e.target.value)} />
        </div>
        <div className="field">
          <label className="label">Pre-eval notes</label>
          <input className="input" value={notes} onChange={e => setNotes(e.target.value)} />
        </div>
      </div>

      {/* Dimension cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {DIMS.map(dim => {
          const score = scores[dim.id] ?? 0;
          const screenshot = dimScreenshots[dim.id];
          return (
            <div key={dim.id} className={`dim-card ${score > 0 ? 'has-score' : ''}`}>
              <div className="dim-top">
                <span className="dim-name">{dim.name}</span>
              </div>
              <div className="dim-hint">{dim.note}</div>
              <div className="stars" style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                {score === -1 ? (
                  <>
                    <span style={{ fontSize: 12, color: 'var(--text-3)', fontStyle: 'italic' }}>N/A — not applicable</span>
                    <button className="btn btn-sm" style={{ marginLeft: 8, fontSize: 11, padding: '1px 7px' }}
                      onClick={() => setScore(dim.id, 0)}>Clear</button>
                  </>
                ) : (
                  <>
                    {[1,2,3,4,5].map(n => (
                      <button key={n} className={`star-btn ${score >= n ? 'on' : ''}`}
                        onClick={() => setScore(dim.id, score === n ? 0 : n)}>★</button>
                    ))}
                    <button className="btn btn-sm" style={{ marginLeft: 6, fontSize: 11, padding: '1px 7px', color: 'var(--text-3)' }}
                      title="Mark as not applicable — dimension wasn't triggered in this chat"
                      onClick={() => setScore(dim.id, -1)}>N/A</button>
                  </>
                )}
              </div>

              <div style={{ display: 'flex', gap: 4, marginTop: 7, alignItems: 'flex-start' }}>
                <textarea
                  className="dim-note-inp"
                  style={{ flex: 1, marginTop: 0 }}
                  placeholder="Evaluator note…"
                  value={dimNotes[dim.id] || ''}
                  onChange={e => setDimNotes(n => ({ ...n, [dim.id]: e.target.value }))}
                />
                <button className="btn btn-icon btn-sm" title="Attach screenshot"
                  style={{ flexShrink: 0 }}
                  onClick={() => fileRefs.current[dim.id]?.click()}>
                  <ImagePlus size={13} />
                </button>
                <input type="file" accept="image/png,image/jpeg,image/gif,image/webp"
                  style={{ display: 'none' }}
                  ref={el => fileRefs.current[dim.id] = el}
                  onChange={e => attachImage(dim.id, e.target.files[0])} />
              </div>

              {screenshot && (
                <div style={{ position: 'relative', marginTop: 6, display: 'inline-block' }}>
                  <img src={screenshot} alt="screenshot"
                    style={{ maxWidth: '100%', maxHeight: 110, borderRadius: 'var(--r-sm)', border: '1px solid var(--border)', display: 'block' }} />
                  <button
                    onClick={() => setDimScreenshots(s => { const n = {...s}; delete n[dim.id]; return n; })}
                    style={{
                      position: 'absolute', top: 4, right: 4,
                      background: 'rgba(0,0,0,0.5)', color: '#fff',
                      border: 'none', borderRadius: '50%', width: 18, height: 18,
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  ><X size={11} /></button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
