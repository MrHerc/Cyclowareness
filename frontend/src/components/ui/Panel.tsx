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

      {hasHeader && (
        <header className="flex items-start justify-between gap-4 border-b border-line-subtle px-5 py-4">
          <div className="min-w-0">
            {title && <Heading className="text-h text-fg truncate">{title}</Heading>}
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
