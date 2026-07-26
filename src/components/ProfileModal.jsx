import { useState } from 'react';
import Modal from './shared/Modal';
import { LEAD_FIELDS, ESCALATION_CHANNELS, OUT_OF_SCOPE_POLICIES } from '../lib/constants';

const EMPTY = {
  brand: '',
  bot_persona_name: '',
  required_lead_fields: [],
  escalation_channels: [],
  out_of_scope_policy: 'deflect_to_contact',
  notes: '',
};

export default function ProfileModal({ profile, onSave, onClose }) {
  const [form, setForm] = useState(profile ? {
    ...profile,
    required_lead_fields: Array.isArray(profile.required_lead_fields) ? profile.required_lead_fields : [],
    escalation_channels: Array.isArray(profile.escalation_channels) ? profile.escalation_channels : [],
  } : EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isNew = !profile;

  function set(key, val) { setForm(f => ({ ...f, [key]: val })); }

  function toggleArr(key, val) {
    setForm(f => {
      const arr = f[key] || [];
      return { ...f, [key]: arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val] };
    });
  }

  async function handleSave() {
    if (!form.brand.trim()) { setError('Brand name is required.'); return; }
    setSaving(true);
    try {
      await window.api.saveClientProfile(form);
      onSave(form);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={isNew ? 'New client profile' : `Edit — ${profile.brand}`}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <span className="spin" /> : null}
            {saving ? 'Saving…' : 'Save profile'}
          </button>
        </>
      }
    >
      {error && <p style={{ color: 'var(--danger)', fontSize: 12 }}>{error}</p>}

      <div className="field-row">
        <div className="field">
          <label className="label">Brand name *</label>
          <input className="input" value={form.brand} onChange={e => set('brand', e.target.value)}
            placeholder="e.g. Nexus Living" disabled={!isNew} />
        </div>
        <div className="field">
          <label className="label">Bot persona name</label>
          <input className="input" value={form.bot_persona_name} onChange={e => set('bot_persona_name', e.target.value)}
            placeholder="e.g. Aria" />
        </div>
      </div>

      <div className="field">
        <label className="label">Required lead fields</label>
        <div className="check-grid">
          {LEAD_FIELDS.map(f => (
            <label key={f} className="check-item">
              <input type="checkbox" checked={form.required_lead_fields.includes(f)}
                onChange={() => toggleArr('required_lead_fields', f)} />
              {f.replace(/_/g, ' ')}
            </label>
          ))}
        </div>
      </div>

      <div className="field">
        <label className="label">Escalation channels</label>
        <div className="check-grid">
          {ESCALATION_CHANNELS.map(c => (
            <label key={c} className="check-item">
              <input type="checkbox" checked={form.escalation_channels.includes(c)}
                onChange={() => toggleArr('escalation_channels', c)} />
              {c.replace(/_/g, ' ')}
            </label>
          ))}
        </div>
      </div>

      <div className="field">
        <label className="label">Out-of-scope policy</label>
        <select className="select input" value={form.out_of_scope_policy} onChange={e => set('out_of_scope_policy', e.target.value)}>
          {OUT_OF_SCOPE_POLICIES.map(p => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
      </div>

      <div className="field">
        <label className="label">Notes</label>
        <textarea className="textarea input" rows={2} value={form.notes}
          onChange={e => set('notes', e.target.value)}
          placeholder="Any brand-specific evaluation notes…" />
      </div>
    </Modal>
  );
}
