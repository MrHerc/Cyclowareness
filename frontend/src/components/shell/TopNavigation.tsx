/**
 * The top bar: identity, orientation, and the state of the machine.
 *
 * It composes rather than implements. Each of the status readouts owns its own
 * query and its own honesty rules — the environment indicator refuses to guess
 * before `/api/capabilities` answers, the sandbox pill says "static only" when
 * no detonation host is attached — and this file only decides what appears for
 * whom, and in what order.
 *
 * Permission gating here is presentational, not protective. The pills are
 * withheld from a role that cannot read the queues behind them because an
 * executive should not watch a request 403 in their network tab, not because
 * withholding them secures anything. The server is the authority either way.
 */

import { Menu } from 'lucide-react'
import { Link } from 'react-router-dom'
import { IconButton } from '../ui'
import { cn } from '../../lib/format'
import { useCapabilities } from '../../lib/api/queries'
import { useAuth } from '../../lib/auth/useAuth'
import { homeFor } from '../../lib/auth/permissions'
import { PRODUCT_NAME } from '../../lib/demo/registry'
import { EnvironmentIndicator } from './EnvironmentIndicator'
import { GlobalSearchButton } from './GlobalSearchButton'
import { HelpMenu } from './HelpMenu'
import { LoopStatusPill } from './LoopStatusPill'
import { NotificationsMenu } from './NotificationsMenu'
import { ProductMark } from './ProductMark'
import { RoleSwitcher } from './RoleSwitcher'
import { SandboxStatusPill } from './SandboxStatusPill'
import { UserMenu } from './UserMenu'

export interface TopNavigationProps {
  /** Opens the command palette. The shell owns the palette's state. */
  onOpenSearch: () => void
  /** Opens the navigation sheet. Only reachable below the `lg` breakpoint. */
  onOpenNav: () => void
  className?: string
}

export function TopNavigation({ onOpenSearch, onOpenNav, className }: TopNavigationProps) {
  const { role, can } = useAuth()
  const { data: capabilities } = useCapabilities()

  const showLoop = can('loops.view')
  const showSandbox = can('sandbox.view')
  const showNotifications = can('approvals.view')
  // Only when the server says this is a demonstration deployment. In a
  // production build the seeded credentials do not exist and every entry in the
  // switcher would 401.
  const showRoleSwitcher = capabilities?.demo_mode === true

  return (
    <header
      className={cn(
        // Sticky rather than `position: fixed` so the sidebar can size itself
        // against the header's real height instead of a magic offset that drifts.
        'glass sticky top-0 z-40 flex h-14 shrink-0 items-center gap-3 border-b border-line px-3 sm:px-4',
        className,
      )}
    >
      <IconButton label="Open navigation" variant="ghost" size="sm" onClick={onOpenNav} className="lg:hidden">
        <Menu className="size-4" aria-hidden="true" strokeWidth={1.75} />
      </IconButton>

      {/* `sr-only sm:not-sr-only`, not `hidden sm:block`: hidden removes the
          name from the accessibility tree as well as from the screen, so below
          `sm` this link announced as nothing but its icon. */}
      <Link
        to={homeFor(role)}
        className="flex shrink-0 items-center gap-2.5 rounded-control py-1 pr-1"
      >
        <ProductMark />
        <span className="sr-only text-h text-fg sm:not-sr-only">{PRODUCT_NAME}</span>
      </Link>

      <EnvironmentIndicator className="hidden sm:inline-flex" />

      <div className="flex flex-1 justify-center px-2">
        <GlobalSearchButton onClick={onOpenSearch} className="w-full max-w-md" />
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {showLoop && <LoopStatusPill className="hidden xl:inline-flex" />}
        {showSandbox && <SandboxStatusPill className="hidden xl:inline-flex" />}

        {showRoleSwitcher && <RoleSwitcher className="hidden md:inline-flex" />}
        {showNotifications && <NotificationsMenu />}
        <HelpMenu onOpenPalette={onOpenSearch} />
        <UserMenu />
      </div>
    </header>
  )
}
