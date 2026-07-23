import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, ScanSearch, ShieldQuestion } from 'lucide-react'
import { api } from '../../lib/api'
import { usePoll } from '../../lib/usePoll'
import type { Report } from '../../lib/types'
import {
  Button,
  Callout,
  Chip,
  CodeBlock,
  Empty,
  GroupLabel,
  LoadState,
  PageHeader,
  Panel,
  Provenance,
  Status,
  Tabs,
  channelLabel,
  timeAgo,
} from '../../components/ui'

const TABS = [
  { key: 'new', label: 'New' },
  { key: 'in_loop', label: 'In the loop' },
  { key: 'dismissed', label: 'Dismissed' },
] as const

/** Suspicion is a risk reading, so it uses the risk tones — never the brand. */
const SUSPICION_TONE: Record<'high' | 'medium' | 'low', 'danger' | 'warning' | 'info'> = {
  high: 'danger',
  medium: 'warning',
  low: 'info',
}

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
    setError(null)
    try {
      await api.post(`/api/reports/${report.id}/dismiss`)
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Dismiss failed')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="rise space-y-6">
      <PageHeader
        title="Triage queue"
        lede="The human sensor at work — suspicious artifacts reported by employees, pre-triaged by AI. Push one into the loop, or dismiss it."
      />

      <Tabs label="Report status" tabs={TABS} value={tab} onChange={setTab} />

      {/* Both actions write through this one error surface. */}
      <div role="alert" aria-live="polite">
        {error && <Callout tone="danger">{error}</Callout>}
      </div>

      {!reports ? (
        <LoadState error={loadError} label="Loading reports" onRetry={refresh} />
      ) : reports.length === 0 ? (
        <Empty icon={<ShieldQuestion size={20} aria-hidden />}>
          {tab === 'new' ? 'Nothing here — the queue is clear.' : 'Nothing here — no reports in this state.'}
        </Empty>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              busy={busyId === report.id}
              onPush={() => void pushToLoop(report)}
              onDismiss={() => void dismiss(report)}
              onOpenRun={(id) => navigate(`/loop/${id}`)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/* --- pieces ---------------------------------------------------------------- */

function ReportCard({
  report,
  busy,
  onPush,
  onDismiss,
  onOpenRun,
}: {
  report: Report
  busy: boolean
  onPush: () => void
  onDismiss: () => void
  onOpenRun: (loopRunId: number) => void
}) {
  const triage = report.triage_summary
  // Both are optional on the payload — never render `undefined` as a name.
  const reporter = report.employee_name ?? 'Unknown reporter'
  const meta = [report.department_name, channelLabel(report.artifact_type)].filter(Boolean).join(' · ')
  const runId = report.linked_loop_run_id

  return (
    <Panel
      // A report the analyst still has to decide on is the one to look at.
      tone={report.status === 'new' ? 'feature' : 'default'}
      title={reporter}
      subtitle={meta}
      actions={
        <>
          <Status value={report.status} />
          <span className="text-xs whitespace-nowrap text-c3">{timeAgo(report.created_at)}</span>
        </>
      }
      footer={
        report.status === 'new' ? (
          <div className="flex flex-wrap items-center gap-2">
            {/* The decision, not two equal options: one act moves the threat
                into the loop, the other closes it. `busy` disables both for
                this row so a double-click cannot push and dismiss at once. */}
            <Button variant="primary" busy={busy} onClick={onPush}>
              Push into the loop <ArrowRight size={14} aria-hidden />
            </Button>
            <Button variant="ghost" busy={busy} onClick={onDismiss}>
              Dismiss as a false alarm
            </Button>
          </div>
        ) : report.status === 'in_loop' && runId ? (
          <Button variant="secondary" size="sm" onClick={() => onOpenRun(runId)}>
            Open loop run #{runId} <ArrowRight size={13} aria-hidden />
          </Button>
        ) : undefined
      }
    >
      <div className="space-y-4">
        {/* The verdict the analyst decides on, immediately under the reporter. */}
        {triage ? (
          <Callout
            tone={SUSPICION_TONE[triage.suspicion_level]}
            /* Name the engine that actually produced this. When no model is
               configured, the summary comes from a keyword and IOC extractor —
               still useful, but not a model's judgement, and the analyst is
               deciding whether to trust it. */
            title={`${triage.source === 'anthropic' ? 'AI triage' : 'Automated triage'} · ${triage.suspicion_level} suspicion`}
            icon={<ScanSearch size={13} aria-hidden />}
            actions={<Provenance source={triage.source ?? 'mock'} />}
          >
            <p className="leading-relaxed text-c1">{triage.summary}</p>
            {triage.indicators.length > 0 && (
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {triage.indicators.map((ind) => (
                  <Chip key={ind}>{ind}</Chip>
                ))}
              </div>
            )}
            <p className="text-sm mt-2.5 text-c2">
              <span className="font-medium text-c1">Recommended</span> · {triage.recommended_action}
            </p>
          </Callout>
        ) : (
          <p className="text-sm text-c3">No AI triage on this report — read the artifact yourself.</p>
        )}

        {report.note && (
          <div>
            <GroupLabel>What the reporter said</GroupLabel>
            <p className="text-sm leading-relaxed text-c2">“{report.note}”</p>
          </div>
        )}

        <div>
          <GroupLabel>Reported artifact</GroupLabel>
          <CodeBlock maxHeight={160}>{report.artifact_ref}</CodeBlock>
        </div>
      </div>
    </Panel>
  )
}
