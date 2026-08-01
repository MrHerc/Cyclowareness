/**
 * A hover/focus hint.
 *
 * A tooltip may only ever REPEAT or expand on something already visible. It is
 * not a place to hide a definition the user needs, because it does not exist on
 * touch and it does not exist on a printed report. Where the explanation is
 * load-bearing — why a target was chosen, what a score means — use a Popover
 * with a real trigger instead.
 *
 * `<TooltipProvider>` belongs once at the app root; it is what makes the second
 * tooltip in a row open instantly instead of re-waiting the delay.
 */

import * as RadixTooltip from '@radix-ui/react-tooltip'
import type { ComponentProps, ReactNode } from 'react'
import { cn } from '../../lib/format'

export const TooltipProvider = RadixTooltip.Provider

export interface TooltipProps {
  content: ReactNode
  children: ReactNode
  side?: ComponentProps<typeof RadixTooltip.Content>['side']
  align?: ComponentProps<typeof RadixTooltip.Content>['align']
  /** Keeps the tooltip open while the pointer is over it — for copyable text. */
  interactive?: boolean
  className?: string
}

export function Tooltip({
  content,
  children,
  side = 'top',
  align = 'center',
  interactive = false,
  className,
}: TooltipProps) {
  return (
    <RadixTooltip.Root disableHoverableContent={!interactive}>
      <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
      <RadixTooltip.Portal>
        <RadixTooltip.Content
          side={side}
          align={align}
          sideOffset={6}
          collisionPadding={8}
          className={cn(
            'z-50 max-w-xs rounded-control border border-line bg-elevated px-2.5 py-1.5',
            'text-sm text-fg-muted shadow-float',
            className,
          )}
        >
          {content}
          <RadixTooltip.Arrow className="fill-elevated" width={10} height={5} />
        </RadixTooltip.Content>
      </RadixTooltip.Portal>
    </RadixTooltip.Root>
  )
}
