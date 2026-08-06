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

const PROVIDERS: { id: string; label: MessageKey }[] = [
  { id: 'microsoft', label: 'p.continue-with-microsoft' },
  { id: 'google', label: 'p.continue-with-google' },
  { id: 'saml', label: 'p.continue-with-sso' },
] as const

export function FederatedIdentity() {
  const t = useT()
  return (
    <div className="mt-6">
      <div className="flex items-center gap-3" aria-hidden="true">
        <span className="rule-fade flex-1" />
        <span className="label text-fg-faint">OR</span>
        <span className="rule-fade flex-1" />
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {PROVIDERS.map((provider) => (
          <Button
            key={provider.id}
            variant="outline"
            block
            disabled
            icon={<KeyRound className="size-4" aria-hidden="true" />}
          >
            {t(provider.label)}
          </Button>
        ))}
      </div>

      {/* Immediately after the controls, so it is read in order by anyone who
          cannot see that they are dimmed. */}
      <p className="text-xs text-fg-faint mt-3">{t('p.identity-federation-is-not-configured-for')}</p>
    </div>
  )
}
