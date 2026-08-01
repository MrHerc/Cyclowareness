/**
 * Tables, with the three things hand-rolled ones always miss.
 *
 * 1. **The scroll container is part of the component.** A wide table without
 *    one does not shrink — it widens the page, and every other panel on the
 *    screen inherits a horizontal scrollbar. Here the overflow is owned by the
 *    wrapper, so a twelve-column IOC table scrolls inside its panel.
 * 2. **Numbers are right-aligned.** `numeric` on a cell also switches on
 *    tabular figures, so a column of scores lines up on the decimal instead of
 *    drifting by digit width.
 * 3. **No zebra striping.** Alternating fills fight the surface steps that give
 *    the product its depth; a hairline per row separates just as well and keeps
 *    one background behind the data.
 *
 * The header is sticky by default, which only does anything when the caller
 * constrains the wrapper's height — pass that through `containerClassName`.
 */

import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from 'react'
import { cn } from '../../lib/format'

export interface TableProps extends HTMLAttributes<HTMLTableElement> {
  /** The scrolling wrapper — put `max-h-*` here, not on the table. */
  containerClassName?: string
}

export function Table({ className, containerClassName, ...rest }: TableProps) {
  return (
    <div className={cn('w-full overflow-x-auto', containerClassName)}>
      <table className={cn('w-full border-collapse text-body', className)} {...rest} />
    </div>
  )
}

export function TableHeader({ className, ...rest }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={cn('sticky top-0 z-10 bg-surface [&_tr]:border-b [&_tr]:border-line', className)}
      {...rest}
    />
  )
}

export function TableBody({ className, ...rest }: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={className} {...rest} />
}

export interface TableRowProps extends HTMLAttributes<HTMLTableRowElement> {
  /** Hover feedback. Set it only when the row actually does something. */
  interactive?: boolean
  /** Marks the row as the current selection for both sighted and AT users. */
  selected?: boolean
}

export function TableRow({ className, interactive, selected, ...rest }: TableRowProps) {
  return (
    <tr
      aria-selected={selected || undefined}
      className={cn(
        'border-b border-line-subtle last:border-b-0',
        interactive && 'cursor-pointer transition-colors duration-100 hover:bg-raised',
        selected && 'bg-brand/8',
        className,
      )}
      {...rest}
    />
  )
}

export interface TableHeadProps extends ThHTMLAttributes<HTMLTableCellElement> {
  numeric?: boolean
}

export function TableHead({ className, numeric, ...rest }: TableHeadProps) {
  return (
    <th
      scope="col"
      className={cn(
        'label whitespace-nowrap px-3 py-2.5 text-fg-faint',
        numeric ? 'text-right' : 'text-left',
        className,
      )}
      {...rest}
    />
  )
}

export interface TableCellProps extends TdHTMLAttributes<HTMLTableCellElement> {
  numeric?: boolean
}

export function TableCell({ className, numeric, ...rest }: TableCellProps) {
  return (
    <td
      className={cn(
        'px-3 py-2.5 align-middle text-fg-muted',
        numeric && 'text-right tabular-nums text-fg',
        className,
      )}
      {...rest}
    />
  )
}

export function TableCaption({ className, ...rest }: HTMLAttributes<HTMLTableCaptionElement>) {
  return <caption className={cn('px-3 py-2 text-left text-sm text-fg-subtle', className)} {...rest} />
}
