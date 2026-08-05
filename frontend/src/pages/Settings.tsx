/**
 * Settings — short, and true.
 *
 * The instinct on a page like this is to fill it: notification preferences, a
 * theme picker, a data-retention slider, a dozen switches nobody wired. Every
 * one of them would be a small lie, and a viewer who flips one and watches
 * nothing happen has learned something about the whole product, not just about
 * that switch.
 *
 * So there are four panels and each is either a fact the platform reports or a
 * preference this build genuinely honours. The demonstration controls are the
 * only destructive thing here and they render only when the server says the
 * routes behind them exist.
 */

import { useLocale } from '../lib/i18n'
import { useCapabilities } from '../lib/api/queries'
import { usePermission } from '../lib/auth/useAuth'
import { AppearancePanel } from '../features/settings/AppearancePanel'
import { DemoControls } from '../features/settings/DemoControls'
import { DeploymentPanel } from '../features/settings/DeploymentPanel'
import { IdentityPanel } from '../features/settings/IdentityPanel'

export default function Settings() {
  const { locale, t } = useLocale()
  const capabilities = useCapabilities()
  const canReset = usePermission('demo.reset')

  // Rendered only on the server's word. A production build has no reset route,
  // and a control that 404s reads as breakage rather than as absence.
  const showDemoControls = capabilities.data?.demo_mode === true && canReset

  return (
    <div className="space-y-6">
      <header className="min-w-0 max-w-3xl space-y-2">
        <p className="label text-brand">System</p>
        <h1 className="text-display text-fg">{t('page.settings.title')}</h1>
        <p lang={locale} className="text-body text-fg-muted">{t('page.settings.lead')}</p>
      </header>

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-2">
        <div className="space-y-6">
          <IdentityPanel />
          <AppearancePanel />
          {showDemoControls ? <DemoControls /> : null}
        </div>
        <DeploymentPanel />
      </div>
    </div>
  )
}
