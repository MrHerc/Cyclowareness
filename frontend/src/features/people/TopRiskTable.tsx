/**
 * The highest scores, split into the two things that produced them.
 *
 * A high score means one of two very different situations: a sensitive role
 * that starts high and has done nothing wrong, or an ordinary role whose
 * behaviour has pushed it up. Those call for opposite responses, and a single
 * ranked number hides which one you are looking at. Splitting the score into
 * baseline and recorded behaviour is not extra detail — it is the finding.
 */

import { Link } from 'react-router-dom'
import { useT } from '../../lib/i18n'
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui'
import type { Employee } from '../../domain/types'
import { cn, num, signed } from '../../lib/format'
import { baselineFor, behaviourOf } from './riskModel'
import { RiskScore } from './RiskScore'

export interface TopRiskTableProps {
  employees: Employee[]
  departmentNames: Map<number, string>
  limit?: number
}

export function TopRiskTable({ employees, departmentNames, limit = 10 }: TopRiskTableProps) {
  const t = useT()
  const ranked = [...employees]
    .sort((a, b) => b.current_risk_score - a.current_risk_score)
    .slice(0, limit)

  return (
    <Table>
      <TableCaption>
        The {ranked.length} highest current scores of {employees.length} people. Baseline plus
        behaviour equals the score in every row — open a person for the signal-by-signal breakdown.
      </TableCaption>

      <TableHeader>
        <TableRow>
          <TableHead>Person</TableHead>
          <TableHead>Department</TableHead>
          <TableHead numeric>{t('u.baseline-from-role')}</TableHead>
          <TableHead numeric>{t('u.from-behaviour')}</TableHead>
          <TableHead>Score</TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {ranked.map((person) => {
          const behaviour = behaviourOf(person)
          return (
            <TableRow key={person.id}>
              <TableCell className="max-w-64">
                <Link
                  to={`/employees/${person.id}`}
                  className="block truncate text-body text-fg hover:text-brand hover:underline"
                >
                  {person.name}
                </Link>
                <span className="block truncate text-xs text-fg-faint">{person.role_title}</span>
              </TableCell>

              <TableCell className="whitespace-nowrap">
                {departmentNames.get(person.department_id) ?? '—'}
              </TableCell>

              <TableCell numeric>
                {num(baselineFor(person.role_sensitivity), 1)}
                <span className="block text-xs text-fg-faint">
                  sensitivity {num(person.role_sensitivity, 1)}
                </span>
              </TableCell>

              <TableCell
                numeric
                className={cn(
                  behaviour > 0 ? 'text-critical' : behaviour < 0 ? 'text-safe' : 'text-fg-muted',
                )}
              >
                {behaviour === 0 ? 'Nothing recorded' : signed(behaviour, 1)}
              </TableCell>

              <TableCell>
                <RiskScore score={person.current_risk_score} bar />
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
