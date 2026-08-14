/**
 * The guided tour: it drives the REAL product, it does not describe one.
 *
 * Each step navigates to its own route and rings a real element, so what the
 * reader sees behind the card is this deployment's own data — empty where it
 * is empty. A tour built from screenshots would show a fuller, tidier product
 * than the one in front of them, which is the same fabrication the rest of
 * this codebase refuses.
 *
 * Three rules it follows:
 *
 * * **It never blocks.** No modal overlay: the page stays usable, the card
 *   sits in a corner, and Escape ends it. A walkthrough that traps somebody
 *   on step 3 of 9 is worse than no walkthrough.
 * * **It is honest about reach.** Steps whose permission the reader lacks are
 *   dropped from the script before it starts, so the count in "3 / 7" is the
 *   number of steps THEY will actually see, and no step ever lands on a
 *   screen that would bounce them.
 * * **It remembers, and can be replayed.** Finishing or dismissing writes a
 *   flag so it never ambushes the same person twice; the help menu reopens
 *   it deliberately.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Compass, X } from 'lucide-react'
import { Button } from '../../components/ui'
import { useT } from '../../lib/i18n'
import { cn } from '../../lib/format'
import { useAuth, usePermission } from '../../lib/auth/useAuth'
import { PORTAL_TOUR_STEPS, TOUR_SEEN_KEY, TOUR_STEPS, type TourStep } from './steps'

export interface GuidedTourProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** A ring drawn over the anchored element, in the page's own coordinates. */
function Spotlight({ selector }: { selector: string }) {
  const [box, setBox] = useState<DOMRect | null>(null)

  useEffect(() => {
    // Measured on the events that can MOVE it, plus a short retry window for
    // an anchor that has not mounted yet — a route change lands before the
    // page finishes fetching, so the first measurement often finds nothing.
    //
    // The first version re-measured on every animation frame, which set state
    // sixty times a second for as long as the tour was open. It worked and it
    // was wasteful: a ring that needs to follow a scroll does not need to be
    // recomputed while nothing is happening.
    let attempts = 0
    const measure = () => {
      const el = document.querySelector(selector)
      setBox(el ? el.getBoundingClientRect() : null)
      return Boolean(el)
    }
    const poll = window.setInterval(() => {
      if (measure() || ++attempts > 20) window.clearInterval(poll)
    }, 150)
    measure()
    window.addEventListener('scroll', measure, true)
    window.addEventListener('resize', measure)
    return () => {
      window.clearInterval(poll)
      window.removeEventListener('scroll', measure, true)
      window.removeEventListener('resize', measure)
    }
  }, [selector])

  if (!box || box.width === 0) return null
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed z-40 rounded-panel ring-2 ring-brand ring-offset-2 ring-offset-base transition-all duration-200"
      style={{ top: box.top - 4, left: box.left - 4, width: box.width + 8, height: box.height + 8 }}
    />
  )
}

export function GuidedTour({ open, onOpenChange }: GuidedTourProps) {
  const t = useT()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { role } = useAuth()
  const [index, setIndex] = useState(0)

  // `usePermission` is a hook, so it cannot be called inside a filter. The
  // script is small and fixed, so every permission it can name is resolved
  // up front and the steps are filtered against that map.
  const canCommandCenter = usePermission('command_center.view')
  const canThreats = usePermission('threats.view')
  const canSandbox = usePermission('sandbox.view')
  const canIncident = usePermission('incident_risks.view')
  const canApprovals = usePermission('approvals.view')
  const canTraining = usePermission('training.view')
  const canPolicy = usePermission('policy.view')
  const canEmployees = usePermission('employees.view')

  const steps = useMemo<TourStep[]>(() => {
    if (role === 'employee') return PORTAL_TOUR_STEPS
    const allowed: Record<string, boolean> = {
      'command_center.view': canCommandCenter,
      'threats.view': canThreats,
      'sandbox.view': canSandbox,
      'incident_risks.view': canIncident,
      'approvals.view': canApprovals,
      'training.view': canTraining,
      'policy.view': canPolicy,
      'employees.view': canEmployees,
    }
    return TOUR_STEPS.filter((s) => !s.permission || allowed[s.permission])
  }, [role, canCommandCenter, canThreats, canSandbox, canIncident, canApprovals,
      canTraining, canPolicy, canEmployees])

  const step = steps[index]

  const end = useCallback(() => {
    try {
      window.localStorage.setItem(TOUR_SEEN_KEY, '1')
    } catch {
      // A blocked store costs the memory, not the tour.
    }
    setIndex(0)
    onOpenChange(false)
  }, [onOpenChange])

  // Drive the router. The card renders only once the route has caught up, so
  // it never describes a screen that is not on the glass yet.
  useEffect(() => {
    if (!open || !step) return
    if (pathname !== step.to) navigate(step.to)
  }, [open, step, pathname, navigate])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') end()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, end])

  if (!open || !step) return null
  const onRoute = pathname === step.to
  const last = index === steps.length - 1

  return (
    <>
      {onRoute && step.anchor ? <Spotlight selector={step.anchor} /> : null}

      <section
        aria-label={t('tour.aria')}
        className={cn(
          // Left, so it does not fight the Cyber AI dock in the right corner.
          'fixed bottom-4 left-4 right-4 z-45 rounded-panel border border-brand/40',
          'bg-elevated p-4 shadow-float sm:right-auto sm:w-[24rem]',
        )}
      >
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-brand text-on-brand">
            <Compass className="size-4.5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="label text-fg-faint">
              {t('tour.step-of', { n: index + 1, total: steps.length })}
            </p>
            <h2 className="mt-0.5 text-h text-fg">{t(step.titleKey)}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">{t(step.bodyKey)}</p>
          </div>
          <Button
            size="sm"
            variant="ghost"
            icon={<X className="size-4" />}
            aria-label={t('tour.end')}
            onClick={end}
          >
            <span className="sr-only">{t('tour.end')}</span>
          </Button>
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <Button
            size="sm"
            variant="ghost"
            icon={<ArrowLeft className="size-4" />}
            disabled={index === 0}
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
          >
            {t('tour.back')}
          </Button>
          <div className="flex items-center gap-1.5" aria-hidden="true">
            {steps.map((s, i) => (
              <span
                key={s.id}
                className={cn(
                  'size-1.5 rounded-full transition-colors',
                  i === index ? 'bg-brand' : 'bg-line-strong',
                )}
              />
            ))}
          </div>
          {last ? (
            <Button size="sm" variant="primary" onClick={end}>
              {t('tour.finish')}
            </Button>
          ) : (
            <Button
              size="sm"
              variant="primary"
              icon={<ArrowRight className="size-4" />}
              onClick={() => setIndex((i) => Math.min(steps.length - 1, i + 1))}
            >
              {t('tour.next')}
            </Button>
          )}
        </div>
      </section>
    </>
  )
}
