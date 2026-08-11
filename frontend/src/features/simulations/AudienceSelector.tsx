/**
 * Who receives the campaign — departments, risk bands, or both.
 *
 * The count under the controls is computed the same way the server computes it:
 * the union of everyone in the chosen departments and everyone whose current
 * score falls in a chosen band. That matters because the API expands
 * `target_department_ids` itself, so a preview built from a different rule
 * would promise a number the campaign then does not match.
 *
 * Band boundaries are not restated here as literals — they come from
 * `riskBand()`, which is the one place this product decides what "high" means.
 */

import { useT } from '../../lib/i18n'
import { Checkbox } from '../../components/ui'
import type { DepartmentRisk, Employee, RiskBand } from '../../domain/types'
import { num, riskBand } from '../../lib/format'
import { RISK_BANDS } from './audience'

export interface AudienceSelectorProps {
  departments: DepartmentRisk[]
  employees: Employee[]
  departmentIds: number[]
  onDepartmentIdsChange: (next: number[]) => void
  bands: RiskBand[]
  onBandsChange: (next: RiskBand[]) => void
  /** How many people the current selection resolves to. */
  selectedCount: number
  /** True while the people list is still arriving — the counts are not final. */
  loading?: boolean
  error?: string | null
}

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value]
}

export function AudienceSelector({
  departments,
  employees,
  departmentIds,
  onDepartmentIdsChange,
  bands,
  onBandsChange,
  selectedCount,
  loading = false,
  error,
}: AudienceSelectorProps) {
  const t = useT()
  const bandCounts = new Map<RiskBand, number>()
  for (const employee of employees) {
    const band = riskBand(employee.current_risk_score)
    bandCounts.set(band, (bandCounts.get(band) ?? 0) + 1)
  }

  return (
    <fieldset className="min-w-0">
      <legend className="text-sm font-medium text-fg-muted">{t('u.target-audience')}</legend>
      <p className="mt-1 text-xs text-fg-faint">{t('p.pick-departments-risk-bands-or-both')}</p>

      <div className="mt-3 grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <p className="label text-fg-faint">Departments</p>
          <div className="mt-2 space-y-2">
            {departments.length === 0 ? (
              <p className="text-sm text-fg-faint">{t('p.no-departments-are-recorded')}</p>
            ) : (
              departments.map((department) => (
                <Checkbox
                  key={department.id}
                  label={
                    <span>
                      {department.name}
                      <span className="ml-2 text-xs text-fg-faint">
                        {num(department.employee_count)} people
                      </span>
                    </span>
                  }
                  checked={departmentIds.includes(department.id)}
                  onCheckedChange={() =>
                    onDepartmentIdsChange(toggle(departmentIds, department.id))
                  }
                />
              ))
            )}
          </div>
        </div>

        <div>
          <p className="label text-fg-faint">{t('u.risk-band')}</p>
          <div className="mt-2 space-y-2">
            {RISK_BANDS.map((band) => (
              <Checkbox
                key={band.value}
                label={
                  <span>
                    {t(band.labelKey)}
                    <span className="ml-2 text-xs text-fg-faint">
                      {loading ? 'counting…' : `${num(bandCounts.get(band.value) ?? 0)} people`}
                    </span>
                  </span>
                }
                hint={t(band.hintKey)}
                disabled={loading}
                checked={bands.includes(band.value)}
                onCheckedChange={() => onBandsChange(toggle(bands, band.value))}
              />
            ))}
          </div>
        </div>
      </div>

      <p aria-live="polite" className="mt-4 text-sm text-fg">
        {loading
          ? t('p.still-loading-the-people-list-the')
          : selectedCount === 0
            ? t('p.nobody-is-selected-yet')
            : `${num(selectedCount)} ${selectedCount === 1 ? 'person' : 'people'} will be targeted.`}
      </p>
      {error ? (
        <p role="alert" className="mt-1 text-xs text-critical">
          {error}
        </p>
      ) : null}
    </fieldset>
  )
}
