const XLSX = require('xlsx');
const fs = require('fs');

const fmtScore = v => v === -1 ? 'N/A' : (v != null ? v : '');

function buildComments(dimNotes) {
  const notes = dimNotes || {};
  return Object.entries(notes)
    .map(([k, v]) => {
      const text = typeof v === 'string' ? v : (v && v.text) || '';
      const hasImg = v && typeof v === 'object' && v.screenshot;
      if (!text && !hasImg) return null;
      return text ? `${k}: ${text}${hasImg ? ' [screenshot]' : ''}` : `${k}: [screenshot]`;
    })
    .filter(Boolean)
    .join(' | ');
}

function parseTemplate(filePath) {
  const wb = XLSX.readFile(filePath, { raw: false, cellDates: false });

  const transcripts = parseSheet(wb, 'transcripts', {
    chat_id: 'chat_id',
    brand: 'brand',
    bot_name: 'bot_name',
    chat_date: 'chat_date',
    evaluator: 'evaluator',
    transcript: 'transcript',
    notes: 'notes',
  });

  const profiles = parseSheet(wb, 'client_profiles', {
    brand: 'brand',
    bot_persona_name: 'bot_persona_name',
    required_lead_fields: 'required_lead_fields',
    escalation_channels: 'escalation_channels',
    out_of_scope_policy: 'out_of_scope_policy',
    notes: 'notes',
  }).map(p => ({
    ...p,
    required_lead_fields: p.required_lead_fields
      ? String(p.required_lead_fields).split(',').map(f => f.trim()).filter(Boolean)
      : [],
    escalation_channels: p.escalation_channels
      ? String(p.escalation_channels).split(',').map(c => c.trim()).filter(Boolean)
      : [],
  }));

  return { transcripts, profiles };
}

function parseSheet(wb, sheetName, colKeys) {
  const ws = wb.Sheets[sheetName];
  if (!ws) return [];

  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, blankrows: false });

  // Find the header row (first row containing a recognized column name)
  const keyUpper = Object.keys(colKeys)[0].toUpperCase();
  const headerIdx = rows.findIndex(row =>
    Array.isArray(row) && row.some(c => c && String(c).toUpperCase().includes(keyUpper))
  );
  if (headerIdx === -1) return [];

  const headers = rows[headerIdx].map(h => (h ? String(h).toLowerCase().trim() : ''));

  // Map column names to indices
  const colIdx = {};
  for (const [key] of Object.entries(colKeys)) {
    colIdx[key] = headers.findIndex(h => h === key);
  }

  const results = [];
  // Skip the header row and the hint row below it
  for (let i = headerIdx + 2; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !row.some(c => c !== null)) continue;
    const obj = {};
    let hasData = false;
    for (const key of Object.keys(colKeys)) {
      const idx = colIdx[key];
      const val = idx >= 0 ? row[idx] : null;
      obj[key] = val !== null && val !== undefined ? String(val) : '';
      if (obj[key]) hasData = true;
    }
    if (hasData) results.push(obj);
  }

  return results;
}

function exportToExcel(evals, templatePath, outputPath) {
  let wb;
  if (templatePath && fs.existsSync(templatePath)) {
    wb = XLSX.readFile(templatePath);
  } else {
    wb = XLSX.utils.book_new();
  }

  let ws = wb.Sheets['eval_scores'];

  if (!ws) {
    ws = XLSX.utils.aoa_to_sheet([
      ['ChatEval — Scores (app exports here)'],
      ['CHAT_ID','EVALUATOR','SCORED_AT','LEAD_CAPTURE','LEAD_QUALIFICATION',
       'CLARIFICATION','CONSISTENCY','PERSONA','ESCALATION','OUT_OF_SCOPE',
       'UX_TONE','OVERALL_AVG','COMMENTS','AI_SCORED'],
      ['Links to transcripts sheet','Who scored it','YYYY-MM-DD HH:MM',
       'Score 1–5','Score 1–5','Score 1–5','Score 1–5','Score 1–5',
       'Score 1–5','Score 1–5','Score 1–5','Auto-calculated','Free-text notes','TRUE if AI'],
    ]);
    XLSX.utils.book_append_sheet(wb, ws, 'eval_scores');
  }

  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:A1');
  const appendAt = range.e.r + 1;

  const rows = evals.map(ev => {
    const comments = buildComments(ev.dim_notes);
    return [
      ev.chat_id, ev.evaluator,
      ev.created_at ? ev.created_at.slice(0, 16) : new Date().toISOString().slice(0, 16),
      fmtScore(ev.lead_capture), fmtScore(ev.lead_qualification), fmtScore(ev.clarification),
      fmtScore(ev.consistency), fmtScore(ev.persona), fmtScore(ev.escalation), fmtScore(ev.out_of_scope),
      fmtScore(ev.ux_tone), ev.overall_avg != null ? Math.round(ev.overall_avg * 10) / 10 : null,
      comments, ev.ai_scored ? 'TRUE' : 'FALSE',
    ];
  });

  XLSX.utils.sheet_add_aoa(ws, rows, { origin: { r: appendAt, c: 0 } });
  XLSX.writeFile(wb, outputPath);
  return true;
}

