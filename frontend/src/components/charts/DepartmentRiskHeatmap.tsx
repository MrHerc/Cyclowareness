import type { DepartmentRisk } from '../../domain/types'
import { cn, num, riskBand, riskBandLabel } from '../../lib/format'
import { ChartFrame } from './ChartFrame'
import { BAND_COLOR } from './chartTheme'

/** Border tone per band. Fill intensity is computed; the edge is not. */
const BAND_BORDER: Record<'low' | 'elevated' | 'high', string> = {
  low: 'border-safe/30',
  elevated: 'border-medium/40',
  high: 'border-critical/45',
}

const BAND_TEXT: Record<'low' | 'elevated' | 'high', string> = {
  low: 'text-safe',
  elevated: 'text-medium',
  high: 'text-critical',
}

export interface DepartmentRiskHeatmapProps {
  departments: DepartmentRisk[]
  /** Present the cell as a button and drill through on activation. */
  onSelect?: (department: DepartmentRisk) => void
  height?: number
  loading?: boolean
  error?: string | null
  className?: string
}

/**
 * Departments as a heatmap grid, ordered worst first.
 *
 * Colour carries the band and nothing else: every cell also states its score,
 * its band in words, its headcount and how many of those people are high risk.
 * A heatmap whose only channel is hue is unreadable to roughly one man in
 * twelve, and unusable on a projector in a bright room — which is exactly where
 * this will be shown.
 */
export function DepartmentRiskHeatmap({
  departments,
  onSelect,
  height = 260,
  loading = false,
  error = null,
  className,
}: DepartmentRiskHeatmapProps) {
  // Worst first. An alphabetical heatmap makes the reader do the sorting.
  const ordered = [...departments].sort((a, b) => b.avg_risk - a.avg_risk)

  return (
    <ChartFrame
      title="Risk by department"
      caption="Average risk score, 0–100 · worst first"
      legend={[
        { label: 'Low risk', color: BAND_COLOR.low },
        { label: 'Elevated', color: BAND_COLOR.elevated },
        { label: 'High risk', color: BAND_COLOR.high },
      ]}
      height={height}
      hasData={ordered.length > 0}
      loading={loading}
      error={error}
      emptyTitle="No departments"
      emptyMessage="No department has a scored population yet."
      responsive={false}
      description="Average risk score per department, with headcount and the number of high-risk people in each."
      className={className}
    >
      <ul className="grid h-full grid-cols-2 content-start gap-2 overflow-y-auto sm:grid-cols-3 xl:grid-cols-4">
        {ordered.map((department) => {
          const band = riskBand(department.avg_risk)
          // 10–36% keeps every cell legible: a light wash still reads as a
          // measurement, while a saturated one would fight the text on top.
          const alpha = 10 + Math.round(Math.min(1, Math.max(0, department.avg_risk) / 100) * 26)
          const body = (
            <>
              <p className="truncate text-sm text-fg" title={department.name}>
                {department.name}
              </p>
              <p className="mt-1 flex items-baseline gap-1.5">
                <span className="text-title text-fg">{num(department.avg_risk, 0)}</span>
                <span className={cn('text-xs', BAND_TEXT[band])}>{riskBandLabel(department.avg_risk)}</span>
              </p>
              <p className="mt-1 text-xs text-fg-subtle">
                {department.employee_count} {department.employee_count === 1 ? 'person' : 'people'}
                {' · '}
                {department.high_risk_count} high risk
              </p>
            </>
          )

          const cellClass = cn(
            'block w-full rounded-control border p-3 text-left',
            BAND_BORDER[band],
          )
          const cellStyle = {
            backgroundColor: `color-mix(in srgb, ${BAND_COLOR[band]} ${alpha}%, transparent)`,
          }

          return (
            <li key={department.id}>
              {onSelect ? (
                <button
                  type="button"
                  className={cn(cellClass, 'transition-colors hover:border-line-strong')}
                  style={cellStyle}
                  onClick={() => onSelect(department)}
                >
                  {body}
                </button>
              ) : (
                <div className={cellClass} style={cellStyle}>
                  {body}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </ChartFrame>
  )
}
