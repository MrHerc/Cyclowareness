import type { ReactElement, ReactNode } from 'react'
import { useLocale, useT } from '../../lib/i18n'
import { ResponsiveContainer } from 'recharts'
import { cn } from '../../lib/format'
import { ChartLegend, type LegendItem } from './ChartLegend'

export interface ChartFrameProps {
  /** Sentence case. The thing being measured, not the chart type. */
  title: string
  /** One line under the title: the window, the sample size, the caveat. */
  caption?: string
  /** The heading level for `title`. Defaults to 3, which is right when the
   *  chart sits inside a Panel (h2). A chart placed directly under the page
   *  h1 must pass 2, or the document skips a level and a screen reader
   *  reports a missing section. Mirrors `Panel`'s own escape hatch. */
  headingLevel?: 2 | 3 | 4
  /** Rendered by `ChartLegend`, so wording and swatches never drift. */
  legend?: LegendItem[]
  /** Right-hand header slot — a range switch, a link to the underlying rows. */
  action?: ReactNode
  /** Plot height in pixels. Width is always the container's. */
  height?: number
  /**
   * False renders the fallback instead of the plot. Every trend chart passes
   * `hasEnoughPoints(...)` here; a chart is not allowed to decide for itself
   * that one point is a trend.
   */
  hasData: boolean
  /** Fallback headline. "Trend unavailable" is right for a trend, wrong for a tally. */
  emptyTitle?: string
  /** Fallback detail. Say what is missing, never just "no data". */
  emptyMessage?: string
  /** Skeleton while the query is in flight. */
  loading?: boolean
  /** Rendered with `role="alert"`. The message the user can act on. */
  error?: string | null
  /**
   * What the chart shows, for screen readers. An SVG of lines is invisible to
   * assistive tech, and a title alone does not carry the finding.
   */
  description?: string
  /**
   * False when the child is not a Recharts chart — the heatmap is a DOM grid
   * and must not be handed to `ResponsiveContainer`, which clones its child
   * with width/height props.
   */
  responsive?: boolean
  className?: string
  /** A single Recharts chart element, unless `responsive` is false. */
  children: ReactElement
}

/**
 * The shell every chart sits in: heading, legend, plot area, and the states a
 * chart can be in other than "drawn".
 *
 * It exists so the insufficient-data fallback is impossible to skip. A chart
 * that renders whatever it was given will happily draw a confident slope
 * through a single measurement, and that is the exact failure this product
 * cannot afford in front of a security buyer.
 */
export function ChartFrame({
  title,
  caption,
  headingLevel = 3,
  legend,
  action,
  height = 240,
  hasData,
  emptyTitle = 'Trend unavailable',
  emptyMessage = 'Fewer than two measured points in this window.',
  loading = false,
  error = null,
  description,
  responsive = true,
  className,
  children,
}: ChartFrameProps) {
  const t = useT()
  // Same rule as Panel: the frame's own text follows the active language.
  const { locale } = useLocale()
  const Heading = `h${headingLevel}` as 'h2' | 'h3' | 'h4'

  return (
    <figure
      lang={locale}
      className={cn(
        'rounded-panel border border-line-subtle bg-surface p-4 shadow-panel',
        className,
      )}
    >
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Heading className="text-h text-fg">{title}</Heading>
          {caption ? <p className="mt-0.5 text-xs text-fg-subtle">{caption}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </header>

      {legend && legend.length > 0 && !loading && !error && hasData ? (
        <ChartLegend items={legend} className="mt-3" />
      ) : null}

      <div className="mt-3" style={{ height }}>
        {loading ? (
          <div
            className="shimmer h-full rounded-control bg-elevated"
            aria-hidden="true"
          />
        ) : error ? (
          <div
            role="alert"
            className="flex h-full flex-col items-center justify-center gap-1 rounded-control border border-critical/40 bg-critical/5 px-4 text-center"
          >
            <p className="text-sm text-critical">{t('p.chart-unavailable')}</p>
            <p className="text-xs text-fg-muted">{error}</p>
          </div>
        ) : !hasData ? (
          <div className="flex h-full flex-col items-center justify-center gap-1 rounded-control border border-dashed border-line px-4 text-center">
            <p className="text-sm text-fg-muted">{emptyTitle}</p>
            <p className="text-xs text-fg-faint">{emptyMessage}</p>
          </div>
        ) : responsive ? (
          <ResponsiveContainer width="100%" height="100%">
            {children}
          </ResponsiveContainer>
        ) : (
          children
        )}
      </div>

      {description ? <figcaption className="sr-only">{description}</figcaption> : null}
    </figure>
  )
}
