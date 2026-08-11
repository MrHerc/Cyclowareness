/**
 * The primary navigation.
 *
 * Every entry comes from `visibleSections(can)` in `app/navigation.ts`, which
 * filters the one table the router also reads. Nothing here is hand-listed, so
 * a menu item pointing at a route the user cannot open — the classic way a demo
 * dies on a 403 — is structurally impossible rather than merely unlikely.
 *
 * Two honesty rules the badges follow:
 *
 * - A badge is drawn only from a count the dashboard actually returned. The
 *   payload carries no incident-risk count, so the Incident Risks entry shows
 *   no badge at all rather than a confident zero.
 * - A zero is not decorated. A badge means "there is work here"; a grey `0` on
 *   every row is noise that teaches people to stop reading badges.
 */

import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'
import { NavLink } from 'react-router-dom'
import { Separator, Tooltip } from '../ui'
import { useT } from '../../lib/i18n'
import { cn } from '../../lib/format'
import { EMPLOYEE_NAV, visibleSections, type NavItem, type NavSection } from '../../app/navigation'
import { useAnalystDashboard } from '../../lib/api/queries'
import { useAuth } from '../../lib/auth/useAuth'

export interface SideNavigationProps {
  /** Icon rail instead of the full list. Ignored inside the mobile sheet. */
  collapsed: boolean
  /** Omit to hide the collapse control — the sheet has no rail to collapse to. */
  onToggleCollapsed?: () => void
  /**
   * Distinguishes the desktop rail from the mobile sheet. Both can be mounted
   * at once, and two lists sharing one `layoutId` make the active indicator try
   * to fly between them.
   */
  instanceId: string
  /** Called after any navigation — the sheet uses it to close itself. */
  onNavigate?: () => void
  className?: string
}

type BadgeKind = NonNullable<NavItem['badge']>

export function SideNavigation({
  collapsed,
  onToggleCollapsed,
  instanceId,
  onNavigate,
  className,
}: SideNavigationProps) {
  const { can } = useAuth()
  const reduceMotion = useReducedMotion()

  // Only the analyst dashboard carries these counts, and only one role may read
  // it. Everyone else gets an unbadged nav rather than a failing request.
  const { data } = useAnalystDashboard({ enabled: can('command_center.view') })

  const counts: Record<BadgeKind, number | null> = {
    approvals: data?.counts.awaiting_approval ?? null,
    threats: data?.counts.new_reports ?? null,
    runs: data?.counts.active_runs ?? null,
    // The analyst dashboard does not report an incident-risk count. Absent is
    // absent; it must not be rendered as zero.
    incidents: null,
  }

  const t = useT()
  const sections: NavSection[] = visibleSections(can)
  const personal = EMPLOYEE_NAV.filter((item) => can(item.permission))
  if (personal.length > 0) {
    sections.push({
      id: 'personal',
      label: 'Personal',
      labelKey: 'nav.section.personal',
      items: personal,
    })
  }

  return (
    <nav
      aria-label={t('u.primary')}
      className={cn('flex h-full flex-col gap-1 overflow-y-auto px-2 py-3', className)}
    >
      {sections.map((section, index) => (
        <div key={section.id} className="mb-1">
          {collapsed ? (
            index > 0 && <Separator className="my-2" />
          ) : (
            <p className="label px-2 pb-1.5 pt-2 text-fg-faint">{t(section.labelKey)}</p>
          )}

          <ul className="space-y-0.5">
            {section.items.map((item) => (
              <li key={item.id}>
                <NavRow
                  item={item}
                  count={item.badge ? counts[item.badge] : null}
                  collapsed={collapsed}
                  instanceId={instanceId}
                  reduceMotion={Boolean(reduceMotion)}
                  onNavigate={onNavigate}
                />
              </li>
            ))}
          </ul>
        </div>
      ))}

      {onToggleCollapsed && (
        <div className="mt-auto pt-2">
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-expanded={!collapsed}
            className={cn(
              'flex w-full items-center gap-3 rounded-control px-2.5 py-2 text-sm text-fg-faint',
              'transition-colors hover:bg-raised hover:text-fg-muted',
              collapsed && 'justify-center',
            )}
          >
            {collapsed ? (
              <PanelLeftOpen className="size-4 shrink-0" aria-hidden="true" strokeWidth={1.75} />
            ) : (
              <PanelLeftClose className="size-4 shrink-0" aria-hidden="true" strokeWidth={1.75} />
            )}
            {!collapsed && t('shell.collapse')}
            {collapsed && <span className="sr-only">{t('shell.expand')}</span>}
          </button>
        </div>
      )}
    </nav>
  )
}

function NavRow({
  item,
  count,
  collapsed,
  instanceId,
  reduceMotion,
  onNavigate,
}: {
  item: NavItem
  count: number | null
  collapsed: boolean
  instanceId: string
  reduceMotion: boolean
  onNavigate?: () => void
}) {
  const t = useT()
  const label = t(item.labelKey)
  const Icon = item.icon
  const badged = count !== null && count > 0

  const row = (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      // Collapsed, the only content is an aria-hidden icon. A tooltip supplies a
      // description, never a name — without this the rail is a column of links
      // announced as "link".
      aria-label={collapsed ? label : undefined}
      className={({ isActive }) =>
        cn(
          'relative flex items-center gap-3 rounded-control px-2.5 py-2 text-body transition-colors',
          collapsed && 'justify-center px-0',
          isActive ? 'text-fg' : 'text-fg-muted hover:bg-raised hover:text-fg',
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <motion.span
              layoutId={`nav-active-${instanceId}`}
              aria-hidden="true"
              transition={
                reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 520, damping: 42 }
              }
              className="absolute inset-0 -z-10 rounded-control border border-brand/25 bg-brand/10"
            />
          )}

          <Icon
            className={cn('size-4 shrink-0', isActive ? 'text-brand' : 'text-fg-subtle')}
            aria-hidden="true"
            strokeWidth={1.75}
          />

          {!collapsed && <span className="min-w-0 flex-1 truncate">{label}</span>}

          {badged && !collapsed && (
            <span
              className={cn(
                'shrink-0 rounded-chip border px-1.5 text-xs',
                item.badge === 'approvals'
                  ? 'border-medium/35 bg-medium/12 text-medium'
                  : 'border-line bg-raised text-fg-muted',
              )}
            >
              {count}
            </span>
          )}

          {badged && collapsed && (
            <span
              aria-hidden="true"
              className={cn(
                'absolute right-1.5 top-1.5 size-1.5 rounded-full',
                item.badge === 'approvals' ? 'bg-medium' : 'bg-fg-subtle',
              )}
            />
          )}
        </>
      )}
    </NavLink>
  )

  if (!collapsed) return row

  return (
    <Tooltip
      side="right"
      content={
        <span className="block">
          <span className="block text-fg">{label}</span>
          {item.hintKey && <span className="block text-fg-subtle">{t(item.hintKey)}</span>}
          {badged && <span className="block text-fg-subtle">{count} waiting</span>}
        </span>
      }
    >
      {row}
    </Tooltip>
  )
}
