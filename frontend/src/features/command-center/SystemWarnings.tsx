/**
 * The things this deployment currently cannot do, stated before anyone relies
 * on them.
 *
 * These are capability facts, not alerts: they are true on page load rather
 * than raised by something the analyst did, so there is no live region and no
 * `role="alert"` here. A banner that announces itself on every poll is noise,
 * and a screen reader repeating "no language model is connected" every fifteen
 * seconds would make the page unusable.
 *
 * Nothing is rendered when nothing is degraded. An empty "all systems normal"
 * panel is a claim this page has no way to verify.
 */

import { TriangleAlert } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useT } from '../../lib/i18n'
import { cn } from '../../lib/format'
import type { SystemWarning, WarningTone } from './derive'

export interface SystemWarningsProps {
  warnings: SystemWarning[]
}

const TONE_FRAME: Record<WarningTone, string> = {
  critical: 'border-critical/40 bg-critical/8',
  high: 'border-high/40 bg-high/8',
  medium: 'border-medium/35 bg-medium/8',
}

const TONE_ICON: Record<WarningTone, string> = {
  critical: 'text-critical',
  high: 'text-high',
  medium: 'text-medium',
}

export function SystemWarnings({ warnings }: SystemWarningsProps) {
  const t = useT()
  if (warnings.length === 0) return null

  return (
    <section aria-labelledby="system-warnings-heading" className="space-y-2">
      <h2 id="system-warnings-heading" className="label text-fg-subtle">
        {t('cc.degraded')}
      </h2>

      <ul className="grid gap-2 lg:grid-cols-2">
        {warnings.map((warning) => (
          <li
            key={warning.id}
            className={cn(
              'flex items-start gap-3 rounded-control border px-4 py-3',
              TONE_FRAME[warning.tone],
            )}
          >
            <TriangleAlert
              aria-hidden="true"
              strokeWidth={1.5}
              className={cn('mt-0.5 size-4 shrink-0', TONE_ICON[warning.tone])}
            />
            <div className="min-w-0 space-y-1">
              <p className="text-body text-fg">{warning.title}</p>
              <p className="text-sm text-fg-muted">{warning.detail}</p>
              {warning.to ? (
                <Link
                  to={warning.to}
                  className="inline-block text-sm text-brand-fg underline-offset-4 hover:underline"
                >
                  {warning.linkLabel ?? 'Open'}
                </Link>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
