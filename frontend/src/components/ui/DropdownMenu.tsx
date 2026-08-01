/**
 * An actions menu, Radix-backed.
 *
 * `DropdownMenuItem` takes a `tone` so a destructive entry can be red without
 * anyone hand-writing a colour on a menu item; `danger` is the only non-default
 * tone, because a menu with four coloured entries has no emphasis left.
 */

import * as RadixMenu from '@radix-ui/react-dropdown-menu'
import { Check } from 'lucide-react'
import type { ComponentProps } from 'react'
import { cn } from '../../lib/format'

export const DropdownMenu = RadixMenu.Root
export const DropdownMenuTrigger = RadixMenu.Trigger
export const DropdownMenuGroup = RadixMenu.Group

const ITEM_BASE =
  'relative flex cursor-pointer select-none items-center gap-2 rounded-chip px-2 py-1.5 ' +
  'text-body outline-none transition-colors duration-100 ' +
  'data-[disabled]:pointer-events-none data-[disabled]:opacity-40'

export function DropdownMenuContent({
  className,
  sideOffset = 6,
  align = 'end',
  ...rest
}: ComponentProps<typeof RadixMenu.Content>) {
  return (
    <RadixMenu.Portal>
      <RadixMenu.Content
        sideOffset={sideOffset}
        align={align}
        collisionPadding={8}
        className={cn(
          'z-50 min-w-48 rounded-control border border-line bg-elevated p-1 shadow-float',
          className,
        )}
        {...rest}
      />
    </RadixMenu.Portal>
  )
}

export interface DropdownMenuItemProps extends ComponentProps<typeof RadixMenu.Item> {
  tone?: 'default' | 'danger'
}

export function DropdownMenuItem({ className, tone = 'default', ...rest }: DropdownMenuItemProps) {
  return (
    <RadixMenu.Item
      className={cn(
        ITEM_BASE,
        tone === 'danger'
          ? 'text-critical data-[highlighted]:bg-critical/12'
          : 'text-fg-muted data-[highlighted]:bg-raised data-[highlighted]:text-fg',
        className,
      )}
      {...rest}
    />
  )
}

export function DropdownMenuCheckboxItem({
  className,
  children,
  ...rest
}: ComponentProps<typeof RadixMenu.CheckboxItem>) {
  return (
    <RadixMenu.CheckboxItem
      className={cn(
        ITEM_BASE,
        'pl-7 text-fg-muted data-[highlighted]:bg-raised data-[highlighted]:text-fg',
        className,
      )}
      {...rest}
    >
      <RadixMenu.ItemIndicator className="absolute left-2 inline-flex">
        <Check size={13} className="text-brand" aria-hidden="true" />
      </RadixMenu.ItemIndicator>
      {children}
    </RadixMenu.CheckboxItem>
  )
}

export function DropdownMenuLabel({ className, ...rest }: ComponentProps<typeof RadixMenu.Label>) {
  return <RadixMenu.Label className={cn('label px-2 py-1.5 text-fg-faint', className)} {...rest} />
}

export function DropdownMenuSeparator({
  className,
  ...rest
}: ComponentProps<typeof RadixMenu.Separator>) {
  return <RadixMenu.Separator className={cn('my-1 h-px bg-line-subtle', className)} {...rest} />
}
