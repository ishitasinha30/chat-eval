const Database = require('better-sqlite3');
const { app } = require('electron');
const path = require('path');

let db;

function initDb() {
  const dbPath = path.join(app.getPath('userData'), 'chateval.db');
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS evals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chat_id TEXT,
      brand TEXT,
      bot_name TEXT,
      chat_date TEXT,
      evaluator TEXT,
      transcript TEXT,
      notes TEXT,
      lead_capture INTEGER,
      lead_qualification INTEGER,
      clarification INTEGER,
      consistency INTEGER,
      persona INTEGER,
      escalation INTEGER,
      out_of_scope INTEGER,
      ux_tone INTEGER,
      overall_avg REAL,
      dim_notes TEXT,
      ai_scored INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS analysis_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      analysis_id TEXT NOT NULL,
      client TEXT NOT NULL,
      date_from TEXT,
      date_to TEXT,
      chats_analysed INTEGER,
      label TEXT,
      triggered_by TEXT,
      generated_at TEXT NOT NULL,
      result_json TEXT NOT NULL,
      weakest_dimension TEXT,
      avg_score REAL
    );

    CREATE TABLE IF NOT EXISTS client_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      brand TEXT UNIQUE NOT NULL,
      bot_persona_name TEXT,
      required_lead_fields TEXT,
      escalation_channels TEXT,
      out_of_scope_policy TEXT,
      notes TEXT,
      updated_at TEXT DEFAULT (datetime('now', 'localtime'))
    );
  `);
}

function saveEval(data) {
  const stmt = db.prepare(`
    INSERT INTO evals (
      chat_id, brand, bot_name, chat_date, evaluator, transcript, notes,
      lead_capture, lead_qualification, clarification, consistency, persona,
      escalation, out_of_scope, ux_tone, overall_avg, dim_notes, ai_scored
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    data.chat_id || null,
    data.brand || null,
    data.bot_name || null,
    data.chat_date || null,
    data.evaluator || null,
    data.transcript || null,
    data.notes || null,
    data.lead_capture || null,
    data.lead_qualification || null,
    data.clarification || null,
    data.consistency || null,
    data.persona || null,
    data.escalation || null,
    data.out_of_scope || null,
    data.ux_tone || null,
    data.overall_avg || null,
    JSON.stringify(data.dim_notes || {}),
    data.ai_scored ? 1 : 0
  );

  return { id: result.lastInsertRowid };
}

function getEvals(filters = {}) {
  let query = 'SELECT * FROM evals WHERE 1=1';
  const params = [];

  if (filters.brand) { query += ' AND brand = ?'; params.push(filters.brand); }
  if (filters.evaluator) { query += ' AND evaluator = ?'; params.push(filters.evaluator); }
  if (filters.from) { query += ' AND chat_date >= ?'; params.push(filters.from); }
  if (filters.to) { query += ' AND chat_date <= ?'; params.push(filters.to); }

  query += ' ORDER BY created_at DESC';

  return db.prepare(query).all(...params).map(r => ({
    ...r,
    dim_notes: r.dim_notes ? JSON.parse(r.dim_notes) : {},
    ai_scored: !!r.ai_scored,
  }));
}

function updateEval(id, data) {
  db.prepare(`
    UPDATE evals SET
      chat_id = ?, brand = ?, bot_name = ?, chat_date = ?,
      lead_capture = ?, lead_qualification = ?, clarification = ?, consistency = ?,
      persona = ?, escalation = ?, out_of_scope = ?, ux_tone = ?,
      overall_avg = ?, dim_notes = ?, evaluator = ?, notes = ?, ai_scored = ?
    WHERE id = ?
  `).run(
    data.chat_id ?? null, data.brand ?? null, data.bot_name ?? null, data.chat_date ?? null,
    data.lead_capture ?? null, data.lead_qualification ?? null,
    data.clarification ?? null, data.consistency ?? null,
    data.persona ?? null, data.escalation ?? null,
    data.out_of_scope ?? null, data.ux_tone ?? null,
    data.overall_avg ?? null,
    JSON.stringify(data.dim_notes || {}),
    data.evaluator ?? null, data.notes ?? null,
    data.ai_scored ? 1 : 0,
    id
  );
  return true;
}

function deleteEval(id) {
  db.prepare('DELETE FROM evals WHERE id = ?').run(id);
  return true;
}

function getClientProfiles() {
  return db.prepare('SELECT * FROM client_profiles ORDER BY brand ASC').all().map(r => ({
    ...r,
    required_lead_fields: r.required_lead_fields ? JSON.parse(r.required_lead_fields) : [],
    escalation_channels: r.escalation_channels ? JSON.parse(r.escalation_channels) : [],
  }));
}

function saveClientProfile(profile) {
  db.prepare(`
    INSERT INTO client_profiles (brand, bot_persona_name, required_lead_fields, escalation_channels, out_of_scope_policy, notes, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))
    ON CONFLICT(brand) DO UPDATE SET
      bot_persona_name = excluded.bot_persona_name,
      required_lead_fields = excluded.required_lead_fields,
      escalation_channels = excluded.escalation_channels,
      out_of_scope_policy = excluded.out_of_scope_policy,
      notes = excluded.notes,
      updated_at = excluded.updated_at
  `).run(
    profile.brand,
    profile.bot_persona_name || null,
    JSON.stringify(Array.isArray(profile.required_lead_fields) ? profile.required_lead_fields : []),
    JSON.stringify(Array.isArray(profile.escalation_channels) ? profile.escalation_channels : []),
    profile.out_of_scope_policy || null,
    profile.notes || null
  );
  return true;
}

function deleteClientProfile(brand) {
  db.prepare('DELETE FROM client_profiles WHERE brand = ?').run(brand);
  return true;
}

// ── Analysis runs ─────────────────────────────────────────────────────────────

function saveAnalysisRun(run) {
  db.prepare(`
    INSERT INTO analysis_runs
      (analysis_id, client, date_from, date_to, chats_analysed, label, triggered_by,
       generated_at, result_json, weakest_dimension, avg_score)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    run.analysis_id, run.client, run.date_from || null, run.date_to || null,
    run.chats_analysed || 0, run.label || null, run.triggered_by || null,
    run.generated_at, run.result_json,
    run.weakest_dimension || null, run.avg_score ?? null
  );
  return true;
}

function getAnalysisRuns(client) {
  const q = client
    ? 'SELECT * FROM analysis_runs WHERE client = ? ORDER BY generated_at DESC'
    : 'SELECT * FROM analysis_runs ORDER BY generated_at DESC';
  return db.prepare(q).all(...(client ? [client] : []));
}

function getAnalysisRun(id) {
  return db.prepare('SELECT * FROM analysis_runs WHERE id = ?').get(id);
}

function getPreviousAnalysisForClient(client, beforeDate) {
  return db.prepare(
    'SELECT * FROM analysis_runs WHERE client = ? AND generated_at < ? ORDER BY generated_at DESC LIMIT 1'
  ).get(client, beforeDate);
}

function deleteAnalysisRun(id) {
  db.prepare('DELETE FROM analysis_runs WHERE id = ?').run(id);
  return true;
}

module.exports = {
  initDb, saveEval, getEvals, updateEval, deleteEval,
  getClientProfiles, saveClientProfile, deleteClientProfile,
  saveAnalysisRun, getAnalysisRuns, getAnalysisRun,
  getPreviousAnalysisForClient, deleteAnalysisRun,
};
