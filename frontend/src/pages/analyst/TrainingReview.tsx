import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, BookOpenCheck, ChevronRight, CirclePause } from 'lucide-react'
import { api } from '../../lib/api'
import { usePoll } from '../../lib/usePoll'
import type { LoopRun, TrainingModule } from '../../lib/types'
import {
  Callout,
  Chip,
  Empty,
  GroupLabel,
  LoadState,
  PageHeader,
  Panel,
  Provenance,
  Status,
  Tabs,
  channelLabel,
  cx,
  timeAgo,
} from '../../components/ui'

const TABS = [
  { key: 'pending_review', label: 'Awaiting review' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
] as const

export function TrainingReview() {
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('pending_review')
  const { data: modules, error, refresh } = usePoll<TrainingModule[]>(
    () => api.get(`/api/training/modules?status=${tab}`),
    4000,
    [tab],
  )
  const { data: pendingRuns } = usePoll<LoopRun[]>(() => api.get('/api/loop-runs?status=awaiting_approval'), 4000)
  const [openId, setOpenId] = useState<number | null>(null)

  const runForModule = (moduleId: number): number | null =>
    pendingRuns?.find((r) => r.training_module_id === moduleId)?.id ?? null

  return (
    <div className="rise space-y-6">
      <PageHeader
        title="Training review"
        lede="Human-in-the-loop: every AI-written module passes an analyst before it reaches employees."
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs label="Module status" tabs={TABS} value={tab} onChange={setTab} />
        {/* Announces the result of each poll in one short phrase, rather than
            letting the whole list re-read every four seconds. */}
        <p className="text-sm text-c3" aria-live="polite">
          {modules ? `${modules.length} ${modules.length === 1 ? 'module' : 'modules'}` : ''}
        </p>
      </div>

      {!modules ? (
        <LoadState error={error} label="Loading modules" onRetry={refresh} />
      ) : modules.length === 0 ? (
        <Empty icon={<BookOpenCheck size={20} aria-hidden />}>No modules in this state.</Empty>
      ) : (
        <div className="space-y-4">
          {modules.map((m) => (
            <ModuleRow
              key={m.id}
              module={m}
              runId={runForModule(m.id)}
              open={openId === m.id}
              onToggle={() => setOpenId(openId === m.id ? null : m.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/* --- pieces ---------------------------------------------------------------- */

function ModuleRow({
  module: m,
  runId,
  open,
  onToggle,
}: {
  module: TrainingModule
  runId: number | null
  open: boolean
  onToggle: () => void
}) {
  const contentId = `module-${m.id}-content`

  return (
    <Panel>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
        <h2 className="min-w-0 flex-1">
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={open}
            aria-controls={contentId}
            className="group flex w-full items-center gap-2 text-left"
          >
            <ChevronRight
              size={15}
              aria-hidden
              className={cx('shrink-0 text-c3 transition-transform', open && 'rotate-90')}
            />
            <span className="text-h truncate transition-colors group-hover:text-brand-fg">{m.title}</span>
          </button>
        </h2>
        <span className="text-xs shrink-0 text-c3">{timeAgo(m.created_at)}</span>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <Status value={m.status} />
        <Chip>{channelLabel(m.channel)}</Chip>
        {/* Provenance stays on every row: an analyst approving a module must know
            whether a live model or the offline generator wrote it. An empty
            generation_source means no engine wrote it at all. */}
        {m.generation_source ? <Provenance source={m.generation_source} /> : <Chip>Human-written</Chip>}
      </div>

      <p className="text-body mt-2.5 text-c2">{m.description}</p>

      <div className="text-xs mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-c3">
        <span>~{m.est_minutes} min</span>
        <span>
          {m.quiz.length} quiz {m.quiz.length === 1 ? 'question' : 'questions'}
        </span>
        {m.approved_by && <span>Approved by {m.approved_by}</span>}
      </div>

      {m.status === 'pending_review' && runId !== null && (
        <div className="mt-4">
          <Callout
            tone="warning"
            title={`Gating loop run #${runId}`}
            icon={<CirclePause size={13} aria-hidden />}
            actions={
              <Link
                to={`/loop/${runId}`}
                className="text-sm inline-flex shrink-0 items-center gap-1.5 font-medium text-warning hover:underline"
              >
                Open the run <ArrowRight size={14} aria-hidden />
              </Link>
            }
          >
            Run #{runId} is stopped at the human gate. Nothing reaches an employee until this module is approved or
            rejected inside the run.
          </Callout>
        </div>
      )}

      {open && (
        <div id={contentId} className="mt-4 border-t border-hair pt-4">
          <GroupLabel>Module content</GroupLabel>
          <div className="space-y-2">
            {m.content.map((s) => (
              <div key={s.heading} className="rounded-control border border-hair bg-raised p-3">
                <h3 className="text-sm font-semibold text-c1">{s.heading}</h3>
                <p className="text-sm mt-1 leading-relaxed text-c2">{s.body}</p>
              </div>
            ))}
            {m.takeaway && (
              <div className="rounded-control border border-line bg-sunken px-3 py-2.5">
                <div className="label text-c3">Takeaway</div>
                <p className="text-sm mt-1 text-c1">{m.takeaway}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </Panel>
  )
}
