/**
 * Departments as filter tiles above the roster.
 *
 * A tile is a real toggle button, not a link: it narrows the table underneath
 * rather than navigating, and pressing the active one again clears the filter.
 * `aria-pressed` carries that state, because a cyan border does not.
 */

import type { DepartmentRisk } from '../../domain/types'
import { cn, num, riskBand, riskBandLabel } from '../../lib/format'
import { BAND_BORDER, BAND_TEXT } from './riskModel'

export interface DepartmentTilesProps {
  departments: DepartmentRisk[]
  selectedId: number | null
  onSelect: (departmentId: number | null) => void
}

export function DepartmentTiles({ departments, selectedId, onSelect }: DepartmentTilesProps) {
  if (departments.length === 0) return null

  const ordered = [...departments].sort((a, b) => b.avg_risk - a.avg_risk)

  return (
    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
      {ordered.map((department) => {
        const band = riskBand(department.avg_risk)
        const selected = selectedId === department.id

        return (
          <li key={department.id}>
            <button
              type="button"
              aria-pressed={selected}
              onClick={() => onSelect(selected ? null : department.id)}
              className={cn(
                'block w-full rounded-control border bg-surface p-3 text-left transition-colors',
                selected ? 'border-brand bg-elevated' : cn(BAND_BORDER[band], 'hover:border-line-strong'),
              )}
            >
              <p className="truncate text-sm text-fg" title={department.name}>
                {department.name}
              </p>
              <p className="mt-1 flex items-baseline gap-1.5">
                <span className="text-title text-fg tabular-nums">{num(department.avg_risk, 0)}</span>
                <span className={cn('text-xs', BAND_TEXT[band])}>{riskBandLabel(department.avg_risk)}</span>
              </p>
              <p className="mt-1 text-xs text-fg-subtle">
                {department.employee_count} {department.employee_count === 1 ? 'person' : 'people'}
                {' · '}
                {department.high_risk_count} high risk
              </p>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
