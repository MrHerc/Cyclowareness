/**
 * Where the organisation actually sits on the 0–100 scale.
 *
 * Fixed ten-point buckets across the whole range rather than buckets fitted to
 * the data: an auto-fitted histogram of a healthy organisation and of a
 * struggling one look identical, because both fill the frame. The empty
 * high-risk buckets on the right are the finding.
 */

import { cn, num, pct } from '../../lib/format'
import { BAND_FILL, BAND_ORDER, BAND_RANGE, BAND_TEXT, scoreHistogram, type Band } from './riskModel'

export interface ScoreDistributionProps {
  scores: number[]
}

const BAND_LABEL: Record<Band, string> = {
  high: 'High risk',
  elevated: 'Elevated',
  low: 'Low risk',
}

export function ScoreDistribution({ scores }: ScoreDistributionProps) {
  const buckets = scoreHistogram(scores)
  const tallest = buckets.reduce((max, bucket) => Math.max(max, bucket.count), 0)

  const counts: Record<Band, number> = {
    high: scores.filter((score) => score >= 60).length,
    elevated: scores.filter((score) => score >= 40 && score < 60).length,
    low: scores.filter((score) => score < 40).length,
  }

  return (
    <div className="space-y-5">
      <div>
        <ul className="flex h-40 items-end gap-1.5" role="list">
          {buckets.map((bucket) => (
            <li
              key={bucket.from}
              className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1"
            >
              <span className="text-xs text-fg-subtle tabular-nums">
                {bucket.count === 0 ? '' : bucket.count}
              </span>
              <span
                className={cn('block w-full rounded-t-chip', BAND_FILL[bucket.band])}
                style={{
                  height: tallest > 0 ? `${Math.max(bucket.count === 0 ? 0 : 4, (bucket.count / tallest) * 100)}%` : 0,
                  opacity: bucket.count === 0 ? 0.15 : 0.75,
                }}
                aria-hidden="true"
              />
              <span className="text-xs text-fg-faint tabular-nums">{bucket.from}</span>
              <span className="sr-only">
                {bucket.count} {bucket.count === 1 ? 'person' : 'people'} scoring {bucket.from} to{' '}
                {bucket.to - 1}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-fg-subtle">
          Each bar is a ten-point band of the 0–100 scale, across all {scores.length}{' '}
          {scores.length === 1 ? 'person' : 'people'} on the roster.
        </p>
      </div>

      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {BAND_ORDER.map((band) => (
          <div key={band} className="rounded-control border border-line-subtle bg-base p-3">
            <dt className="label text-fg-subtle">{BAND_LABEL[band]}</dt>
            <dd className="mt-1.5 flex items-baseline gap-2">
              <span className={cn('text-title tabular-nums', BAND_TEXT[band])}>{counts[band]}</span>
              <span className="text-sm text-fg-subtle">
                {scores.length > 0 ? pct(counts[band] / scores.length, 0) : '—'}
              </span>
            </dd>
            <dd className="mt-1 text-xs text-fg-faint">Scores {BAND_RANGE[band]}</dd>
          </div>
        ))}
      </dl>

      <p className="text-sm text-fg-subtle">
        The bands are thresholds on the same scale, not separate measurements: 60 and above is high
        risk, which is also the threshold the targeting stage uses when it looks for people to train.
        The mean sits at {scores.length > 0 ? num(scores.reduce((sum, s) => sum + s, 0) / scores.length, 1) : '—'}.
      </p>
    </div>
  )
}
