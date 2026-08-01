/**
 * The run this artifact started, and the sandbox question.
 *
 * Two capability facts are stated here rather than worked around.
 *
 * 1. **The platform API has no threat → run index.** A human-sensor report keeps
 *    both ids, so that route is real; a feed or analyst-submitted artifact has
 *    no such record and the panel says so and points at the run list, instead of
 *    guessing by title.
 *
 * 2. **The loop does not raise a sandbox job.** Stage 2 runs the platform
 *    analyzer over the artifact text; the file sandbox is a separate surface
 *    with its own submissions. Implying a detonation that never happened would
 *    be the most flattering lie available on this screen.
 */

import { FlaskConical, Route } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ErrorState, SkeletonText } from '../../components/states'
import { Button, Panel, Separator, Spinner } from '../../components/ui'
import { LoopStageTracker, LoopStatusBadge } from '../../components/loop'
import { STAGES } from '../../domain/types'
import { useLoop } from '../../lib/api/queries'
import { formatDateTime, humanise } from '../../lib/format'

export interface ThreatLoopPanelProps {
  loopRunId: number | null
  /** True while the lookup that would produce a run id is still in flight. */
  resolving: boolean
}

export function ThreatLoopPanel({ loopRunId, resolving }: ThreatLoopPanelProps) {
  const run = useLoop(loopRunId ?? undefined)
  const stage = run.data ? STAGES.find((entry) => entry.n === run.data.current_stage) : undefined

  return (
    <Panel title="The loop" subtitle="What this artifact set in motion.">
      {loopRunId === null ? (
        resolving ? (
          <div role="status" aria-busy="true">
            <span className="sr-only">Looking for the loop run behind this artifact</span>
            <SkeletonText lines={2} />
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-body text-fg-muted">
              No record on this deployment links this artifact to a loop run. The threats API does not
              index runs by threat, and only a human-sensor report carries both ids.
            </p>
            <Button variant="secondary" size="sm" asChild>
              <Link to="/loops" className="gap-2">
                <Route className="size-4" aria-hidden="true" />
                Open the run list
              </Link>
            </Button>
          </div>
        )
      ) : run.isLoading ? (
        <div role="status" aria-busy="true" className="flex items-center gap-2 text-body text-fg-subtle">
          <Spinner size={15} />
          <span>Loading loop run {loopRunId}</span>
        </div>
      ) : run.error && !run.data ? (
        <ErrorState
          compact
          error={run.error}
          onRetry={() => void run.refetch()}
          title={`Loop run ${loopRunId} could not be loaded`}
        />
      ) : run.data ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-lead text-fg">Run {run.data.id}</span>
            <LoopStatusBadge status={run.data.status} />
          </div>

          <LoopStageTracker
            currentStage={run.data.current_stage}
            status={run.data.status}
            showLabel
          />

          <p className="text-sm text-fg-muted">
            {stage
              ? `Stage ${stage.n} of ${STAGES.length} — ${stage.label}. ${stage.hint}, owned by ${stage.owner}.`
              : `Stage ${run.data.current_stage} of ${STAGES.length}.`}
          </p>

          <dl className="space-y-1 text-sm">
            <div className="flex gap-2">
              <dt className="text-fg-subtle">Started</dt>
              <dd className="text-fg-muted">
                <time dateTime={run.data.created_at}>{formatDateTime(run.data.created_at)}</time>
              </dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-fg-subtle">Status</dt>
              <dd className="text-fg-muted">{humanise(run.data.status)}</dd>
            </div>
          </dl>

          <Button variant="secondary" size="sm" asChild>
            <Link to={`/loops/${run.data.id}`}>Open loop run {run.data.id}</Link>
          </Button>
        </div>
      ) : null}

      <Separator className="my-4" />

      <h3 className="label text-fg-faint">Sandbox</h3>
      <p className="mt-2 text-sm text-fg-muted">
        The loop’s ANALYZE stage runs the platform analyzer over this artifact’s text. It does not
        raise a sandbox job, and this deployment records no link from a threat record to one — so no
        detonation verdict is claimed here.
      </p>
      <Button variant="ghost" size="sm" asChild className="mt-2">
        <Link to="/sandbox" className="gap-2">
          <FlaskConical className="size-4" aria-hidden="true" />
          Open the sandbox
        </Link>
      </Button>
    </Panel>
  )
}
