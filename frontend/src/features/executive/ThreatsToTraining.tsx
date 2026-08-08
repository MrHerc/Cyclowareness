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

import { useT, type MessageKey } from '../../lib/i18n'
import { ShieldCheck } from 'lucide-react'
import { LoopOutcomeChart } from '../../components/charts'
import { HonestMetric } from '../../components/data'
import { EmptyState } from '../../components/states'
import { Badge, Panel } from '../../components/ui'
import type { RunSummary } from '../../domain/types'
import { humanise, timeAgo } from '../../lib/format'
import { loopOutcomes, trainingDrivers } from './derive'
import { RestrictedNote } from './ExecutiveSection'

const SOURCE_LABELS: Record<string, MessageKey> = {
  human_sensor: 'p.reported-by-an-employee',
  feed: 'p.threat-feed',
  manual: 'p.submitted-by-an-analyst',
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
  const t = useT()
  return (
    <li className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 border-b border-line-subtle py-3 last:border-b-0">
      <div className="min-w-0 flex-1">
        <p className="truncate text-body text-fg">{run.threat_title}</p>
        <p className="mt-0.5 text-xs text-fg-subtle">
          {t(SOURCE_LABELS[run.source ?? ''] ?? 'p.source-not-recorded')}
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
  const t = useT()
  const outcomes = runs ? loopOutcomes(runs) : null
  const drivers = runs ? trainingDrivers(runs) : []

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <Panel>
        <HonestMetric
          label={t('p.closed-loops')}
          value={loopsClosed}
          format="number"
          sample={runs ? runs.length : loopsClosed}
          sampleNoun={runs ? 'loop runs on record' : 'closed loops counted by the server'}
          source="live"
          sourceDetail={t('u.platform-api')}
          lastUpdated={updatedAt}
          tone={loopsClosed > 0 ? 'brand' : 'neutral'}
          hint={t('p.a-threat-that-became-training-and')}
          unmeasuredReason={t('u.the-dashboard-did-not-report-a-count')}
          definition={{
            calculation: t('p.runs-that-reached-the-completed-state'),
            includes: ['Runs where training was assigned, taken, and scored'],
            excludes: [
              'Runs that closed at conversion because the artifact came back benign',
              'Runs still awaiting approval, training or measurement',
            ],
            caveat: t('p.this-is-the-number-the-product'),
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
          what={t('u.the-run-by-run-breakdown-is-held')}
          detail={t('p.loop-run-records-are-analystscoped-so')}
        />
      )}

      <Panel
        title={t('x.real-threats-that-put-people')}
        subtitle={t('x.most-recent-first-each-one')}
        headingLevel={3}
        className="xl:col-span-2"
      >
        {!runs ? (
          <RestrictedNote
            what={t('u.the-threat-list-is-held-by-the')}
            detail={t('p.threat-and-run-records-are-analystscoped')}
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
            headline={t('u.no-threat-has-reached-targeting-yet')}
            description={t('x.a-row-appears-here-once')}
          />
        )}
      </Panel>
    </div>
  )
}
