import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, X } from 'lucide-react'
import { Button, cx } from './ui'

export interface TourStep {
  /** CSS selector of the element to spotlight. Omit for a centered intro/outro. */
  target?: string
  title: string
  body: string
}

const SEEN_KEY = 'cyclo_tour_seen'

export function hasSeenTour(): boolean {
  return localStorage.getItem(SEEN_KEY) === '1'
}

interface Rect {
  top: number
  left: number
  width: number
  height: number
}

function readRect(selector?: string): Rect | null {
  if (!selector) return null
  const el = document.querySelector(selector)
  if (!el) return null
  const r = el.getBoundingClientRect()
  return { top: r.top, left: r.left, width: r.width, height: r.height }
}

export function Tour({ steps, onClose }: { steps: TourStep[]; onClose: () => void }) {
  const [index, setIndex] = useState(0)
  const [rect, setRect] = useState<Rect | null>(null)
  const step = steps[index]
  const cardRef = useRef<HTMLDivElement>(null)

  const finish = () => {
    localStorage.setItem(SEEN_KEY, '1')
    onClose()
  }

  // Track the spotlight target. We scroll it into view exactly ONCE per step,
  // then re-measure on scroll/resize WITHOUT re-scrolling — otherwise a smooth
  // scroll's own scroll events would re-arm the animation into a feedback loop.
  // setRect is guarded by geometry equality so identical measurements don't
  // force re-renders.
  useLayoutEffect(() => {
    const measure = () => {
      const next = readRect(step.target)
      setRect((prev) => {
        if (
          prev && next &&
          prev.top === next.top && prev.left === next.left &&
          prev.width === next.width && prev.height === next.height
        ) {
          return prev
        }
        return next
      })
    }
    const el = step.target ? document.querySelector(step.target) : null
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    // Measure after the smooth scroll has had time to settle.
    const raf = requestAnimationFrame(measure)
    const t1 = setTimeout(measure, 320)
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(t1)
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [step.target])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish()
      else if (e.key === 'ArrowRight') setIndex((i) => Math.min(steps.length - 1, i + 1))
      else if (e.key === 'ArrowLeft') setIndex((i) => Math.max(0, i - 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [steps.length])

  const pad = 8
  const spotlight = rect
    ? {
        top: rect.top - pad,
        left: rect.left - pad,
        width: rect.width + pad * 2,
        height: rect.height + pad * 2,
      }
    : null

  // Card placement: below the target if room, else above, else centered.
  const cardStyle: React.CSSProperties = (() => {
    if (!spotlight) return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
    const below = spotlight.top + spotlight.height + 14
    const roomBelow = window.innerHeight - below > 220
    // Clamp so the 352px card (or narrower on small screens) always stays fully
    // on-screen with a 16px inset — the floor is applied last so it can't go
    // negative on narrow viewports.
    const cardW = Math.min(352, window.innerWidth - 32)
    const maxLeft = Math.max(16, window.innerWidth - cardW - 16)
    const left = Math.min(Math.max(16, spotlight.left), maxLeft)
    if (roomBelow) return { top: below, left }
    return { top: Math.max(16, spotlight.top - 232), left }
  })()

  const isLast = index === steps.length - 1

  return (
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-label="Guided tour">
      {/* Dim everything except the spotlight (box-shadow cut-out). */}
      {spotlight ? (
        <div
          className="pointer-events-none absolute rounded-xl transition-all duration-300 ease-out"
          style={{
            top: spotlight.top,
            left: spotlight.left,
            width: spotlight.width,
            height: spotlight.height,
            boxShadow: '0 0 0 9999px rgba(3, 7, 15, 0.82)',
            border: '1.5px solid rgba(45, 212, 191, 0.7)',
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-[rgba(3,7,15,0.82)]" />
      )}

      {/* Click-catcher to advance / dismiss on backdrop. */}
      <div className="absolute inset-0" onClick={() => setIndex((i) => Math.min(steps.length - 1, i + 1))} />

      <div
        ref={cardRef}
        style={cardStyle}
        onClick={(e) => e.stopPropagation()}
        className="absolute w-[352px] max-w-[calc(100vw-32px)] rounded-2xl border border-accent/30 bg-surface p-5 shadow-2xl fade-in"
      >
        <button
          onClick={finish}
          aria-label="Close tour"
          className="absolute right-3 top-3 text-muted hover:text-ink"
        >
          <X size={16} />
        </button>
        <div className="mb-1 flex items-center gap-1.5">
          {steps.map((_, i) => (
            <span
              key={i}
              className={cx('h-1.5 rounded-full transition-all', i === index ? 'w-5 bg-accent' : 'w-1.5 bg-surface-3')}
            />
          ))}
        </div>
        <div className="mt-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-faint">
          Step {index + 1} of {steps.length}
        </div>
        <h3 className="mt-1 text-base font-semibold">{step.title}</h3>
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{step.body}</p>
        <div className="mt-4 flex items-center justify-between">
          <button
            onClick={finish}
            className="text-xs text-faint transition-colors hover:text-muted"
          >
            Skip tour
          </button>
          <div className="flex gap-2">
            {index > 0 && (
              <Button variant="ghost" onClick={() => setIndex((i) => i - 1)}>
                <ArrowLeft size={14} /> Back
              </Button>
            )}
            {isLast ? (
              <Button onClick={finish}>Got it</Button>
            ) : (
              <Button onClick={() => setIndex((i) => i + 1)}>
                Next <ArrowRight size={14} />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
