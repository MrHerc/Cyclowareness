/**
 * The header every Policy Intelligence screen wears.
 *
 * The three routes under `/policy-intelligence` are one surface, so they share
 * one heading block and one set of links rather than each inventing its own
 * navigation. The backing badge is rendered from `backingFor()` — the surface
 * declares that its policies and findings are seeded, and the screen says so
 * where a viewer will see it, not in a footnote.
 */

import { useT } from '../../lib/i18n'
import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { DataSourceLabel, DemoDataBadge } from '../../components/data'
import { backingFor } from '../../lib/demo/registry'
import { cn } from '../../lib/format'

const SURFACE = 'policy-intelligence'

const LINKS = [
  { to: '/policy-intelligence', label: 'Overview', end: true },
  { to: '/policy-intelligence/policies', label: 'Policy library', end: false },
  { to: '/policy-intelligence/findings', label: 'Findings', end: false },
]

export interface PolicyHeaderProps {
  title: string
  description: string
  /** Right-aligned controls: an export, a refresh, a primary action. */
  actions?: ReactNode
  className?: string
}

export function PolicyHeader({ title, description, actions, className }: PolicyHeaderProps) {
  const t = useT()
  const backing = backingFor(SURFACE)

  return (
    <header className={cn('space-y-4', className)}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 max-w-3xl space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="label text-brand">{t('p.policy-intelligence')}</p>
            {backing.backing === 'seeded' || backing.backing === 'demo' ? (
              <DemoDataBadge detail={backing.note} />
            ) : (
              <DataSourceLabel source="live" detail={backing.note} />
            )}
          </div>
          <h1 className="text-display text-fg">{title}</h1>
          <p className="text-body text-fg-muted">{description}</p>
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>

      <nav aria-label={t('p.policy-intelligence-sections')}>
        <ul className="flex flex-wrap items-center gap-1 border-b border-line-subtle">
          {LINKS.map((link) => (
            <li key={link.to}>
              <NavLink
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  cn(
                    '-mb-px inline-flex h-9 items-center border-b-2 px-3 text-body transition-colors',
                    isActive
                      ? 'border-brand text-fg'
                      : 'border-transparent text-fg-subtle hover:text-fg',
                  )
                }
              >
                {link.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  )
}
