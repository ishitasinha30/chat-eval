const Anthropic = require('@anthropic-ai/sdk');

const DIM_IDS = [
  'lead_capture','lead_qualification','clarification','consistency',
  'persona','escalation','out_of_scope','ux_tone',
];

async function scoreTranscript({ transcript, clientProfile, apiKey }) {
  if (!apiKey) throw new Error('No API key set. Add your Anthropic API key in Settings.');

  const client = new Anthropic({ apiKey });
  const p = clientProfile || {};

  const fields = Array.isArray(p.required_lead_fields)
    ? p.required_lead_fields.join(', ')
    : (p.required_lead_fields || 'not specified');
  const channels = Array.isArray(p.escalation_channels)
    ? p.escalation_channels.join(', ')
    : (p.escalation_channels || 'not specified');
  const botName = p.bot_persona_name || 'not specified';
  const policy = p.out_of_scope_policy || 'not specified';

  const prompt = `You are a QA evaluator for student housing chatbots. Score this transcript on 8 dimensions (1–5 each, 1 = very poor, 5 = excellent).

CLIENT PROFILE:
- Bot name: ${botName}
- Required lead fields: ${fields}
- Escalation channels: ${channels}
- Out-of-scope policy: ${policy}

TRANSCRIPT:
${transcript}

SCORING RUBRIC:
1. lead_capture — Did the bot collect every required field (${fields})? Score proportionally to % collected.
2. lead_qualification — Did the bot gather useful preference data (city, budget, dates, room type) beyond required fields?
3. clarification — Were absurd/edge-case inputs handled gracefully? If none occurred, score on general clarification quality.
4. consistency — Did the bot remember earlier answers? Re-asking the same question = 1–2.
5. persona — Was the bot name consistently "${botName}"? Honest about being a bot? A name slip = 1–2.
6. escalation — Were escalation requests handled per channels (${channels})? If none occurred, score 3.
7. out_of_scope — Were off-topic questions handled per policy "${policy}"? If none occurred, score 3.
8. ux_tone — Was the bot friendly, natural, on-brand, and did it recover from frustration?

Return ONLY valid JSON with no other text or markdown:
{"lead_capture":{"score":4,"reason":"one sentence"},"lead_qualification":{"score":3,"reason":"one sentence"},"clarification":{"score":5,"reason":"one sentence"},"consistency":{"score":4,"reason":"one sentence"},"persona":{"score":3,"reason":"one sentence"},"escalation":{"score":3,"reason":"one sentence"},"out_of_scope":{"score":4,"reason":"one sentence"},"ux_tone":{"score":5,"reason":"one sentence"}}`;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = message.content[0].text.trim()
    .replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

  const result = JSON.parse(text);

  for (const dim of DIM_IDS) {
    if (!result[dim] || typeof result[dim].score !== 'number') {
      throw new Error(`AI returned invalid data for dimension: ${dim}`);
    }
    result[dim].score = Math.max(1, Math.min(5, Math.round(result[dim].score)));
    result[dim].reason = String(result[dim].reason || '');
  }

  return result;
}

const ANALYSIS_REQUIRED_KEYS = ['meta','overall_health','dimensions','cross_dimension_patterns','priority_fix_order','regression_note'];

