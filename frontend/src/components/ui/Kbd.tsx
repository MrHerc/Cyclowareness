/**
 * A keyboard key, for shortcut hints in menus and the command palette.
 *
 * It renders a real `<kbd>`; the element carries the meaning, so a shortcut
 * hint is not read out as loose punctuation.
 */

import type { ReactNode } from 'react'
import { cn } from '../../lib/format'

export interface KbdProps {
  children: ReactNode
  className?: string
}

export function Kbd({ children, className }: KbdProps) {
  return (
    <kbd
      className={cn(
        'tech inline-flex h-5 min-w-5 items-center justify-center rounded-chip',
        'border border-line-strong bg-raised px-1.5 text-fg-subtle',
        className,
      )}
    >
      {children}
    </kbd>
  )
}
