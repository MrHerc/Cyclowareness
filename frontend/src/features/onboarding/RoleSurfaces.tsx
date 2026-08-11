/**
 * What this role can actually open.
 *
 * Built from `visibleSections(can)` — the same table the sidebar and the command
 * palette read — so every row here is a route that exists and that this person
 * will not be redirected away from. A hand-written list of "what you can do"
 * drifts within a sprint and then teaches new users about screens they cannot
 * reach, which is worse than saying nothing.
 */

import { useT } from '../../lib/i18n'
import { Link } from 'react-router-dom'
import { EMPLOYEE_NAV, visibleSections, type NavItem } from '../../app/navigation'
import type { Permission } from '../../lib/auth/permissions'

export interface RoleSurfacesProps {
  can: (permission: Permission) => boolean
  /** Called before navigating, so leaving through a link still counts as read. */
  onNavigate: () => void
}

export function RoleSurfaces({ can, onNavigate }: RoleSurfacesProps) {
  const t = useT()
  const sections = visibleSections(can)
  const mine = EMPLOYEE_NAV.filter((item) => can(item.permission))
  const groups: { id: string; label: string; items: NavItem[] }[] = [
    ...sections,
    ...(mine.length ? [{ id: 'mine', label: t('u.yours-2'), items: mine }] : []),
  ]

  if (groups.length === 0) {
    return (
      <p className="text-body text-fg-muted">{t('p.this-role-has-no-surfaces-assigned')}</p>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      {groups.map((group) => (
        <section key={group.id}>
          <h3 className="label text-fg-faint">{group.label.toUpperCase()}</h3>
          <ul className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {group.items.map((item) => {
              const Icon = item.icon
              return (
                <li key={item.id}>
                  <Link
                    to={item.to}
                    onClick={onNavigate}
                    className="flex h-full items-start gap-2.5 rounded-control border border-line-subtle bg-base px-3 py-2 transition-colors duration-150 hover:border-brand/40 hover:bg-elevated"
                  >
                    <Icon
                      className="mt-0.5 size-4 shrink-0 text-fg-subtle"
                      strokeWidth={1.6}
                      aria-hidden="true"
                    />
                    <span className="min-w-0">
                      <span className="text-body text-fg block">{item.label}</span>
                      {item.hint ? (
                        <span className="text-xs text-fg-subtle block">{item.hint}</span>
                      ) : null}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}
