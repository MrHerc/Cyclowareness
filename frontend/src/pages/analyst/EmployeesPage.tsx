import { useEffect, useState } from 'react'
import { Users } from 'lucide-react'
import { api } from '../../lib/api'
import { usePoll } from '../../lib/usePoll'
import type { DepartmentRisk, Employee, EmployeeDetail } from '../../lib/types'
import {
  DeptTile,
  Drawer,
  Empty,
  GroupLabel,
  LoadState,
  Metric,
  PageHeader,
  Panel,
  RiskMeter,
  Status,
  TD,
  TH,
  Table,
  cx,
  pct,
  riskBand,
  signed,
  timeAgo,
} from '../../components/ui'

export function EmployeesPage() {
  const { data: employees, error: empError, refresh } = usePoll<Employee[]>(
    () => api.get('/api/employees'),
    5000,
  )
  const { data: departments, error: deptError } = usePoll<DepartmentRisk[]>(
    () => api.get('/api/departments'),
    5000,
  )
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [deptFilter, setDeptFilter] = useState<number | null>(null)

  if (!employees || !departments)
    return <LoadState error={empError ?? deptError} label="Loading the risk model" onRetry={refresh} />

  const deptName = (id: number) => departments.find((d) => d.id === id)?.name ?? '—'
  const visible = deptFilter ? employees.filter((e) => e.department_id === deptFilter) : employees

  return (
    <div className="rise space-y-6">
      <PageHeader
        title="People and risk"
        lede="Every score traces back to concrete events, and every event is listed. This model decides who the TARGET stage picks."
      />

      <Panel
        title="Risk by department"
        subtitle="Select a department to filter the list below. Select it again to clear."
      >
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
          {departments.map((d) => (
            <DeptTile
              key={d.id}
              name={d.name}
              avgRisk={d.avg_risk}
              employeeCount={d.employee_count}
              highRiskCount={d.high_risk_count}
              selected={deptFilter === d.id}
              onClick={() => setDeptFilter(deptFilter === d.id ? null : d.id)}
            />
          ))}
        </div>
      </Panel>

      <Panel
        title="People"
        subtitle={deptFilter ? `Filtered to ${deptName(deptFilter)}` : undefined}
        actions={<span className="text-sm text-c3">{visible.length}</span>}
      >
        {visible.length === 0 ? (
          <Empty icon={<Users size={16} aria-hidden />}>No people in this department yet.</Empty>
        ) : (
          <Table minWidth={640}>
            <thead>
              <tr>
                <TH>Employee</TH>
                <TH>Department</TH>
                <TH>Role</TH>
                <TH numeric>Role sensitivity</TH>
                <TH numeric>Risk score</TH>
              </tr>
            </thead>
            <tbody>
              {visible.map((e) => (
                /* The row stays clickable for the mouse, but the name is a real
                   button — that is the keyboard and screen-reader path into the
                   drawer, which a bare onClick on the <tr> never provided. */
                <tr
                  key={e.id}
                  onClick={() => setSelectedId(e.id)}
                  className="cursor-pointer transition-colors hover:bg-raised"
                >
                  <TD>
                    <button
                      type="button"
                      onClick={() => setSelectedId(e.id)}
                      aria-label={`Open the risk breakdown for ${e.name}`}
                      className="rounded-chip text-left font-medium text-c1 hover:underline"
                    >
                      {e.name}
                    </button>
                  </TD>
                  <TD muted>{deptName(e.department_id)}</TD>
                  <TD muted>{e.role_title}</TD>
                  <TD numeric>
                    <span className="inline-flex items-center gap-2">
                      <span className="h-1 w-12 overflow-hidden rounded-full bg-sunken" aria-hidden>
                        <span
                          className="block h-full rounded-full bg-line-strong"
                          style={{ width: `${Math.min(100, Math.max(0, e.role_sensitivity * 100))}%` }}
                        />
                      </span>
                      <span className="text-sm w-9 text-right text-c2">{pct(e.role_sensitivity)}</span>
                    </span>
                  </TD>
                  <TD numeric>
                    <RiskMeter score={e.current_risk_score} />
                  </TD>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Panel>

      {selectedId !== null && <EmployeeDrawer id={selectedId} onClose={() => setSelectedId(null)} />}
    </div>
  )
}

/**
 * Hand-tuned scaling: contributions are small numbers, so ×2.2 makes a large
 * factor fill the track without a second pass over the data. The track itself
 * is always drawn, so a contribution of exactly 0 still reads as "measured,
 * moved nothing" instead of vanishing.
 */
function barWidth(contribution: number): string {
  return `${Math.min(100, Math.abs(contribution) * 2.2)}%`
}

function EmployeeDrawer({ id, onClose }: { id: number; onClose: () => void }) {
  const [detail, setDetail] = useState<EmployeeDetail | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setDetail(null)
    setError(null)
    // `alive` drops a response that lands after the drawer moved to another
    // employee — otherwise a slow request overwrites the newer one.
    let alive = true
    api
      .get<EmployeeDetail>(`/api/employees/${id}`)
      .then((d) => alive && setDetail(d))
      .catch((e) => alive && setError(e instanceof Error ? e.message : 'Failed to load'))
    return () => {
      alive = false
    }
  }, [id])

  const band = detail ? riskBand(detail.current_risk_score) : null

  return (
    <Drawer title={detail?.name ?? 'Employee'} onClose={onClose}>
      <div aria-live="polite" aria-busy={!detail && !error}>
        {!detail || !band ? (
          <LoadState error={error} label="Loading the breakdown" />
        ) : (
          <div className="space-y-6">
            <p className="text-sm text-c2">
              {detail.role_title} · {detail.department_name}
            </p>

            <Metric
              label="Current risk score"
              value={detail.current_risk_score.toFixed(1)}
              caption={`${band.label} band · scale 0–100`}
              tone={band.tone}
            />

            <section>
              <GroupLabel right={<span className="text-xs text-c3">contribution to the score</span>}>
                Score breakdown
              </GroupLabel>
              {detail.risk_breakdown.length === 0 ? (
                <Empty>Nothing has scored against this person yet.</Empty>
              ) : (
                <ul className="space-y-2">
                  {detail.risk_breakdown.map((f) => (
                    <li key={f.factor} className="flex items-center gap-3">
                      <span className="text-sm w-44 shrink-0 truncate text-c2">{f.label}</span>
                      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-sunken">
                        <span
                          className={cx(
                            'block h-full rounded-full',
                            f.contribution >= 0 ? 'bg-danger' : 'bg-success',
                          )}
                          style={{ width: barWidth(f.contribution) }}
                        />
                      </span>
                      <span
                        className={cx(
                          'text-sm w-12 shrink-0 text-right font-mono font-semibold',
                          f.contribution >= 0 ? 'text-danger' : 'text-success',
                        )}
                      >
                        {signed(f.contribution)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <GroupLabel>Risk events</GroupLabel>
              {detail.recent_events.length === 0 ? (
                <Empty>No risk events recorded yet.</Empty>
              ) : (
                <ul className="space-y-2">
                  {detail.recent_events.map((e) => (
                    <li key={e.id} className="rounded-control border border-hair bg-raised px-3 py-2.5">
                      <div className="flex items-center justify-between gap-3">
                        <Status value={e.type} />
                        <span
                          className={cx(
                            'text-sm font-mono font-semibold',
                            e.delta > 0 ? 'text-danger' : e.delta < 0 ? 'text-success' : 'text-c3',
                          )}
                        >
                          {signed(e.delta)}
                        </span>
                      </div>
                      <p className="text-sm mt-1.5 text-c2">{e.reason}</p>
                      <p className="text-xs mt-1 text-c3">{timeAgo(e.created_at)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </div>
    </Drawer>
  )
}
