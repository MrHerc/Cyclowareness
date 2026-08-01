/**
 * A section of the executive view, and the two honesty affordances it needs.
 *
 * Every section on this page answers one question a board asks out loud, so the
 * heading *is* the question and a single line underneath says what the answer
 * means. That line is not decoration: a chart an executive reads without a
 * stated interpretation gets interpreted anyway, usually generously.
 *
 * `RestrictedNote` and `WithheldMetric` cover the other two cases — the figure
 * exists and this role may not see it, or the list it would be counted from did
 * not load. Neither is "not measured", and neither may render as a zero or a
 * dash: both of those read as a value, and one of them reads as a good one.
 */

import type { ReactNode } from 'react'
import { Lock, TriangleAlert } from 'lucide-react'
import { cn } from '../../lib/format'

export interface ExecutiveSectionProps {
  id: string
  /** The question this section answers, as a question. */
  question: string
  /** One sentence: how to read what follows. */
  meaning: string
  /** Right-aligned controls — a range switch, a link. */
  actions?: ReactNode
  children: ReactNode
}

export function ExecutiveSection({
  id,
  question,
  meaning,
  actions,
  children,
}: ExecutiveSectionProps) {
  return (
    <section aria-labelledby={id} className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
        <div className="min-w-0 max-w-3xl">
          <h2 id={id} className="text-h text-fg">
            {question}
          </h2>
          <p className="mt-1 text-sm text-fg-muted">{meaning}</p>
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
      {children}
    </section>
  )
}

export interface RestrictedNoteProps {
  /** What is being withheld, named plainly. */
  what: string
  /** Who does hold it, so the reader knows where to ask. */
  detail: string
  className?: string
}

export function RestrictedNote({ what, detail, className }: RestrictedNoteProps) {
  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-panel border border-dashed border-line px-5 py-6',
        className,
      )}
    >
      <Lock className="mt-0.5 size-5 shrink-0 text-fg-faint" aria-hidden="true" />
      <div>
        <p className="text-h text-fg-muted">{what}</p>
        <p className="mt-1 text-sm text-fg-subtle">{detail}</p>
      </div>
    </div>
  )
}

export interface WithheldMetricProps {
  label: string
  /** Why the figure is missing. `restricted` is a permission, `unavailable` a failed read. */
  cause: 'restricted' | 'unavailable'
  /** The sentence under the tile. One clause, no jargon. */
  reason: string
}

/**
 * The metric-tile shape, with the reason where the figure would be.
 *
 * It keeps the label and the caption so the row does not develop a hole, and it
 * never renders a dash — a dash in a metric grid reads as zero to everyone who
 * has ever seen a spreadsheet.
 */
export function WithheldMetric({ label, cause, reason }: WithheldMetricProps) {
  const Icon = cause === 'restricted' ? Lock : TriangleAlert
  return (
    <div className="min-w-0">
      <span className="label text-fg-subtle">{label}</span>
      <div className="mt-2 flex items-center gap-2 text-lead text-fg-faint">
        <Icon className="size-4 shrink-0" aria-hidden="true" />
        {cause === 'restricted' ? 'Restricted' : 'Unavailable'}
      </div>
      <p className="mt-2 text-xs text-fg-subtle">{reason}</p>
    </div>
  )
}