async function runBulkAnalysis({ client, evals, clientProfile, params, previousAnalysis, apiKey }) {
  if (!apiKey) throw new Error('No API key set. Add your Anthropic API key in Settings.');

  const anthropic = new Anthropic({ apiKey });
  const p = clientProfile || {};

  const fields = Array.isArray(p.required_lead_fields) ? p.required_lead_fields.join(', ') : (p.required_lead_fields || 'not specified');
  const channels = Array.isArray(p.escalation_channels) ? p.escalation_channels.join(', ') : (p.escalation_channels || 'not specified');

  // Build regression context block
  let regressionBlock = '';
  if (previousAnalysis) {
    try {
      const prev = JSON.parse(previousAnalysis.result_json);
      const prevScores = (prev.dimensions || [])
        .map(d => `${d.id}: ${d.avg_score}`)
        .join(' | ');
      regressionBlock = `
PREVIOUS ANALYSIS (for regression comparison):
Run date: ${previousAnalysis.generated_at.slice(0,10)} | Chats analysed: ${previousAnalysis.chats_analysed} | Label: ${previousAnalysis.label || 'unlabelled'}
Dimension avg scores from previous run: ${prevScores}
`;
    } catch { /* skip if unparseable */ }
  }

  // Bundle evals — scores + evaluator comments only (no transcript, reduces tokens)
  const bundledEvals = evals.map(ev => {
    const dimNotes = ev.dim_notes || {};
    const comments = {};
    for (const dim of DIM_IDS) {
      const raw = dimNotes[dim];
      const text = typeof raw === 'string' ? raw : (raw && raw.text) || '';
      if (text) comments[dim] = text;
    }
    return {
      chat_id: ev.chat_id || `eval-${ev.id}`,
      scores: {
        lead_capture: ev.lead_capture, lead_qualification: ev.lead_qualification,
        clarification: ev.clarification, consistency: ev.consistency,
        persona: ev.persona, escalation: ev.escalation,
        out_of_scope: ev.out_of_scope, ux_tone: ev.ux_tone,
      },
      overall_avg: ev.overall_avg,
      evaluator_comments: comments,
      ai_scored: ev.ai_scored,
    };
  });

  const aiScoredCount = evals.filter(e => e.ai_scored).length;
  const aiNote = aiScoredCount > 0
    ? `Note: ${aiScoredCount} of ${evals.length} chats were AI auto-scored — human review recommended for those.`
    : '';

  const systemPrompt = `You are a chatbot quality analyst reviewing evaluated transcripts from a student housing chatbot. Your audience is a prompt engineer who needs to understand failure patterns and fix the underlying prompts. Respond ONLY with a valid JSON object. No preamble, no markdown fences, no explanation outside the JSON structure.`;

  const userMessage = `ANALYSIS REQUEST

Client: ${client}
Analysis label: ${params.label || 'unlabelled'}
Date range: ${params.dateFrom || 'all'} to ${params.dateTo || 'all'}
Total chats: ${evals.length}
Dimensions to focus: ${params.dimensions && params.dimensions.length < 8 ? params.dimensions.join(', ') : 'All'}
${aiNote}

CLIENT PROFILE:
- Bot persona name: ${p.bot_persona_name || 'not specified'}
- Required lead fields: ${fields}
- Escalation channels: ${channels}
- Out-of-scope policy: ${p.out_of_scope_policy || 'not specified'}
${regressionBlock}
EVALUATED CHATS:
${JSON.stringify(bundledEvals, null, 2)}

FAILURE PATTERN TAXONOMY — use these exact codes for the failure_pattern field:
PARTIAL_CAPTURE, SKIPPED_CAPTURE, CONTEXT_LOSS, EDGE_CASE_FAIL, EDGE_CASE_PASS,
PERSONA_SLIP, ESCALATION_FAIL, ESCALATION_PASS, SCOPE_DEFLECT, SCOPE_OVERREACH,
TONE_RECOVERY, TONE_FAIL

IMPORTANT RULES:
- If all chats score 5/5 on a dimension, flag it as a possible scoring calibration issue in root_cause.
- For dimensions with no failures, set failure_rate to 0 and provide a brief positive root_cause.
- failure_rate is a decimal between 0 and 1 (e.g. 0.42 = 42% of chats scored below 3).
- evidence array: include up to 3 examples per dimension, only for chats scoring 1–3.
- priority_fix_order: rank only dimensions needing attention (avg_score < 4).
- regression_note: compare with previous analysis if provided; otherwise "No previous analysis available for comparison."

OUTPUT SCHEMA (return exactly this structure):
{
  "meta": { "client": string, "date_range": {"from": string, "to": string}, "chats_analysed": number, "analysis_label": string, "generated_at": ISO8601 },
  "overall_health": { "average_score": number, "weakest_dimension": string, "strongest_dimension": string, "critical_failures": [string] },
  "dimensions": [{ "id": string, "name": string, "avg_score": number, "failure_rate": number, "root_cause": string, "failure_pattern": string, "evidence": [{"chat_id": string, "comment": string, "score": number}], "prompt_fix": {"diagnosis": string, "suggested_instruction": string, "priority": "HIGH"|"MEDIUM"|"LOW", "effort": "HIGH"|"MEDIUM"|"LOW"} }],
  "cross_dimension_patterns": [{ "pattern_name": string, "dimensions_affected": [string], "description": string, "prompt_fix": string }],
  "priority_fix_order": [{ "rank": number, "dimension": string, "reason": string, "effort": "HIGH"|"MEDIUM"|"LOW" }],
  "regression_note": string
}`;

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8192,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  });

  const raw = message.content[0].text.trim()
    .replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

  const result = JSON.parse(raw);

  // Validate required keys
  for (const key of ANALYSIS_REQUIRED_KEYS) {
    if (!(key in result)) throw new Error(`AI response missing required key: "${key}"`);
  }
  if (!Array.isArray(result.dimensions)) throw new Error('AI response: dimensions must be an array');

  return result;
}

module.exports = { scoreTranscript, runBulkAnalysis };
