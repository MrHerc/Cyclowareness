import { cn } from '../../lib/format'

export interface LegendItem {
  label: string
  /** A `var(--color-*)` reference from `chartTheme`. Never a colour literal. */
  color: string
  /** The current reading, when the legend doubles as the value readout. */
  value?: string
  /** Dimmed — the series is present in the data but not measured in this window. */
  muted?: boolean
}

export interface ChartLegendProps {
  items: LegendItem[]
  className?: string
}

/**
 * The one legend in the product.
 *
 * It exists so that "Click rate" is never "Clicks" three screens later, and so
 * that a swatch is the same size and shape whether it labels a line, a bar or a
 * heatmap band. Drift between chart legends is what makes a dashboard read as
 * several products stitched together.
 */
export function ChartLegend({ items, className }: ChartLegendProps) {
  if (items.length === 0) return null

  return (
    <ul className={cn('flex flex-wrap items-center gap-x-4 gap-y-1.5', className)}>
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className={cn('size-2 shrink-0 rounded-chip', item.muted && 'opacity-40')}
            style={{ backgroundColor: item.color }}
          />
          <span className={cn('text-xs', item.muted ? 'text-fg-faint' : 'text-fg-muted')}>
            {item.label}
          </span>
          {item.value !== undefined ? (
            <span className={cn('text-xs', item.muted ? 'text-fg-faint' : 'text-fg')}>
              {item.value}
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  )
}
