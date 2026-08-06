/**
 * Appearance — two entries, and only one of them is a control.
 *
 * The rail preference is a real stored value the shell reads at startup, and
 * the switch says so rather than pretending to move the rail underneath the
 * page. The motion entry is a read-out, not a toggle: the token layer already
 * follows the operating system, and a second switch that could disagree with
 * the first is not a preference, it is a bug waiting to be filed.
 */

import { useT } from '../../lib/i18n'
import { useState } from 'react'
import { PanelLeftClose, Waves } from 'lucide-react'
import { Panel, Switch } from '../../components/ui'
import { readNavCollapsed, useReducedMotion, writeNavCollapsed } from './preferences'

export function AppearancePanel() {
  const t = useT()
  const [collapsed, setCollapsed] = useState(readNavCollapsed)
  const [storageFailed, setStorageFailed] = useState(false)
  const reducedMotion = useReducedMotion()

  return (
    <Panel
      title={t('x.appearance')}
      subtitle={t('x.stored-in-this-browser-for')}
    >
      <div className="space-y-5">
        <div className="flex gap-3">
          <PanelLeftClose
            className="mt-0.5 size-4 shrink-0 text-fg-subtle"
            aria-hidden="true"
            strokeWidth={1.75}
          />
          <div className="min-w-0 space-y-1.5">
            <Switch
              label={t('p.start-with-the-navigation-rail-collapsed')}
              checked={collapsed}
              onCheckedChange={(next) => {
                setCollapsed(next)
                setStorageFailed(!writeNavCollapsed(next))
              }}
            />
            <p className="text-xs text-fg-subtle">{t('p.the-shell-reads-this-once-when')}</p>
            {storageFailed ? (
              <p role="alert" className="text-xs text-critical">{t('p.this-browser-refused-to-store-the')}</p>
            ) : null}
          </div>
        </div>

        <div className="flex gap-3 border-t border-line-subtle pt-5">
          <Waves
            className="mt-0.5 size-4 shrink-0 text-fg-subtle"
            aria-hidden="true"
            strokeWidth={1.75}
          />
          <div className="min-w-0 space-y-1">
            <p className="text-body text-fg">
              {reducedMotion
                ? t('p.your-system-asks-for-reduced-motion')
                : t('p.your-system-does-not-ask-for')}
            </p>
            <p className="text-xs text-fg-subtle">
              Every animation in the interface collapses under the operating system’s reduced-motion
              setting. There is deliberately no in-app override: a second switch that could disagree
              with the system one would leave the two saying different things about the same
              preference. Change it in your operating system’s accessibility settings and this line
              will follow.
            </p>
          </div>
        </div>
      </div>
    </Panel>
  )
}
