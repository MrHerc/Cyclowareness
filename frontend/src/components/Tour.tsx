import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, X } from 'lucide-react'
import { Button, IconButton, cx } from './ui'

export interface TourStep {
  /** CSS selector of the element to spotlight. Omit for a centered intro/outro. */
  target?: string
  title: string
  body: string
}

const SEEN_KEY = 'cyclo_tour_seen'

export function hasSeenTour(storageKey: string = SEEN_KEY): boolean {
  return localStorage.getItem(storageKey) === '1'
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

export function Tour({
  steps,
  onClose,
  storageKey = SEEN_KEY,
}: {
  steps: TourStep[]
  onClose: () => void
  storageKey?: string
}) {
  const [index, setIndex] = useState(0)
  const [rect, setRect] = useState<Rect | null>(null)
  const step = steps[index]
  const cardRef = useRef<HTMLDivElement>(null)

  const finish = () => {
    localStorage.setItem(storageKey, '1')
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
          className="pointer-events-none absolute rounded-panel border-[1.5px] border-brand transition-all duration-300 ease-out"
          style={{
            top: spotlight.top,
            left: spotlight.left,
            width: spotlight.width,
            height: spotlight.height,
            boxShadow: '0 0 0 9999px rgb(0 0 0 / 0.78)',
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-black/78" />
      )}

      {/* Backdrop click advances, and finishes on the last step — otherwise the
          final click is a no-op and the tour reads as stuck. */}
      <div
        className="absolute inset-0"
        onClick={() => (isLast ? finish() : setIndex((i) => i + 1))}
      />

      <div
        ref={cardRef}
        style={cardStyle}
        onClick={(e) => e.stopPropagation()}
        className="rise absolute w-[352px] max-w-[calc(100vw-32px)] rounded-panel border border-line bg-panel p-5 shadow-2xl shadow-black/50"
      >
        <IconButton label="Close tour" onClick={finish} className="absolute right-2 top-2">
          <X size={16} aria-hidden />
        </IconButton>
        <div className="flex items-center gap-1.5" aria-hidden>
          {steps.map((_, i) => (
            <span
              key={i}
              className={cx('h-1 rounded-full transition-all', i === index ? 'w-5 bg-brand' : 'w-1 bg-line-strong')}
            />
          ))}
        </div>
        <div className="label mt-3 text-c3">
          Step {index + 1} of {steps.length}
        </div>
        <h3 className="text-h mt-1.5">{step.title}</h3>
        <p className="text-sm mt-2 leading-relaxed text-c2">{step.body}</p>
        <div className="mt-4 flex items-center justify-between gap-3">
          <button onClick={finish} className="text-xs text-c3 transition-colors hover:text-c1">
            Skip
          </button>
          <div className="flex gap-2">
            {index > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setIndex((i) => i - 1)}>
                <ArrowLeft size={14} aria-hidden /> Back
              </Button>
            )}
            {isLast ? (
              <Button variant="primary" size="sm" onClick={finish}>
                Done
              </Button>
            ) : (
              <Button variant="primary" size="sm" onClick={() => setIndex((i) => i + 1)}>
                Next <ArrowRight size={14} aria-hidden />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
