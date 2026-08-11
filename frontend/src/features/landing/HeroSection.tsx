/**
 * The hero: a camera move the reader drives with the scroll wheel.
 *
 * The section is two-and-a-bit viewports tall and its contents are `sticky`, so
 * for the length of that scroll the picture stays put and only the frame index
 * advances — the page appears to hold still while the camera walks in from the
 * valley to the screen. Scrolling back walks it out again. Nothing plays on its
 * own; the reader is the transport.
 *
 * THE WASH IS DARK AND THE COPY IS LIGHT. It was the other way round while the
 * landing was a white page, and both had to turn over together: the page below
 * is now the application's own near-black, so a white gradient at the top of
 * the hero would have been a bright band sitting between a bright photograph
 * and a dark page, visible as a seam from three sections away. Dark over the
 * dawn sky also lets the photograph keep its own light — the wash is a scrim,
 * not a coat of paint.
 *
 * The copy is gone by 45% of the scroll, before the frame's upper third fills
 * with ridge line, and the last half of the move is the picture alone.
 */

import { motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '../../lib/format'
import { useLocale } from '../../lib/i18n'
import { useReducedMotion } from '../settings/preferences'
import { EntryAction } from './LandingScaffold'
import { HeroCanvas } from './HeroCanvas'
import { useHeroFrames } from './useHeroFrames'
import { Container } from './primitives'
import { focusIn } from './motion'
import { Stagger, Rise } from './Section'

/** Countable in the repository, each one of them. */
const FIGURES = [
  { value: '7', labelKey: 'l.hero.figure.stages' },
  { value: '12', labelKey: 'l.hero.figure.analyzers' },
  { value: '22', labelKey: 'l.hero.figure.rules' },
] as const

/** Copy is fully gone by this much of the scroll. */
const COPY_OUT = 0.45

export function HeroSection() {
  const { t } = useLocale()
  const reduced = useReducedMotion()
  const frames = useHeroFrames(!reduced)

  const sectionRef = useRef<HTMLElement | null>(null)
  const copyRef = useRef<HTMLDivElement | null>(null)
  const hintRef = useRef<HTMLDivElement | null>(null)
  const progressRef = useRef(0)
  const [showLoader, setShowLoader] = useState(!reduced)

  useEffect(() => {
    if (!frames.ready) return
    const id = window.setTimeout(() => setShowLoader(false), 260)
    return () => window.clearTimeout(id)
  }, [frames.ready])

  useEffect(() => {
    if (reduced) {
      progressRef.current = 0
      return
    }
    const section = sectionRef.current
    if (!section) return

    let raf = 0
    const apply = () => {
      raf = 0
      const rect = section.getBoundingClientRect()
      const travel = rect.height - window.innerHeight
      const p = travel <= 0 ? 0 : Math.min(1, Math.max(0, -rect.top / travel))
      progressRef.current = p

      // Straight to style, not through state: this runs on every scroll event
      // and a re-render per frame would cost more than the paint.
      if (copyRef.current) {
        const out = Math.min(1, p / COPY_OUT)
        copyRef.current.style.opacity = String(1 - out)
        copyRef.current.style.transform = `translateY(${(-28 * out).toFixed(1)}px)`
        copyRef.current.style.pointerEvents = out > 0.6 ? 'none' : ''
      }
      if (hintRef.current) {
        hintRef.current.style.opacity = String(Math.max(0, 1 - p / 0.12))
      }
    }

    const onScroll = () => {
      if (raf) return
      raf = requestAnimationFrame(apply)
    }

    apply()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [reduced])

  return (
    <>
      <section
        ref={sectionRef}
        aria-label={t('l.hero.title')}
        className={reduced ? 'relative' : 'relative h-[220vh] md:h-[260vh]'}
      >
        <div className="sticky top-0 h-svh w-full overflow-hidden bg-void">
          {/* THE PICTURE RESOLVES; THE WORDS DO NOT WAIT FOR IT. The photograph
              arrives out of blur and darkness over 900ms while the headline is
              already legible underneath — so the first thing a reader can do is
              read, and the image is what catches up. Copying the reference's
              order here matters more than copying its duration. */}
          <motion.div
            className="absolute inset-0"
            initial="hidden"
            animate={frames.ready ? 'shown' : 'hidden'}
            variants={focusIn}
          >
            <HeroCanvas
              frames={frames}
              progressRef={progressRef}
              reduced={reduced}
              label={t('l.hero.scene-alt')}
            />
          </motion.div>

          {/* BEHIND THE SCRIM AND THE COPY, not on top of them.
              It was rendered last, so for the second or so before the frames
              decoded it covered the headline: the picture arrived first at full
              brightness and the words followed it. That is the reverse of the
              intended order — the reference keeps its copy legible from the
              first paint and lets the photograph resolve underneath. Same two
              layers, correct sequence.

              `hero-start.jpg` is the sequence's own first frame, so the hand-off
              when the canvas takes over is invisible. */}
          <div
            className={cn(
              'pointer-events-none absolute inset-0 transition-opacity duration-500',
              showLoader ? 'opacity-100' : 'opacity-0',
            )}
            aria-hidden="true"
          >
            <img src="/media/hero-start.jpg" alt="" className="size-full object-cover" fetchPriority="high" />
          </div>

          {/* Scrim above for the copy, scrim below so the photograph hands off
              to the page's own ground instead of ending on a hard edge. */}
          {/* The scrim has to be strongest where the copy actually is, and the
              copy is not at the very top — the headline starts a fifth of the
              way down. A gradient that begins fading immediately left the
              supporting sentence sitting at 40% coverage over a sunlit ridge,
              which measured fine as a colour pair and was unreadable as a
              sentence. It holds near-full opacity through the copy block and
              only then releases, so the photograph keeps its light below. */}
          <div
            aria-hidden="true"
            className={cn(
              'pointer-events-none absolute inset-x-0 top-0',
              'h-[80%] bg-gradient-to-b from-void/95 via-void/78 to-transparent',
              'sm:h-[68%] sm:via-void/72',
            )}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-base to-transparent"
          />

          <div className="absolute inset-x-0 top-0 flex justify-center px-6 pt-28 sm:pt-32">
            <div ref={copyRef} className="w-full max-w-[46rem] text-center">
              <p className="label text-fg-subtle">{t('l.hero.eyebrow')}</p>
              <h1
                className={cn(
                  'mt-4 text-[2.5rem] leading-[1.08] tracking-[-0.02em] text-fg',
                  'sm:text-[3.4rem]',
                )}
                style={{ fontWeight: 480 }}
              >
                {t('l.hero.title')}
              </h1>
              {/* `text-fg-muted` is the right grey on a flat panel and the
                  wrong one over a photograph — it is chosen for contrast
                  against a known ground, and here the ground is a sunrise. */}
              <p className="mx-auto mt-4 max-w-[34rem] text-lead text-fg/85">
                {t('l.hero.lead')}
              </p>
              <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
                <EntryAction />
                <a
                  href="#loop"
                  className={cn(
                    'inline-flex h-10 items-center justify-center rounded-full px-5',
                    'border border-white/25 bg-white/5 text-[0.9375rem] text-fg backdrop-blur-sm',
                    'transition-colors duration-150 hover:bg-white/12',
                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg',
                  )}
                >
                  {t('l.hero.secondary')}
                </a>
              </div>
              <p className="mt-4 text-sm text-fg/70">
                {t('l.hero.note')}{' '}
                <Link to="/register" className="rounded-control text-fg underline underline-offset-4">
                  {t('a.request-account')}
                </Link>
              </p>
            </div>
          </div>

          {!reduced ? (
            <div
              ref={hintRef}
              aria-hidden="true"
              className="absolute inset-x-0 bottom-10 flex justify-center"
            >
              <span className="text-xs uppercase tracking-[0.14em] text-fg-faint">
                {t('l.hero.scroll-hint')}
              </span>
            </div>
          ) : null}

          {!frames.ready ? (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 bg-white/15" aria-hidden="true">
              <div
                className="h-full bg-brand/80 transition-[width] duration-200"
                style={{ width: `${Math.round(frames.progress * 100)}%` }}
              />
            </div>
          ) : null}
        </div>
      </section>

      {/* The counted figures, on the page's own ground rather than pinned
          inside the sticky frame for two viewports of scrolling. */}
      <div className="bg-base pt-16 sm:pt-20">
        <Container>
          <Stagger as="dl" className="grid grid-cols-1 gap-px overflow-hidden rounded-panel border border-hair bg-hair sm:grid-cols-3">
            {FIGURES.map((figure) => (
              <Rise key={figure.value} className="bg-elevated px-6 py-7">
                <dt className="text-[2.25rem] leading-none tracking-[-0.02em] text-fg" style={{ fontWeight: 480 }}>
                  {figure.value}
                </dt>
                <dd className="mt-3 text-sm leading-relaxed text-fg-muted">{t(figure.labelKey)}</dd>
              </Rise>
            ))}
          </Stagger>
        </Container>
      </div>
    </>
  )
}
