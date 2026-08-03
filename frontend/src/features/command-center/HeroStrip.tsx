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

type TileTone = 'neutral' | 'brand' | 'critical' | 'high' | 'medium'

interface Tile {
  id: string
  label: string
  /** `null` only when the source did not answer. A measured zero is `0`. */
  value: number | null
  caption: string
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

  return [
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
      ? [
          {
            id: 'assigned',
            label: 'Assigned to you',
            value: assignedToMe,
            caption:
              awaitingApproval === null
                ? 'Approval items naming you'
                : `${awaitingApproval} ${plural(awaitingApproval, 'item is', 'items are')} at the gate in total`,
            to: '/approvals',
            icon: BadgeCheck,
            tone: pressing(assignedToMe, 'medium'),
          },
        ]
      : []),
    {
      id: 'gate',
      label: 'Waiting at the gate',
      value: awaitingApproval,
      caption: 'Nothing reaches an employee until a human decides',
      to: '/approvals',
      icon: BadgeCheck,
      tone: pressing(awaitingApproval, 'medium'),
    },
    {
      id: 'runs',
      label: 'Active loops',
      value: activeRuns,
      caption: 'Runs currently moving through the seven stages',
      to: '/loops',
      icon: Radar,
      tone: pressing(activeRuns, 'brand'),
    },
    {
      id: 'reports',
      label: 'New threat submissions',
      value: newReports,
      caption: 'Reported by the human sensor and not yet triaged',
      to: '/threats',
      icon: Inbox,
      tone: pressing(newReports, 'high'),
    },
    {
      id: 'findings',
      label: 'High-risk policy findings',
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
      label: 'Open incident risks',
      value: openIncidentRisks,
      caption: 'Raised by incident response against named people',
      to: '/incident-risks',
      icon: ShieldAlert,
      tone: pressing(openIncidentRisks, 'high'),
    },
    {
      id: 'simulations',
      label: 'Running simulations',
      value: activeSimulations,
      caption: 'Campaigns launched and still collecting outcomes',
      to: '/simulations',
      icon: Send,
      tone: pressing(activeSimulations, 'brand'),
    },
    {
      id: 'sandbox',
      label: 'Sandbox analyzers',
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
}

/**
 * The decision row. Rendered as a list of links so it is one tab stop per tile
 * and reads as "eight things, each of which goes somewhere" to a screen reader.
 */
export function HeroStrip(props: HeroStripProps) {
  const tiles = buildTiles(props)

  return (
    <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {tiles.map((tile) => {
        const Icon = tile.icon
        const unavailable = tile.value === null

        return (
          <li key={tile.id}>
            <Link
              to={tile.to}
              className={cn(
                'block h-full rounded-panel border bg-elevated p-4 transition-colors duration-150',
                'hover:border-line-strong hover:bg-raised',
                tile.tone === 'neutral' ? 'border-line' : 'border-line-strong',
              )}
            >
              <span className="flex items-center gap-2">
                <Icon
                  aria-hidden="true"
                  strokeWidth={1.75}
                  className={cn('size-4 shrink-0', TONE_ICON[tile.tone])}
                />
                <span className="label text-fg-subtle">{tile.label}</span>
              </span>

              <span
                className={cn(
                  'mt-3 block tabular-nums',
                  unavailable ? 'text-lead text-fg-faint' : cn('text-display', TONE_TEXT[tile.tone]),
                )}
              >
                {unavailable ? 'Not available' : tile.value}
              </span>

              <span className="mt-1 block text-xs text-fg-subtle">
                {unavailable ? 'This source has not answered yet' : tile.caption}
              </span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
