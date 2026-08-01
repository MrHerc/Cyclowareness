/**
 * Tabs, Radix-backed.
 *
 * Underlines rather than pills: a run detail can carry seven tabs, and seven
 * filled pills in a row compete with the panel they introduce. The active
 * marker is the only brand mark in the strip.
 *
 * Radix owns arrow-key navigation and the tab/panel aria wiring; do not
 * substitute buttons and a useState.
 */

import * as RadixTabs from '@radix-ui/react-tabs'
import type { ComponentProps } from 'react'
import { cn } from '../../lib/format'

export const Tabs = RadixTabs.Root
export type TabsProps = ComponentProps<typeof RadixTabs.Root>

export function TabsList({ className, ...rest }: ComponentProps<typeof RadixTabs.List>) {
  return (
    <RadixTabs.List
      className={cn('flex items-center gap-1 border-b border-line-subtle', className)}
      {...rest}
    />
  )
}

export function TabsTrigger({ className, ...rest }: ComponentProps<typeof RadixTabs.Trigger>) {
  return (
    <RadixTabs.Trigger
      className={cn(
        'relative -mb-px whitespace-nowrap border-b-2 border-transparent px-3 py-2',
        'text-body font-medium text-fg-subtle transition-colors duration-150',
        'hover:text-fg-muted',
        'data-[state=active]:border-brand data-[state=active]:text-fg',
        'disabled:pointer-events-none disabled:opacity-40',
        className,
      )}
      {...rest}
    />
  )
}

export function TabsContent({ className, ...rest }: ComponentProps<typeof RadixTabs.Content>) {
  return <RadixTabs.Content className={cn('rise mt-4 outline-none', className)} {...rest} />
}
