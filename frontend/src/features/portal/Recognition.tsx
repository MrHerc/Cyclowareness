/**
 * Points, badges and standings — deliberately the last thing on the page.
 *
 * Gamification earns attention it has not paid for. A portal that opens with a
 * streak counter teaches people that the goal is the streak, and the one number
 * that matters here is a risk score, not a leaderboard position. So this lives
 * below everything, in the quiet tone, with no brand colour and no celebration.
 *
 * Locked badges show their real progress fraction, which the server computes
 * from the same signals as the score. Nothing here is invented for effect.
 */

import {
  Award,
  Eye,
  Flame,
  GraduationCap,
  ScanEye,
  ShieldCheck,
  Target,
  type LucideIcon,
} from 'lucide-react'
import { Panel, Progress } from '../../components/ui'
import type { Badge as BadgeRecord, TeamStanding } from '../../domain/types'
import { cn, num } from '../../lib/format'

export interface RecognitionProps {
  points: number
  streak: number
  reportsSubmitted: number
  rank: number | null
  badges: BadgeRecord[]
  teams: TeamStanding[]
}

/** The icon names the backend's badge catalogue actually emits. */
const BADGE_ICONS: Record<string, LucideIcon> = {
  Eye,
  ScanEye,
  Target,
  Flame,
  GraduationCap,
  ShieldCheck,
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="label text-fg-subtle">{label}</span>
      <p className="mt-1 text-title text-fg tabular-nums">{value}</p>
    </div>
  )
}

function BadgeTile({ badge }: { badge: BadgeRecord }) {
  const Icon = BADGE_ICONS[badge.icon] ?? Award

  return (
    <li
      className={cn(
        'rounded-panel border p-3',
        badge.earned ? 'border-line bg-elevated' : 'border-line-subtle bg-base',
      )}
    >
      <div className="flex items-start gap-2.5">
        <Icon
          className={cn('mt-0.5 size-4 shrink-0', badge.earned ? 'text-fg' : 'text-fg-faint')}
          strokeWidth={1.75}
          aria-hidden="true"
        />
        <div className="min-w-0">
          <p className={cn('text-body', badge.earned ? 'text-fg' : 'text-fg-subtle')}>
            {badge.name}
          </p>
          <p className="mt-0.5 text-xs text-fg-faint">{badge.description}</p>
        </div>
      </div>

      {badge.earned ? (
        <p className="mt-2 text-xs text-fg-subtle">Earned</p>
      ) : (
        <Progress
          className="mt-2.5"
          value={badge.progress * 100}
          label={`${badge.name} progress`}
          tone="neutral"
          size="sm"
          showValue
          showLabel={false}
        />
      )}
    </li>
  )
}

export function Recognition({
  points,
  streak,
  reportsSubmitted,
  rank,
  badges,
  teams,
}: RecognitionProps) {
  return (
    <Panel
      tone="quiet"
      title="Recognition"
      subtitle="A record of what you have done. It does not affect your risk score."
      headingLevel={2}
    >
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
          <Stat label="Points" value={num(points, 0)} />
          <Stat label="Passing streak" value={num(streak, 0)} />
          <Stat label="Reports sent" value={num(reportsSubmitted, 0)} />
          <Stat label="Standing" value={rank === null ? 'Unranked' : `#${num(rank, 0)}`} />
        </div>

        {badges.length > 0 ? (
          <div>
            <h3 className="label text-fg-subtle">Badges</h3>
            <ul className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {badges.map((badge) => (
                <BadgeTile key={badge.id} badge={badge} />
              ))}
            </ul>
          </div>
        ) : null}

        {teams.length > 0 ? (
          <div>
            <h3 className="label text-fg-subtle">Teams, safest first</h3>
            <ul className="mt-2 divide-line">
              {teams.map((team) => (
                <li
                  key={team.department_id}
                  className="flex items-baseline justify-between gap-3 py-2"
                >
                  <span className={cn('truncate text-body', team.is_mine ? 'text-fg' : 'text-fg-muted')}>
                    {team.name}
                    {team.is_mine ? <span className="ml-2 text-xs text-fg-faint">your team</span> : null}
                  </span>
                  <span className="shrink-0 text-sm text-fg-muted tabular-nums">
                    avg risk {num(team.avg_risk, 1)} · {num(team.points, 0)} points
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-fg-faint">
              Average risk across everyone in the department. It is a team average, not anyone's
              individual score.
            </p>
          </div>
        ) : null}

        <p className="text-xs text-fg-faint">
          Points count completed training only — 50 for each module you finish, plus half your quiz
          score. They are a record of what you did, not a measurement of how safe you are.
        </p>
      </div>
    </Panel>
  )
}
