/**
 * The signature figure, wired to the list underneath it.
 *
 * The point of putting the flow and the run list in one panel is that the
 * figure is not decoration: clicking a node is how an analyst asks "which
 * runs are those?", and the answer appears without leaving the page. The
 * selection lives in the URL so that "the four runs stuck in Targeting" is a
 * link somebody can paste into a channel.
 *
 * Counts on the nodes and rows in the table are derived by the same function
 * (`summariseRuns`, via `positionOf`), so a node that says 3 filters to exactly
 * three rows. Any other arrangement drifts.
 */

import type { MessageKey } from '../../lib/i18n'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useT } from '../../lib/i18n'
import { ClosedLoopFlow, LoopStatusBadge, summariseRuns } from '../../components/loop'
import { AsyncBoundary, EmptyState, SkeletonTable } from '../../components/states'
import {
  Button,
  Panel,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui'
import { STAGES, type RunSummary } from '../../domain/types'
import { humanise, timeAgo } from '../../lib/format'
import { runsAt, type RunPosition } from './derive'

export interface LoopSectionProps {
  runs: RunSummary[]
  selected: RunPosition
  onSelect: (next: RunPosition) => void
  isLoading: boolean
  error: unknown
  onRetry: () => void
}

function stageLabel(stage: number): string {
  return STAGES.find((entry) => entry.n === stage)?.label ?? `Stage ${stage}`
}

/** Takes the translator rather than reaching for one: this is a module-level
 *  helper, and a hook cannot be called outside a component. */
function selectionLabel(selected: RunPosition, t: (key: MessageKey) => string): string {
  if (selected === null) return t('w.every-active-and-recently-closed')
  if (selected === 'gate') return 'Runs waiting at the human approval gate'
  return `Runs held at ${stageLabel(selected)}`
}

export function LoopSection({
  runs,
  selected,
  onSelect,
  isLoading,
  error,
  onRetry,
}: LoopSectionProps) {
  const t = useT()
  const activity = useMemo(() => summariseRuns(runs), [runs])
  const visible = useMemo(() => runsAt(runs, selected), [runs, selected])

  return (
    <Panel
      title={t('cc.closedLoop')}
      subtitle={t('x.select-a-stage-or-the')}
      actions={
        selected !== null ? (
          <Button size="sm" variant="ghost" onClick={() => onSelect(null)}>
            Clear stage filter
          </Button>
        ) : undefined
      }
    >
      <AsyncBoundary
        isLoading={isLoading}
        error={error}
        onRetry={onRetry}
        loadingLabel={t('x.loading-the-loop')}
        skeleton={
          <div className="space-y-6">
            <div className="shimmer h-64 rounded-panel bg-elevated" aria-hidden="true" />
            <SkeletonTable rows={4} cols={5} />
          </div>
        }
      >
        <ClosedLoopFlow
          stages={activity.stages}
          gate={activity.gate}
          selectedStage={typeof selected === 'number' ? selected : null}
          gateSelected={selected === 'gate'}
          onStageClick={(stage) => onSelect(selected === stage ? null : stage)}
          onGateClick={() => onSelect(selected === 'gate' ? null : 'gate')}
          windowLabel="Active and recent runs"
        />

        <div className="mt-6 border-t border-line-subtle pt-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-h text-fg">{selectionLabel(selected, t)}</h3>
            <p className="text-xs text-fg-faint">
              {visible.length} of {runs.length} {runs.length === 1 ? 'run' : 'runs'}
            </p>
          </div>

          {visible.length === 0 ? (
            <EmptyState
              compact
              headline="No runs here"
              description={
                selected === null
                  ? 'Runs appear once a threat is submitted, reported by an employee, or pushed from the intelligence feed.'
                  : 'Nothing is held at this point of the loop right now. Clear the filter to see every run.'
              }
              action={
                selected === null ? (
                  <Button size="sm" variant="secondary" asChild>
                    <Link to="/threats">Open threat intake</Link>
                  </Button>
                ) : (
                  <Button size="sm" variant="secondary" onClick={() => onSelect(null)}>
                    Clear stage filter
                  </Button>
                )
              }
              className="mt-2"
            />
          ) : (
            <Table className="mt-3" containerClassName="max-h-96">
              <TableHeader>
                <TableRow>
                  <TableHead>Run</TableHead>
                  <TableHead>Trigger</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead numeric>Targets</TableHead>
                  <TableHead>Started</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((run) => (
                  <TableRow key={run.id}>
                    <TableCell>
                      <Link
                        to={`/loops/${run.id}`}
                        className="tech text-brand-fg underline-offset-4 hover:underline"
                      >
                        #{run.id}
                      </Link>
                    </TableCell>
                    <TableCell className="max-w-[22rem]">
                      <span className="block truncate text-fg" title={run.threat_title}>
                        {run.threat_title}
                      </span>
                      <span className="block truncate text-xs text-fg-faint">
                        {[run.source, run.threat_type, run.verdict]
                          .filter((part): part is string => Boolean(part))
                          .map(humanise)
                          .join(' · ') || 'No classification recorded'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <LoopStatusBadge status={run.status} />
                    </TableCell>
                    <TableCell>{stageLabel(run.current_stage)}</TableCell>
                    <TableCell numeric>{run.targets}</TableCell>
                    <TableCell>{timeAgo(run.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </AsyncBoundary>
    </Panel>
  )
}
