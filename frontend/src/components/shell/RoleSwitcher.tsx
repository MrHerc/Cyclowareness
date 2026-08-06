/**
 * Move between the three role experiences on stage, without typing credentials.
 *
 * The important property, and the reason the menu says so in plain words: this
 * is a **real sign-in**. Each entry POSTs the seeded account's credentials to
 * `/api/auth/login`, the server issues the token, and every subsequent request
 * is authorised by that token. Nothing about the role is decided in the browser.
 *
 * That matters because the obvious shortcut — flipping a `role` field in client
 * state — would make the whole permission demonstration worthless: an auditor
 * asking "so the executive view is enforced?" would be shown a UI that merely
 * chose not to render things. Here, an executive who navigates to `/approvals`
 * by hand gets a 403 from FastAPI.
 *
 * Rendered only where `capabilities.demo_mode` is true. In a production build
 * these buttons would 401 on every click, so the caller asks the server first.
 */

import { Check, UserCog } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Spinner,
  useToast,
} from '../ui'
import { useT } from '../../lib/i18n'
import { ApiError } from '../../lib/api/client'
import { useAuth } from '../../lib/auth/useAuth'
import { homeFor } from '../../lib/auth/permissions'
import { DEMO_ACCOUNTS } from '../../lib/demo/registry'

export interface RoleSwitcherProps {
  className?: string
}

export function RoleSwitcher({ className }: RoleSwitcherProps) {
  const t = useT()
  const { session, switchRole } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const [pending, setPending] = useState<string | null>(null)
  // Controlled so the menu can stay open while a sign-in is in flight (the
  // spinner has to be visible somewhere) and close itself once it lands.
  const [open, setOpen] = useState(false)

  const signInAs = async (email: string, password: string) => {
    setPending(email)
    try {
      const next = await switchRole(email, password)
      setOpen(false)
      navigate(homeFor(next.role), { replace: true })
      toast.show({
        tone: 'success',
        title: `Signed in as ${next.employee_name ?? next.email}`,
        description: t('p.the-server-issued-a-new-token'),
      })
    } catch (error) {
      toast.show({
        tone: 'error',
        title: t('p.could-not-switch-account'),
        description:
          error instanceof ApiError
            ? error.message
            : t('p.the-signin-request-failed-before-the'),
      })
    } finally {
      setPending(null)
    }
  }

  return (
    <DropdownMenu open={open} onOpenChange={(next) => (pending === null ? setOpen(next) : undefined)}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          icon={<UserCog className="size-4" aria-hidden="true" strokeWidth={1.75} />}
          className={className}
        >
          {t('shell.switchAccount')}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-80">
        <DropdownMenuLabel>Seeded demonstration accounts</DropdownMenuLabel>

        {DEMO_ACCOUNTS.map((account) => {
          const current = session?.email === account.email
          const busy = pending === account.email
          return (
            <DropdownMenuItem
              key={account.email}
              disabled={pending !== null}
              // Radix closes the menu on select; keeping it open while the
              // request is in flight is what lets the spinner mean anything.
              onSelect={(event) => {
                event.preventDefault()
                void signInAs(account.email, account.password)
              }}
            >
              <span className="flex w-4 shrink-0 items-center justify-center">
                {busy ? (
                  <Spinner size={13} />
                ) : current ? (
                  <Check className="size-3.5 text-brand" aria-hidden="true" strokeWidth={2} />
                ) : null}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-fg">{account.role}</span>
                <span className="block truncate text-xs text-fg-faint">{account.description}</span>
              </span>
            </DropdownMenuItem>
          )
        })}

        <DropdownMenuSeparator />
        <p className="px-2 pb-1.5 pt-1 text-xs text-fg-faint">{t('p.each-entry-performs-a-real-signin')}</p>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
