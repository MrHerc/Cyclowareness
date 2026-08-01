/**
 * The roster.
 *
 * Two things worth knowing.
 *
 * **The row is not the control.** The person's name is a real `<Link>`, so it
 * can be middle-clicked, copied and reached by keyboard in one tab stop. A
 * `<tr onClick>` is none of those things and is invisible to assistive tech.
 *
 * **The trend column is empty for most people, and that is the honest result.**
 * The employees endpoint returns a current score and nothing else; the only
 * per-person history available without a request per row is the analyst
 * dashboard's tail of recent risk events. Where that tail holds two or more
 * events for someone, their score is reconstructed from it and drawn. Where it
 * does not, `Sparkline` renders "not enough data" — which is the truth, rather
 * than a flat line implying a stable score.
 */

import { ArrowDown, ArrowUp } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Sparkline } from '../../components/charts'
import { StatusDot, Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui'
import { cn, num, signed } from '../../lib/format'
import { RiskScore } from './RiskScore'

export type EmployeeSortKey = 'name' | 'department' | 'sensitivity' | 'score' | 'movement'
export type SortDirection = 'asc' | 'desc'

export interface EmployeeRow {
  id: number
  name: string
  email: string
  roleTitle: string
  roleSensitivity: number
  score: number
  departmentName: string
  status: string | undefined
  /** Reconstructed score after each recent event, oldest first. */
  trail: number[]
  /** Net movement across those events. `null` when none were recorded. */
  movement: number | null
}

export interface EmployeeTableProps {
  rows: EmployeeRow[]
  sort: EmployeeSortKey
  direction: SortDirection
  onSort: (key: EmployeeSortKey) => void
  /** How many recent risk events the movement column was derived from. */
  movementSample: number
}

interface ColumnSpec {
  key: EmployeeSortKey | null
  label: string
  numeric?: boolean
  className?: string
}

const COLUMNS: ColumnSpec[] = [
  { key: 'name', label: 'Person' },
  { key: 'department', label: 'Department' },
  { key: null, label: 'Role' },
  { key: 'sensitivity', label: 'Sensitivity', numeric: true },
  { key: 'score', label: 'Risk score' },
  { key: 'movement', label: 'Recent movement' },
]

function SortButton({
  column,
  sort,
  direction,
  onSort,
}: {
  column: ColumnSpec
  sort: EmployeeSortKey
  direction: SortDirection
  onSort: (key: EmployeeSortKey) => void
}) {
  if (!column.key) return <>{column.label}</>
  const activeKey = column.key
  const active = sort === activeKey
  const Icon = direction === 'asc' ? ArrowUp : ArrowDown

  return (
    <button
      type="button"
      onClick={() => onSort(activeKey)}
      className={cn(
        'label inline-flex items-center gap-1 rounded-chip transition-colors hover:text-fg-muted',
        active && 'text-fg',
      )}
    >
      {column.label}
      {active ? <Icon className="size-3" aria-hidden="true" /> : null}
    </button>
  )
}

export function EmployeeTable({ rows, sort, direction, onSort, movementSample }: EmployeeTableProps) {
  // A column of "Not reported" in every row is noise, not honesty. The API
  // simply does not return employment status today, so the column appears only
  // if some deployment starts sending it — and the caption says so either way.
  const hasStatus = rows.some((row) => row.status !== undefined)

  return (
    <Table containerClassName="max-h-[70vh]">
      <TableCaption>
        {rows.length} {rows.length === 1 ? 'person' : 'people'}. Risk scores are the engine’s current
        values.{' '}
        {hasStatus
          ? ''
          : 'Employment status is not returned by the employees endpoint, so no status column is shown. '}
        {movementSample === 0
          ? 'No recent risk event could be attributed to a named person, so no movement is shown.'
          : `Recent movement is derived from the ${movementSample} most recent risk events that could be attributed to a named person; it is not a full history.`}
      </TableCaption>

      <TableHeader>
        <TableRow>
          {COLUMNS.map((column) => (
            <TableHead
              key={column.label}
              numeric={column.numeric}
              aria-sort={
                column.key === sort ? (direction === 'asc' ? 'ascending' : 'descending') : undefined
              }
            >
              <SortButton column={column} sort={sort} direction={direction} onSort={onSort} />
            </TableHead>
          ))}
          {hasStatus ? <TableHead>Status</TableHead> : null}
        </TableRow>
      </TableHeader>

      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell className="max-w-64">
              <Link
                to={`/employees/${row.id}`}
                className="block truncate text-body text-fg hover:text-brand hover:underline"
              >
                {row.name}
              </Link>
              <span className="block truncate text-xs text-fg-faint">{row.email}</span>
            </TableCell>

            <TableCell className="whitespace-nowrap">{row.departmentName}</TableCell>

            <TableCell className="max-w-56">
              <span className="block truncate" title={row.roleTitle}>
                {row.roleTitle}
              </span>
            </TableCell>

            <TableCell numeric>{num(row.roleSensitivity, 1)}</TableCell>

            <TableCell>
              <RiskScore score={row.score} bar />
            </TableCell>

            <TableCell>
              <span className="flex items-center gap-2">
                <Sparkline
                  values={row.trail}
                  label={`${row.name}: risk score across recent events`}
                  color="var(--color-series-3)"
                />
                {row.movement === null ? (
                  <span className="text-xs text-fg-faint">No recent events</span>
                ) : (
                  <span
                    className={cn(
                      'text-sm tabular-nums',
                      row.movement > 0 ? 'text-critical' : row.movement < 0 ? 'text-safe' : 'text-fg-muted',
                    )}
                  >
                    {signed(row.movement, 1)}
                  </span>
                )}
              </span>
            </TableCell>

            {hasStatus ? (
              <TableCell>
                <StatusDot status={row.status ?? null} />
              </TableCell>
            ) : null}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
