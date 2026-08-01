/**
 * One person against the team they sit in.
 *
 * The comparison is arithmetic on two numbers the server already sent — this
 * score minus the department average — so it is a fact rather than a ranking.
 * No percentile is claimed: a percentile over a roster this size would be a
 * confident-looking number computed from a handful of people.
 */

import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { NoMeasurement } from '../../components/data'
import type { DepartmentRisk } from '../../domain/types'
import { cn, num, signed } from '../../lib/format'
import { RiskScore } from './RiskScore'

export interface EmployeeDepartmentContextProps {
  departmentName: string
  department: DepartmentRisk | undefined
  score: number
}

export function EmployeeDepartmentContext({
  departmentName,
  department,
  score,
}: EmployeeDepartmentContextProps) {
  if (!department) {
    return (
      <div className="space-y-2">
        <p className="text-body text-fg">{departmentName || 'No department recorded'}</p>
        <NoMeasurement
          label="No roll-up available"
          reason="The departments endpoint returned no roll-up for this department, which happens when it has no active employees."
        />
      </div>
    )
  }

  const difference = Math.round((score - department.avg_risk) * 10) / 10

  return (
    <div className="space-y-4">
      <div>
        <p className="label text-fg-subtle">Department average</p>
        <div className="mt-2">
          <RiskScore score={department.avg_risk} bar />
        </div>
      </div>

      <p className="text-body text-fg-muted">
        This person sits{' '}
        <span className={cn(difference > 0 ? 'text-critical' : difference < 0 ? 'text-safe' : 'text-fg')}>
          {signed(difference, 1)}
        </span>{' '}
        against the {department.name} average of {num(department.avg_risk, 1)}, taken across{' '}
        {department.employee_count} {department.employee_count === 1 ? 'person' : 'people'} of whom{' '}
        {department.high_risk_count} {department.high_risk_count === 1 ? 'is' : 'are'} in the high-risk
        band.
      </p>

      <Link
        to={`/employees?department=${department.id}`}
        className="inline-flex items-center gap-1.5 text-sm text-brand hover:underline"
      >
        See everyone in {department.name}
        <ArrowRight className="size-3.5" aria-hidden="true" />
      </Link>
    </div>
  )
}
