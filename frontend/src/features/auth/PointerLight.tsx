/**
 * A soft light that follows the pointer across the public pages.
 *
 * The sign-in screen is the first thing anyone sees, and it had one fixed glow
 * baked into the page background. This is the same light, moved to wherever the
 * reader is looking — which is the whole trick: the surface feels responsive
 * without anything on it moving, so no text reflows, nothing shifts under the
 * cursor, and the form is exactly where it was a moment ago.
 *
 * IT CARRIES NO INFORMATION, AND THAT IS DELIBERATE. Everything else on a
 * public page in this product is measured or stated; this is light. It has no
 * numbers, no state, and nothing about the deployment behind it. A decorative
 * element that hints at data would be the same lie as a seeded chart.
 *
 * Three things it will not do.
 *
 * It does not animate on `prefers-reduced-motion`. The light snaps to a fixed
 * position and stops listening, rather than following slowly — a damped chase is
 * still motion, and the setting is a request, not a preference for less.
 *
 * It does not run on touch. There is no pointer to follow, `pointermove` from a
 * tap would jump the light across the screen, and a phone is where the battery
 * cost of a rAF loop actually lands.
 *
 * It never sits between the reader and the form: `pointer-events-none`, behind
 * everything, and it only ever changes two custom properties.
 */

import { useEffect, useRef } from 'react'

/** Where the light rests before the pointer has moved, and under reduced motion. */
const REST = { x: 18, y: 12 }

/** How much of the remaining distance the light closes each frame.
 *
 *  Low enough to lag the cursor visibly — the lag is what reads as weight. At
 *  1.0 the light is welded to the pointer and looks like a cursor artefact. */
const EASING = 0.045

export function PointerLight() {
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const coarse = window.matchMedia('(pointer: coarse)').matches
    if (reduced || coarse) {
      node.style.setProperty('--light-x', `${REST.x}%`)
      node.style.setProperty('--light-y', `${REST.y}%`)
      return
    }

    let targetX = REST.x
    let targetY = REST.y
    let x = REST.x
    let y = REST.y
    let frame = 0

    const onMove = (event: PointerEvent) => {
      targetX = (event.clientX / window.innerWidth) * 100
      targetY = (event.clientY / window.innerHeight) * 100
    }

    const tick = () => {
      x += (targetX - x) * EASING
      y += (targetY - y) * EASING
      node.style.setProperty('--light-x', `${x.toFixed(2)}%`)
      node.style.setProperty('--light-y', `${y.toFixed(2)}%`)
      frame = window.requestAnimationFrame(tick)
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    frame = window.requestAnimationFrame(tick)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      style={{ ['--light-x' as string]: `${REST.x}%`, ['--light-y' as string]: `${REST.y}%` }}
    >
      {/* The near light: small, brighter, tracks closely. */}
      <div
        className="absolute inset-0 transition-opacity duration-700"
        style={{
          background:
            'radial-gradient(560px 560px at var(--light-x) var(--light-y),' +
            ' color-mix(in oklab, var(--color-brand) 8%, transparent), transparent 68%)',
        }}
      />
      {/* The far light: wide and faint, so the page still has a horizon when the
          pointer is in a corner. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(1100px 900px at calc(var(--light-x) * 0.6 + 8%)' +
            ' calc(var(--light-y) * 0.6 + 4%),' +
            ' color-mix(in oklab, var(--color-brand) 4%, transparent), transparent 62%)',
        }}
      />
    </div>
  )
}
