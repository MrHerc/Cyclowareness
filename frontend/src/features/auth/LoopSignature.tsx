/**
 * The signature figure on the sign-in screen: one artifact travelling the loop.
 *
 * WHY NOT `ClosedLoopFlow`
 * That component draws the loop a deployment is *actually* running — its nodes
 * carry counts and its edges animate only where work is genuinely in flight.
 * Feeding it invented numbers to decorate a public page would put fabricated
 * figures on the first screen anyone sees, which is the one thing this product
 * cannot afford. This figure carries no quantities at all. It states what the
 * system does, in order, and nothing about what it has measured.
 *
 * WHY A RING RATHER THAN A PIPELINE
 * A pipeline has an end. The entire claim of the product is that measurement
 * re-enters intake, so the closing edge cannot be a footnote — it is the same
 * arc as every other edge, and the travelling highlight crosses it in front of
 * you before the next cycle starts.
 *
 * The names of the stages live in the narrative strip below rather than beside
 * the nodes. Text inside an SVG scales with the viewBox, so ring labels are
 * legible on a projector and 8px wide on a laptop; HTML underneath keeps the
 * type scale honest at every width.
 */

import { useT } from '../../lib/i18n'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useEffect, useId, useState } from 'react'
import { cn } from '../../lib/format'
import { dwellMs, LOOP_STORY } from './loopStory'

/* -- geometry, in viewBox units ------------------------------------------- */

const VB_W = 440
const VB_H = 430
const CX = 220
const CY = 222
const R = 150
const NODE_R = 26
const GATE_R = 31

const COUNT = LOOP_STORY.length
const STEP_DEG = 360 / COUNT
/** Keeps each arc clear of the two nodes it joins, and of the arrowhead. */
const INSET_DEG = 13

function polar(deg: number, radius: number): { x: number; y: number } {
  const rad = (deg * Math.PI) / 180
  return { x: CX + radius * Math.cos(rad), y: CY + radius * Math.sin(rad) }
}

/** Slot 0 sits at the top; the ring runs clockwise from there. */
const angleOf = (slot: number) => -90 + STEP_DEG * slot

const NODE_POS = LOOP_STORY.map((_, i) => polar(angleOf(i), R))

/** Segment `i` carries the artifact from node `i` to node `i + 1`. */
const SEGMENTS = LOOP_STORY.map((_, i) => {
  const from = polar(angleOf(i) + INSET_DEG, R)
  const to = polar(angleOf(i + 1) - INSET_DEG, R)
  return `M${from.x.toFixed(2)},${from.y.toFixed(2)} A${R},${R} 0 0 1 ${to.x.toFixed(2)},${to.y.toFixed(2)}`
})

const ARIA_LABEL = `The Cyclowareness closed loop: ${LOOP_STORY.map((n) => n.label).join(', ')}, and back to intake.`

/* -------------------------------------------------------------------------- */

export interface LoopSignatureProps {
  className?: string
}

