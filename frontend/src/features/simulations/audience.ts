/**
 * Who a campaign will actually target.
 *
 * Apart from the selector that renders it because Fast Refresh only works
 * when a module exports components alone — a file that also exports a
 * constant or a helper falls back to a full reload on every edit.
 */

import type { MessageKey } from '../../lib/i18n'
import type { Employee, RiskBand } from '../../domain/types'
import { riskBand } from '../../lib/format'

/**
 * Ordered worst-first: the band an analyst most often targets is at the top.
 *
 * `labelKey`/`hintKey` carry the catalogue entries; the English stays as the
 * fallback. A module-scope constant cannot call `useT()`, so the lookup belongs
 * to the component that renders it — the same split `app/navigation.ts` uses.
 */
export const RISK_BANDS: {
  value: RiskBand
  label: string
  labelKey: MessageKey
  hint: string
  hintKey: MessageKey
}[] = [
  {
    value: 'high',
    label: 'High risk',
    labelKey: 'u.high-risk',
    hint: 'Score of 60 or more',
    hintKey: 'u.score-of-60-or-more',
  },
  {
    value: 'elevated',
    label: 'Elevated',
    labelKey: 'u.elevated',
    hint: 'Score of 40 to 59',
    hintKey: 'u.score-of-40-to-59',
  },
  {
    value: 'low',
    label: 'Low risk',
    labelKey: 'u.low-risk',
    hint: 'Score under 40',
    hintKey: 'u.score-under-40',
  },
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
