/**
 * Appearance — two entries, and only one of them is a control.
 *
 * The rail preference is a real stored value the shell reads at startup, and
 * the switch says so rather than pretending to move the rail underneath the
 * page. The motion entry is a read-out, not a toggle: the token layer already
 * follows the operating system, and a second switch that could disagree with
 * the first is not a preference, it is a bug waiting to be filed.
 */

import { useState } from 'react'
import { PanelLeftClose, Waves } from 'lucide-react'
import { Panel, Switch } from '../../components/ui'
import { readNavCollapsed, useReducedMotion, writeNavCollapsed } from './preferences'

export function AppearancePanel() {
  const [collapsed, setCollapsed] = useState(readNavCollapsed)
  const [storageFailed, setStorageFailed] = useState(false)
  const reducedMotion = useReducedMotion()

  return (
    <Panel
      title="Appearance"
      subtitle="Stored in this browser, for this browser. Nothing here leaves the device or reaches the platform."
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
              label="Start with the navigation rail collapsed"
              checked={collapsed}
              onCheckedChange={(next) => {
                setCollapsed(next)
                setStorageFailed(!writeNavCollapsed(next))
              }}
            />
            <p className="text-xs text-fg-subtle">
              The shell reads this once when the application loads, so it decides how the rail comes
              up next time rather than moving it now. The control at the foot of the rail collapses
              it immediately, and writes the same preference.
            </p>
            {storageFailed ? (
              <p role="alert" className="text-xs text-critical">
                This browser refused to store the preference — private browsing or a full quota. It
                applies for this session and will not survive a reload.
              </p>
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
                ? 'Your system asks for reduced motion, and this product honours it.'
                : 'Your system does not ask for reduced motion.'}
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
