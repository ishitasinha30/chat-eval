import { useRef } from 'react';
import { Sparkles, Bot, ImagePlus, X } from 'lucide-react';
import { DIMS } from '../../lib/constants';

export default function ScoringPanel({
  scores, setScores,
  dimNotes, setDimNotes,
  dimScreenshots, setDimScreenshots,
  aiReasons, aiScored,
  isScoring, onAutoScore,
  onSave, isSaving,
}) {
  const fileRefs = useRef({});

  const scored = Object.values(scores).filter(v => v > 0);
  const avg = scored.length > 0 ? scored.reduce((a, b) => a + b, 0) / scored.length : null;

  function setScore(dimId, val) {
    setScores(s => ({ ...s, [dimId]: val }));
  }

  function attachImage(dimId, file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => setDimScreenshots(s => ({ ...s, [dimId]: e.target.result }));
    reader.readAsDataURL(file);
  }

  return (
    <div className="panel panel-r">
      <div className="panel-head">
        <span className="panel-head-title">Score this chat</span>
        <button className="btn btn-ai btn-sm" onClick={onAutoScore} disabled={isScoring}>
          {isScoring ? <span className="spin" /> : <Sparkles size={12} />}
          {isScoring ? 'Scoring…' : 'Auto-score with AI'}
        </button>
      </div>

      <div className="panel-body">
        <div className="dim-cards">
          {DIMS.map(dim => {
            const score = scores[dim.id] || 0;
            const screenshot = dimScreenshots[dim.id];
            return (
              <div key={dim.id} className={`dim-card ${score > 0 ? 'has-score' : ''}`}>
                <div className="dim-top">
                  <span className="dim-name">{dim.name}</span>
                  {aiScored && score > 0 && (
                    <span className="chip chip-ai" style={{ fontSize: 10 }}>
                      <Bot size={10} style={{ marginRight: 3 }} />AI
                    </span>
                  )}
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
                      {[1, 2, 3, 4, 5].map(n => (
                        <button key={n} className={`star-btn ${score >= n ? 'on' : ''}`}
                          onClick={() => setScore(dim.id, score === n ? 0 : n)}
                          aria-label={`${n} star`}>★</button>
                      ))}
                      <button className="btn btn-sm" style={{ marginLeft: 6, fontSize: 11, padding: '1px 7px', color: 'var(--text-3)' }}
                        title="Mark as not applicable — dimension wasn't triggered in this chat"
                        onClick={() => setScore(dim.id, -1)}>N/A</button>
                    </>
                  )}
                </div>

                {aiReasons[dim.id] && (
                  <div className="dim-ai-reason">
                    <Bot size={11} style={{ flexShrink: 0, marginTop: 1 }} />
                    {aiReasons[dim.id]}
                  </div>
                )}

                {/* Note + screenshot */}
                <div style={{ display: 'flex', gap: 4, marginTop: 7, alignItems: 'flex-start' }}>
                  <textarea
                    className="dim-note-inp"
                    style={{ flex: 1, marginTop: 0 }}
                    placeholder="Evaluator note…"
                    value={dimNotes[dim.id] || ''}
                    onChange={e => setDimNotes(n => ({ ...n, [dim.id]: e.target.value }))}
                  />
                  <button
                    className="btn btn-icon btn-sm"
                    title="Attach screenshot"
                    style={{ flexShrink: 0 }}
                    onClick={() => fileRefs.current[dim.id]?.click()}
                  >
                    <ImagePlus size={13} />
                  </button>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/gif,image/webp"
                    style={{ display: 'none' }}
                    ref={el => fileRefs.current[dim.id] = el}
                    onChange={e => attachImage(dim.id, e.target.files[0])}
                  />
                </div>

                {screenshot && (
                  <div style={{ position: 'relative', marginTop: 6, display: 'inline-block' }}>
                    <img src={screenshot} alt="screenshot"
                      style={{ maxWidth: '100%', maxHeight: 120, borderRadius: 'var(--r-sm)', border: '1px solid var(--border)', display: 'block' }} />
                    <button
                      onClick={() => setDimScreenshots(s => { const n = {...s}; delete n[dim.id]; return n; })}
                      style={{
                        position: 'absolute', top: 4, right: 4,
                        background: 'rgba(0,0,0,0.5)', color: '#fff',
                        border: 'none', borderRadius: '50%', width: 18, height: 18,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                      title="Remove screenshot"
                    ><X size={11} /></button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="score-footer">
        <div>
          <div className="overall-label">Overall</div>
          <div className="overall-num">{avg != null ? avg.toFixed(1) : '—'}</div>
        </div>
        <div className="score-track">
          <div className="score-fill" style={{ width: avg != null ? `${(avg / 5) * 100}%` : '0%' }} />
        </div>
        <button className="btn btn-primary" onClick={onSave} disabled={isSaving || scored.length === 0}>
          {isSaving ? <span className="spin" /> : null}
          {isSaving ? 'Saving…' : 'Save eval'}
        </button>
      </div>
    </div>
  );
}
