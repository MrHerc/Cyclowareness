import { useT } from '../../lib/i18n'
export interface ChartTooltipRow {
  label: string
  /** A `var(--color-*)` reference from `chartTheme`. */
  color: string
  /**
   * The formatted reading, or `null` for "not measured". The caller formats,
   * because only the caller knows whether the number is a rate, a score or a
   * count — but only `null` may mean absent, never the string "0".
   */
  value: string | null
}

export interface ChartTooltipProps {
  /** The x value, already formatted: a date, a department, a severity. */
  title: string
  rows: ChartTooltipRow[]
  /** Optional second line under the title — a sample size, a window. */
  note?: string
}

/**
 * The tooltip body every chart hands to Recharts' `content` prop.
 *
 * Two jobs. It reads from the surface tokens so a floating panel over a chart
 * looks like every other floating panel in the product; and it renders an
 * unmeasured point as "Not measured" rather than letting Recharts quietly drop
 * the row, which would leave a hovering analyst unable to tell a gap in the
 * data from a series that simply was not hovered.
 */
export function ChartTooltip({ title, rows, note }: ChartTooltipProps) {
  const t = useT()
  return (
    <div className="min-w-40 rounded-control border border-line bg-elevated px-3 py-2 shadow-float">
      <p className="text-xs text-fg-muted">{title}</p>
      {note ? <p className="text-xs text-fg-faint">{note}</p> : null}
      <ul className="mt-1.5 space-y-1">
        {rows.map((row) => (
          <li key={row.label} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="size-2 shrink-0 rounded-chip"
                style={{ backgroundColor: row.color }}
              />
              <span className="text-xs text-fg-muted">{row.label}</span>
            </span>
            {row.value === null ? (
              <span className="text-xs text-fg-faint">{t('u.not-measured-2')}</span>
            ) : (
              <span className="text-sm text-fg">{row.value}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
