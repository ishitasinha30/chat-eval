import { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import Modal from '../shared/Modal';
import { DIMS } from '../../lib/constants';

export default function RunAnalysisModal({ onDone, onClose }) {
  const [brands, setBrands] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [client, setClient] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [minChats, setMinChats] = useState(5);
  const [focusDims, setFocusDims] = useState(DIMS.map(d => d.id));
  const [label, setLabel] = useState('');
  const [triggeredBy, setTriggeredBy] = useState('');
  const [running, setRunning] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [error, setError] = useState('');
  const [lowSampleWarn, setLowSampleWarn] = useState(false);
  const [pendingRun, setPendingRun] = useState(false);

  useEffect(() => {
    Promise.all([
      window.api.getEvals({}),
      window.api.getClientProfiles(),
      window.api.getSetting('defaultEvaluator'),
    ]).then(([evals, profs, defEval]) => {
      // Show all profile brands + any brands that already have evals, even without a profile
      const allBrands = [
        ...profs.map(p => p.brand),
        ...evals.map(e => e.brand),
      ].filter(Boolean);
      const b = [...new Set(allBrands)].sort();
      setBrands(b);
      setProfiles(profs);
      if (defEval) setTriggeredBy(defEval);
      if (b.length === 1) setClient(b[0]);
    });
  }, []);

  function toggleDim(id) {
    setFocusDims(d => d.includes(id) ? d.filter(x => x !== id) : [...d, id]);
  }

  async function executeRun() {
    setLowSampleWarn(false);
    setPendingRun(false);
    setRunning(true);
    setError('');
    try {
      const apiKey = await window.api.getSetting('apiKey');
      if (!apiKey) throw new Error('No API key set. Add your Anthropic API key in Settings.');

      // Check client has a profile
      const clientProfile = profiles.find(p => p.brand === client);
      if (!clientProfile) {
        throw new Error(`Define a client profile for "${client}" before running analysis.`);
      }

      setStatusMsg('Loading evaluations…');
      const evals = await window.api.getEvals({
        brand: client,
        from: dateFrom || undefined,
        to: dateTo || undefined,
      });

      if (evals.length === 0) {
        throw new Error('No evaluations found matching the selected filters.');
      }

      const generatedAt = new Date().toISOString();

      // Fetch previous analysis for regression
      setStatusMsg('Checking for previous analysis…');
      const previousAnalysis = await window.api.getPreviousAnalysisForClient(client, generatedAt);

      setStatusMsg(`Sending ${evals.length} evals to Claude for analysis…`);
      const result = await window.api.runBulkAnalysis({
        client,
        evals,
        clientProfile,
        params: { dateFrom, dateTo, dimensions: focusDims, label },
        previousAnalysis: previousAnalysis || null,
        apiKey,
      });

      // Save to DB
      setStatusMsg('Saving report…');
      const { crypto } = window;
      const analysisId = crypto.randomUUID();
      await window.api.saveAnalysisRun({
        analysis_id: analysisId,
        client,
        date_from: dateFrom || null,
        date_to: dateTo || null,
        chats_analysed: evals.length,
        label: label || null,
        triggered_by: triggeredBy || null,
        generated_at: generatedAt,
        result_json: JSON.stringify(result),
        weakest_dimension: result.overall_health?.weakest_dimension || null,
        avg_score: result.overall_health?.average_score ?? null,
      });

      onDone();
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setRunning(false);
      setStatusMsg('');
    }
  }

  async function handleRun() {
    if (!client) { setError('Select a client.'); return; }
    setError('');

    // Check sample size warning
    const evals = await window.api.getEvals({
      brand: client,
      from: dateFrom || undefined,
      to: dateTo || undefined,
    });

    if (evals.length < minChats) {
      setLowSampleWarn(true);
      setPendingRun(true);
      return;
    }

    executeRun();
  }

  return (
    <Modal
      title="Run Bulk Analysis"
      onClose={onClose}
      width={540}
      footer={
        <>
          {error && <span style={{ fontSize: 12, color: 'var(--danger)', flex: 1 }}>{error}</span>}
          <button className="btn" onClick={onClose} disabled={running}>Cancel</button>
          <button className="btn btn-ai" onClick={handleRun} disabled={running || !client}>
            {running ? <span className="spin" /> : <Sparkles size={13} />}
            {running ? statusMsg || 'Running…' : 'Run analysis'}
          </button>
        </>
      }
    >
      {lowSampleWarn && (
        <div style={{
          background: '#fef3c7', border: '1px solid #fbbf24', borderRadius: 'var(--r-md)',
          padding: '10px 14px', marginBottom: 14, fontSize: 13,
        }}>
          <strong>Low sample size</strong> — only {' '}
          <strong style={{ color: 'var(--danger)' }}>fewer than {minChats} chats</strong>
          {' '}match your filters. Analysis may not be reliable.
          <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
            <button className="btn btn-sm btn-ai" onClick={executeRun}>Proceed anyway</button>
            <button className="btn btn-sm" onClick={() => { setLowSampleWarn(false); setPendingRun(false); }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Client */}
      <div className="field" style={{ marginBottom: 12 }}>
        <label className="label">Client <span style={{ color: 'var(--danger)' }}>*</span></label>
        <select className="input select" value={client} onChange={e => setClient(e.target.value)}>
          <option value="">— select brand —</option>
          {brands.map(b => <option key={b}>{b}</option>)}
        </select>
        {client && !profiles.find(p => p.brand === client) && (
          <div style={{ fontSize: 11, color: 'var(--danger)', marginTop: 4 }}>
            No client profile found for "{client}". Define one in Settings before running.
          </div>
        )}
      </div>

      {/* Date range */}
      <div className="field-row" style={{ marginBottom: 12 }}>
        <div className="field">
          <label className="label">Date from</label>
          <input type="date" className="input" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
        </div>
        <div className="field">
          <label className="label">Date to</label>
          <input type="date" className="input" value={dateTo} onChange={e => setDateTo(e.target.value)} />
        </div>
      </div>

      {/* Min chats + triggered by */}
      <div className="field-row" style={{ marginBottom: 12 }}>
        <div className="field">
          <label className="label">Min chats threshold</label>
          <input type="number" min={1} className="input" value={minChats}
            onChange={e => setMinChats(Number(e.target.value))} style={{ width: 80 }} />
        </div>
        <div className="field">
          <label className="label">Triggered by</label>
          <input className="input" value={triggeredBy} onChange={e => setTriggeredBy(e.target.value)}
            placeholder="Evaluator name" />
        </div>
      </div>

      {/* Analysis label */}
      <div className="field" style={{ marginBottom: 14 }}>
        <label className="label">Analysis label <span style={{ color: 'var(--text-3)' }}>(optional)</span></label>
        <input className="input" value={label} onChange={e => setLabel(e.target.value)}
          placeholder="e.g. Post-prompt-v3 test" />
      </div>

      {/* Dimensions */}
      <div className="field">
        <label className="label">Dimensions to focus</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
          {DIMS.map(d => (
            <label key={d.id} style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px',
              borderRadius: 'var(--r-sm)', cursor: 'pointer', fontSize: 12,
              background: focusDims.includes(d.id) ? 'var(--accent-bg)' : 'var(--bg-2)',
              border: focusDims.includes(d.id) ? '1px solid var(--accent)' : '1px solid var(--border)',
              color: focusDims.includes(d.id) ? 'var(--accent)' : 'var(--text)',
            }}>
              <input type="checkbox" checked={focusDims.includes(d.id)} onChange={() => toggleDim(d.id)}
                style={{ margin: 0 }} />
              {d.name}
            </label>
          ))}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 6 }}>
          {focusDims.length === DIMS.length ? 'All dimensions selected' : `${focusDims.length} of ${DIMS.length} selected`}
        </div>
      </div>
    </Modal>
  );
}
