/**
 * The workhorse container. Almost every screen is panels on a dark field.
 *
 * `tone="feature"` exists so a page can have exactly one "look here first"
 * region without anyone reaching for a colour. It lifts a surface step and
 * draws a single brand hairline along the top edge — the same light-from-above
 * idea the shadow tokens encode. Use it once per page; two features is none.
 *
 * `flush` drops the body padding, which is what a <Table> inside a panel needs
 * so its sticky header can reach the panel edge.
 */

import type { ReactNode } from 'react'
import { cn } from '../../lib/format'
import { useLocale } from '../../lib/i18n'

export type PanelTone = 'default' | 'feature' | 'quiet' | 'danger'

const TONE: Record<PanelTone, string> = {
  default: 'bg-surface border-line shadow-panel',
  feature: 'bg-elevated border-brand/25 shadow-panel',
  quiet: 'bg-base border-line-subtle',
  danger: 'bg-surface border-critical/30 shadow-panel',
}

export interface PanelProps {
  title?: ReactNode
  subtitle?: ReactNode
  /** Buttons or filters, right-aligned in the header. */
  actions?: ReactNode
  footer?: ReactNode
  tone?: PanelTone
  /** Removes the body padding. For tables and edge-to-edge lists. */
  flush?: boolean
  /**
   * Heading level for `title`. Panels nest, and a page full of `h2`s inside
   * other panels reads as a flat outline to a screen reader.
   */
  headingLevel?: 2 | 3 | 4
  className?: string
  bodyClassName?: string
  children?: ReactNode
}

export function Panel({
  title,
  subtitle,
  actions,
  footer,
  tone = 'default',
  flush = false,
  headingLevel = 2,
  className,
  bodyClassName,
  children,
}: PanelProps) {
  // Titles/subtitles are translated while the deep prose is not, so the
  // header declares the ACTIVE language for its own text — screen-reader voice
  // and the uppercase casing rule both follow it. Centralised here so hundreds
  // of call sites do not each carry a lang attribute.
  const { locale } = useLocale()
  const Heading = `h${headingLevel}` as 'h2' | 'h3' | 'h4'
  const hasHeader = Boolean(title || subtitle || actions)

  return (
    <section className={cn('relative rounded-panel border', TONE[tone], className)}>
      {tone === 'feature' && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-4 top-0 h-px bg-brand/50"
        />
      )}

      {/* `flex-wrap` and a wrapping title: the row could not wrap and `actions`
          was pinned `shrink-0`, so a wide action clipped the heading on a narrow
          viewport — a panel whose title reads "Latest threat int…" is a panel
          nobody can identify. */}
      {hasHeader && (
        <header lang={locale} className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 border-b border-line-subtle px-5 py-4">
          <div className="min-w-0 flex-1">
            {title && <Heading className="text-h text-fg">{title}</Heading>}
            {subtitle && <p className="text-sm text-fg-subtle mt-1">{subtitle}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </header>
      )}

      {children !== undefined && (
        <div className={cn(!flush && 'p-5', bodyClassName)}>{children}</div>
      )}

      {footer && (
        <footer className="border-t border-line-subtle px-5 py-3 text-sm text-fg-muted">
          {footer}
        </footer>
      )}
    </section>
  )
}
