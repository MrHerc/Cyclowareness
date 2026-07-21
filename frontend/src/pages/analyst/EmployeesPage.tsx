import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { api } from '../../lib/api'
import { usePoll } from '../../lib/usePoll'
import type { DepartmentRisk, Employee, EmployeeDetail } from '../../lib/types'
import { Badge, Card, LoadState, RiskBar, SectionTitle, cx, riskTone, timeAgo } from '../../components/ui'

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
    return <LoadState error={empError ?? deptError} label="Loading risk model…" onRetry={refresh} />

  const deptName = (id: number) => departments.find((d) => d.id === id)?.name ?? '—'
  const visible = deptFilter ? employees.filter((e) => e.department_id === deptFilter) : employees

  return (
    <div className="fade-in space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Employees & Risk</h1>
        <p className="text-sm text-muted">
          Transparent, explainable scores — every number traces back to concrete events. This score drives the TARGET stage.
        </p>
      </div>

      {/* dept heatmap / filter */}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
        {departments.map((d) => {
          const tone = riskTone(d.avg_risk)
          const active = deptFilter === d.id
          return (
            <button
              key={d.id}
              onClick={() => setDeptFilter(active ? null : d.id)}
              className={cx(
                'rounded-xl border p-3 text-left transition-colors',
                active ? 'border-accent/60 bg-accent/5' : 'border-border bg-surface hover:border-border-2',
              )}
            >
              <div className="truncate text-xs font-medium text-muted">{d.name}</div>
              <div className={cx('mt-1 text-xl font-bold tabular-nums', tone.text)}>{d.avg_risk.toFixed(0)}</div>
              <div className="text-[10px] text-faint">
                {d.employee_count} people · {d.high_risk_count} high
              </div>
            </button>
          )
        })}
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-2 text-left text-[11px] uppercase tracking-wide text-faint">
              <th className="px-4 py-2.5 font-medium">Employee</th>
              <th className="px-4 py-2.5 font-medium">Department</th>
              <th className="px-4 py-2.5 font-medium">Role</th>
              <th className="px-4 py-2.5 font-medium">Sensitivity</th>
              <th className="px-4 py-2.5 font-medium">Risk score</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((e) => (
              <tr
                key={e.id}
                onClick={() => setSelectedId(e.id)}
                className="cursor-pointer border-b border-border/60 transition-colors last:border-0 hover:bg-surface-2"
              >
                <td className="px-4 py-2.5 font-medium">{e.name}</td>
                <td className="px-4 py-2.5 text-muted">{deptName(e.department_id)}</td>
                <td className="px-4 py-2.5 text-muted">{e.role_title}</td>
                <td className="px-4 py-2.5">
                  <div className="h-1.5 w-14 overflow-hidden rounded-full bg-surface-3">
                    <div className="h-full bg-indigo" style={{ width: `${e.role_sensitivity * 100}%` }} />
                  </div>
                </td>
                <td className="px-4 py-2.5">
                  <RiskBar score={e.current_risk_score} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </Card>

      {selectedId !== null && <EmployeeDrawer id={selectedId} onClose={() => setSelectedId(null)} />}
    </div>
  )
}

function EmployeeDrawer({ id, onClose }: { id: number; onClose: () => void }) {
  const [detail, setDetail] = useState<EmployeeDetail | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setDetail(null)
    setError(null)
    let alive = true
    api
      .get<EmployeeDetail>(`/api/employees/${id}`)
      .then((d) => alive && setDetail(d))
      .catch((e) => alive && setError(e instanceof Error ? e.message : 'Failed to load'))
    return () => {
      alive = false
    }
  }, [id])

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50" onClick={onClose}>
      <div
        className="h-full w-full max-w-md overflow-y-auto border-l border-border bg-surface p-6 shadow-2xl fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {!detail ? (
          <LoadState error={error} />
        ) : (
          <>
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold">{detail.name}</h2>
                <p className="text-sm text-muted">
                  {detail.role_title} · {detail.department_name}
                </p>
              </div>
              <button onClick={onClose} className="text-muted hover:text-ink">
                <X size={18} />
              </button>
            </div>

            <div className="mt-5 rounded-xl border border-border bg-surface-2 p-4 text-center">
              <div className="text-[11px] uppercase tracking-wide text-faint">Current risk score</div>
              <div className={cx('mt-1 text-4xl font-bold tabular-nums', riskTone(detail.current_risk_score).text)}>
                {detail.current_risk_score.toFixed(1)}
              </div>
              <div className="mt-1 text-xs text-muted">{riskTone(detail.current_risk_score).label} risk</div>
            </div>

            <div className="mt-5">
              <SectionTitle>Score breakdown (explainable)</SectionTitle>
              <div className="space-y-1.5">
                {detail.risk_breakdown.map((f) => (
                  <div key={f.factor} className="flex items-center gap-2 text-xs">
                    <span className="w-44 truncate text-muted">{f.label}</span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3">
                      <div
                        className={cx('h-full rounded-full', f.contribution >= 0 ? 'bg-bad' : 'bg-good')}
                        style={{ width: `${Math.min(100, Math.abs(f.contribution) * 2.2)}%` }}
                      />
                    </div>
                    <span
                      className={cx(
                        'w-12 text-right font-mono font-semibold tabular-nums',
                        f.contribution >= 0 ? 'text-bad' : 'text-good',
                      )}
                    >
                      {f.contribution > 0 ? '+' : ''}
                      {f.contribution.toFixed(1)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5">
              <SectionTitle>Recent risk events (audit trail)</SectionTitle>
              <div className="space-y-1.5">
                {detail.recent_events.length === 0 && (
                  <p className="text-xs text-faint">No events yet.</p>
                )}
                {detail.recent_events.map((e) => (
                  <div key={e.id} className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs">
                    <div className="flex items-center justify-between">
                      <Badge value={e.type} />
                      <span
                        className={cx(
                          'font-mono font-semibold tabular-nums',
                          e.delta > 0 ? 'text-bad' : 'text-good',
                        )}
                      >
                        {e.delta > 0 ? '+' : ''}
                        {e.delta.toFixed(1)}
                      </span>
                    </div>
                    <p className="mt-1 text-muted">{e.reason}</p>
                    <p className="mt-0.5 text-[10px] text-faint">{timeAgo(e.created_at)}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
