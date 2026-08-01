/**
 * A lighter container for grid items — one threat, one policy, one integration.
 *
 * When a card is clickable it must BE the clickable element, not a div with an
 * onClick and a nested link. Pass `asChild` with a router `<Link>` (or an `<a>`)
 * and the card renders as that element, keeping one tab stop and a real href
 * the user can middle-click.
 */

import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/format'
import { Slot } from './Slot'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Adds hover feedback and a pointer. Implied by `asChild`. */
  interactive?: boolean
  /** Render onto the child element (a `<Link>`) instead of a `<div>`. */
  asChild?: boolean
  children: ReactNode
}

export function Card({ interactive, asChild = false, className, children, ...rest }: CardProps) {
  const clickable = interactive ?? asChild
  const classes = cn(
    'block rounded-panel border border-line bg-elevated p-4 text-left',
    clickable &&
      'cursor-pointer transition-colors duration-150 hover:border-line-strong hover:bg-raised',
    className,
  )

  if (asChild) {
    return (
      <Slot className={classes} {...rest}>
        {children}
      </Slot>
    )
  }

  return (
    <div className={classes} {...rest}>
      {children}
    </div>
  )
}
