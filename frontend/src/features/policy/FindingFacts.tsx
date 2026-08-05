/**
 * The two blocks of a finding that a reader argues with.
 *
 * `VersionComparison` puts affected, approved and recommended side by side
 * because the finding is usually the gap between them — "the approved build is
 * the vulnerable build" only lands when the two strings are next to each other.
 * A version the finding does not carry is an em dash, never an empty cell that
 * reads as "none".
 *
 * `AffectedPeople` renders the ids the server could not resolve as well as the
 * ones it could. A silently shortened list understates the blast radius, and
 * employment status is carried through so a reader can see that two of the five
 * named people have left rather than wondering why training never lands.
 */

import { Building2, UserRound } from 'lucide-react'
import { Badge } from '../../components/ui'
import { cn, humanise } from '../../lib/format'
import type { AffectedDepartmentRef, AffectedEmployeeRef } from './data'

export interface VersionComparisonProps {
  // Nullable to match PolicyFinding: a finding often knows the affected version
  // without yet knowing the recommended one, and the component already renders
  // the "nothing to compare" case rather than an empty cell.
  affected: string | null
  approved: string | null
  recommended: string | null
  technology: string | null
  className?: string
}

function VersionCell({
  label,
  value,
  tone,
}: {
  label: string
  // Nullable because a finding routinely knows one version and not the others;
  // the cell renders an em dash rather than pretending the field is empty.
  value: string | null
  tone?: string
}) {
  return (
    <div className="rounded-control border border-line-subtle bg-base p-3">
      <p className="label text-fg-faint">{label}</p>
      <p className={cn('tech mt-1.5 break-all text-fg', tone)}>{value || '—'}</p>
    </div>
  )
}

export function VersionComparison({
  affected,
  approved,
  recommended,
  technology,
  className,
}: VersionComparisonProps) {
  const nothing = !affected && !approved && !recommended

  if (nothing) {
    return (
      <p className={cn('text-sm text-fg-faint', className)}>
        This finding is not about a version. No affected, approved or recommended version was
        recorded for it.
      </p>
    )
  }

  return (
    <div className={cn('space-y-2', className)}>
      {technology ? (
        <p className="text-sm text-fg-muted">
          <span className="label mr-2 text-fg-faint">Technology</span>
          <span className="tech text-fg">{technology}</span>
        </p>
      ) : null}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <VersionCell label="In use" value={affected} tone="text-high" />
        <VersionCell label="Approved by policy" value={approved} />
        <VersionCell label="Recommended" value={recommended} tone="text-safe" />
      </div>
    </div>
  )
}

export interface AffectedPeopleProps {
  departments: AffectedDepartmentRef[]
  employees: AffectedEmployeeRef[]
  className?: string
}

export function AffectedPeople({ departments, employees, className }: AffectedPeopleProps) {
  if (departments.length === 0 && employees.length === 0) {
    return (
      <p className={cn('text-sm text-fg-faint', className)}>
        No department or employee is named on this finding. That is a gap in the record, not a
        statement that nobody is affected.
      </p>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div>
        <p className="label text-fg-faint">Departments · {departments.length}</p>
        {departments.length === 0 ? (
          <p className="mt-1.5 text-sm text-fg-faint">None named.</p>
        ) : (
          <ul className="mt-1.5 flex flex-wrap gap-2">
            {departments.map((department) => (
              <li key={department.id}>
                <span className="inline-flex items-center gap-1.5 rounded-chip border border-line px-2 py-0.5 text-sm text-fg-muted">
                  <Building2 className="size-3.5 shrink-0" aria-hidden="true" />
                  {department.resolved && department.name ? (
                    department.name
                  ) : (
                    <span className="text-fg-faint">
                      Department {department.id} — no longer resolves
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <p className="label text-fg-faint">People · {employees.length}</p>
        {employees.length === 0 ? (
          <p className="mt-1.5 text-sm text-fg-faint">None named.</p>
        ) : (
          <ul className="mt-1.5 divide-line">
            {employees.map((employee) => (
              <li key={employee.id} className="flex items-center justify-between gap-3 py-2">
                <span className="inline-flex min-w-0 items-center gap-2">
                  <UserRound className="size-4 shrink-0 text-fg-faint" aria-hidden="true" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm text-fg">
                      {employee.resolved && employee.name
                        ? employee.name
                        : `Employee ${employee.id} — no longer resolves`}
                    </span>
                    {employee.department_name || employee.email ? (
                      <span className="block truncate text-xs text-fg-subtle">
                        {[employee.department_name, employee.email].filter(Boolean).join(' · ')}
                      </span>
                    ) : null}
                  </span>
                </span>
                {employee.employment_status && employee.employment_status !== 'active' ? (
                  <Badge status={employee.employment_status} size="sm">
                    {humanise(employee.employment_status)}
                  </Badge>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