export function LoopSignature({ className }: LoopSignatureProps) {
  const reduced = useReducedMotion() ?? false
  const [step, setStep] = useState(0)

  // One timer per beat rather than one interval, so the gate can hold longer
  // than a stage without the schedule drifting.
  useEffect(() => {
    if (reduced) return
    const timer = setTimeout(
      () => setStep((current) => (current + 1) % COUNT),
      dwellMs(LOOP_STORY[step]),
    )
    return () => clearTimeout(timer)
  }, [step, reduced])

  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const active = LOOP_STORY[step]
  /** The arc feeding the active node. At step 0 that is the closing edge. */
  const activeSegment = (step + COUNT - 1) % COUNT

  return (
    <div className={cn('flex w-full flex-col items-center gap-6', className)}>
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        role="img"
        aria-label={ARIA_LABEL}
        className="block h-auto w-full max-w-[440px]"
      >
        <defs>
          <marker
            id={`${uid}-arrow`}
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="4.5"
            markerHeight="4.5"
            orient="auto-start-reverse"
          >
            <path d="M0,1 L9,5 L0,9 Z" fill="var(--color-fg-faint)" />
          </marker>
        </defs>

        {/* The artifact arriving from outside. The loop is fed by the real
            world; drawing it as self-contained would misstate the product. */}
        <g>
          <path
            d={`M${CX},6 L${CX},${CY - R - NODE_R - 6}`}
            stroke="var(--color-line)"
            strokeWidth={1.5}
            fill="none"
            markerEnd={`url(#${uid}-arrow)`}
          />
          <text x={CX + 12} y={22} className="label" fill="var(--color-fg-faint)">
            Real threat
          </text>
          {!reduced && step === 0 && (
            <motion.path
              d={`M${CX},6 L${CX},${CY - R - NODE_R - 6}`}
              stroke="var(--color-brand)"
              strokeWidth={2}
              strokeLinecap="round"
              fill="none"
              initial={{ pathLength: 0, opacity: 0.9 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
            />
          )}
        </g>

        {SEGMENTS.map((d, index) => {
          const isActive = !reduced && index === activeSegment
          // Everything the artifact has already crossed this cycle stays faintly
          // lit, so the ring reads as a journey rather than as a chase light.
          const travelled = reduced || index + 1 < step
          return (
            <g key={index}>
              <path
                d={d}
                fill="none"
                stroke={travelled ? 'var(--color-brand)' : 'var(--color-line)'}
                strokeOpacity={travelled ? 0.3 : 1}
                strokeWidth={1.5}
                markerEnd={`url(#${uid}-arrow)`}
              />
              {isActive && (
                <motion.path
                  d={d}
                  fill="none"
                  stroke="var(--color-brand)"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1, ease: 'easeInOut' }}
                />
              )}
            </g>
          )
        })}

        {LOOP_STORY.map((node, index) => {
          const { x, y } = NODE_POS[index]
          const isActive = !reduced && index === step
          const isGate = node.kind === 'gate'
          const radius = isGate ? GATE_R : NODE_R
          const Icon = node.icon
          const tone = isActive
            ? node.machine
              ? 'text-ai'
              : 'text-brand'
            : isGate
              ? 'text-brand-fg'
              : 'text-fg-subtle'

          return (
            <g key={node.id} className={tone}>
              {isActive && (
                <circle
                  cx={x}
                  cy={y}
                  r={radius + 9}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1}
                  strokeOpacity={0.5}
                  className="pulse-soft"
                />
              )}
              {/* The gate wears a second ring at rest. It is a checkpoint whether
                  or not anything is standing at it. */}
              {isGate && (
                <circle
                  cx={x}
                  cy={y}
                  r={radius + 5}
                  fill="none"
                  stroke="currentColor"
                  strokeOpacity={isActive ? 0.7 : 0.35}
                  strokeWidth={1}
                  strokeDasharray="3 5"
                />
              )}
              <circle
                cx={x}
                cy={y}
                r={radius}
                fill="var(--color-elevated)"
                stroke={isActive || isGate ? 'currentColor' : 'var(--color-line-strong)'}
                strokeWidth={isActive ? 2 : 1.25}
              />
              <Icon
                size={22}
                x={x - 11}
                y={y - 11}
                strokeWidth={1.6}
                aria-hidden="true"
                focusable="false"
              />
            </g>
          )
        })}

        <text
          x={CX}
          y={CY - 6}
          textAnchor="middle"
          className="label"
          fill="var(--color-fg-faint)"
        >
          THE CLOSED LOOP
        </text>
        <text x={CX} y={CY + 14} textAnchor="middle" className="text-xs" fill="var(--color-fg-subtle)">
          Seven stages, one human gate
        </text>
      </svg>

      {reduced ? (
        <StaticNarrative />
      ) : (
        <div
          // The strip repeats every twenty seconds. Announcing it would make the
          // sign-in form unusable with a screen reader; the figure's own label
          // carries the same information once.
          aria-hidden="true"
          className="min-h-[7.5rem] w-full max-w-md text-center"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={active.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
            >
              <p className={cn('label', active.machine ? 'text-ai' : 'text-brand-fg')}>
                {active.stage === null
                  ? 'HUMAN DECISION'
                  : `STAGE ${active.stage} OF ${LOOP_STORY.length - 1} · ${active.owner.toUpperCase()}`}
              </p>
              <p className="text-h text-fg mt-2">{active.label}</p>
              <p className="text-body text-fg-muted mt-1.5">{active.narrative}</p>
            </motion.div>
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}

/**
 * What the figure says when motion is turned off. The gate is the beat that is
 * kept, because it is the one claim in the loop a viewer is least likely to
 * assume — every other stage is machinery.
 */
function StaticNarrative() {
  const t = useT()
  const gate = LOOP_STORY.find((node) => node.kind === 'gate')
  return (
    <div className="w-full max-w-md text-center">
      <p className="label text-brand-fg">{t('p.human-decision')}</p>
      <p className="text-h text-fg mt-2">{t('p.seven-stages-one-human-gate')}</p>
      <p className="text-body text-fg-muted mt-1.5">{gate?.narrative}</p>
      <ul className="mt-4 flex flex-wrap items-center justify-center gap-1.5">
        {LOOP_STORY.map((node) => (
          <li
            key={node.id}
            className={cn(
              'rounded-chip border px-2 py-0.5 text-xs',
              node.kind === 'gate'
                ? 'border-brand/40 text-brand-fg'
                : 'border-line-subtle text-fg-subtle',
            )}
          >
            {node.label}
          </li>
        ))}
      </ul>
    </div>
  )
}
