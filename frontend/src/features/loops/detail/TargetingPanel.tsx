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

import { Link } from 'react-router-dom'
import type { DepartmentRisk, StageEntry, Target } from '../../../domain/types'
import { STAGES } from '../../../domain/types'
import { cn, num, riskBand, riskBandLabel } from '../../../lib/format'
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

const BAND_CLASS: Record<'low' | 'elevated' | 'high', string> = {
  high: 'text-high',
  elevated: 'text-medium',
  low: 'text-safe',
}

function exposureOf(target: Target): { label: string; className: string } {
  if (target.exposed === true) return { label: 'Received the artifact', className: 'text-high' }
  if (target.exposed === false)
    return { label: 'Not exposed — selected on risk signals', className: 'text-fg-muted' }
  return { label: 'Exposure not recorded', className: 'text-fg-faint' }
}

export function TargetingPanel({ entry, targets, departments }: TargetingPanelProps) {
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
        <p className="text-body text-fg-muted">
          No one was selected. That is not “nobody is at risk” — it means nothing in the artifact,
          the exposed departments or the recent-behaviour signals matched a person. A run approved
          in this state advances with nothing to assign.
        </p>
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
                      <span className={cn(BAND_CLASS[riskBand(target.risk_score)])}>
                        {num(target.risk_score, 0)}
                      </span>
                      <span className="ml-2 text-xs text-fg-faint">
                        {riskBandLabel(target.risk_score)}
                      </span>
                    </TableCell>
                    <TableCell className={cn('text-sm', exposure.className)}>
                      {exposure.label}
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

          <p className="mt-3 text-xs text-fg-subtle">
            Risk scores are the values recorded when this list was drawn. A person&apos;s score
            moves afterwards, so the number here will not always match their profile today.
          </p>
        </>
      )}
    </StageSection>
  )
}
