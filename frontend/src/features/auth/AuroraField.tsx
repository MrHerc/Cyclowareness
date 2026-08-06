/**
 * The slow gradient field behind the sign-in aside.
 *
 * Two brand-hued blooms drifting on 34s and 47s — coprime on purpose, so the
 * pair never visibly returns to a starting pose. What a reader registers is
 * that the surface is alive, not that something is looping.
 *
 * IT CARRIES NO INFORMATION, and that is the same rule the pointer light
 * follows. Everything else on a public page in this product is measured or
 * stated; this is light. A decorative field that hinted at data — a "threat
 * level" glow, a count-driven intensity — would be exactly the fabrication the
 * rest of the product refuses.
 *
 * Cheap by construction: two elements, `transform` and nothing else, so the
 * compositor moves them without a repaint. This runs behind a form somebody is
 * typing a password into, and a repaint-heavy background on a mid-range laptop
 * is a dropped keystroke.
 *
 * Colour comes from `--color-brand` via `color-mix`, never a literal — which
 * is what lets the same component work on the light sign-in surface, where
 * `--color-brand` resolves to the darkened accent, and on the dark console
 * where it does not. The mix percentages were lowered for the light ground:
 * a glow tuned for near-black is invisible on white. Under
 * `prefers-reduced-motion` the global rule in `tokens.css` stops the animation
 * and the blooms simply sit still — the composition still reads.
 */

import { cn } from '../../lib/format'

export interface AuroraFieldProps {
  className?: string
}

export function AuroraField({ className }: AuroraFieldProps) {
  return (
    <div
      aria-hidden="true"
      className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}
    >
      <div
        className="aurora-a absolute -left-1/4 top-[-15%] size-[70%] rounded-full blur-3xl"
        style={{
          background:
            'radial-gradient(circle at 50% 50%,' +
            ' color-mix(in oklab, var(--color-brand) 13%, transparent), transparent 70%)',
        }}
      />
      <div
        className="aurora-b absolute -right-1/5 bottom-[-20%] size-[80%] rounded-full blur-3xl"
        style={{
          background:
            'radial-gradient(circle at 50% 50%,' +
            ' color-mix(in oklab, var(--color-safe) 11%, transparent), transparent 72%)',
        }}
      />
    </div>
  )
}
