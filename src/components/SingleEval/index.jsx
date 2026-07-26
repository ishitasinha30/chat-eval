import { useState, useEffect } from 'react';
import TranscriptPanel from './TranscriptPanel';
import ScoringPanel from './ScoringPanel';
import ProfileModal from '../ProfileModal';
import Toast from '../shared/Toast';

const TODAY = new Date().toISOString().slice(0, 10);

function emptyMeta(defaultEvaluator = '') {
  return { chat_id: '', brand: '', bot_name: '', chat_date: TODAY, evaluator: defaultEvaluator, notes: '' };
}

// Serialize dimNotes (text) + dimScreenshots (base64) into the dim_notes JSON blob
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

export default function SingleEval() {
  const [tab, setTab] = useState('paste');
  const [transcript, setTranscript] = useState('');
  const [meta, setMeta] = useState(emptyMeta());
  const [profiles, setProfiles] = useState([]);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [scores, setScores] = useState({});
  const [dimNotes, setDimNotes] = useState({});
  const [dimScreenshots, setDimScreenshots] = useState({});
  const [aiReasons, setAiReasons] = useState({});
  const [aiScored, setAiScored] = useState(false);
  const [isScoring, setIsScoring] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [profileModal, setProfileModal] = useState(null);

  useEffect(() => {
    loadProfiles();
    window.api.getSetting('defaultEvaluator').then(v => {
      if (v) setMeta(m => ({ ...m, evaluator: v }));
    });
  }, []);

  async function loadProfiles() {
    const p = await window.api.getClientProfiles();
    setProfiles(p);
  }

  async function handleAutoScore() {
    if (!transcript.trim()) {
      setToast({ message: 'Paste a transcript first.', type: 'error' });
      return;
    }
    const apiKey = await window.api.getSetting('apiKey');
    if (!apiKey) {
      setToast({ message: 'Add your Anthropic API key in Settings.', type: 'error' });
      return;
    }
    setIsScoring(true);
    try {
      const result = await window.api.scoreTranscript({
        transcript,
        clientProfile: selectedProfile,
        apiKey,
      });
      const newScores = {};
      const newReasons = {};
      const newNotes = {};
      for (const [dim, data] of Object.entries(result)) {
        newScores[dim] = data.score;
        newReasons[dim] = data.reason;
        // Pre-populate evaluator note with AI reason (only if no existing note)
        if (!dimNotes[dim]) newNotes[dim] = data.reason;
      }
      setScores(newScores);
      setAiReasons(newReasons);
      setDimNotes(n => ({ ...n, ...newNotes }));
      setAiScored(true);
      setToast({ message: 'AI scoring complete — review and override any score.', type: 'success' });
    } catch (e) {
      setToast({ message: e.message, type: 'error' });
    } finally {
      setIsScoring(false);
    }
  }

  async function handleSave() {
    const scored = Object.values(scores).filter(v => v > 0);
    if (scored.length === 0) {
      setToast({ message: 'Score at least one dimension before saving.', type: 'error' });
      return;
    }
    setIsSaving(true);
    try {
      const avg = scored.reduce((a, b) => a + b, 0) / scored.length;
      const chatId = meta.chat_id.trim() || `CHT-${Date.now()}`;
      const sc = (v) => (v === -1 ? -1 : v || null);
      await window.api.saveEval({
        chat_id: chatId,
        brand: meta.brand,
        bot_name: meta.bot_name,
        chat_date: meta.chat_date,
        evaluator: meta.evaluator,
        notes: meta.notes,
        transcript,
        lead_capture: sc(scores.lead_capture),
        lead_qualification: sc(scores.lead_qualification),
        clarification: sc(scores.clarification),
        consistency: sc(scores.consistency),
        persona: sc(scores.persona),
        escalation: sc(scores.escalation),
        out_of_scope: sc(scores.out_of_scope),
        ux_tone: sc(scores.ux_tone),
        overall_avg: Math.round(avg * 10) / 10,
        dim_notes: serializeDimNotes(dimNotes, dimScreenshots),
        ai_scored: aiScored,
      });
      setToast({ message: 'Eval saved.', type: 'success' });
      setTranscript('');
      setMeta(emptyMeta(meta.evaluator));
      setScores({});
      setDimNotes({});
      setDimScreenshots({});
      setAiReasons({});
      setAiScored(false);
    } catch (e) {
      setToast({ message: e.message, type: 'error' });
    } finally {
      setIsSaving(false);
    }
  }

  function handleProfileSaved(savedProfile) {
    loadProfiles();
    setSelectedProfile(savedProfile);
    if (savedProfile.brand) setMeta(m => ({ ...m, brand: savedProfile.brand }));
    setProfileModal(null);
  }

  return (
    <div className="split">
      <TranscriptPanel
        tab={tab} setTab={setTab}
        transcript={transcript} setTranscript={setTranscript}
        meta={meta} setMeta={setMeta}
        profiles={profiles}
        selectedProfile={selectedProfile} setSelectedProfile={setSelectedProfile}
        onEditProfile={(p) => setProfileModal(p)}
        onNewProfile={() => setProfileModal('new')}
      />
      <ScoringPanel
        scores={scores} setScores={setScores}
        dimNotes={dimNotes} setDimNotes={setDimNotes}
        dimScreenshots={dimScreenshots} setDimScreenshots={setDimScreenshots}
        aiReasons={aiReasons} aiScored={aiScored}
        isScoring={isScoring} onAutoScore={handleAutoScore}
        onSave={handleSave} isSaving={isSaving}
      />

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
