/**
 * Who a campaign will actually target.
 *
 * Apart from the selector that renders it because Fast Refresh only works
 * when a module exports components alone — a file that also exports a
 * constant or a helper falls back to a full reload on every edit.
 */

import type { Employee, RiskBand } from '../../domain/types'
import { riskBand } from '../../lib/format'

/** Ordered worst-first: the band an analyst most often targets is at the top. */
export const RISK_BANDS: { value: RiskBand; label: string; hint: string }[] = [
  { value: 'high', label: 'High risk', hint: 'Score of 60 or more' },
  { value: 'elevated', label: 'Elevated', hint: 'Score of 40 to 59' },
  { value: 'low', label: 'Low risk', hint: 'Score under 40' },
]

/**
 * The exact employee set the API will end up targeting.
 *
 * Exported so the dialog can both preview the count and send the ids, without
 * two implementations of the same union.
 */
export function resolveAudience(
  employees: Employee[],
  departmentIds: number[],
  bands: RiskBand[],
): { all: number[]; fromBands: number[] } {
  const departments = new Set(departmentIds)
  const chosenBands = new Set(bands)

  const fromBands = employees
    .filter((employee) => chosenBands.has(riskBand(employee.current_risk_score)))
    .map((employee) => employee.id)

  const all = new Set(fromBands)
  for (const employee of employees) {
    if (departments.has(employee.department_id)) all.add(employee.id)
  }

  return { all: [...all].sort((a, b) => a - b), fromBands }
}
