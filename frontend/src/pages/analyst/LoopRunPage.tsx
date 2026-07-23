import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Check, CheckCircle2, ChevronRight, Pencil, XCircle } from 'lucide-react'
import { api } from '../../lib/api'
import { usePoll } from '../../lib/usePoll'
import { useLoopStream } from '../../lib/useLoopStream'
import { STAGES, type LoopRunDetail, type TrainingModule } from '../../lib/types'
import {
  Button,
  Callout,
  Chip,
  CodeBlock,
  GroupLabel,
  Input,
  LoadState,
  Metric,
  PageHeader,
  Panel,
  Provenance,
  RiskMeter,
  Status,
  TD,
  TH,
  Table,
  Textarea,
  channelLabel,
  cx,
  pct,
  signed,
  timeAgo,
} from '../../components/ui'

export function LoopRunPage() {
  const { id } = useParams()
  const { data: run, error: loadError, refresh } = usePoll<LoopRunDetail>(
    () => api.get(`/api/loop-runs/${id}`),
    2500,
    [id],
  )
  const [busyAction, setBusyAction] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Live stage updates push an instant refresh; polling backs it up.
  useLoopStream(refresh)

  if (!run) return <LoadState error={loadError} label="Loading the loop run" onRetry={refresh} />

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
    <div className="rise space-y-6">
      <PageHeader
        breadcrumb={
          <>
            <Link to="/" className="inline-flex items-center gap-1 hover:text-c1">
              <ArrowLeft size={14} aria-hidden /> Loop
            </Link>
            <ChevronRight size={13} className="text-c3" aria-hidden />
            <span className="text-c3">Run #{run.id}</span>
          </>
        }
        title={`Loop run #${run.id}`}
        lede={run.threat ? run.threat.title : 'One artifact travelling all seven stages.'}
        actions={
          <>
            <Status value={run.status} />
            {run.threat && <Status value={run.threat.source} />}
            <span className="text-xs text-c3">started {timeAgo(run.created_at)}</span>
          </>
        }
      />

      {error && (
        <div role="alert">
          <Callout tone="danger">{error}</Callout>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-5">
        {/* The spine: where the run is, and where it has been. */}
        <Panel
          title="Stage timeline"
          subtitle="Seven stages, in order"
          className="xl:col-span-2 xl:sticky xl:top-4 xl:self-start"
          footer={
            run.status === 'awaiting_training' ? (
              <div>
                <Button
                  variant="secondary"
                  size="sm"
                  busy={busyAction === 'force-measure'}
                  onClick={() => void act('force-measure')}
                >
                  Force measure now
                </Button>
                <p className="text-xs mt-1.5 text-c3">
                  Expires open assignments (which raises their risk) and advances the run to Measure.
                </p>
              </div>
            ) : undefined
          }
        >
          <ol className="space-y-0">
            {STAGES.map((stage, i) => {
              const entries = run.stage_history.filter((h) => h.stage === stage.n)
              const entry = entries.at(-1)
              const state = entry?.status ?? 'pending'
              const isGate =
                (run.status === 'awaiting_approval' && stage.n === 4) ||
                (run.status === 'awaiting_training' && stage.n === 6)
              return (
                <li key={stage.n} className="relative flex gap-3 pb-5 last:pb-0">
                  {i < STAGES.length - 1 && (
                    <div
                      className={cx(
                        'absolute left-[13px] top-7 h-full w-px',
                        state === 'completed' ? 'bg-brand/40' : 'bg-hair',
                      )}
                      aria-hidden
                    />
                  )}
                  <div
                    className={cx(
                      'z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold',
                      state === 'completed' && 'border-brand bg-brand/15 text-brand-fg',
                      state === 'in_progress' && 'border-warning bg-warning/15 text-warning breathe',
                      state === 'failed' && 'border-danger bg-danger/15 text-danger',
                      state === 'pending' && 'border-line bg-raised text-c3',
                    )}
                  >
                    {state === 'completed' ? (
                      <Check size={13} aria-hidden />
                    ) : state === 'failed' ? (
                      <XCircle size={13} aria-hidden />
                    ) : (
                      stage.n
                    )}
                  </div>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <h3 className={cx('text-sm font-semibold', state === 'pending' ? 'text-c3' : 'text-c1')}>
                        {stage.n}. {stage.label}
                      </h3>
                      <span className="text-xs text-c3">{stage.hint}</span>
                      {entry?.completed_at && (
                        <span className="text-xs ml-auto shrink-0 text-c3">{timeAgo(entry.completed_at)}</span>
                      )}
                    </div>
                    {entry?.detail && <p className="text-xs mt-1 leading-relaxed text-c2">{entry.detail}</p>}
                    {entry?.error && (
                      <p className="text-xs mt-1 flex items-start gap-1.5 text-danger">
                        <XCircle size={13} className="mt-0.5 shrink-0" aria-hidden />
                        <span>
                          <span className="sr-only">Stage failed: </span>
                          {entry.error}
                        </span>
                      </p>
                    )}
                    {isGate && (
                      <p className="text-xs mt-1 text-warning">
                        {stage.n === 4
                          ? 'Waiting for analyst approval of the AI-generated training below.'
                          : 'Waiting for targeted employees to complete their training.'}
                      </p>
                    )}
                  </div>
                </li>
              )
            })}
          </ol>
        </Panel>

        {/* The story, in the order it happened. */}
        <div className="space-y-6 xl:col-span-3">
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
            <Panel
              title="Stage 4 — Who was targeted, and why"
              subtitle="Targeted, not blasted: only the people this threat would have worked on."
              actions={<span className="text-sm text-c3">{run.targeting.length} people</span>}
            >
              <ul className="divide-hair">
                {run.targeting.map((t) => (
                  <li key={t.employee_id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                      <span className="text-body font-medium">{t.name}</span>
                      <RiskMeter score={t.risk_score} />
                    </div>
                    {t.reasons.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {t.reasons.map((r) => (
                          <Chip key={r} tone="brand">
                            {r}
                          </Chip>
                        ))}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          {run.assignments.length > 0 && (
            <Panel
              title="Stage 5 — Training delivery"
              actions={<span className="text-sm text-c3">{run.assignments.length} assigned</span>}
            >
              <Table minWidth={440}>
                <thead>
                  <tr>
                    <TH>Employee</TH>
                    <TH>Status</TH>
                    <TH numeric>Quiz score</TH>
                    <TH>Completed</TH>
                  </tr>
                </thead>
                <tbody>
                  {run.assignments.map((a) => (
                    <tr key={a.id}>
                      <TD>{a.employee_name}</TD>
                      <TD>
                        <Status value={a.status} />
                      </TD>
                      <TD numeric>{a.score !== null ? `${a.score.toFixed(0)}%` : '—'}</TD>
                      <TD muted>{a.completed_at ? timeAgo(a.completed_at) : '—'}</TD>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Panel>
          )}

          {run.measure_summary && (
            <Panel
              tone={run.status === 'completed' ? 'feature' : 'default'}
              title="Stages 6–7 — Measured result, fed back"
              subtitle="What the targeted people actually did, and what it moved."
            >
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                <Metric size="sm" label="Completion" value={pct(run.measure_summary.completion_rate)} />
                <Metric
                  size="sm"
                  label="Avg quiz score"
                  value={run.measure_summary.avg_score !== null ? `${run.measure_summary.avg_score.toFixed(0)}%` : '—'}
                />
                <Metric
                  size="sm"
                  label="Net risk change"
                  value={signed(run.measure_summary.risk_delta_total)}
                  caption={run.measure_summary.risk_delta_total <= 0 ? 'risk fell' : 'risk rose'}
                  tone={run.measure_summary.risk_delta_total <= 0 ? 'success' : 'danger'}
                />
                <Metric
                  size="sm"
                  label="Avg time"
                  value={
                    run.measure_summary.avg_time_seconds
                      ? `${Math.round(run.measure_summary.avg_time_seconds / 60)}m`
                      : '—'
                  }
                />
              </div>

              {run.measure_summary.per_employee.length > 0 && (
                <div className="mt-5">
                  <GroupLabel>Per person</GroupLabel>
                  <ul className="divide-hair">
                    {run.measure_summary.per_employee.map((p) => (
                      <li key={p.employee_id} className="text-sm flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
                        <span className="w-36 truncate font-medium">{p.name}</span>
                        <Status value={p.status} />
                        <span className="text-c2">{p.score !== null ? `${p.score.toFixed(0)}%` : '—'}</span>
                        <span
                          className={cx(
                            'ml-auto font-mono font-semibold',
                            p.risk_delta <= 0 ? 'text-success' : 'text-danger',
                          )}
                        >
                          {signed(p.risk_delta)} risk
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {run.status === 'completed' && (
                <div className="mt-5">
                  <Callout tone="success" title="Loop closed" icon={<CheckCircle2 size={13} aria-hidden />}>
                    The measured results updated the risk model, and will shape who gets picked at the next Target
                    stage.
                  </Callout>
                </div>
              )}
            </Panel>
          )}
        </div>
      </div>
    </div>
  )
}

/* --- stage 2 --------------------------------------------------------------- */

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
    <Panel
      title="Stage 2 — Sandbox analysis"
      subtitle="What the artifact turned out to be"
      actions={
        <Button variant="ghost" size="sm" onClick={() => setShowRaw(!showRaw)}>
          {showRaw ? 'Hide artifact' : 'Show artifact'}
        </Button>
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        {threat.verdict && <Status value={threat.verdict} />}
        {threat.threat_type && <Chip>{threat.threat_type.replace(/_/g, ' ')}</Chip>}
        <Chip>{channelLabel(threat.artifact_type)}</Chip>
        {threat.confidence !== null && <span className="text-sm text-c2">confidence {pct(threat.confidence)}</span>}
      </div>

      {threat.behavior_summary && <p className="text-body mt-3 leading-relaxed text-c2">{threat.behavior_summary}</p>}

      {threat.explanation && (
        <div className="mt-3">
          <Callout tone="brand" title="AI explanation — what employees will read">
            {threat.explanation}
          </Callout>
        </div>
      )}

      {iocEntries.length > 0 && (
        <div className="mt-4">
          <GroupLabel>Indicators</GroupLabel>
          <dl className="space-y-1.5">
            {iocEntries.map((entry) => (
              <div key={entry.label} className="flex flex-wrap items-baseline gap-1.5">
                <dt className="label w-16 shrink-0 text-c3">{entry.label}</dt>
                {entry.values.map((v) => (
                  <dd key={v} className="m-0">
                    <code className="rounded-chip bg-sunken px-1.5 py-0.5 font-mono text-xs text-c2">{v}</code>
                  </dd>
                ))}
              </div>
            ))}
          </dl>
        </div>
      )}

      {showRaw && (
        <div className="mt-4">
          <GroupLabel>Raw artifact</GroupLabel>
          <CodeBlock maxHeight={224}>{threat.artifact_ref}</CodeBlock>
        </div>
      )}
    </Panel>
  )
}

/* --- stage 3: the human gate ----------------------------------------------- */

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
  const [saveError, setSaveError] = useState<string | null>(null)

  const save = async () => {
    setSaving(true)
    setSaveError(null)
    try {
      await api.patch(`/api/training/modules/${module.id}`, { title, description, takeaway, content })
      await refresh()
      setEditing(false)
    } catch (e) {
      // Without this the save failed in silence and the editor simply closed.
      setSaveError(e instanceof Error ? e.message : 'Could not save the module')
    } finally {
      setSaving(false)
    }
  }

  const editSection = (index: number, field: 'heading' | 'body', value: string) =>
    setContent((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)))

  return (
    <Panel
      tone={editable ? 'feature' : 'default'}
      title="Stage 3 — Generated micro-training"
      subtitle={
        editable
          ? 'Review required. Nothing reaches an employee until you approve it.'
          : 'Written from the threat above.'
      }
      actions={
        <div className="flex items-center gap-2">
          <Provenance source={module.generation_source} />
          <Status value={module.status} />
        </div>
      }
      footer={
        editable && !editing ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="primary" onClick={onApprove} busy={busyAction === 'approve'}>
              <Check size={14} aria-hidden /> Approve and continue the loop
            </Button>
            <Button variant="secondary" onClick={() => setEditing(true)}>
              <Pencil size={13} aria-hidden /> Edit first
            </Button>
            <Button variant="danger" onClick={onReject} busy={busyAction === 'reject'}>
              <XCircle size={14} aria-hidden /> Reject
            </Button>
            <span className="text-xs ml-auto text-c3">Human-in-the-loop gate</span>
          </div>
        ) : undefined
      }
    >
      {editing ? (
        <div className="space-y-4">
          <Input label="Module title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Textarea
            label="Description"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <Textarea
            label="Key takeaway"
            rows={2}
            value={takeaway}
            onChange={(e) => setTakeaway(e.target.value)}
            hint="The one line an employee should remember."
          />
          {content.map((section, i) => (
            <div key={i} className="space-y-3 rounded-control border border-hair bg-raised p-3">
              <Input
                label={`Section ${i + 1} heading`}
                value={section.heading}
                onChange={(e) => editSection(i, 'heading', e.target.value)}
              />
              <Textarea
                label={`Section ${i + 1} body`}
                rows={3}
                value={section.body}
                onChange={(e) => editSection(i, 'body', e.target.value)}
              />
            </div>
          ))}
          {saveError && (
            <div role="alert">
              <Callout tone="danger">{saveError}</Callout>
            </div>
          )}
          <div className="flex gap-2">
            <Button variant="primary" onClick={() => void save()} busy={saving}>
              Save changes
            </Button>
            <Button variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <>
          <h3 className="text-h">{module.title}</h3>
          <p className="text-body mt-1 text-c2">{module.description}</p>
          <div className="text-xs mt-2 flex flex-wrap items-center gap-2 text-c3">
            <Chip>{channelLabel(module.channel)}</Chip>
            <span>about {module.est_minutes} min</span>
            <span aria-hidden>·</span>
            <span>
              {module.quiz.length} quiz {module.quiz.length === 1 ? 'question' : 'questions'}
            </span>
            {module.approved_by && (
              <>
                <span aria-hidden>·</span>
                <span>approved by {module.approved_by}</span>
              </>
            )}
          </div>

          <div className="mt-4 space-y-2.5">
            {module.content.map((section) => (
              <div key={section.heading} className="rounded-control border border-hair bg-raised p-3">
                <h4 className="text-sm font-semibold text-brand-fg">{section.heading}</h4>
                <p className="text-sm mt-1 leading-relaxed text-c2">{section.body}</p>
              </div>
            ))}
          </div>

          <details className="mt-4">
            <summary className="text-sm cursor-pointer text-brand-fg hover:underline">
              Quiz preview ({module.quiz.length} {module.quiz.length === 1 ? 'question' : 'questions'})
            </summary>
            <ol className="mt-2 space-y-2">
              {module.quiz.map((q, qi) => (
                <li key={qi} className="rounded-control border border-hair bg-raised p-3">
                  <p className="text-sm font-medium">
                    {qi + 1}. {q.question}
                  </p>
                  <ul className="mt-1.5 space-y-1">
                    {q.options.map((opt, oi) => {
                      const correct = oi === q.correct_index
                      return (
                        <li
                          key={oi}
                          className={cx(
                            'text-xs flex items-start gap-1.5 rounded-chip px-2 py-1',
                            correct ? 'bg-success/10 text-success' : 'text-c2',
                          )}
                        >
                          {correct ? (
                            <Check size={13} className="mt-0.5 shrink-0" aria-hidden />
                          ) : (
                            <span className="w-[13px] shrink-0" aria-hidden />
                          )}
                          <span>
                            {correct && <span className="sr-only">Correct answer: </span>}
                            {opt}
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                </li>
              ))}
            </ol>
          </details>

          {module.takeaway && (
            <div className="mt-4">
              <Callout tone="brand" title="Takeaway">
                {module.takeaway}
              </Callout>
            </div>
          )}
        </>
      )}
    </Panel>
  )
}
