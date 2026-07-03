import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, BookOpenCheck } from 'lucide-react'
import { api } from '../../lib/api'
import { usePoll } from '../../lib/usePoll'
import type { LoopRun, TrainingModule } from '../../lib/types'
import { Badge, Card, EmptyState, SectionTitle, Spinner, cx, timeAgo } from '../../components/ui'

const TABS = [
  { key: 'pending_review', label: 'Awaiting review' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
] as const

export function TrainingReview() {
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('pending_review')
  const { data: modules } = usePoll<TrainingModule[]>(() => api.get(`/api/training/modules?status=${tab}`), 4000, [tab])
  const { data: pendingRuns } = usePoll<LoopRun[]>(() => api.get('/api/loop-runs?status=awaiting_approval'), 4000)
  const [openId, setOpenId] = useState<number | null>(null)

  const runForModule = (moduleId: number): number | null =>
    pendingRuns?.find((r) => r.training_module_id === moduleId)?.id ?? null

  return (
    <div className="fade-in space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Training Review</h1>
        <p className="text-sm text-muted">
          Human-in-the-loop: every AI-generated module passes an analyst before it reaches employees.
        </p>
      </div>

      <div className="flex w-fit gap-1 rounded-lg border border-border bg-surface p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cx(
              'rounded-md px-3.5 py-1.5 text-[13px] font-medium transition-colors',
              tab === t.key ? 'bg-accent/15 text-accent' : 'text-muted hover:text-ink',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {!modules ? (
        <Spinner />
      ) : modules.length === 0 ? (
        <EmptyState>
          <BookOpenCheck size={20} className="mx-auto mb-2 text-faint" />
          No modules in this state.
        </EmptyState>
      ) : (
        <div className="space-y-3">
          {modules.map((m) => {
            const runId = runForModule(m.id)
            const open = openId === m.id
            return (
              <Card key={m.id} className="p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <button onClick={() => setOpenId(open ? null : m.id)} className="text-left text-sm font-semibold hover:text-accent">
                    {m.title}
                  </button>
                  {m.ai_generated && (
                    <span className="rounded-md border border-indigo/30 bg-indigo/10 px-1.5 py-0.5 text-[10px] text-indigo">
                      AI generated
                    </span>
                  )}
                  <Badge value={m.status} />
                  <Badge value={m.channel} />
                  <span className="ml-auto text-xs text-faint">{timeAgo(m.created_at)}</span>
                </div>
                <p className="mt-1 text-[13px] text-muted">{m.description}</p>
                <div className="mt-2 flex items-center gap-3 text-[11px] text-faint">
                  <span>~{m.est_minutes} min</span>
                  <span>{m.quiz.length} quiz questions</span>
                  {m.approved_by && <span>approved by {m.approved_by}</span>}
                </div>

                {open && (
                  <div className="mt-4 space-y-2.5 border-t border-border pt-4">
                    {m.content.map((s) => (
                      <div key={s.heading} className="rounded-lg border border-border bg-surface-2 p-3">
                        <div className="text-[12px] font-semibold text-accent">{s.heading}</div>
                        <p className="mt-1 text-[13px] leading-relaxed text-muted">{s.body}</p>
                      </div>
                    ))}
                    {m.takeaway && (
                      <div className="rounded-lg border border-accent/25 bg-accent/5 px-3 py-2.5 text-sm italic text-accent">
                        “{m.takeaway}”
                      </div>
                    )}
                  </div>
                )}

                {m.status === 'pending_review' && runId && (
                  <div className="mt-4">
                    <SectionTitle>
                      <span className="text-warn">This module is gating loop run #{runId}</span>
                    </SectionTitle>
                    <Link
                      to={`/loop/${runId}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-warn/40 bg-warn/10 px-3 py-1.5 text-sm font-medium text-warn transition-colors hover:bg-warn/20"
                    >
                      Review & approve in the loop <ArrowRight size={14} />
                    </Link>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
