/**
 * A small floating surface attached to a trigger.
 *
 * Unlike a Tooltip, this survives a click and can hold interactive content —
 * a filter set, a score breakdown, the provenance of a generated module. That
 * makes it the right home for any explanation a user might want to read slowly
 * or copy out of.
 */

import * as RadixPopover from '@radix-ui/react-popover'
import type { ComponentProps } from 'react'
import { cn } from '../../lib/format'

export const Popover = RadixPopover.Root
export const PopoverTrigger = RadixPopover.Trigger
export const PopoverAnchor = RadixPopover.Anchor
export const PopoverClose = RadixPopover.Close

export function PopoverContent({
  className,
  sideOffset = 8,
  align = 'start',
  ...rest
}: ComponentProps<typeof RadixPopover.Content>) {
  return (
    <RadixPopover.Portal>
      <RadixPopover.Content
        sideOffset={sideOffset}
        align={align}
        collisionPadding={8}
        className={cn(
          'rise z-50 w-72 rounded-panel border border-line bg-elevated p-4',
          'text-body text-fg-muted shadow-float outline-none',
          className,
        )}
        {...rest}
      />
    </RadixPopover.Portal>
  )
}
