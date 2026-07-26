import { useState } from 'react';
import { ArrowLeft, Copy, Check, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { DIMS } from '../../lib/constants';

function scoreColor(v) {
  if (v == null) return 'var(--text-3)';
  if (v < 2.5) return 'var(--danger)';
  if (v < 3.5) return '#ca8a04';
  return 'var(--success)';
}

function effortColor(e) {
  if (e === 'LOW') return { bg: '#dcfce7', color: '#15803d' };
  if (e === 'HIGH') return { bg: '#fee2e2', color: '#b91c1c' };
  return { bg: '#fef3c7', color: '#b45309' };
}

function RegressionArrow({ current, previous }) {
  if (previous == null) return null;
  const delta = current - previous;
  if (Math.abs(delta) < 0.15) return <span style={{ color: 'var(--text-3)', fontSize: 12 }} title={`Was ${previous}`}>→</span>;
  if (delta > 0) return (
    <span style={{ color: 'var(--success)', fontSize: 12, fontWeight: 600 }} title={`Was ${previous}, +${delta.toFixed(1)}`}>
      ↑ +{delta.toFixed(1)}
    </span>
  );
  return (
    <span style={{ color: 'var(--danger)', fontSize: 12, fontWeight: 600 }} title={`Was ${previous}, ${delta.toFixed(1)}`}>
      ↓ {delta.toFixed(1)}
    </span>
  );
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <button onClick={copy} className="btn btn-icon btn-sm" title="Copy to clipboard" style={{ flexShrink: 0 }}>
      {copied ? <Check size={12} /> : <Copy size={12} />}
    </button>
  );
}

