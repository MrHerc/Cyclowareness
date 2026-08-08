/**
 * Marks a surface whose data is demonstration data.
 *
 * The product is shown to buyers on a seeded deployment. A screen that looks
 * exactly like the live one, with numbers that were never measured, is the
 * easiest way to lose a room — so the demo surfaces say so themselves rather
 * than relying on the presenter to remember.
 *
 * Neutral and dashed, never amber: in this system the warm hues mean risk, and
 * "this is a demo" is not a risk finding.
 */

import { MonitorPlay } from 'lucide-react'
import { useT } from '../../lib/i18n'
import { cn } from '../../lib/format'
import { Tip } from './Tip'

export interface DemoDataBadgeProps {
  /** What exactly is seeded, when only part of the surface is. */
  detail?: string
  className?: string
}

export function DemoDataBadge({ detail, className }: DemoDataBadgeProps) {
  const t = useT()
  return (
    <Tip
      content={
        <span>
          Demonstration data. Nothing on this surface was measured from a live system.
          {detail ? <span className="mt-1 block text-fg-subtle">{detail}</span> : null}
        </span>
      }
    >
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-chip border border-dashed border-line-strong px-2 py-0.5 text-xs text-fg-subtle',
          className,
        )}
      >
        <MonitorPlay className="size-3.5 shrink-0" aria-hidden="true" />
        {t('u.demo-data-2')}
      </span>
    </Tip>
  )
}
