const { BrowserWindow, app } = require('electron');
const path = require('path');
const fs = require('fs');

const DIM_LABELS = {
  lead_capture: 'Lead Capture Completeness',
  lead_qualification: 'Lead Qualification Quality',
  clarification: 'Clarification & Edge Cases',
  consistency: 'Consistency / Memory',
  persona: 'Persona & Transparency',
  escalation: 'Escalation & Handoff',
  out_of_scope: 'Out-of-Scope Handling',
  ux_tone: 'Overall UX & Tone',
};

function scoreHtml(v) {
  if (v === -1) return '<span style="color:#9ca3af;font-style:italic;font-size:12px">N/A</span>';
  if (!v) return '<span style="color:#d1d5db">—</span>';
  const color = v >= 4 ? '#16a34a' : v <= 2 ? '#dc2626' : '#ca8a04';
  const stars = '★'.repeat(v) + '☆'.repeat(5 - v);
  return `<span style="color:${color};font-size:16px;letter-spacing:1px">${stars}</span> <span style="font-weight:700;color:${color}">${v}/5</span>`;
}

function noteHtml(raw) {
  if (!raw) return '';
  const text = typeof raw === 'string' ? raw : (raw.text || '');
  const hasImg = raw && typeof raw === 'object' && raw.screenshot;
  if (!text && !hasImg) return '';
  return `<div style="font-size:11px;color:#6b7280;margin-top:5px;font-style:italic;line-height:1.5">"${text || ''}"${hasImg ? ' <span style="color:#7c3aed;font-size:10px">[screenshot attached]</span>' : ''}</div>`;
}

function generateEvalHtml(ev) {
  const dimNotes = ev.dim_notes || {};
  const dims = Object.keys(DIM_LABELS);
  const scoredVals = dims.map(k => ev[k]).filter(v => v != null && v > 0);
  const avg = scoredVals.length
    ? (scoredVals.reduce((a, b) => a + b, 0) / scoredVals.length).toFixed(1)
    : '—';
  const avgColor = avg !== '—' ? (avg >= 4 ? '#16a34a' : avg < 3 ? '#dc2626' : '#ca8a04') : '#9ca3af';

  const dimCards = dims.map(k => `
    <div style="border:1px solid #e5e7eb;border-radius:8px;padding:11px 14px;break-inside:avoid">
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.06em;color:#9ca3af;font-weight:600;margin-bottom:4px">${DIM_LABELS[k]}</div>
      <div>${scoreHtml(ev[k])}</div>
      ${noteHtml(dimNotes[k])}
    </div>
  `).join('');

  const aiChip = ev.ai_scored
    ? '<span style="background:#f3e8ff;color:#7c3aed;font-size:10px;padding:2px 8px;border-radius:12px;font-weight:600">AI scored</span>'
    : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>ChatEval — ${ev.chat_id || 'Eval'}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif;
           font-size: 12px; color: #111; padding: 32px 36px; background: #fff; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <!-- Header -->
  <div style="display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #111;padding-bottom:14px;margin-bottom:20px">
    <div>
      <div style="font-size:22px;font-weight:800;letter-spacing:-0.5px">ChatEval</div>
      <div style="font-size:11px;color:#6b7280;margin-top:2px">Chatbot evaluation report</div>
    </div>
    <div style="text-align:right">
      <div style="font-size:11px;color:#6b7280">Generated</div>
      <div style="font-size:12px;font-weight:500">${new Date().toLocaleString()}</div>
    </div>
  </div>

  <!-- Meta grid -->
  <div style="display:grid;grid-template-columns:repeat(5,auto);gap:12px 28px;margin-bottom:20px;align-items:start">
    ${[
      ['Chat ID', ev.chat_id || '—'],
      ['Brand', ev.brand || '—'],
      ['Bot', ev.bot_name || '—'],
      ['Evaluator', ev.evaluator || '—'],
      ['Date', ev.chat_date || '—'],
    ].map(([label, val]) => `
      <div>
        <div style="font-size:9px;text-transform:uppercase;letter-spacing:0.07em;color:#9ca3af;font-weight:600">${label}</div>
        <div style="font-size:13px;font-weight:600;margin-top:3px">${val}</div>
      </div>
    `).join('')}
  </div>

  <!-- Overall score banner -->
  <div style="display:flex;align-items:center;gap:20px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:14px 20px;margin-bottom:20px">
    <div>
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.06em;color:#9ca3af;font-weight:600">Overall score</div>
      <div style="font-size:36px;font-weight:800;color:${avgColor};line-height:1">${avg}</div>
    </div>
    ${ev.notes ? `<div style="flex:1;font-size:12px;color:#6b7280;border-left:2px solid #e5e7eb;padding-left:16px;line-height:1.5"><strong>Pre-eval note:</strong> ${ev.notes}</div>` : ''}
    ${aiChip ? `<div style="margin-left:auto">${aiChip}</div>` : ''}
  </div>

  <!-- Dimensions -->
  <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.06em;color:#9ca3af;font-weight:600;margin-bottom:10px">Dimension scores</div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:24px">
    ${dimCards}
  </div>

  ${ev.transcript ? `
  <!-- Transcript -->
  <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.06em;color:#9ca3af;font-weight:600;margin-bottom:8px">Chat transcript</div>
  <div style="border:1px solid #e5e7eb;border-radius:8px;padding:14px;font-family:monospace;font-size:11px;line-height:1.7;white-space:pre-wrap;word-break:break-word;color:#374151;background:#f9fafb">${ev.transcript.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>
  ` : ''}

  <!-- Footer -->
  <div style="margin-top:28px;border-top:1px solid #e5e7eb;padding-top:12px;font-size:10px;color:#9ca3af;display:flex;justify-content:space-between">
    <span>ChatEval — confidential</span>
    <span>${ev.brand || ''} · ${ev.chat_id || ''}</span>
  </div>
</body>
</html>`;
}

async function exportEvalPdf(ev, outputPath) {
  const html = generateEvalHtml(ev);
  const tmpPath = path.join(app.getPath('temp'), `chateval-pdf-${Date.now()}.html`);
  fs.writeFileSync(tmpPath, html, 'utf-8');

  const win = new BrowserWindow({
    show: false,
    webPreferences: { nodeIntegration: false, contextIsolation: true },
  });

  await new Promise((resolve, reject) => {
    win.webContents.once('did-finish-load', resolve);
    win.webContents.once('did-fail-load', (_, __, errDesc) => reject(new Error(errDesc)));
    win.loadFile(tmpPath);
  });

  // Allow CSS rendering to settle
  await new Promise(r => setTimeout(r, 300));

  const pdfBuffer = await win.webContents.printToPDF({
    pageSize: 'A4',
    printBackground: true,
    margins: { top: 0.4, bottom: 0.4, left: 0.4, right: 0.4 },
  });

  win.close();
  try { fs.unlinkSync(tmpPath); } catch { /* best effort */ }

  fs.writeFileSync(outputPath, pdfBuffer);
  return true;
}

module.exports = { exportEvalPdf };
