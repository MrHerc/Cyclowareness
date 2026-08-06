/**
 * Stage 4 — who was selected, and the reason each person was.
 *
 * The reasons are the point. A targeting engine that cannot say why it picked
 * someone is indistinguishable from a random draw, and the exposure column is
 * kept separate from the reasons for the same reason: "the artifact actually
 * reached this person" and "this person matches a risk signal" are different
 * claims, and blending them would let the weaker one borrow the stronger one's
 * weight.
 */

import { type MessageKey, useT } from '../../../lib/i18n'
import { Link } from 'react-router-dom'
import type { DepartmentRisk, StageEntry, Target } from '../../../domain/types'
import { STAGES } from '../../../domain/types'
import { cn, num, riskBand, riskBandLabel } from '../../../lib/format'
import { BAND_TEXT } from '../../people/riskModel'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../components/ui'
import { StageSection } from './StageSection'

const STAGE = STAGES[3]

export interface TargetingPanelProps {
  entry: StageEntry | undefined
  targets: Target[]
  departments: DepartmentRisk[] | undefined
}

function exposureOf(target: Target): { label: MessageKey; className: string } {
  if (target.exposed === true) return { label: 'p.received-the-artifact', className: 'text-high' }
  if (target.exposed === false)
    return { label: 'p.not-exposed-selected-on-risk-signals', className: 'text-fg-muted' }
  return { label: 'p.exposure-not-recorded', className: 'text-fg-faint' }
}

export function TargetingPanel({ entry, targets, departments }: TargetingPanelProps) {
  const t = useT()
  const departmentName = (id: number) =>
    departments?.find((department) => department.id === id)?.name ?? `Department ${id}`

  return (
    <StageSection
      stage={STAGE}
      entry={entry}
      source="live"
      sourceDetail="Risk engine selection stored on the run"
    >
      {targets.length === 0 ? (
        <p className="text-body text-fg-muted">{t('p.no-one-was-selected-that-is')}</p>
      ) : (
        <>
          <p className="text-body text-fg-muted">
            {targets.length} {targets.length === 1 ? 'person was' : 'people were'} selected, each
            for a stated reason. Everyone else in the organisation was left alone.
          </p>

          <Table className="mt-4">
            <TableHeader>
              <TableRow>
                <TableHead>Person</TableHead>
                <TableHead>Department</TableHead>
                <TableHead numeric>Risk at selection</TableHead>
                <TableHead>Exposure</TableHead>
                <TableHead>Why they were selected</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {targets.map((target) => {
                const exposure = exposureOf(target)
                return (
                  <TableRow key={target.employee_id}>
                    <TableCell>
                      <Link
                        to={`/employees/${target.employee_id}`}
                        className="text-fg hover:text-brand"
                      >
                        {target.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm">
                      {departmentName(target.department_id)}
                    </TableCell>
                    <TableCell numeric>
                      <span className={cn(BAND_TEXT[riskBand(target.risk_score)])}>
                        {num(target.risk_score, 0)}
                      </span>
                      <span className="ml-2 text-xs text-fg-faint">
                        {riskBandLabel(target.risk_score)}
                      </span>
                    </TableCell>
                    <TableCell className={cn('text-sm', exposure.className)}>
                      {t(exposure.label)}
                    </TableCell>
                    <TableCell>
                      {target.reasons.length === 0 ? (
                        <span className="text-sm text-fg-faint">No reason was recorded</span>
                      ) : (
                        <ul className="space-y-1">
                          {target.reasons.map((reason) => (
                            <li key={reason} className="text-sm text-fg-muted">
                              {reason}
                            </li>
                          ))}
                        </ul>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>

          <p className="mt-3 text-xs text-fg-subtle">{t('p.risk-scores-are-the-values-recorded')}</p>
        </>
      )}
    </StageSection>
  )
}
