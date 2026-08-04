/**
 * One band of the command centre's lower half, named after a NAVIGATION SECTION.
 *
 * The dashboard used to end in a flat grid of eight panels under a single
 * "Operational areas" heading. Each of those panels is a miniature of a
 * destination that already has its own page, so the grid was a second, unlabelled
 * copy of the sidebar — which is why a reader could see everything at once and
 * still not know what anything was.
 *
 * These bands carry the SAME names as `NAV_SECTIONS` — Operate, Programme,
 * People & risk, Governance, System. That is the whole point: a person who
 * learns "Governance" here finds "Governance" in the sidebar and knows they are
 * the same thing. The dashboard teaches the structure instead of competing
 * with it.
 *
 * Each band names where its full depth lives, because a summary panel that
 * cannot be opened is a dead end.
 */

import { Link } from 'react-router-dom'

export interface AreaGroupProps {
  /** Must match a `NAV_SECTIONS` label exactly — the mirroring is the feature. */
  label: string
  /** Where the full depth for this band lives. */
  to: string
  /** Link text. Names the destination, never "see more". */
  linkLabel: string
  children: React.ReactNode
}

export function AreaGroup({ label, to, linkLabel, children }: AreaGroupProps) {
  const id = `area-${label.toLowerCase().replace(/[^a-z]+/g, '-')}`

  return (
    <section aria-labelledby={id} className="space-y-3">
      <div className="flex items-baseline gap-3">
        <h3 id={id} className="label shrink-0 text-fg-subtle">
          {label}
        </h3>
        {/* The rule carries the eye from the name to the way out. */}
        <span aria-hidden="true" className="h-px flex-1 bg-line" />
        <Link
          to={to}
          className="label shrink-0 text-fg-faint underline-offset-4 hover:text-brand-fg hover:underline"
        >
          {linkLabel}
        </Link>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">{children}</div>
    </section>
  )
}
