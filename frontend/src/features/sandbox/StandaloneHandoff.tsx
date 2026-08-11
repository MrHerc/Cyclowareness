/**
 * The door to the standalone Cyclowareness Sandbox deployment.
 *
 * The engine behind this portal's own sandbox screens is the standalone's,
 * byte for byte — so this is not a second analyser. It is the standalone's own
 * interface, which carries the parts the portal does not re-implement: the
 * engine matrix, score tuning, the retention policy and its separate,
 * hash-chained chain of custody.
 *
 * NO SECOND PASSWORD. The portal mints a session in the standalone's format
 * carrying THIS analyst's address, so the audit trail over there records the
 * person rather than a shared service account — see `useStandaloneDoor`, which
 * owns the mint and is shared with the button in the top bar.
 *
 * That button is now the way in; this panel is the EXPLANATION. It says what
 * the standalone carries that this portal does not, which a 32px control in a
 * header cannot, and it earns its place on the Sandbox page by answering the
 * question the button raises rather than by being the only way to ask it.
 *
 * It renders nothing at all when no standalone is configured. An integration
 * the operator has not set up must not appear as a broken button.
 */

import { ExternalLink, Loader2 } from 'lucide-react'
import { cn } from '../../lib/format'
import { useT } from '../../lib/i18n'
import { Button, Panel } from '../../components/ui'
import { useStandaloneDoor } from './useStandaloneDoor'

export function StandaloneHandoff() {
  const t = useT()
  const { configured, busy, error, open } = useStandaloneDoor()

  if (!configured) return null

  return (
    <Panel
      title={t('sbx.standalone.title')}
      subtitle={t('sbx.standalone.subtitle')}
      actions={
        <Button variant="secondary" onClick={open} disabled={busy}>
          {busy ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <ExternalLink className="size-4" aria-hidden="true" />
          )}
          {t('sbx.standalone.open')}
        </Button>
      }
    >
      <p className="max-w-[52rem] text-body text-fg-muted">{t('sbx.standalone.body')}</p>
      <ul className={cn('mt-4 flex flex-wrap gap-2')}>
        {['sbx.standalone.cap.engines', 'sbx.standalone.cap.tuning', 'sbx.standalone.cap.retention', 'sbx.standalone.cap.audit'].map(
          (key) => (
            <li key={key} className="rounded-chip border border-hair px-2.5 py-1 text-xs text-fg-muted">
              {t(key as Parameters<typeof t>[0])}
            </li>
          ),
        )}
      </ul>
      {error ? (
        <p role="alert" className="mt-4 text-sm text-critical">
          {error}
        </p>
      ) : null}
    </Panel>
  )
}
