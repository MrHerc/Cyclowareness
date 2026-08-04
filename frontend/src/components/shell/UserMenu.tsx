/**
 * Who is signed in, and the way out.
 *
 * The menu prints the account's email and role from the session the server
 * issued, not from anything chosen locally — on a stage where roles are swapped
 * repeatedly, "which account am I actually in?" has to be answerable in one
 * glance and has to be right.
 *
 * Signing out clears the credential and the query cache (the provider does
 * both) and then navigates. The order matters: navigating first would let the
 * guard fire against a session that still exists for one more render.
 */

import { Globe, LogOut, User } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import {
  Avatar,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui'
import { LOCALE_NAMES, LOCALES, useLocale } from '../../lib/i18n'
import { cn } from '../../lib/format'
import { useAuth, usePermission } from '../../lib/auth/useAuth'
import { ROLE_LABEL } from '../../lib/auth/permissions'

export interface UserMenuProps {
  className?: string
}

export function UserMenu({ className }: UserMenuProps) {
  const { session, role, logout } = useAuth()
  // An executive has no portal of their own. Offering the link anyway would
  // bounce them straight back off the guard, which reads as a broken menu.
  const hasPortal = usePermission('portal.view')
  const navigate = useNavigate()
  const { locale, setLocale, t } = useLocale()

  if (!session) return null

  const name = session.employee_name ?? session.email

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Account menu — signed in as ${name}`}
          className={cn(
            'flex items-center gap-2 rounded-control border border-transparent px-1.5 py-1',
            'transition-colors hover:border-line hover:bg-raised',
            className,
          )}
        >
          <Avatar name={name} size="sm" />
          <span className="hidden min-w-0 text-left lg:block">
            <span className="block truncate text-sm text-fg">{name}</span>
            <span className="block truncate text-xs text-fg-faint">
              {role ? ROLE_LABEL[role] : 'No role'}
            </span>
          </span>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-64">
        <div className="flex items-center gap-3 px-2 py-2">
          <Avatar name={name} size="md" />
          <div className="min-w-0">
            <p className="truncate text-body text-fg">{name}</p>
            <p className="truncate text-xs text-fg-faint">{session.email}</p>
            <p className="mt-0.5 text-xs text-fg-subtle">
              {role ? ROLE_LABEL[role] : 'No role assigned'}
            </p>
          </div>
        </div>

        <DropdownMenuSeparator />

        {hasPortal && (
          <>
            <DropdownMenuItem onSelect={() => navigate('/portal')}>
              <User className="size-4 shrink-0" aria-hidden="true" strokeWidth={1.75} />
              {t('nav.portal')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}

        {/* Language sits above sign-out because a reader who cannot read the
            menu needs this item first. Each option is written in its OWN
            language — "Azərbaycanca", never "Azerbaijani" — since the person
            who needs it is by definition not reading the current one. */}
        <div className="px-2 pb-1 pt-1.5">
          <p className="label flex items-center gap-2 text-fg-faint">
            <Globe className="size-3.5 shrink-0" aria-hidden="true" strokeWidth={1.75} />
            {t('shell.language')}
          </p>
        </div>
        {LOCALES.map((code) => (
          <DropdownMenuItem
            key={code}
            onSelect={() => setLocale(code)}
            aria-current={locale === code}
          >
            <span
              aria-hidden="true"
              className={cn(
                'size-1.5 shrink-0 rounded-full',
                locale === code ? 'bg-brand' : 'bg-transparent',
              )}
            />
            {LOCALE_NAMES[code]}
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />

        <DropdownMenuItem
          tone="danger"
          onSelect={() => {
            logout()
            navigate('/login', { replace: true })
          }}
        >
          <LogOut className="size-4 shrink-0" aria-hidden="true" strokeWidth={1.75} />
          {t('shell.signOut')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
