/**
 * The identity-federation options, present and honestly unavailable.
 *
 * They are drawn because a buyer needs to see that the product expects to sit
 * behind their directory, and they are disabled because this backend exposes
 * exactly one credential route — `POST /api/auth/login`. Wiring a button to a
 * fake OAuth redirect would be a working demo of a capability that does not
 * exist, which is the failure this whole design system is written against.
 *
 * No vendor marks. A rendered Microsoft or Google logo on a control that cannot
 * do anything implies a relationship and a configuration, neither of which is
 * true here; a neutral key icon claims nothing.
 */

import { useT, type MessageKey } from '../../lib/i18n'
import { KeyRound } from 'lucide-react'
import { Button } from '../../components/ui'

const PROVIDERS: { id: string; label: MessageKey; short: string }[] = [
  // `short` is the visible text — a brand name, not prose, so it is not a
  // message key; the full sentence stays on the accessible name.
  { id: 'microsoft', label: 'p.continue-with-microsoft', short: 'Microsoft' },
  { id: 'google', label: 'p.continue-with-google', short: 'Google' },
  { id: 'saml', label: 'p.continue-with-sso', short: 'SSO' },
] as const

export function FederatedIdentity() {
  const t = useT()
  return (
    <div className="mt-5">
      <div className="flex items-center gap-3" aria-hidden="true">
        <span className="rule-fade flex-1" />
        <span className="label text-fg-faint">{t('u.or')}</span>
        <span className="rule-fade flex-1" />
      </div>

      {/* One row of three, not a stack of full-width buttons: these are
          disabled affordances, and 218px of dead controls out-weighed the live
          form. The accessible name keeps the full "Continue with X". */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        {PROVIDERS.map((provider) => (
          <Button
            key={provider.id}
            variant="outline"
            block
            disabled
            aria-label={t(provider.label)}
            icon={<KeyRound className="size-4" aria-hidden="true" />}
          >
            {provider.short}
          </Button>
        ))}
      </div>

      {/* Immediately after the controls, so it is read in order by anyone who
          cannot see that they are dimmed. */}
      <p className="text-xs text-fg-faint mt-3">{t('p.identity-federation-is-not-configured-for')}</p>
    </div>
  )
}
