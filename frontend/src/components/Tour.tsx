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

  // Track the spotlight target (scroll it into view, follow resize/scroll).
  useLayoutEffect(() => {
    const update = () => {
      const el = step.target ? document.querySelector(step.target) : null
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      // Let the smooth-scroll settle before measuring.
      requestAnimationFrame(() => setRect(readRect(step.target)))
      setTimeout(() => setRect(readRect(step.target)), 260)
    }
    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
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
    const left = Math.min(Math.max(16, spotlight.left), window.innerWidth - 380)
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
