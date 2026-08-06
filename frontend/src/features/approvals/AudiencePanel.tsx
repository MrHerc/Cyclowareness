/**
 * Who this would reach, and why each of them.
 *
 * The reasons are the point. An analyst is being asked to approve content that
 * will be put in front of named people, so the selection signals are theirs to
 * disagree with — a count alone would make the audience unreviewable.
 *
 * Two things this panel refuses to invent. The API reports no exclusion list
 * and no send schedule, so both are stated as absences rather than drawn as
 * empty sections that read like a configured zero.
 */

import { useT } from '../../lib/i18n'
import { CalendarClock, UserMinus, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Avatar, Badge, Panel, Progress, ScrollArea, Separator, Tooltip } from '../../components/ui'
import type { StatusTone } from '../../components/ui'
import { num, pct, riskBand, riskBandLabel } from '../../lib/format'
import type { AudienceMember } from './contract'

/** `riskBand` speaks its own vocabulary; `elevated` is not a status word. */
const BAND_TONE: Record<ReturnType<typeof riskBand>, StatusTone> = {
  high: 'high',
  elevated: 'medium',
  low: 'safe',
}

const BANDS = [
  { key: 'high', label: 'High risk', tone: 'high' as const },
  { key: 'elevated', label: 'Elevated', tone: 'medium' as const },
  { key: 'low', label: 'Low risk', tone: 'safe' as const },
]

function Distribution({ members }: { members: AudienceMember[] }) {
  const t = useT()
  const scored = members.filter((member) => member.riskScore !== null)
  const unscored = members.length - scored.length

  if (scored.length === 0) {
    return (
      <p className="text-sm text-fg-subtle">{t('p.no-risk-score-is-recorded-for')}</p>
    )
  }

  const counts = BANDS.map((band) => ({
    ...band,
    count: scored.filter((member) => riskBand(member.riskScore as number) === band.key).length,
  }))

  return (
    <div className="space-y-2.5">
      {counts.map((band) => (
        // The count is rendered here rather than through `showValue`, which
        // states a percentage — a share of eleven people is not a useful figure.
        <div key={band.key} className="space-y-1">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="text-fg-muted">{band.label}</span>
            <span className="text-fg">{band.count}</span>
          </div>
          <Progress
            label={`${band.label}: ${band.count} of ${scored.length}`}
            value={band.count}
            max={scored.length}
            tone={band.tone}
            size="sm"
          />
        </div>
      ))}
      <p className="text-xs text-fg-faint">
        {scored.length} of {members.length} scored
        {unscored > 0 ? ` · ${unscored} without a recorded score, excluded from the bars` : ''}
      </p>
    </div>
  )
}

function Member({ member }: { member: AudienceMember }) {
  const t = useT()
  return (
    <li className="flex gap-3 py-3">
      <Avatar name={member.name} size="sm" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to={`/employees/${member.employeeId}`}
            className="text-body text-fg hover:text-brand"
          >
            {member.name}
          </Link>
          {member.riskScore !== null ? (
            <Tooltip content={`${riskBandLabel(member.riskScore)} · score ${num(member.riskScore)}`}>
              <Badge tone={BAND_TONE[riskBand(member.riskScore)]} size="sm">
                {num(member.riskScore)}
              </Badge>
            </Tooltip>
          ) : (
            <span className="text-xs text-fg-faint">No score</span>
          )}
          {member.exposed && (
            <Tooltip content="The artifact actually reached this person. Everyone else was selected on a prior.">
              <Badge tone="critical" size="sm">
                Exposed
              </Badge>
            </Tooltip>
          )}
        </div>

        {member.reasons.length > 0 ? (
          <ul className="space-y-0.5">
            {member.reasons.map((reason) => (
              <li key={reason} className="text-xs text-fg-subtle">
                {reason}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-fg-faint">{t('p.the-risk-engine-gave-no-reason')}</p>
        )}
      </div>
    </li>
  )
}

export interface AudiencePanelProps {
  members: AudienceMember[]
  targetingNote: string | null
}

export function AudiencePanel({ members, targetingNote }: AudiencePanelProps) {
  const t = useT()
  const exposed = members.filter((member) => member.exposed).length

  return (
    <Panel
      title={t('x.proposed-audience')}
      headingLevel={2}
      subtitle={
        members.length === 0
          ? 'Nobody was selected'
          : `${members.length} ${members.length === 1 ? 'person' : 'people'}${exposed > 0 ? ` · ${exposed} actually exposed (${pct(exposed / members.length)})` : ''}`
      }
      bodyClassName="space-y-4"
    >
      {members.length === 0 ? (
        <p className="text-sm text-medium" role="note">
          {targetingNote ??
            t('p.no-employee-matched-this-threats-targeting')}
        </p>
      ) : (
        <>
          <Distribution members={members} />

          <Separator fade />

          <div className="space-y-1">
            <h3 className="label text-fg-faint">{t('y.why-each-person')}</h3>
            <ScrollArea viewportClassName="max-h-96">
              <ul className="divide-line pr-3">
                {members.map((member) => (
                  <Member key={member.employeeId} member={member} />
                ))}
              </ul>
            </ScrollArea>
          </div>

          {targetingNote && (
            <p className="text-xs text-fg-faint" role="note">
              {targetingNote}
            </p>
          )}
        </>
      )}

      <Separator fade />

      <div className="space-y-3">
        <div className="flex items-start gap-2">
          <UserMinus className="mt-0.5 size-4 shrink-0 text-fg-faint" aria-hidden="true" />
          <p className="text-xs text-fg-subtle">
            <span className="text-fg-muted">Exclusions.</span> The targeting API returns the people
            it selected, not the people it ruled out. There is no exclusion list to show, and this
            screen will not present an empty one as though nobody was excluded.
          </p>
        </div>

        <div className="flex items-start gap-2">
          <CalendarClock className="mt-0.5 size-4 shrink-0 text-fg-faint" aria-hidden="true" />
          <p className="text-xs text-fg-subtle">
            <span className="text-fg-muted">Delivery.</span> Approval advances the run immediately —
            targeting runs again and assignments are created at once. This deployment has no
            scheduled or staggered send.
          </p>
        </div>

        <div className="flex items-start gap-2">
          <Users className="mt-0.5 size-4 shrink-0 text-fg-faint" aria-hidden="true" />
          <p className="text-xs text-fg-subtle">{t('p.the-audience-is-recomputed-at-execution')}</p>
        </div>
      </div>
    </Panel>
  )
}
