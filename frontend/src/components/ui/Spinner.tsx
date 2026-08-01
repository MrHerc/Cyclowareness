/**
 * The one busy indicator. Hand-drawn rather than an icon-pack import so its
 * stroke weight matches the type at every size and so a spinner never depends
 * on an icon name surviving a library version bump.
 *
 * It is decorative by default: the surrounding control is responsible for
 * saying what is happening (`aria-busy`, an aria-live region). A spinner that
 * announces itself on every poll is noise in a screen reader.
 */

import { cn } from '../../lib/format'

export interface SpinnerProps {
  /** Matches the current font size by default. */
  size?: number
  className?: string
}

export function Spinner({ size = 14, className }: SpinnerProps) {
  return (
    <svg
      className={cn('animate-spin', className)}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity="0.25" />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  )
}
