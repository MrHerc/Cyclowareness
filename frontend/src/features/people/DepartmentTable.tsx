/**
 * Departments as rows, worst first.
 *
 * The heatmap above it is for shape; this is for reading exact values and for
 * getting to the people. The share of a department that is high risk is
 * computed from the two counts the server sent, so it carries its own
 * denominator in the adjacent column rather than floating free as a percentage.
 */

import { useT } from '../../lib/i18n'
import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui'
import type { DepartmentRisk } from '../../domain/types'
import { pct } from '../../lib/format'
import { RiskScore } from './RiskScore'

export interface DepartmentTableProps {
  departments: DepartmentRisk[]
  /** Net change in this department's average risk over the recent event tail. */
  movement: Map<number, number>
  /** How many recent risk events the movement column was derived from. */
  movementSample: number
}

export function DepartmentTable({ departments, movement, movementSample }: DepartmentTableProps) {
  const t = useT()
  const ordered = [...departments].sort((a, b) => b.avg_risk - a.avg_risk)

  return (
    <Table>
      <TableCaption>
        {ordered.length} {ordered.length === 1 ? 'department' : 'departments'}. Departed staff are
        excluded from every average.{' '}
        {movementSample === 0
          ? t('p.no-recent-risk-event-could-be-2')
          : `Movement is the change the ${movementSample} attributed recent risk events made to each department’s average.`}
      </TableCaption>

      <TableHeader>
        <TableRow>
          <TableHead>Department</TableHead>
          <TableHead>{t('u.average-risk')}</TableHead>
          <TableHead numeric>People</TableHead>
          <TableHead numeric>{t('u.high-risk')}</TableHead>
          <TableHead numeric>{t('u.share-high-risk')}</TableHead>
          <TableHead>Movement</TableHead>
          <TableHead><span className="sr-only">{t('u.open-roster')}</span></TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {ordered.map((department) => {
          const delta = movement.get(department.id)
          return (
            <TableRow key={department.id}>
              <TableCell className="text-fg">{department.name}</TableCell>
              <TableCell>
                <RiskScore score={department.avg_risk} bar />
              </TableCell>
              <TableCell numeric>{department.employee_count}</TableCell>
              <TableCell numeric>{department.high_risk_count}</TableCell>
              <TableCell numeric>
                {department.employee_count > 0
                  ? pct(department.high_risk_count / department.employee_count, 0)
                  : '—'}
              </TableCell>
              <TableCell>
                {delta === undefined ? (
                  <span className="text-xs text-fg-faint">{t('u.no-recent-events')}</span>
                ) : (
                  <span
                    className={
                      delta > 0 ? 'text-critical' : delta < 0 ? 'text-safe' : 'text-fg-muted'
                    }
                  >
                    {delta > 0 ? '+' : ''}
                    {delta.toFixed(1)}
                  </span>
                )}
              </TableCell>
              <TableCell>
                <Link
                  to={`/employees?department=${department.id}`}
                  className="inline-flex items-center gap-1.5 text-sm text-brand hover:underline"
                >
                  {t('u.open-roster')}
                  <ArrowRight className="size-3.5" aria-hidden="true" />
                </Link>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