function PromptFixBox({ fix }) {
  if (!fix) return null;
  return (
    <div style={{
      marginTop: 10, border: '1.5px solid var(--border)', borderRadius: 'var(--r-md)',
      background: 'var(--bg)', overflow: 'hidden',
    }}>
      <div style={{
        background: 'var(--bg-2)', padding: '5px 10px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
        borderBottom: '1px solid var(--border)',
      }}>
        <span style={{ fontSize: 10, fontWeight: 650, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-3)' }}>
          Prompt fix
        </span>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {fix.priority && (
            <span style={{
              fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 3,
              ...effortColor(fix.priority), textTransform: 'uppercase',
            }}>Priority: {fix.priority}</span>
          )}
          {fix.effort && (
            <span style={{
              fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 3,
              ...effortColor(fix.effort), textTransform: 'uppercase',
            }}>Effort: {fix.effort}</span>
          )}
        </div>
      </div>
      {fix.diagnosis && (
        <div style={{ padding: '8px 12px 4px', fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5 }}>
          <span style={{ fontWeight: 550, color: 'var(--text)' }}>Diagnosis: </span>{fix.diagnosis}
        </div>
      )}
      {fix.suggested_instruction && (
        <div style={{ padding: '6px 12px 10px', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <pre style={{
            flex: 1, margin: 0, fontFamily: 'monospace', fontSize: 12, lineHeight: 1.6,
            color: 'var(--text)', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            background: 'var(--bg-3)', borderRadius: 'var(--r-sm)', padding: '8px 10px',
          }}>{fix.suggested_instruction}</pre>
          <CopyButton text={fix.suggested_instruction} />
        </div>
      )}
    </div>
  );
}

function PatternBadge({ code }) {
  if (!code) return null;
  const isPositive = code === 'EDGE_CASE_PASS' || code === 'ESCALATION_PASS' || code === 'SCOPE_DEFLECT' || code === 'TONE_RECOVERY';
  return (
    <span style={{
      fontSize: 10, fontWeight: 650, padding: '2px 7px', borderRadius: 3,
      fontFamily: 'monospace', letterSpacing: '0.04em',
      background: isPositive ? '#dcfce7' : '#fee2e2',
      color: isPositive ? '#15803d' : '#b91c1c',
    }}>{code}</span>
  );
}

export default function AnalysisReport({ run, previousRun, onBack }) {
  const result = typeof run.result_json === 'string' ? JSON.parse(run.result_json) : run.result_json;

  // Build previous dim scores map for regression arrows
  const prevDimScores = {};
  if (previousRun) {
    try {
      const prevResult = typeof previousRun.result_json === 'string'
        ? JSON.parse(previousRun.result_json) : previousRun.result_json;
      for (const d of (prevResult.dimensions || [])) {
        prevDimScores[d.id] = d.avg_score;
      }
    } catch { /* ignore */ }
  }

  const { meta, overall_health, dimensions, cross_dimension_patterns, priority_fix_order, regression_note } = result;

  const dimMap = {};
  for (const d of (dimensions || [])) dimMap[d.id] = d;

  const aiScoredNote = meta?.chats_analysed && run.chats_analysed ?
    null : null; // included in meta by Claude if relevant

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        padding: '12px 20px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
      }}>
        <button className="btn btn-icon btn-sm" onClick={onBack} title="Back to history">
          <ArrowLeft size={14} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>
            {run.client} — {run.label || 'Analysis report'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
            {run.chats_analysed} chats · {run.date_from || 'all'} → {run.date_to || 'present'} · {run.generated_at?.slice(0, 16)} · {run.triggered_by}
          </div>
        </div>
        {previousRun && (
          <span style={{ fontSize: 11, color: 'var(--text-3)', background: 'var(--bg-2)', padding: '3px 8px', borderRadius: 4 }}>
            Compared to: {previousRun.generated_at?.slice(0, 10)} ({previousRun.label || 'prev run'})
          </span>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* ── Overall health ─────────────────────────────────────────────── */}
        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            <div style={{
              background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)',
              padding: '12px 20px', display: 'flex', gap: 28, alignItems: 'center', flex: 1,
            }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 550, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-3)' }}>
                  Avg score
                </div>
                <div style={{ fontSize: 28, fontWeight: 700, color: scoreColor(overall_health?.average_score) }}>
                  {overall_health?.average_score?.toFixed(1)}
                </div>
              </div>
              <div style={{ width: 1, background: 'var(--border)', alignSelf: 'stretch' }} />
              <div style={{ display: 'flex', gap: 24, flex: 1, flexWrap: 'wrap' }}>
                {overall_health?.weakest_dimension && (
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 550, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Weakest</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--danger)', marginTop: 2 }}>
                      {DIMS.find(d => d.id === overall_health.weakest_dimension)?.name || overall_health.weakest_dimension}
                    </div>
                  </div>
                )}
                {overall_health?.strongest_dimension && (
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 550, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Strongest</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--success)', marginTop: 2 }}>
                      {DIMS.find(d => d.id === overall_health.strongest_dimension)?.name || overall_health.strongest_dimension}
                    </div>
                  </div>
                )}
                {overall_health?.critical_failures?.length > 0 && (
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 550, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Critical failures</div>
                    <div style={{ display: 'flex', gap: 5, marginTop: 4, flexWrap: 'wrap' }}>
                      {overall_health.critical_failures.map(id => (
                        <span key={id} style={{
                          fontSize: 11, padding: '2px 7px', background: '#fee2e2', color: '#b91c1c',
                          borderRadius: 4, fontWeight: 600,
                        }}>
                          {DIMS.find(d => d.id === id)?.name || id}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ── Dimension breakdown ────────────────────────────────────────── */}
        <section>
          <div style={{ fontWeight: 650, fontSize: 13, marginBottom: 10, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Dimension breakdown
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {(dimensions || []).map(dim => (
              <div key={dim.id} style={{
                border: '1px solid var(--border)', borderRadius: 'var(--r-md)',
                background: 'var(--bg)', overflow: 'hidden',
              }}>
                {/* Card header */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                  borderBottom: '1px solid var(--border)', background: 'var(--bg-2)',
                }}>
                  <div style={{ fontWeight: 650, fontSize: 13, flex: 1 }}>{dim.name}</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <span style={{ fontSize: 20, fontWeight: 700, color: scoreColor(dim.avg_score) }}>
                      {dim.avg_score?.toFixed(1)}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-3)' }}>/5</span>
                    <RegressionArrow current={dim.avg_score} previous={prevDimScores[dim.id]} />
                  </div>
                  <div style={{ fontSize: 12, color: dim.failure_rate > 0.3 ? 'var(--danger)' : 'var(--text-3)' }}>
                    {Math.round((dim.failure_rate || 0) * 100)}% failure rate
                  </div>
                  <PatternBadge code={dim.failure_pattern} />
                </div>

                {/* Root cause */}
                <div style={{ padding: '10px 14px' }}>
                  {dim.root_cause && (
                    <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6, marginBottom: 8 }}>
                      <span style={{ fontWeight: 600 }}>Root cause: </span>{dim.root_cause}
                    </div>
                  )}

                  {/* Evidence */}
                  {dim.evidence?.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 8 }}>
                      {dim.evidence.map((ev, i) => (
                        <div key={i} style={{
                          display: 'flex', gap: 8, alignItems: 'flex-start',
                          background: 'var(--bg-2)', borderRadius: 'var(--r-sm)', padding: '6px 10px',
                        }}>
                          <span style={{
                            fontSize: 11, fontWeight: 650, color: scoreColor(ev.score),
                            minWidth: 18, textAlign: 'center',
                          }}>★{ev.score}</span>
                          <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'monospace', minWidth: 70 }}>
                            {ev.chat_id}
                          </span>
                          <span style={{ fontSize: 12, color: 'var(--text-2)', flex: 1, fontStyle: 'italic' }}>
                            "{ev.comment}"
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <PromptFixBox fix={dim.prompt_fix} />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Cross-dimension patterns ───────────────────────────────────── */}
        {cross_dimension_patterns?.length > 0 && (
          <section>
            <div style={{ fontWeight: 650, fontSize: 13, marginBottom: 10, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Cross-dimension patterns
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {cross_dimension_patterns.map((pat, i) => (
                <div key={i} style={{
                  border: '1.5px solid #c7d9f8', borderRadius: 'var(--r-md)',
                  background: 'var(--accent-bg)', padding: '12px 16px',
                }}>
                  <div style={{ fontWeight: 650, fontSize: 13, marginBottom: 4 }}>{pat.pattern_name}</div>
                  <div style={{ display: 'flex', gap: 5, marginBottom: 8, flexWrap: 'wrap' }}>
                    {(pat.dimensions_affected || []).map(id => (
                      <span key={id} style={{
                        fontSize: 11, padding: '2px 7px', background: 'var(--accent)', color: '#fff',
                        borderRadius: 4, fontWeight: 600,
                      }}>
                        {DIMS.find(d => d.id === id)?.name || id}
                      </span>
                    ))}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6, marginBottom: 8 }}>{pat.description}</div>
                  {pat.prompt_fix && (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      <pre style={{
                        flex: 1, margin: 0, fontFamily: 'monospace', fontSize: 12, lineHeight: 1.6,
                        color: 'var(--text)', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                        background: 'var(--bg)', borderRadius: 'var(--r-sm)', padding: '8px 10px',
                        border: '1px solid var(--border)',
                      }}>{pat.prompt_fix}</pre>
                      <CopyButton text={pat.prompt_fix} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Priority fix order ─────────────────────────────────────────── */}
        {priority_fix_order?.length > 0 && (
          <section>
            <div style={{ fontWeight: 650, fontSize: 13, marginBottom: 10, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Priority fix order
            </div>
            <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-2)', borderBottom: '1px solid var(--border)' }}>
                    {['#', 'Dimension', 'Reason', 'Effort'].map(h => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 650, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {priority_fix_order.map((item, i) => {
                    const ec = effortColor(item.effort);
                    return (
                      <tr key={i} style={{ borderBottom: i < priority_fix_order.length - 1 ? '1px solid var(--border)' : 'none' }}>
                        <td style={{ padding: '9px 12px', fontWeight: 700, color: 'var(--text-3)', fontSize: 14, width: 36 }}>{item.rank}</td>
                        <td style={{ padding: '9px 12px', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap' }}>
                          {DIMS.find(d => d.id === item.dimension)?.name || item.dimension}
                        </td>
                        <td style={{ padding: '9px 12px', fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5 }}>{item.reason}</td>
                        <td style={{ padding: '9px 12px' }}>
                          <span style={{ fontSize: 11, fontWeight: 650, padding: '2px 8px', borderRadius: 4, ...ec }}>
                            {item.effort}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ── Regression note ────────────────────────────────────────────── */}
        {regression_note && (
          <section>
            <div style={{ fontWeight: 650, fontSize: 13, marginBottom: 8, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Regression analysis
            </div>
            <div style={{
              border: '1px solid var(--border)', borderRadius: 'var(--r-md)',
              background: 'var(--bg-2)', padding: '12px 16px',
              fontSize: 13, color: 'var(--text)', lineHeight: 1.7,
            }}>
              {regression_note}
            </div>
          </section>
        )}

        <div style={{ height: 20 }} />
      </div>
    </div>
  );
}