function exportToCsv(evals, outputPath) {
  const headers = [
    'chat_id','brand','bot_name','chat_date','evaluator','scored_at',
    'lead_capture','lead_qualification','clarification','consistency',
    'persona','escalation','out_of_scope','ux_tone','overall_avg',
    'comments','ai_scored',
  ];

  const rows = evals.map(ev => {
    const comments = buildComments(ev.dim_notes);
    return [
      ev.chat_id, ev.brand, ev.bot_name, ev.chat_date, ev.evaluator,
      ev.created_at ? ev.created_at.slice(0, 16) : '',
      fmtScore(ev.lead_capture), fmtScore(ev.lead_qualification), fmtScore(ev.clarification),
      fmtScore(ev.consistency), fmtScore(ev.persona), fmtScore(ev.escalation), fmtScore(ev.out_of_scope),
      fmtScore(ev.ux_tone), ev.overall_avg != null ? Math.round(ev.overall_avg * 10) / 10 : '',
      comments, ev.ai_scored ? 'TRUE' : 'FALSE',
    ];
  });

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  fs.writeFileSync(outputPath, XLSX.utils.sheet_to_csv(ws));
  return true;
}

function generateTemplate(outputPath, { singleRow = false } = {}) {
  const wb = XLSX.utils.book_new();

  // ── transcripts sheet ────────────────────────────────────────────────────
  const transcriptsData = [
    ['ChatEval — Transcripts'],
    ['CHAT_ID','BRAND','BOT_NAME','CHAT_DATE','EVALUATOR','TRANSCRIPT','NOTES'],
    ['Unique ID\ne.g. CHT-001','Property brand\ne.g. Nexus Living','Bot display name\ne.g. Aria',
     'Date of chat\nYYYY-MM-DD','Person scoring\nthis chat',
     'Full transcript — one turn per line.\nPrefix each line: Bot: … or User: …',
     'Optional pre-eval\nobservation'],
    ['CHT-001','Nexus Living','Aria','2026-06-19','Priya',
     "Bot: Hi! I'm Aria, your accommodation assistant at Nexus Living.\nUser: I want to book a room\nBot: Great! Could you share your full name?\nUser: Jamie Okafor\nBot: Thanks Jamie! What's your email?",
     'User was cooperative throughout'],
    ...(!singleRow ? [['CHT-002','Nexus Living','Aria','2026-06-19','Priya',
     "Bot: Hi! I'm Aria.\nUser: hi i want a room in london\nBot: We don't have London properties. Closest: Manchester, Sheffield, Birmingham.\nUser: manchester then\nBot: Which academic year?\nUser: 26/27",
     'Check city-switch clarity']] : []),
  ];
  const ws1 = XLSX.utils.aoa_to_sheet(transcriptsData);
  ws1['!cols'] = [12,16,12,14,12,50,22].map(w => ({ wch: w }));
  XLSX.utils.book_append_sheet(wb, ws1, 'transcripts');

  // ── client_profiles sheet ────────────────────────────────────────────────
  const profilesData = [
    ['ChatEval — Client Profiles'],
    ['BRAND','BOT_PERSONA_NAME','REQUIRED_LEAD_FIELDS','ESCALATION_CHANNELS','OUT_OF_SCOPE_POLICY','NOTES'],
    ['Must match brand\nin transcripts sheet','Official bot name\ne.g. Aria',
     'Comma-separated required fields.\nOptions: first_name, last_name, email, phone, city, university, budget, move_in_date, room_type',
     'How bot should hand off.\ne.g. call, email, contact_form',
     "How bot handles things it can't do.\ne.g. deflect_to_contact, say_dont_know",
     'Any other brand-specific\nevaluation notes'],
    ['Nexus Living','Aria','first_name, last_name, email, phone','call, email','deflect_to_contact',
     'Bot sometimes uses wrong persona name — watch for it'],
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(profilesData);
  ws2['!cols'] = [16,16,40,24,22,32].map(w => ({ wch: w }));
  XLSX.utils.book_append_sheet(wb, ws2, 'client_profiles');

  // ── eval_scores sheet ────────────────────────────────────────────────────
  const scoresData = [
    ['ChatEval — Scores (app exports here)'],
    ['CHAT_ID','EVALUATOR','SCORED_AT','LEAD_CAPTURE','LEAD_QUALIFICATION',
     'CLARIFICATION','CONSISTENCY','PERSONA','ESCALATION','OUT_OF_SCOPE',
     'UX_TONE','OVERALL_AVG','COMMENTS','AI_SCORED'],
    ['Links to\ntranscripts sheet','Who scored it','Timestamp of eval\nYYYY-MM-DD HH:MM',
     'Score 1–5','Score 1–5','Score 1–5','Score 1–5','Score 1–5',
     'Score 1–5','Score 1–5','Score 1–5','Auto-calculated\naverage',
     'Free-text notes\nfrom evaluator','TRUE if AI\nauto-scored'],
    ['CHT-001','Priya','2026-06-19 14:32',4,3,5,2,3,4,4,4,3.6,
     'Bot forgot 71-wk limit until called out. Persona name slip.',true],
  ];
  const ws3 = XLSX.utils.aoa_to_sheet(scoresData);
  ws3['!cols'] = [12,12,18,...Array(9).fill(10),14,32,10].map(w => ({ wch: w }));
  XLSX.utils.book_append_sheet(wb, ws3, 'eval_scores');

  XLSX.writeFile(wb, outputPath);
  return true;
}

module.exports = { parseTemplate, exportToExcel, exportToCsv, generateTemplate };
