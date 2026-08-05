/**
 * One-click sign-in for the seeded accounts.
 *
 * Rendered only when `/api/capabilities` reports `demo_mode`. In a production
 * build every one of these credentials 401s, so drawing them unconditionally
 * would put four broken buttons on the first screen of the product — the exact
 * failure the capabilities endpoint exists to prevent.
 *
 * They are real sign-ins. The server issues the token and enforces every
 * permission afterwards; nothing here fakes a role client-side.
 */

import { useT } from '../../lib/i18n'
import { ChevronRight } from 'lucide-react'
import { DemoDataBadge } from '../../components/data'
import { Spinner } from '../../components/ui'
import { DEMO_ACCOUNTS } from '../../lib/demo/registry'

export interface DemoAccountsProps {
  onUse: (email: string, password: string) => void
  /** The address currently being signed in, or `null`. */
  pending: string | null
  disabled?: boolean
}

export function DemoAccounts({ onUse, pending, disabled = false }: DemoAccountsProps) {
  const t = useT()
  return (
    <section className="mt-8 rounded-panel border border-dashed border-line-strong bg-surface/60 p-4">
      <header className="flex items-center justify-between gap-3">
        <h2 className="label text-fg-subtle">{t('y.demonstration-accounts')}</h2>
        <DemoDataBadge detail="Seeded credentials for the fictional Caspian Dynamics organisation." />
      </header>

      <p className="text-xs text-fg-faint mt-2">
        This deployment reports demo mode, so the seeded accounts are offered directly. Each button
        performs a real sign-in against the platform.
      </p>

      <ul className="mt-3 flex flex-col gap-1.5">
        {DEMO_ACCOUNTS.map((account) => {
          const busy = pending === account.email
          return (
            <li key={account.email}>
              <button
                type="button"
                onClick={() => onUse(account.email, account.password)}
                disabled={disabled || pending !== null}
                className="group flex w-full items-center gap-3 rounded-control border border-line-subtle bg-base px-3 py-2 text-left transition-colors duration-150 hover:border-brand/40 hover:bg-elevated disabled:pointer-events-none disabled:opacity-45"
              >
                <span className="min-w-0 flex-1">
                  <span className="text-body text-fg block">{account.role}</span>
                  <span className="text-xs text-fg-subtle block truncate">
                    {account.description}
                  </span>
                </span>
                {busy ? (
                  <Spinner size={14} />
                ) : (
                  <ChevronRight
                    className="size-4 shrink-0 text-fg-faint transition-colors duration-150 group-hover:text-brand"
                    aria-hidden="true"
                  />
                )}
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
