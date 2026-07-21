import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, ShieldQuestion } from 'lucide-react'
import { api } from '../../lib/api'
import { usePoll } from '../../lib/usePoll'
import type { Report } from '../../lib/types'
import { Badge, Button, Card, EmptyState, LoadState, SectionTitle, Tabs, channelLabel, timeAgo } from '../../components/ui'

const TABS = [
  { key: 'new', label: 'New' },
  { key: 'in_loop', label: 'In the loop' },
  { key: 'dismissed', label: 'Dismissed' },
] as const

export function TriageQueue() {
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('new')
  const { data: reports, error: loadError, refresh } = usePoll<Report[]>(
    () => api.get(`/api/reports?status=${tab}`),
    4000,
    [tab],
  )
  const navigate = useNavigate()
  const [busyId, setBusyId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const pushToLoop = async (report: Report) => {
    setBusyId(report.id)
    setError(null)
    try {
      const res = await api.post<{ loop_run_id: number }>(`/api/reports/${report.id}/push-to-loop`)
      navigate(`/loop/${res.loop_run_id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
      setBusyId(null)
    }
  }

  const dismiss = async (report: Report) => {
    setBusyId(report.id)
    try {
      await api.post(`/api/reports/${report.id}/dismiss`)
      await refresh()
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="fade-in space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Triage Queue</h1>
        <p className="text-sm text-muted">
          The human sensor at work — suspicious artifacts reported by employees, pre-triaged by AI.
        </p>
      </div>

      <Tabs tabs={TABS} value={tab} onChange={setTab} />

      {error && <div className="text-sm text-bad">{error}</div>}

      {!reports ? (
        <LoadState error={loadError} onRetry={refresh} />
      ) : reports.length === 0 ? (
        <EmptyState>
          <ShieldQuestion size={20} className="mx-auto mb-2 text-faint" />
          Nothing here — {tab === 'new' ? 'the queue is clear.' : 'no reports in this state.'}
        </EmptyState>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <Card key={report.id} className="p-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold">{report.employee_name}</span>
                <span className="text-xs text-faint">· {report.department_name}</span>
                <Badge value={report.artifact_type} label={channelLabel(report.artifact_type)} />
                {report.triage_summary && <Badge value={report.triage_summary.suspicion_level} label={`${report.triage_summary.suspicion_level} suspicion`} />}
                <Badge value={report.status} />
                <span className="ml-auto text-xs text-faint">{timeAgo(report.created_at)}</span>
              </div>

              {report.note && <p className="mt-2 text-sm italic text-muted">“{report.note}”</p>}

              <pre className="mt-3 max-h-36 overflow-auto whitespace-pre-wrap rounded-lg border border-border bg-bg p-3 font-mono text-[11px] leading-relaxed text-muted">
                {report.artifact_ref}
              </pre>

              {report.triage_summary && (
                <div className="mt-3 rounded-lg border border-indigo/25 bg-indigo/5 p-3">
                  <SectionTitle>AI triage assist</SectionTitle>
                  <p className="text-[13px] leading-relaxed">{report.triage_summary.summary}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {report.triage_summary.indicators.map((ind) => (
                      <span key={ind} className="rounded-md border border-warn/30 bg-warn/10 px-1.5 py-0.5 text-[10px] text-warn">
                        {ind}
                      </span>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-muted">
                    <span className="font-semibold text-indigo">Recommended:</span> {report.triage_summary.recommended_action}
                  </p>
                </div>
              )}

              {report.status === 'new' && (
                <div className="mt-4 flex gap-2">
                  <Button busy={busyId === report.id} onClick={() => void pushToLoop(report)}>
                    Push into the loop <ArrowRight size={14} />
                  </Button>
                  <Button variant="ghost" busy={busyId === report.id} onClick={() => void dismiss(report)}>
                    Dismiss (false alarm)
                  </Button>
                </div>
              )}
              {report.status === 'in_loop' && report.linked_loop_run_id && (
                <div className="mt-4">
                  <Button variant="subtle" onClick={() => navigate(`/loop/${report.linked_loop_run_id}`)}>
                    View loop run #{report.linked_loop_run_id} <ArrowRight size={14} />
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
