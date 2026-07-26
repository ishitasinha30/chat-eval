import { useRef } from 'react';
import { Upload, FileText, Sparkles, Edit2, Plus, Download } from 'lucide-react';
import { SAMPLE_TRANSCRIPT } from '../../lib/constants';

export default function TranscriptPanel({
  tab, setTab, transcript, setTranscript,
  meta, setMeta, profiles, selectedProfile, setSelectedProfile,
  onEditProfile, onNewProfile,
}) {
  const fileRef = useRef();

  async function handleDownloadTemplate() {
    const result = await window.api.saveFile({
      title: 'Save ChatEval template',
      defaultPath: 'ChatEval_Template.xlsx',
      filters: [{ name: 'Excel', extensions: ['xlsx'] }],
    });
    if (result.canceled) return;
    try {
      await window.api.generateTemplate(result.filePath, { singleRow: true });
    } catch (e) {
      alert('Could not generate template: ' + e.message);
    }
  }

  async function handleExcelUpload(file) {
    if (!file) return;
    const result = await window.api.openFile({
      title: 'Open Excel transcript file',
      properties: ['openFile'],
      filters: [{ name: 'Excel', extensions: ['xlsx', 'xls'] }],
    });
    if (result.canceled || !result.filePaths[0]) return;
    try {
      const { transcripts } = await window.api.parseTemplate(result.filePaths[0]);
      if (transcripts.length > 0) {
        const t = transcripts[0];
        setTranscript(t.transcript || '');
        setMeta(m => ({
          ...m,
          chat_id: t.chat_id || '',
          brand: t.brand || '',
          bot_name: t.bot_name || '',
          chat_date: t.chat_date || m.chat_date,
          evaluator: t.evaluator || m.evaluator,
          notes: t.notes || '',
        }));
        const match = profiles.find(p => p.brand === t.brand);
        if (match) setSelectedProfile(match);
      }
    } catch (e) {
      alert('Could not parse file: ' + e.message);
    }
  }

  function loadSample() {
    setTranscript(SAMPLE_TRANSCRIPT);
    setMeta(m => ({
      ...m,
      chat_id: 'CHT-DEMO',
      brand: 'Nexus Living',
      bot_name: 'Aria',
      chat_date: new Date().toISOString().slice(0, 10),
    }));
    const match = profiles.find(p => p.brand === 'Nexus Living');
    if (match) setSelectedProfile(match);
    setTab('paste');
  }

  const fieldList = selectedProfile?.required_lead_fields?.join(', ') || '—';
  const channels = selectedProfile?.escalation_channels?.join(', ') || '—';

  return (
    <div className="panel panel-l">
      <div className="panel-head">
        <span className="panel-head-title">Transcript</span>
        <button className="btn btn-sm" onClick={loadSample}>
          <Sparkles size={12} /> Sample
        </button>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'paste' ? 'active' : ''}`} onClick={() => setTab('paste')}>
          <FileText size={12} /> Paste text
        </button>
        <button className={`tab ${tab === 'upload' ? 'active' : ''}`} onClick={() => setTab('upload')}>
          <Upload size={12} /> From Excel
        </button>
      </div>

      <div className="panel-body">
        {tab === 'paste' ? (
          <textarea
            className="textarea input tall mono"
            value={transcript}
            onChange={e => setTranscript(e.target.value)}
            placeholder={`Paste the chat transcript here…\n\nBot: Hi! I'm Aria…\nUser: I want to book a room\nBot: Great! Could you share your name?`}
            style={{ flex: 1, minHeight: 180 }}
          />
        ) : (
          <>
            <label className={`upload-zone ${transcript ? 'has-file' : ''}`}
              onClick={() => handleExcelUpload()}>
              <Upload size={24} color={transcript ? 'var(--success)' : 'var(--text-3)'} />
              <p>{transcript ? 'Transcript loaded from Excel' : 'Click to open Excel template'}</p>
              <small>Loads the first transcript row from the transcripts sheet</small>
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              <span className="text-muted text-sm">don't have the template?</span>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            </div>
            <button className="btn" onClick={handleDownloadTemplate}>
              <Download size={13} /> Download blank template
            </button>
          </>
        )}

        {/* Metadata */}
        <div className="field-row">
          <div className="field">
            <label className="label">Brand</label>
            <input className="input" value={meta.brand} onChange={e => {
              setMeta(m => ({ ...m, brand: e.target.value }));
              const match = profiles.find(p => p.brand === e.target.value);
              if (match) setSelectedProfile(match);
            }} placeholder="Nexus Living" list="brand-list" />
            <datalist id="brand-list">
              {profiles.map(p => <option key={p.brand} value={p.brand} />)}
            </datalist>
          </div>
          <div className="field">
            <label className="label">Bot name</label>
            <input className="input" value={meta.bot_name} onChange={e => setMeta(m => ({ ...m, bot_name: e.target.value }))}
              placeholder="Aria" />
          </div>
        </div>

        <div className="field-row">
          <div className="field">
            <label className="label">Evaluator</label>
            <input className="input" value={meta.evaluator} onChange={e => setMeta(m => ({ ...m, evaluator: e.target.value }))}
              placeholder="Your name" />
          </div>
          <div className="field">
            <label className="label">Chat date</label>
            <input className="input" type="date" value={meta.chat_date} onChange={e => setMeta(m => ({ ...m, chat_date: e.target.value }))} />
          </div>
        </div>

        <div className="field-row">
          <div className="field">
            <label className="label">Chat ID</label>
            <input className="input" value={meta.chat_id} onChange={e => setMeta(m => ({ ...m, chat_id: e.target.value }))}
              placeholder="CHT-001 (auto if blank)" />
          </div>
          <div className="field">
            <label className="label">Pre-eval notes</label>
            <input className="input" value={meta.notes} onChange={e => setMeta(m => ({ ...m, notes: e.target.value }))}
              placeholder="Optional observation…" />
          </div>
        </div>

        {/* Client profile */}
        <div className="profile-box">
          <div className="profile-box-head">
            <span className="profile-box-head-label">Client profile</span>
            <div style={{ display: 'flex', gap: 4 }}>
              {selectedProfile && (
                <button className="btn btn-sm" onClick={() => onEditProfile(selectedProfile)}>
                  <Edit2 size={11} /> Edit
                </button>
              )}
              <button className="btn btn-sm" onClick={onNewProfile}>
                <Plus size={11} /> New
              </button>
            </div>
          </div>
          {selectedProfile ? (
            <div className="profile-rows">
              <div className="profile-row">
                <span className="profile-row-key">Required fields</span>
                <span className="profile-row-val">{fieldList}</span>
              </div>
              <div className="profile-row">
                <span className="profile-row-key">Escalation</span>
                <span className="profile-row-val">{channels}</span>
              </div>
              <div className="profile-row">
                <span className="profile-row-key">Out-of-scope</span>
                <span className="profile-row-val">{selectedProfile.out_of_scope_policy || '—'}</span>
              </div>
            </div>
          ) : (
            <div className="profile-rows">
              <p className="text-muted text-sm">
                {profiles.length === 0
                  ? 'No profiles yet — create one to configure lead fields for AI scoring.'
                  : 'Type a brand name above to load a profile, or create a new one.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
