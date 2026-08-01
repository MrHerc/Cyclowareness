/**
 * Renders its props onto its single child instead of onto a wrapper element.
 *
 * This is what `asChild` is built on: a <Button asChild><Link/></Button> must
 * produce one `<a>` carrying the button's classes, not a `<button>` wrapping an
 * `<a>`. Nesting the two is both invalid HTML and a keyboard trap — the outer
 * button takes a tab stop that does nothing.
 */

import { cloneElement, isValidElement, type ReactNode } from 'react'
import { cn } from '../../lib/format'

export interface SlotProps {
  className?: string
  children: ReactNode
  [key: string]: unknown
}

type SlottableProps = { className?: string } & Record<string, unknown>

export function Slot({ className, children, ...rest }: SlotProps) {
  if (!isValidElement<SlottableProps>(children)) {
    throw new Error('asChild expects exactly one React element child')
  }
  const childProps = children.props
  return cloneElement(children, {
    ...rest,
    // The child wins on everything it sets itself (`to`, `href`, `type`) so a
    // wrapper can never silently override the thing it is wrapping.
    ...childProps,
    className: cn(className, childProps.className),
  })
}
