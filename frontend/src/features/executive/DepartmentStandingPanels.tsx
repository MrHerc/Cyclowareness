/**
 * Which teams carry the risk, and the one thing this endpoint cannot say.
 *
 * "Most improved department" is the figure every executive dashboard shows and
 * almost none can support. `/api/dashboard/executive` returns a current
 * roll-up per department and an organisation-wide series — there is no
 * per-department history to difference, so there is no improvement to rank and
 * none is drawn. What is measured is standing: the average today and how many
 * people sit in the high-risk band. Both panels say "today" in their subtitles
 * so neither can be read as movement.
 */

import { useT } from '../../lib/i18n'
import { Building2 } from 'lucide-react'
import { DepartmentRiskHeatmap } from '../../components/charts'
import { InsufficientDataState } from '../../components/data'
import { EmptyState } from '../../components/states'
import { Badge, Panel } from '../../components/ui'
import type { DepartmentRisk } from '../../domain/types'
import { num, riskBand, riskBandLabel } from '../../lib/format'
import { departmentStanding } from './derive'

export interface DepartmentStandingPanelsProps {
  departments: DepartmentRisk[]
  loading?: boolean
  error?: string | null
  /** Drill-through, when the viewer's role can open a department roster. */
  onSelect?: (department: DepartmentRisk) => void
}

function StandingRow({ department }: { department: DepartmentRisk }) {
  const band = riskBand(department.avg_risk)
  return (
    <li className="flex items-center justify-between gap-4 border-b border-line-subtle py-2.5 last:border-b-0">
      <div className="min-w-0">
        <p className="truncate text-body text-fg">{department.name}</p>
        <p className="text-xs text-fg-subtle">
          {department.employee_count} {department.employee_count === 1 ? 'person' : 'people'}
          {department.high_risk_count > 0
            ? ` · ${department.high_risk_count} in the high-risk band`
            : ' · none in the high-risk band'}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span className="text-h text-fg tabular-nums">{num(department.avg_risk, 1)}</span>
        <Badge tone={band === 'high' ? 'critical' : band === 'elevated' ? 'medium' : 'safe'}>
          {riskBandLabel(department.avg_risk)}
        </Badge>
      </div>
    </li>
  )
}

export function DepartmentStandingPanels({
  departments,
  loading = false,
  error = null,
  onSelect,
}: DepartmentStandingPanelsProps) {
  const t = useT()
  const { attention, strongest } = departmentStanding(departments)

  if (!loading && !error && departments.length === 0) {
    return (
      <EmptyState
        icon={Building2}
        headline="No department has a scored population"
        description={t('x.departments-appear-here-once-they')}
      />
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <DepartmentRiskHeatmap
        departments={departments}
        onSelect={onSelect}
        height={260}
        loading={loading}
        error={error}
        className="xl:col-span-2"
      />

      <Panel
        title={t('x.departments-requiring-attention')}
        subtitle={t('x.standing-today-an-elevated-or')}
        headingLevel={3}
      >
        {attention.length > 0 ? (
          <ul>
            {attention.map((department) => (
              <StandingRow key={department.id} department={department} />
            ))}
          </ul>
        ) : (
          <p className="text-body text-fg-muted">{t('p.no-department-is-above-the-low')}</p>
        )}
      </Panel>

      <Panel
        title={t('x.strongest-departments-today')}
        subtitle={t('x.lowest-averages-with-nobody-in')}
        headingLevel={3}
      >
        {strongest.length > 0 ? (
          <ul>
            {strongest.map((department) => (
              <StandingRow key={department.id} department={department} />
            ))}
          </ul>
        ) : (
          <p className="text-body text-fg-muted">{t('p.no-department-is-currently-in-the')}</p>
        )}
      </Panel>

      <InsufficientDataState
        title={t('x.movement-by-department-cannot-be')}
        reason={t('p.this-view-is-served-one-figure')}
        remedy="The organisation-wide risk trend above is measured and does answer whether risk is falling overall. Per-department movement becomes available when the platform snapshots department averages the way it snapshots the organisation."
        sample={departments.length}
        sampleNoun="departments with a current roll-up"
        className="xl:col-span-2"
      />
    </div>
  )
}
