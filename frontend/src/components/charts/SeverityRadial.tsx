/**
 * Severity as a ring of petals — the reference design's threat-by-severity
 * figure, rebuilt on real counts and this product's severity rules.
 *
 * The reference shows fixed percentages in a decorative hexagon. This draws one
 * segment per severity that ACTUALLY HAS findings, sized by share, and states
 * the share and count in the centre and the legend. An empty band is absent,
 * not a zero-width sliver an eye reads as "checked and clear" — the same rule
 * `SeverityBarChart` follows, because the two must never disagree about whether
 * a severity exists.
 *
 * `info` is not a risk band and never takes a risk hue; it stays grey, so the
 * bottom of the ring cannot be mistaken for "low risk". Segments are ordered
 * critical-first, always, so two screenshots of the same estate look like one
 * system.
 *
 * A ring, not a pie: the hole carries the total, which is the number a person
 * came to read, and a donut segment's ANGLE is what encodes share — radius is
 * constant, so nothing here misleads by area the way a petal whose length also
 * varies would.
 */

import { num } from '../../lib/format'
import { useT, type MessageKey } from '../../lib/i18n'
import { SEVERITY_COLOR, SEVERITY_ORDER } from './chartTheme'
import type { SeverityCount } from './SeverityBarChart'

export interface SeverityRadialProps {
  data: SeverityCount[]
  /** Diameter in px. The ring scales to it; the centre text does not. */
  size?: number
  className?: string
}

const R = 46
const STROKE = 12
const CIRC = 2 * Math.PI * R
/** A hair of empty between segments so adjacent hues do not bleed into one. */
const GAP = 0.012

export function SeverityRadial({ data, size = 176, className }: SeverityRadialProps) {
  const t = useT()
  const ordered = SEVERITY_ORDER.map(
    (severity) => data.find((row) => row.severity === severity),
  ).filter((row): row is SeverityCount => Boolean(row && row.count > 0))

  const total = ordered.reduce((sum, row) => sum + row.count, 0)

  if (total === 0) {
    return (
      <div
        className={className}
        style={{ width: size, height: size }}
        role="img"
        aria-label={t('p.no-open-findings')}
      >
        <svg viewBox="0 0 120 120" className="size-full">
          <circle
            cx="60"
            cy="60"
            r={R}
            fill="none"
            stroke="var(--color-line)"
            strokeWidth={STROKE}
          />
        </svg>
      </div>
    )
  }

  let offset = 0
  const segments = ordered.map((row) => {
    const share = row.count / total
    const len = Math.max(share - GAP, 0) * CIRC
    const seg = {
      severity: row.severity,
      count: row.count,
      share,
      dash: `${len} ${CIRC - len}`,
      // Rotate each segment to start where the previous ended.
      rotation: offset * 360,
    }
    offset += share
    return seg
  })

  // The same words the legend beside it renders. A sighted reader seeing
  // "Kritik" while a screen reader says "Critical" is one chart described two
  // ways.
  const label = ordered
    .map(
      (row) =>
        `${t(`severity.${row.severity}` as MessageKey)} ${num((row.count / total) * 100, 0)}%`,
    )
    .join(', ')

  return (
    <div className={className} style={{ width: size, height: size }} role="img" aria-label={label}>
      <svg viewBox="0 0 120 120" className="size-full -rotate-90">
        {/* the track, so a single-segment ring still reads as a ring */}
        <circle cx="60" cy="60" r={R} fill="none" stroke="var(--color-line)" strokeWidth={STROKE} />
        {segments.map((seg) => (
          <circle
            key={seg.severity}
            cx="60"
            cy="60"
            r={R}
            fill="none"
            stroke={SEVERITY_COLOR[seg.severity]}
            strokeWidth={STROKE}
            strokeDasharray={seg.dash}
            strokeDashoffset={-((seg.rotation / 360) * CIRC)}
            strokeLinecap="butt"
          />
        ))}
      </svg>
      {/* the total, in the hole. Not rotated with the ring. */}
      <div className="pointer-events-none -mt-[100%] grid h-full place-items-center">
        <div className="text-center leading-none">
          <div className="text-title tabular-nums text-fg">{num(total, 0)}</div>
          <div className="label mt-1 text-fg-faint">
            {total === 1 ? 'finding' : 'findings'}
          </div>
        </div>
      </div>
    </div>
  )
}
