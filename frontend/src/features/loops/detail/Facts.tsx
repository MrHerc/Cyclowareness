/**
 * A label/value grid. The run page is mostly these.
 *
 * `hint` exists so a value that needs a caveat carries it — "Not recorded" with
 * nothing beside it reads as a gap in the UI rather than as a fact about the
 * deployment.
 */

import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '../../../lib/format'

export interface Fact {
  label: string
  value: ReactNode
  /** Turns the value into a router link. */
  to?: string
  /** One clause under the value, for a caveat the value cannot carry alone. */
  hint?: string
}

export interface FactsProps {
  items: Fact[]
  className?: string
}

export function Facts({ items, className }: FactsProps) {
  return (
    <dl className={cn('grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3', className)}>
      {items.map((item) => (
        <div key={item.label} className="min-w-0">
          <dt className="label text-fg-faint">{item.label}</dt>
          <dd className="mt-1 break-words text-body text-fg">
            {item.to ? (
              <Link to={item.to} className="text-brand hover:underline">
                {item.value}
              </Link>
            ) : (
              item.value
            )}
          </dd>
          {item.hint ? <p className="mt-1 text-xs text-fg-subtle">{item.hint}</p> : null}
        </div>
      ))}
    </dl>
  )
}
