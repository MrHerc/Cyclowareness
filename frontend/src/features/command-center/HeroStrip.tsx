/**
 * What needs a human right now, as seven counts that are all links.
 *
 * Two rules this strip is built around.
 *
 * **A count of zero is a fact.** "0 waiting at the gate" is the single most
 * useful thing this row can say, so a measured zero renders as `0`. Only a
 * source that has not answered renders an em dash, and it says why underneath —
 * conflating "nothing to do" with "we could not ask" is how an analyst learns to
 * distrust the whole row.
 *
 * **Every tile is a real link to a filtered view.** A number an analyst cannot
 * click through to is trivia. The destination is the screen that shows the
 * individual items the number counted, never a general index of everything.
 */

import { useT } from '../../lib/i18n'
import {
  BadgeCheck,
  Boxes,
  Inbox,
  Landmark,
  Radar,
  Send,
  ShieldAlert,
  type LucideIcon,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import type { SandboxCapabilities } from '../../domain/types'
import { cn } from '../../lib/format'
import { type MessageKey } from '../../lib/i18n'

type TileTone = 'neutral' | 'brand' | 'critical' | 'high' | 'medium'

interface Tile {
  id: string
  label: MessageKey
  /** `null` only when the source did not answer. A measured zero is `0`. */
  value: number | null
  /** A key, or an already-computed sentence when the text interpolates a
   *  number. `isKey` at the render site decides which. */
  caption: MessageKey | string
  to: string
  icon: LucideIcon
  tone: TileTone
}

export interface HeroStripProps {
  /** Every count is `null` until its query answers, and never defaulted to 0. */
  activeRuns: number | null
  awaitingApproval: number | null
  assignedToMe: number | null
  newReports: number | null
  activeSimulations: number | null
  highRiskFindings: number | null
  openFindings: number | null
  openIncidentRisks: number | null
  sandbox: SandboxCapabilities | undefined
}

const TONE_TEXT: Record<TileTone, string> = {
  neutral: 'text-fg',
  brand: 'text-brand',
  critical: 'text-critical',
  high: 'text-high',
  medium: 'text-medium',
}

const TONE_ICON: Record<TileTone, string> = {
  neutral: 'text-fg-subtle',
  brand: 'text-brand',
  critical: 'text-critical',
  high: 'text-high',
  medium: 'text-medium',
}

/** Only a number a person has to act on earns a colour. Idle counts stay neutral. */
function pressing(value: number | null, tone: TileTone): TileTone {
  return value !== null && value > 0 ? tone : 'neutral'
}

function plural(count: number | null, one: string, many: string): string {
  return count === 1 ? one : many
}

function buildTiles(props: HeroStripProps): Tile[] {
  const {
    activeRuns,
    awaitingApproval,
    assignedToMe,
    newReports,
    activeSimulations,
    highRiskFindings,
    openFindings,
    openIncidentRisks,
    sandbox,
  } = props

  const analyzers = sandbox ? sandbox.static_analyzers.length : null
  const unavailable = sandbox ? Object.keys(sandbox.unavailable_analyzers).length : 0

  const tiles: Tile[] = [
    // THE SAME RULE THE QUEUE TAB FOLLOWS. Nothing in this product assigns a run
    // to an analyst — the server never emits `assigned_analyst` — so this tile
    // read a permanent 0 in the leading position of the attention strip, which
    // is where the eye goes first. The tab beside it was retired for exactly
    // this and the tile was left behind; `assignedToMe` is null until the queue
    // answers, and 0 thereafter, for ever.
    //
    // It reappears the moment a deployment populates the field, which is why
    // this reads the data rather than a flag.
    ...(assignedToMe !== null && assignedToMe > 0
      // Annotated so the key literals narrow to `MessageKey`. Without it the
      // inner array widens `label` to `string` and the tile stops type-checking
      // against the catalogue.
      ? ([
          {
            id: 'assigned',
            label: 'h.assigned-to-you',
            value: assignedToMe,
            caption:
              awaitingApproval === null
                ? 'h.approval-items-naming-you'
                : `${awaitingApproval} ${plural(awaitingApproval, 'item is', 'items are')} at the gate in total`,
            to: '/approvals',
            icon: BadgeCheck,
            tone: pressing(assignedToMe, 'medium'),
          },
        ] as Tile[])
      : []),
    {
      id: 'gate',
      label: 'h.waiting-at-the-gate',
      value: awaitingApproval,
      caption: 'p.nothing-reaches-an-employee-until-a',
      to: '/approvals',
      icon: BadgeCheck,
      tone: pressing(awaitingApproval, 'medium'),
    },
    {
      id: 'runs',
      label: 'h.active-loops',
      value: activeRuns,
      caption: 'p.runs-currently-moving-through-the-seven',
      to: '/loops',
      icon: Radar,
      tone: pressing(activeRuns, 'brand'),
    },
    {
      id: 'reports',
      label: 'p.new-threat-submissions',
      value: newReports,
      caption: 'p.reported-by-the-human-sensor-and',
      to: '/threats',
      icon: Inbox,
      tone: pressing(newReports, 'high'),
    },
    {
      id: 'findings',
      label: 'p.highrisk-policy-findings',
      value: highRiskFindings,
      caption:
        openFindings === null
          ? 'Open findings at critical or high severity'
          : `${openFindings} open ${plural(openFindings, 'finding', 'findings')} at all severities`,
      to: '/policy-intelligence/findings',
      icon: Landmark,
      tone: pressing(highRiskFindings, 'critical'),
    },
    {
      id: 'incidents',
      label: 'h.open-incident-risks',
      value: openIncidentRisks,
      caption: 'p.raised-by-incident-response-against-named',
      to: '/incident-risks',
      icon: ShieldAlert,
      tone: pressing(openIncidentRisks, 'high'),
    },
    {
      id: 'simulations',
      label: 'h.running-simulations',
      value: activeSimulations,
      caption: 'p.campaigns-launched-and-still-collecting-outcomes',
      to: '/simulations',
      icon: Send,
      tone: pressing(activeSimulations, 'brand'),
    },
    {
      id: 'sandbox',
      label: 'h.sandbox-analyzers',
      value: analyzers,
      caption: sandbox
        ? `${unavailable} unavailable · dynamic detonation ${sandbox.dynamic_worker ? 'available' : 'not available'}`
        : 'Analyzers reported ready by the sandbox',
      to: '/sandbox',
      icon: Boxes,
      // Capability, not urgency: a healthy sandbox must not glow like a queue.
      tone: sandbox && !sandbox.dynamic_worker ? 'medium' : 'neutral',
    },
  ]

  return tiles
}

/**
 * The decision row. Rendered as a list of links so it is one tab stop per tile
 * and reads as "eight things, each of which goes somewhere" to a screen reader.
 */
/** A caption is a message key when it looks like one — every key in this
 *  catalogue is `prefix.slug`, and no rendered sentence is. Computed captions
 *  ("3 items are at the gate in total") interpolate a number and cannot be
 *  keyed, so they pass through untranslated rather than being looked up and
 *  coming back blank. */
function isKey(value: MessageKey | string): value is MessageKey {
  return /^[a-z]+\.[a-z0-9-]+$/.test(value)
}

export function HeroStrip(props: HeroStripProps) {
  const t = useT()
  const tiles = buildTiles(props)

  // ONE FILLED TILE, AND ONLY WHEN IT IS EARNED. The accent-on-dark design puts
  // a single card in the accent colour and leaves the rest in greyscale, which
  // is what makes the row scannable: the eye goes to the fill first. So the fill
  // marks the most pressing count rather than the first tile — the leading
  // position is a layout accident, and colouring it would point at whatever
  // happens to be there.
  //
  // Nothing pressing means nothing filled. A row where one card is always lime
  // teaches the reader to stop seeing it.
  const filledId = tiles.find((tile) => tile.tone !== 'neutral' && (tile.value ?? 0) > 0)?.id

  return (
    <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {tiles.map((tile) => {
        const Icon = tile.icon
        const unavailable = tile.value === null
        const filled = tile.id === filledId

        return (
          <li key={tile.id}>
            <Link
              to={tile.to}
              className={cn(
                'block h-full rounded-panel border p-4 transition-colors duration-150',
                filled
                  ? 'border-brand bg-brand hover:bg-brand-fg'
                  : cn(
                      'bg-elevated hover:border-line-strong hover:bg-raised',
                      tile.tone === 'neutral' ? 'border-line' : 'border-line-strong',
                    ),
              )}
            >
              <span className="flex items-center gap-2">
                <Icon
                  aria-hidden="true"
                  strokeWidth={1.75}
                  className={cn(
                    'size-4 shrink-0',
                    // NEAR-BLACK ON THE FILL, NEVER WHITE. White on this lime
                    // measures 1.4:1 — the token file records why `on-brand`
                    // exists and what it is for.
                    filled ? 'text-on-brand' : TONE_ICON[tile.tone],
                  )}
                />
                <span className={cn('label', filled ? 'text-on-brand/70' : 'text-fg-subtle')}>
                  {t(tile.label)}
                </span>
              </span>

              <span
                className={cn(
                  'mt-3 block tabular-nums',
                  unavailable
                    ? 'text-lead text-fg-faint'
                    : cn('text-display', filled ? 'text-on-brand' : TONE_TEXT[tile.tone]),
                )}
              >
                {unavailable ? 'Not available' : tile.value}
              </span>

              <span
                className={cn(
                  'mt-1 block text-xs',
                  filled ? 'text-on-brand/70' : 'text-fg-subtle',
                )}
              >
                {unavailable
                  ? t('p.this-source-has-not-answered-yet')
                  : isKey(tile.caption)
                    ? t(tile.caption)
                    : tile.caption}
              </span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
