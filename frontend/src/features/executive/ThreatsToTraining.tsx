/**
 * The product's central claim, shown as evidence rather than asserted.
 *
 * Every row here is a real artifact that arrived, was analysed, was approved by
 * a named person, and put a specific number of people into training. Runs that
 * produced no targets are left out rather than listed at zero — a threat that
 * was analysed and closed is a different outcome from a threat that trained
 * somebody, and merging the two would inflate the only number on this page that
 * is the product's whole argument.
 *
 * Run records are analyst-scoped. Read by an executive account the list is
 * withheld, and this component says so instead of rendering an empty state that
 * would read as "no threats drove training".
 */

import { ShieldCheck } from 'lucide-react'
import { LoopOutcomeChart } from '../../components/charts'
import { HonestMetric } from '../../components/data'
import { EmptyState } from '../../components/states'
import { Badge, Panel } from '../../components/ui'
import type { RunSummary } from '../../domain/types'
import { humanise, timeAgo } from '../../lib/format'
import { loopOutcomes, trainingDrivers } from './derive'
import { RestrictedNote } from './ExecutiveSection'

const SOURCE_LABELS: Record<string, string> = {
  human_sensor: 'Reported by an employee',
  feed: 'Threat feed',
  manual: 'Submitted by an analyst',
}

export interface ThreatsToTrainingProps {
  /** The count the executive endpoint reports directly. */
  loopsClosed: number
  /** All run summaries, or `null` when this role may not read them. */
  runs: RunSummary[] | null
  updatedAt: string | null
  loading?: boolean
  error?: string | null
}

function DriverRow({ run }: { run: RunSummary }) {
  return (
    <li className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 border-b border-line-subtle py-3 last:border-b-0">
      <div className="min-w-0 flex-1">
        <p className="truncate text-body text-fg">{run.threat_title}</p>
        <p className="mt-0.5 text-xs text-fg-subtle">
          {SOURCE_LABELS[run.source ?? ''] ?? 'Source not recorded'}
          {run.threat_type ? ` · ${humanise(run.threat_type)}` : ''} · {timeAgo(run.created_at)}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span className="text-sm text-fg-muted">
          {run.targets} {run.targets === 1 ? 'person trained' : 'people trained'}
        </span>
        {run.verdict ? <Badge status={run.verdict} /> : null}
      </div>
    </li>
  )
}

export function ThreatsToTraining({
  loopsClosed,
  runs,
  updatedAt,
  loading = false,
  error = null,
}: ThreatsToTrainingProps) {
  const outcomes = runs ? loopOutcomes(runs) : null
  const drivers = runs ? trainingDrivers(runs) : []

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <Panel>
        <HonestMetric
          label="Closed loops"
          value={loopsClosed}
          format="number"
          sample={runs ? runs.length : loopsClosed}
          sampleNoun={runs ? 'loop runs on record' : 'closed loops counted by the server'}
          source="live"
          sourceDetail="Platform API"
          lastUpdated={updatedAt}
          tone={loopsClosed > 0 ? 'brand' : 'neutral'}
          hint="A threat that became training and was then measured. Runs that closed without measuring anything are not counted."
          unmeasuredReason="the dashboard did not report a count"
          definition={{
            calculation: 'Runs that reached the completed state and produced a measurement.',
            includes: ['Runs where training was assigned, taken, and scored'],
            excludes: [
              'Runs that closed at conversion because the artifact came back benign',
              'Runs still awaiting approval, training or measurement',
            ],
            caveat: 'This is the number the product stakes its claim on, so the measurement condition is part of the definition rather than a footnote.',
          }}
        />
      </Panel>

      {outcomes ? (
        <LoopOutcomeChart
          completed={outcomes.completed}
          awaiting={outcomes.awaiting}
          failed={outcomes.failed}
          loading={loading}
          error={error}
        />
      ) : (
        <RestrictedNote
          what="The run-by-run breakdown is held by the security team"
          detail="Loop run records are analyst-scoped, so this view can show the closed count the dashboard reports but not the split between completed, in flight and failed."
        />
      )}

      <Panel
        title="Real threats that put people into training"
        subtitle="Most recent first. Each one was approved by a person before anybody was targeted."
        headingLevel={3}
        className="xl:col-span-2"
      >
        {!runs ? (
          <RestrictedNote
            what="The threat list is held by the security team"
            detail="Threat and run records are analyst-scoped. Ask the security team for the underlying runs behind the closed-loop count above."
          />
        ) : drivers.length > 0 ? (
          <ul>
            {drivers.map((run) => (
              <DriverRow key={run.id} run={run} />
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={ShieldCheck}
            compact
            headline="No threat has reached targeting yet"
            description="A row appears here once a real artifact has been analysed, converted into training and approved at the gate. Runs that were analysed and closed without targeting anybody are deliberately not listed."
          />
        )}
      </Panel>
    </div>
  )
}
