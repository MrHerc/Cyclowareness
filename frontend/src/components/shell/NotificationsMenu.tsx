/**
 * What is waiting for you — derived, and labelled as derived.
 *
 * There is no notification service in this product. Rather than draw a bell
 * that does nothing, or invent a feed, this menu reads the queues the platform
 * genuinely maintains and says in the footer exactly where the entries came
 * from. A bell that implies push delivery this deployment cannot perform is the
 * same lie as a metric that was never measured.
 *
 * The dot only appears when there is genuinely something waiting; a permanently
 * decorated bell teaches people to ignore it.
 */

import { BadgeCheck, Bell, Inbox } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  IconButton,
} from '../ui'
import { cn } from '../../lib/format'
import { useAnalystDashboard } from '../../lib/api/queries'

export interface NotificationsMenuProps {
  className?: string
}

export function NotificationsMenu({ className }: NotificationsMenuProps) {
  const navigate = useNavigate()
  const { data, isPending, isError } = useAnalystDashboard()

  const approvals = data?.counts.awaiting_approval ?? null
  const reports = data?.counts.new_reports ?? null
  const total = (approvals ?? 0) + (reports ?? 0)
  const flagged = data !== undefined && total > 0

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <IconButton
          label={flagged ? `Waiting for you — ${total} item${total === 1 ? '' : 's'}` : 'Waiting for you'}
          variant="ghost"
          size="sm"
          className={cn('relative', className)}
        >
          <Bell className="size-4" aria-hidden="true" strokeWidth={1.75} />
          {flagged && (
            <span
              aria-hidden="true"
              className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-medium"
            />
          )}
        </IconButton>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-80">
        <DropdownMenuLabel>Waiting for you</DropdownMenuLabel>

        {isPending && (
          <p className="px-2 py-3 text-sm text-fg-subtle">Reading the queues.</p>
        )}

        {isError && (
          <p className="px-2 py-3 text-sm text-fg-subtle">
            The queues could not be read, so this list is empty for a reason that has nothing to do
            with your workload.
          </p>
        )}

        {data !== undefined && (
          <>
            <DropdownMenuItem onSelect={() => navigate('/approvals')}>
              <BadgeCheck className="size-4 shrink-0" aria-hidden="true" strokeWidth={1.75} />
              <span className="flex-1">Waiting at the approval gate</span>
              <span className={approvals ? 'text-medium' : 'text-fg-faint'}>{approvals}</span>
            </DropdownMenuItem>

            <DropdownMenuItem onSelect={() => navigate('/threats')}>
              <Inbox className="size-4 shrink-0" aria-hidden="true" strokeWidth={1.75} />
              <span className="flex-1">New reports to triage</span>
              <span className={reports ? 'text-fg' : 'text-fg-faint'}>{reports}</span>
            </DropdownMenuItem>
          </>
        )}

        <DropdownMenuSeparator />
        <p className="px-2 pb-1.5 pt-1 text-xs text-fg-faint">
          Derived from the live queues. This deployment sends no email or push notifications.
        </p>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
