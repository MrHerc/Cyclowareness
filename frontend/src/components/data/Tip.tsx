/**
 * The tooltip every badge in this directory shares.
 *
 * Internal on purpose: it is not a general UI primitive, it is the one place
 * this set puts *supporting* detail. The rule it encodes — a tooltip may only
 * elaborate on a fact that is already visible. No measurement, sample size,
 * window or provenance label is ever hidden behind one, which is why nothing
 * here takes a `hidden` variant.
 *
 * Radix rather than `title=""`: a native tooltip is unreachable by keyboard,
 * cannot be dismissed with Escape, and is not announced.
 */

import type { ReactNode } from 'react'
import * as Tooltip from '@radix-ui/react-tooltip'
import { cn } from '../../lib/format'

export interface TipProps {
  /** Supporting detail. When empty the children render untouched — no dead trigger. */
  content: ReactNode
  children: ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
  /**
   * True when the child is already a button or link. Without it the wrapper
   * takes a tab stop of its own and the keyboard user stops twice on one thing.
   */
  focusableChild?: boolean
  className?: string
}

export function Tip({ content, children, side = 'top', focusableChild = false, className }: TipProps) {
  if (!content) return <>{children}</>

  return (
    <Tooltip.Provider delayDuration={150}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <span
            tabIndex={focusableChild ? undefined : 0}
            className={cn('inline-flex items-center rounded-chip', className)}
          >
            {children}
          </span>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            side={side}
            sideOffset={6}
            collisionPadding={8}
            className="z-50 max-w-72 rounded-control border border-line bg-elevated px-3 py-2 text-xs text-fg-muted shadow-float"
          >
            {content}
            <Tooltip.Arrow className="fill-elevated" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  )
}
