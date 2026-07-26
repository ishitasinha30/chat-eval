import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Eye, EyeOff, CheckCircle } from 'lucide-react';
import ProfileModal from '../ProfileModal';
import Toast from '../shared/Toast';

export default function Settings() {
  const [apiKey, setApiKey] = useState('');
  const [defaultEvaluator, setDefaultEvaluator] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null); // null | 'ok' | 'fail'
  const [profiles, setProfiles] = useState([]);
  const [profileModal, setProfileModal] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    window.api.getSetting('apiKey').then(v => { if (v) setApiKey(v); });
    window.api.getSetting('defaultEvaluator').then(v => { if (v) setDefaultEvaluator(v); });
    loadProfiles();
  }, []);

  async function loadProfiles() {
    const p = await window.api.getClientProfiles();
    setProfiles(p);
  }

  async function saveApiKey() {
    await window.api.setSetting('apiKey', apiKey.trim());
    setToast({ message: 'API key saved.', type: 'success' });
    setTestResult(null);
  }

  async function saveEvaluator() {
    await window.api.setSetting('defaultEvaluator', defaultEvaluator.trim());
    setToast({ message: 'Default evaluator saved.', type: 'success' });
  }

  async function testApiKey() {
    if (!apiKey.trim()) return;
    setTesting(true);
    setTestResult(null);
    try {
      await window.api.scoreTranscript({
        transcript: 'Bot: Hi!\nUser: Hello.',
        clientProfile: null,
        apiKey: apiKey.trim(),
      });
      setTestResult('ok');
    } catch {
      setTestResult('fail');
    } finally {
      setTesting(false);
    }
  }

  async function handleDeleteProfile(brand) {
    if (!confirm(`Delete profile for "${brand}"?`)) return;
    await window.api.deleteClientProfile(brand);
    loadProfiles();
  }

  function handleProfileSaved() {
    loadProfiles();
    setProfileModal(null);
    setToast({ message: 'Profile saved.', type: 'success' });
  }

  return (
    <div className="settings-body">
      {/* API Key */}
      <div className="settings-section">
        <div className="settings-section-title">Anthropic API key <span style={{ fontWeight: 400, color: 'var(--text-3)', fontSize: 12 }}>(optional)</span></div>
        <p className="text-muted text-sm">
          Only needed for AI auto-scoring. Manual scoring works without it. Your key is stored locally and never leaves this machine.
        </p>
        <div className="api-key-row">
          <input
            className="input"
            type={showKey ? 'text' : 'password'}
            value={apiKey}
            onChange={e => { setApiKey(e.target.value); setTestResult(null); }}
            placeholder="sk-ant-…"
          />
          <button className="btn btn-icon" onClick={() => setShowKey(s => !s)} title={showKey ? 'Hide' : 'Show'}>
            {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
          <button className="btn" onClick={testApiKey} disabled={testing || !apiKey.trim()}>
            {testing ? <span className="spin" /> : null}
            {testing ? 'Testing…' : 'Test'}
          </button>
          <button className="btn btn-primary" onClick={saveApiKey} disabled={!apiKey.trim()}>Save</button>
        </div>
        {testResult === 'ok' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--success)' }}>
            <CheckCircle size={13} /> Connection successful
          </div>
        )}
        {testResult === 'fail' && (
          <p style={{ fontSize: 12, color: 'var(--danger)' }}>Connection failed — check your API key.</p>
        )}
      </div>

      {/* Default evaluator */}
      <div className="settings-section">
        <div className="settings-section-title">Default evaluator name</div>
        <p className="text-muted text-sm">Pre-fills the evaluator field on new evals.</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="input" style={{ flex: 1 }} value={defaultEvaluator}
            onChange={e => setDefaultEvaluator(e.target.value)}
            placeholder="e.g. Priya" />
          <button className="btn btn-primary" onClick={saveEvaluator}>Save</button>
        </div>
      </div>

      {/* Client profiles */}
      <div className="settings-section" style={{ maxWidth: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="settings-section-title">Client profiles</div>
          <button className="btn btn-sm btn-primary" onClick={() => setProfileModal('new')}>
            <Plus size={13} /> New profile
          </button>
        </div>
        <p className="text-muted text-sm">
          Each profile defines the required lead fields and escalation rules for a brand.
        </p>

        {profiles.length === 0 ? (
          <p className="text-muted text-sm" style={{ fontStyle: 'italic' }}>No profiles yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {profiles.map(p => (
              <div key={p.brand} className="profile-list-item">
                <div className="profile-list-item-info">
                  <div className="profile-list-item-name">{p.brand}</div>
                  <div className="profile-list-item-meta">
                    Bot: {p.bot_persona_name || '—'} · Fields: {
                      Array.isArray(p.required_lead_fields) && p.required_lead_fields.length > 0
                        ? p.required_lead_fields.join(', ')
                        : 'none set'
                    }
                  </div>
                </div>
                <div className="profile-list-actions">
                  <button className="btn btn-icon btn-sm" onClick={() => setProfileModal(p)} title="Edit">
                    <Edit2 size={13} />
                  </button>
                  <button className="btn btn-icon btn-sm btn-danger" onClick={() => handleDeleteProfile(p.brand)} title="Delete">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {profileModal !== null && (
        <ProfileModal
          profile={profileModal === 'new' ? null : profileModal}
          onSave={handleProfileSaved}
          onClose={() => setProfileModal(null)}
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onDone={() => setToast(null)} />}
    </div>
  );
}
