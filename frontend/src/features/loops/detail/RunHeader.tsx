/**
 * The run page's masthead: which artifact, how far round, and how fresh.
 *
 * The stage tracker is repeated here even though the timeline is a few pixels
 * below it, because the one question asked from the doorway — "where is this
 * one" — should not require reading a seven-row list to answer.
 */

import { useT } from '../../../lib/i18n'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import type { LoopRunDetail } from '../../../domain/types'
import { formatDateTime, humanise, timeAgo } from '../../../lib/format'
import { LoopStageTracker, LoopStatusBadge } from '../../../components/loop'
import { DataSourceLabel, LastUpdated } from '../../../components/data'
import { Button } from '../../../components/ui'
import { stageLabel } from '../filters'

export interface RunHeaderProps {
  run: LoopRunDetail
  /** Milliseconds from React Query's `dataUpdatedAt`, or 0 while unknown. */
  updatedAt: number
}

export function RunHeader({ run, updatedAt }: RunHeaderProps) {
  const t = useT()
  const title = run.threat?.title?.trim() || 'Untitled artifact'

  return (
    <header className="space-y-4">
      <Link
        to="/loops"
        className="inline-flex items-center gap-1.5 text-sm text-fg-subtle hover:text-fg"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        All closed loops
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <span className="tech text-fg-faint">Run #{run.id}</span>
            <LoopStatusBadge status={run.status} />
            {run.threat?.source ? (
              <span className="text-xs text-fg-subtle">
                From {humanise(run.threat.source).toLowerCase()}
              </span>
            ) : null}
          </div>
          <h1 className="mt-1.5 text-title text-fg">{title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
            <LoopStageTracker currentStage={run.current_stage} status={run.status} showLabel />
            <span className="text-sm text-fg-subtle">
              Stage {run.current_stage} of 7 · {stageLabel(run.current_stage)}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1.5">
          <DataSourceLabel source="live" detail={t('p.loop-run-record')} />
          <LastUpdated at={updatedAt ? new Date(updatedAt).toISOString() : null} />
          {run.status === 'awaiting_approval' ? (
            <Button asChild variant="primary" size="sm" className="mt-1">
              <Link to={`/approvals/${run.id}`}>Open the approval</Link>
            </Button>
          ) : null}
        </div>
      </div>

      <dl className="flex flex-wrap gap-x-8 gap-y-2 border-t border-line-subtle pt-4">
        <div>
          <dt className="label text-fg-faint">Started</dt>
          <dd className="text-sm text-fg-muted">
            {formatDateTime(run.created_at)} ({timeAgo(run.created_at)})
          </dd>
        </div>
        <div>
          <dt className="label text-fg-faint">Closed</dt>
          <dd className="text-sm text-fg-muted">
            {run.completed_at ? formatDateTime(run.completed_at) : 'Still open'}
          </dd>
        </div>
        <div>
          <dt className="label text-fg-faint">Targeted</dt>
          <dd className="text-sm text-fg-muted">
            {run.targeting.length} {run.targeting.length === 1 ? 'person' : 'people'}
          </dd>
        </div>
        <div>
          <dt className="label text-fg-faint">Assigned</dt>
          <dd className="text-sm text-fg-muted">
            {run.assignments.length}{' '}
            {run.assignments.length === 1 ? 'assignment' : 'assignments'}
          </dd>
        </div>
      </dl>
    </header>
  )
}
