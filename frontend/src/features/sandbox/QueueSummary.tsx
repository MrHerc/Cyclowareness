/**
 * The estate, counted where the rows are.
 *
 * These numbers come from `/api/sandbox/jobs/stats`, which counts in SQL over
 * every job — NOT from the page of results beside them. That distinction is the
 * whole reason this component exists: a tile computed client-side from the
 * visible page is a property of how many rows the last poll happened to fetch,
 * and it reads as a fact about the deployment. A queue of 269 jobs behind a
 * 50-row page would show "Analysed 50".
 *
 * `unclassified` is drawn rather than hidden. It is completed jobs whose verdict
 * the engine did not settle, and dropping it would leave three numbers that do
 * not add up to the fourth — a reader can see the arithmetic here.
 */

import { useT } from '../../lib/i18n'
import type { SandboxJobStats } from '../../domain/types'
import { Panel } from '../../components/ui'
import { cn, num } from '../../lib/format'

export interface QueueSummaryProps {
  stats: SandboxJobStats
}

function Tile({
  label,
  value,
  tone,
  caption,
}: {
  label: string
  value: string
  tone?: string
  caption?: string
}) {
  return (
    <div className="min-w-0">
      <p className="label text-fg-subtle">{label}</p>
      <p className={cn('mt-1 text-title', tone ?? 'text-fg')}>{value}</p>
      {caption ? <p className="mt-0.5 text-xs text-fg-faint">{caption}</p> : null}
    </div>
  )
}

export function QueueSummary({ stats }: QueueSummaryProps) {
  const t = useT()
  const { verdicts } = stats

  return (
    <Panel>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 lg:grid-cols-6">
        <Tile label="Submitted" value={num(stats.total, 0)} />
        <Tile
          label="Analysed"
          value={num(stats.completed, 0)}
          caption={stats.in_flight > 0 ? `${num(stats.in_flight, 0)} still running` : undefined}
        />
        <Tile label="Malicious" value={num(verdicts.malicious, 0)} tone="text-critical" />
        <Tile label="Suspicious" value={num(verdicts.suspicious, 0)} tone="text-high" />
        <Tile label="Clean" value={num(verdicts.clean, 0)} tone="text-safe" />
        <Tile
          label="Unclassified"
          value={num(verdicts.unclassified, 0)}
          tone="text-fg-muted"
          caption={t('x.finished-without-a-verdict')}
        />
      </div>

      <p className="mt-4 border-t border-line-subtle pt-3 text-xs text-fg-faint">
        Counted over every submission in this deployment, not over the page below.
        {stats.completed > 0 ? (
          <> Mean score across analysed samples: {num(stats.average_score, 1)} out of 100.</>
        ) : null}
      </p>
    </Panel>
  )
}
