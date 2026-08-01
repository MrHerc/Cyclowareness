/**
 * The heading strip shared by the four people-and-risk screens.
 *
 * It carries the backing badge next to the title rather than buried at the
 * bottom of the page: the organisation on these screens is a seeded fiction and
 * the risk model operating on it is the real one, and a viewer has to be told
 * which is which before they read a single number.
 */

import type { ReactNode } from 'react'
import { DemoDataBadge } from '../../components/data'
import { backingFor } from '../../lib/demo/registry'

export interface PeopleHeaderProps {
  title: string
  /** One or two sentences. What this screen answers, in the product's voice. */
  lead: string
  /** Surface id from `lib/demo/registry` — drives the demonstration-data badge. */
  surfaceId?: string
  /** Filters or links, right-aligned on wide viewports. */
  actions?: ReactNode
}

export function PeopleHeader({ title, lead, surfaceId = 'employees', actions }: PeopleHeaderProps) {
  const backing = backingFor(surfaceId)

  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0 max-w-2xl">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-display text-fg">{title}</h1>
          {backing.backing === 'seeded' || backing.backing === 'demo' ? (
            <DemoDataBadge detail={backing.note} />
          ) : null}
        </div>
        <p className="mt-2 text-lead text-fg-muted">{lead}</p>
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  )
}
