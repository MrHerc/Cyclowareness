/**
 * The soft gradient wash behind the sign-in.
 *
 * FOUR PASTELS, NOT THE BRAND. The first version mixed `--color-brand` and
 * `--color-safe`, which put a lime-green glow on the door — legible, on-brand,
 * and nothing like the reference. The look being matched is built from
 * lavender, sky, peach and mint at very low opacity: several hues bleeding into
 * each other so the white reads as lit rather than tinted. One saturated hue,
 * however soft, reads as a product colour instead.
 *
 * IT CARRIES NO INFORMATION, and that is the same rule the pointer light
 * follows. Everything else on a public page in this product is measured or
 * stated; this is light. A decorative field that hinted at data — a "threat
 * level" glow, a count-driven intensity — would be exactly the fabrication the
 * rest of the product refuses.
 *
 * Cheap by construction: four elements, `transform` and nothing else, so the
 * compositor moves them without a repaint. This runs behind a form somebody is
 * typing a password into, and a repaint-heavy background on a mid-range laptop
 * is a dropped keystroke. The two animated blooms drift on 34s and 47s —
 * coprime on purpose, so the pair never visibly returns to a starting pose.
 * Under `prefers-reduced-motion` the global rule in `tokens.css` stops them and
 * the composition still reads.
 *
 * The literals are the one deliberate exception to "no colour outside
 * tokens.css": they are not product colours and nothing else may use them, so
 * promoting them to tokens would invite exactly that.
 */

import { cn } from '../../lib/format'

export interface AuroraFieldProps {
  className?: string
}

/** Low opacity because these overlap: four at 0.5 stack into mud. */
const BLOOMS = [
  { c: '#b9a8f0', cls: 'aurora-a -left-[15%] -top-[25%] size-[65%]' },
  { c: '#a5c8f2', cls: 'aurora-b -right-[10%] -top-[10%] size-[55%]' },
  { c: '#f3c9a9', cls: 'right-[5%] bottom-[-20%] size-[60%]' },
  { c: '#a9e4cf', cls: 'left-[10%] bottom-[-25%] size-[50%]' },
]

export function AuroraField({ className }: AuroraFieldProps) {
  return (
    <div
      aria-hidden="true"
      className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}
    >
      {BLOOMS.map((bloom) => (
        <div
          key={bloom.c}
          className={cn('absolute rounded-full blur-3xl', bloom.cls)}
          style={{
            background: `radial-gradient(circle at 50% 50%, ${bloom.c}59, transparent 70%)`,
          }}
        />
      ))}
    </div>
  )
}
