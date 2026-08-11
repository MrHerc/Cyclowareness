/**
 * The landing's entrance primitives, on Framer Motion.
 *
 * These replaced a hand-rolled `IntersectionObserver` that toggled a
 * `data-reveal` attribute. The observer worked, but every list on the page then
 * had to stagger itself by passing a hand-computed `delay` to each child — and
 * a hand-computed delay is a number that drifts the moment somebody inserts a
 * row. `Stagger`/`Rise` express the same thing as a parent-child relationship,
 * so the rhythm survives editing.
 *
 * `whileInView` with `once` is deliberate: a section that re-animates every
 * time it re-enters the viewport turns scrolling back up into a flicker.
 *
 * Reduced motion is not checked here. `MotionConfig reducedMotion="user"` sits
 * at the top of the page and drops transforms globally, which is one decision
 * in one place instead of a condition in every component.
 */

import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { cn } from '../../lib/format'
import { riseIn, stagger } from './motion'

/** How much of the element must be on screen before it starts. */
const VIEWPORT = { once: true, amount: 0.15 } as const

/** One element rising into place. */
export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode
  className?: string
  /** Legacy escape hatch, in milliseconds. Prefer wrapping in `Stagger`. */
  delay?: number
}) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="shown"
      viewport={VIEWPORT}
      variants={
        delay
          ? {
              hidden: riseIn.hidden,
              shown: {
                ...(riseIn.shown as object),
                transition: { ...(riseIn.shown as { transition: object }).transition, delay: delay / 1000 },
              },
            }
          : riseIn
      }
    >
      {children}
    </motion.div>
  )
}

/**
 * A group whose children arrive in sequence.
 *
 * 40ms apart: below about 30 the sequence reads as one block, above about 60 the
 * last item feels late.
 */
export function Stagger({
  children,
  className,
  as: As = 'div',
  each = 0.04,
  delay = 0,
}: {
  children: ReactNode
  className?: string
  as?: 'div' | 'ul' | 'ol' | 'dl'
  each?: number
  delay?: number
}) {
  const Component = motion[As]
  return (
    <Component
      className={className}
      initial="hidden"
      whileInView="shown"
      viewport={VIEWPORT}
      variants={stagger(delay, each)}
    >
      {children}
    </Component>
  )
}

/** A child of `Stagger`. Carries no timing of its own — the parent owns it. */
export function Rise({
  children,
  className,
  as: As = 'div',
}: {
  children: ReactNode
  className?: string
  as?: 'div' | 'li' | 'dd'
}) {
  const Component = motion[As]
  return (
    <Component className={className} variants={riseIn}>
      {children}
    </Component>
  )
}

export interface SectionProps {
  title: string
  eyebrow?: string
  intro?: ReactNode
  id?: string
  className?: string
  children: ReactNode
}

/** Kept for any section still composing the older way. */
export function Section({ title, eyebrow, intro, id, className, children }: SectionProps) {
  return (
    <section id={id} className={cn('mx-auto w-full max-w-[68rem] px-6 py-20 sm:py-24', className)}>
      <Reveal>
        <div className="max-w-[42rem]">
          {eyebrow ? <p className="label text-fg-faint">{eyebrow}</p> : null}
          <h2 className="mt-2 text-display text-fg">{title}</h2>
          {intro ? <p className="mt-4 text-lead text-fg-muted">{intro}</p> : null}
        </div>
      </Reveal>
      <div className="mt-10">{children}</div>
    </section>
  )
}
