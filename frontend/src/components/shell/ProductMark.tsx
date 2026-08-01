/**
 * The product mark: an open loop with an arrowhead, closing on itself.
 *
 * It is drawn rather than imported so it inherits `currentColor` and scales with
 * the type — a raster logo on a projector at 4K is the one asset that always
 * looks wrong. The gap in the ring is deliberate: this product does not claim
 * the loop closes by itself, a human closes it at the gate.
 */

import { cn } from '../../lib/format'

export interface ProductMarkProps {
  className?: string
}

export function ProductMark({ className }: ProductMarkProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={cn('size-6 shrink-0 text-brand', className)}
    >
      <path
        d="M16.25 4.64 A 8.5 8.5 0 1 1 7.75 4.64"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
      <path
        d="M4.76 4.38 L 7.75 4.64 L 6.48 7.36"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="2.6" fill="currentColor" />
    </svg>
  )
}
