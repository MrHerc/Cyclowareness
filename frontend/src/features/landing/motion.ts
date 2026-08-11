/**
 * One rhythm for every animation on the landing.
 *
 * Durations and easings live here rather than in each component because a page
 * whose sections each pick their own timing reads as several pages stitched
 * together. These are the reference site's measured values: entrances at 670ms,
 * content swaps at 500ms out and 300ms in, micro-interactions at 200ms.
 *
 * TWO RULES THE NUMBERS ENCODE:
 *
 *   * **Exit is faster than entry.** Something leaving should get out of the
 *     way; something arriving deserves to be watched. The swap pair is 500/300
 *     in the reference, and the ratio — not the exact figures — is the part
 *     worth copying.
 *   * **Enter with ease-out, leave with ease-in.** An element that decelerates
 *     into place feels placed; one that accelerates away feels dismissed.
 *
 * Reduced motion is NOT handled here. It is handled once, at the top of the
 * page, by wrapping the tree in `<MotionConfig reducedMotion="user">` — Framer
 * then drops transform and layout animation everywhere and keeps opacity, so no
 * component has to remember to ask.
 */

import type { Transition, Variants } from 'framer-motion'

export const DURATION = {
  /** Micro-interaction: hover, press, colour. */
  fast: 0.2,
  /** Content arriving. */
  enter: 0.67,
  /** Content leaving — roughly two-thirds of `enter`. */
  exit: 0.45,
} as const

/** Decelerating. Everything that arrives uses this. */
export const EASE_OUT = [0.22, 1, 0.36, 1] as const
/** Accelerating. Everything that leaves uses this. */
export const EASE_IN = [0.55, 0, 1, 0.45] as const

/**
 * The press response. A spring rather than a curve because a button is a
 * physical metaphor, and 0.97 rather than 0.9 because this is a security
 * console's front door, not a game.
 */
export const PRESS: Transition = { type: 'spring', stiffness: 520, damping: 32, mass: 0.6 }

/** A section's contents, arriving one after another. */
export const stagger = (delay = 0, each = 0.04): Variants => ({
  hidden: {},
  shown: { transition: { delayChildren: delay, staggerChildren: each } },
})

/**
 * The single entrance used across the page: up sixteen pixels and in.
 *
 * 16px, not 40: a long rise draws the eye to the movement rather than to what
 * moved, and on a page of measured claims the movement is not the message.
 */
export const riseIn: Variants = {
  hidden: { opacity: 0, y: 16 },
  shown: { opacity: 1, y: 0, transition: { duration: DURATION.enter, ease: EASE_OUT } },
}

/**
 * The hero photograph resolving.
 *
 * The reference brings its hero in from blur and darkness over about 800ms
 * while the headline is already legible — the copy never waits on the picture.
 * Blur is expensive to animate, so it runs once, on one element, at load.
 */
export const focusIn: Variants = {
  hidden: { opacity: 0, filter: 'blur(18px) brightness(0.55)', scale: 1.04 },
  shown: {
    opacity: 1,
    filter: 'blur(0px) brightness(1)',
    scale: 1,
    transition: { duration: 0.9, ease: EASE_OUT },
  },
}
