/**
 * A scroll container with a scrollbar that matches the product.
 *
 * Use it where the scroll region is INSIDE a panel — a signal list, a long
 * targeting table, a menu. The page itself keeps the native scrollbar: a custom
 * one on the document costs keyboard and momentum behaviour for nothing.
 */

import * as RadixScrollArea from '@radix-ui/react-scroll-area'
import type { ComponentProps, ReactNode } from 'react'
import { cn } from '../../lib/format'

export interface ScrollAreaProps extends ComponentProps<typeof RadixScrollArea.Root> {
  /** Applied to the scrolling viewport, where a max-height belongs. */
  viewportClassName?: string
  children: ReactNode
}

export function ScrollArea({ className, viewportClassName, children, ...rest }: ScrollAreaProps) {
  return (
    <RadixScrollArea.Root
      type="hover"
      scrollHideDelay={600}
      className={cn('relative overflow-hidden', className)}
      {...rest}
    >
      <RadixScrollArea.Viewport className={cn('h-full w-full', viewportClassName)}>
        {children}
      </RadixScrollArea.Viewport>

      <RadixScrollArea.Scrollbar
        orientation="vertical"
        className="flex w-2.5 touch-none select-none p-0.5 transition-opacity"
      >
        <RadixScrollArea.Thumb className="flex-1 rounded-chip bg-line-strong" />
      </RadixScrollArea.Scrollbar>
      <RadixScrollArea.Scrollbar
        orientation="horizontal"
        className="flex h-2.5 touch-none select-none flex-col p-0.5 transition-opacity"
      >
        <RadixScrollArea.Thumb className="flex-1 rounded-chip bg-line-strong" />
      </RadixScrollArea.Scrollbar>
      <RadixScrollArea.Corner />
    </RadixScrollArea.Root>
  )
}
