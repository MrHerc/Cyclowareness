import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Check, CheckCircle2, ChevronRight, CircleAlert, Pencil, XCircle } from 'lucide-react'
import { api } from '../../lib/api'
import { usePoll } from '../../lib/usePoll'
import { STAGES, type LoopRunDetail, type TrainingModule } from '../../lib/types'
import {
  Badge,
  Button,
  Card,
  RiskBar,
  SectionTitle,
  Spinner,
  cx,
  pct,
  timeAgo,
} from '../../components/ui'

export function LoopRunPage() {
  const { id } = useParams()
  const { data: run, error: loadError, refresh } = usePoll<LoopRunDetail>(
    () => api.get(`/api/loop-runs/${id}`),
    1500,
    [id],
  )
  const [busyAction, setBusyAction] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (!run && loadError)
    return (
      <div className="fade-in py-10 text-center">
        <p className="text-sm text-bad">{loadError}</p>
        <Link to="/" className="mt-3 inline-block text-sm text-accent hover:underline">
          ← Back to the dashboard
        </Link>
      </div>
    )
  if (!run) return <Spinner label="Loading loop run…" />

  const act = async (action: 'approve' | 'reject' | 'force-measure') => {
    setBusyAction(action)
    setError(null)
    try {
      await api.post(`/api/loop-runs/${run.id}/${action}`)
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed')
    } finally {
      setBusyAction(null)
    }
  }

  return (
    <div className="fade-in space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Link to="/" className="flex items-center gap-1 text-sm text-muted hover:text-ink">
          <ArrowLeft size={15} /> Dashboard
        </Link>
        <ChevronRight size={14} className="text-faint" />
        <h1 className="text-lg font-bold tracking-tight">
          Loop run <span className="font-mono text-accent">#{run.id}</span>
        </h1>
        <Badge value={run.status} />
        {run.threat && (
          <>
            <span className="text-sm text-muted">·</span>
            <span className="max-w-md truncate text-sm text-muted">{run.threat.title}</span>
            <Badge value={run.threat.source} />
          </>
        )}
        <span className="ml-auto text-xs text-faint">started {timeAgo(run.created_at)}</span>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-bad/40 bg-bad/10 px-3 py-2 text-sm text-bad">
          <CircleAlert size={15} /> {error}
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-5">
        {/* Stage timeline */}
        <Card className="p-5 xl:col-span-2">
          <SectionTitle>Stage timeline</SectionTitle>
          <div className="space-y-0">
            {STAGES.map((stage, i) => {
              const entries = run.stage_history.filter((h) => h.stage === stage.n)
              const entry = entries.at(-1)
              const state = entry?.status ?? 'pending'
              const isGate =
                (run.status === 'awaiting_approval' && stage.n === 4) ||
                (run.status === 'awaiting_training' && stage.n === 6)
              return (
                <div key={stage.n} className="relative flex gap-3 pb-5 last:pb-0">
                  {i < STAGES.length - 1 && (
                    <div
                      className={cx(
                        'absolute left-[13px] top-7 h-full w-px',
                        state === 'completed' ? 'bg-accent/40' : 'bg-border',
                      )}
                    />
                  )}
                  <div
                    className={cx(
                      'z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold',
                      state === 'completed' && 'border-accent bg-accent/15 text-accent',
                      state === 'in_progress' && 'border-warn bg-warn/15 text-warn pulse-glow',
                      state === 'failed' && 'border-bad bg-bad/15 text-bad',
                      state === 'pending' && 'border-border-2 bg-surface-2 text-faint',
                    )}
                  >
                    {state === 'completed' ? <Check size={13} /> : state === 'failed' ? <XCircle size={13} /> : stage.n}
                  </div>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={cx(
                          'text-[13px] font-semibold uppercase tracking-wide',
                          state === 'pending' ? 'text-faint' : 'text-ink',
                        )}
                      >
                        {stage.label}
                      </span>
                      <span className="text-[10px] text-faint">{stage.hint}</span>
                      {entry?.completed_at && (
                        <span className="ml-auto shrink-0 text-[10px] text-faint">{timeAgo(entry.completed_at)}</span>
                      )}
                    </div>
                    {entry?.detail && <p className="mt-1 text-xs leading-relaxed text-muted">{entry.detail}</p>}
                    {entry?.error && <p className="mt-1 text-xs text-bad">✕ {entry.error}</p>}
                    {isGate && (
                      <p className="mt-1 text-xs italic text-warn">
                        {stage.n === 4
                          ? 'Waiting for analyst approval of the AI-generated training below.'
                          : 'Waiting for targeted employees to complete their training.'}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {run.status === 'awaiting_training' && (
            <div className="mt-4 border-t border-border pt-4">
              <Button variant="subtle" busy={busyAction === 'force-measure'} onClick={() => void act('force-measure')}>
                Force measure now
              </Button>
              <p className="mt-1.5 text-[11px] text-faint">
                Expires open assignments (raises their risk) and advances to MEASURE.
              </p>
            </div>
          )}
        </Card>

        {/* Right column: threat, module, targeting, results */}
        <div className="space-y-5 xl:col-span-3">
          {run.threat && <ThreatPanel threat={run.threat} />}

          {run.training_module && (
            <ModulePanel
              module={run.training_module}
              editable={run.status === 'awaiting_approval'}
              onApprove={() => void act('approve')}
              onReject={() => void act('reject')}
              busyAction={busyAction}
              refresh={refresh}
            />
          )}

          {run.targeting.length > 0 && (
            <Card className="p-5">
              <SectionTitle
                right={<span className="text-[11px] text-faint">targeted, not blasted — {run.targeting.length} people</span>}
              >
                Stage 4 — Targeting rationale
              </SectionTitle>
              <div className="space-y-2">
                {run.targeting.map((t) => (
                  <div key={t.employee_id} className="rounded-lg border border-border bg-surface-2 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium">{t.name}</span>
                      <RiskBar score={t.risk_score} />
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {t.reasons.map((r) => (
                        <span
                          key={r}
                          className="rounded-md border border-indigo/30 bg-indigo/10 px-1.5 py-0.5 text-[10px] text-indigo"
                        >
                          {r}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {run.assignments.length > 0 && (
            <Card className="p-5">
              <SectionTitle>Stage 5 — Training delivery</SectionTitle>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wide text-faint">
                    <th className="pb-2 font-medium">Employee</th>
                    <th className="pb-2 font-medium">Status</th>
                    <th className="pb-2 font-medium">Quiz score</th>
                    <th className="pb-2 font-medium">Completed</th>
                  </tr>
                </thead>
                <tbody>
                  {run.assignments.map((a) => (
                    <tr key={a.id} className="border-t border-border">
                      <td className="py-2">{a.employee_name}</td>
                      <td className="py-2">
                        <Badge value={a.status} />
                      </td>
                      <td className="py-2 tabular-nums">{a.score !== null ? `${a.score.toFixed(0)}%` : '—'}</td>
                      <td className="py-2 text-xs text-muted">{a.completed_at ? timeAgo(a.completed_at) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}

          {run.measure_summary && (
            <Card className="border-accent/30 p-5">
              <SectionTitle>Stages 6–7 — Measured results & feedback</SectionTitle>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <MiniStat label="Completion" value={pct(run.measure_summary.completion_rate)} />
                <MiniStat
                  label="Avg quiz score"
                  value={run.measure_summary.avg_score !== null ? `${run.measure_summary.avg_score.toFixed(0)}%` : '—'}
                />
                <MiniStat
                  label="Net risk change"
                  value={`${run.measure_summary.risk_delta_total > 0 ? '+' : ''}${run.measure_summary.risk_delta_total.toFixed(1)}`}
                  tone={run.measure_summary.risk_delta_total <= 0 ? 'good' : 'bad'}
                />
                <MiniStat
                  label="Avg time"
                  value={
                    run.measure_summary.avg_time_seconds
                      ? `${Math.round(run.measure_summary.avg_time_seconds / 60)}m`
                      : '—'
                  }
                />
              </div>
              <div className="mt-4 space-y-1.5">
                {run.measure_summary.per_employee.map((p) => (
                  <div key={p.employee_id} className="flex items-center gap-3 rounded-lg bg-surface-2 px-3 py-2 text-xs">
                    <span className="w-36 truncate font-medium">{p.name}</span>
                    <Badge value={p.status} />
                    <span className="tabular-nums text-muted">{p.score !== null ? `${p.score.toFixed(0)}%` : '—'}</span>
                    <span
                      className={cx(
                        'ml-auto font-mono font-semibold tabular-nums',
                        p.risk_delta <= 0 ? 'text-good' : 'text-bad',
                      )}
                    >
                      {p.risk_delta > 0 ? '+' : ''}
                      {p.risk_delta.toFixed(1)} risk
                    </span>
                  </div>
                ))}
              </div>
              {run.status === 'completed' && (
                <div className="mt-4 flex items-center gap-2 rounded-lg border border-good/30 bg-good/5 px-3 py-2.5 text-sm text-good">
                  <CheckCircle2 size={16} />
                  Loop closed — measured results updated the risk model and will shape the next TARGET stage.
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

function MiniStat({ label, value, tone }: { label: string; value: string; tone?: 'good' | 'bad' }) {
  return (
    <div className="rounded-lg border border-border bg-surface-2 p-3">
      <div className="text-[10px] uppercase tracking-wide text-faint">{label}</div>
      <div className={cx('mt-1 text-lg font-bold tabular-nums', tone === 'good' && 'text-good', tone === 'bad' && 'text-bad')}>
        {value}
      </div>
    </div>
  )
}

function ThreatPanel({ threat }: { threat: NonNullable<LoopRunDetail['threat']> }) {
  const [showRaw, setShowRaw] = useState(false)
  const iocs = threat.iocs ?? {}
  const iocEntries: { label: string; values: string[] }[] = [
    { label: 'URLs', values: iocs.urls ?? [] },
    { label: 'Domains', values: iocs.domains ?? [] },
    { label: 'Hashes', values: iocs.hashes ?? [] },
    { label: 'Senders', values: iocs.sender_patterns ?? [] },
  ].filter((e) => e.values.length > 0)

  return (
    <Card className="p-5">
      <SectionTitle
        right={
          <button onClick={() => setShowRaw(!showRaw)} className="text-[11px] text-accent hover:underline">
            {showRaw ? 'hide artifact' : 'view artifact'}
          </button>
        }
      >
        Stage 2 — Sandbox analysis
      </SectionTitle>
      <div className="flex flex-wrap items-center gap-2">
        {threat.verdict && <Badge value={threat.verdict} />}
        {threat.threat_type && <Badge value={threat.threat_type} />}
        <Badge value={threat.artifact_type} />
        {threat.confidence !== null && (
          <span className="text-xs text-muted">confidence {pct(threat.confidence)}</span>
        )}
      </div>
      {threat.behavior_summary && (
        <p className="mt-3 text-sm leading-relaxed text-muted">{threat.behavior_summary}</p>
      )}
      {threat.explanation && (
        <div className="mt-3 rounded-lg border border-indigo/25 bg-indigo/5 p-3">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-indigo">
            AI plain-language explanation (what employees will read)
          </div>
          <p className="mt-1 text-sm leading-relaxed">{threat.explanation}</p>
        </div>
      )}
      {iocEntries.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {iocEntries.map((entry) => (
            <div key={entry.label} className="flex flex-wrap items-baseline gap-1.5">
              <span className="w-16 text-[10px] font-semibold uppercase tracking-wide text-faint">{entry.label}</span>
              {entry.values.map((v) => (
                <code key={v} className="rounded bg-surface-3 px-1.5 py-0.5 font-mono text-[11px] text-warn">
                  {v}
                </code>
              ))}
            </div>
          ))}
        </div>
      )}
      {showRaw && (
        <pre className="mt-3 max-h-56 overflow-auto whitespace-pre-wrap rounded-lg border border-border bg-bg p-3 font-mono text-[11px] leading-relaxed text-muted">
          {threat.artifact_ref}
        </pre>
      )}
    </Card>
  )
}

function ModulePanel({
  module,
  editable,
  onApprove,
  onReject,
  busyAction,
  refresh,
}: {
  module: TrainingModule
  editable: boolean
  onApprove: () => void
  onReject: () => void
  busyAction: string | null
  refresh: () => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(module.title)
  const [description, setDescription] = useState(module.description)
  const [takeaway, setTakeaway] = useState(module.takeaway)
  const [content, setContent] = useState(module.content)
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    try {
      await api.patch(`/api/training/modules/${module.id}`, { title, description, takeaway, content })
      await refresh()
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  const editSection = (index: number, field: 'heading' | 'body', value: string) =>
    setContent((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)))

  return (
    <Card className={cx('p-5', editable && 'border-warn/40')}>
      <SectionTitle
        right={
          <div className="flex items-center gap-2">
            {module.ai_generated && (
              <span className="rounded-md border border-indigo/30 bg-indigo/10 px-1.5 py-0.5 text-[10px] text-indigo">
                AI generated
              </span>
            )}
            <Badge value={module.status} />
          </div>
        }
      >
        Stage 3 — Generated micro-training {editable && '(review required)'}
      </SectionTitle>

      {editing ? (
        <div className="space-y-2.5">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm font-semibold outline-none focus:border-accent/60"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent/60"
          />
          <textarea
            value={takeaway}
            onChange={(e) => setTakeaway(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm italic outline-none focus:border-accent/60"
          />
          {content.map((section, i) => (
            <div key={i} className="space-y-1.5 rounded-lg border border-border bg-surface-2 p-3">
              <input
                value={section.heading}
                onChange={(e) => editSection(i, 'heading', e.target.value)}
                className="w-full rounded-md border border-border bg-surface px-2.5 py-1.5 text-[12px] font-semibold text-accent outline-none focus:border-accent/60"
              />
              <textarea
                value={section.body}
                onChange={(e) => editSection(i, 'body', e.target.value)}
                rows={3}
                className="w-full rounded-md border border-border bg-surface px-2.5 py-1.5 text-[13px] outline-none focus:border-accent/60"
              />
            </div>
          ))}
          <div className="flex gap-2">
            <Button onClick={() => void save()} busy={saving}>
              Save changes
            </Button>
            <Button variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <>
          <h3 className="text-base font-semibold">{module.title}</h3>
          <p className="mt-1 text-sm text-muted">{module.description}</p>
          <div className="mt-2 flex items-center gap-2 text-[11px] text-faint">
            <Badge value={module.channel} /> · ~{module.est_minutes} min · {module.quiz.length} quiz questions
            {module.approved_by && <span>· approved by {module.approved_by}</span>}
          </div>

          <div className="mt-4 space-y-2.5">
            {module.content.map((section) => (
              <div key={section.heading} className="rounded-lg border border-border bg-surface-2 p-3">
                <div className="text-[12px] font-semibold text-accent">{section.heading}</div>
                <p className="mt-1 text-[13px] leading-relaxed text-muted">{section.body}</p>
              </div>
            ))}
          </div>

          <details className="mt-3">
            <summary className="cursor-pointer text-xs text-accent hover:underline">
              Quiz preview ({module.quiz.length} questions)
            </summary>
            <div className="mt-2 space-y-2">
              {module.quiz.map((q, qi) => (
                <div key={qi} className="rounded-lg border border-border bg-surface-2 p-3 text-[13px]">
                  <div className="font-medium">
                    {qi + 1}. {q.question}
                  </div>
                  <ul className="mt-1.5 space-y-1">
                    {q.options.map((opt, oi) => (
                      <li
                        key={oi}
                        className={cx(
                          'rounded px-2 py-1 text-xs',
                          oi === q.correct_index ? 'bg-good/10 text-good' : 'text-muted',
                        )}
                      >
                        {oi === q.correct_index ? '✓ ' : ''}
                        {opt}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </details>

          {module.takeaway && (
            <div className="mt-3 rounded-lg border border-accent/25 bg-accent/5 px-3 py-2.5 text-sm italic text-accent">
              “{module.takeaway}”
            </div>
          )}

          {editable && (
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
              <Button onClick={onApprove} busy={busyAction === 'approve'}>
                <Check size={14} /> Approve & continue the loop
              </Button>
              <Button variant="ghost" onClick={() => setEditing(true)}>
                <Pencil size={13} /> Edit first
              </Button>
              <Button variant="danger" onClick={onReject} busy={busyAction === 'reject'}>
                <XCircle size={14} /> Reject
              </Button>
              <span className="ml-auto text-[11px] text-faint">human-in-the-loop gate</span>
            </div>
          )}
        </>
      )}
    </Card>
  )
}
