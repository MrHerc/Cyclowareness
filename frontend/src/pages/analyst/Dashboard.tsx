import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { HelpCircle, Plus, RotateCcw } from 'lucide-react'
import { Tour, hasSeenTour, type TourStep } from '../../components/Tour'
import { api } from '../../lib/api'
import { usePoll } from '../../lib/usePoll'
import { useLoopStream } from '../../lib/useLoopStream'
import { useCapabilities } from '../../lib/useCapabilities'
import type { AnalystDashboard as Dash, RunSummary } from '../../lib/types'
import { LoopViz, StageTracker } from '../../components/LoopViz'
import { ChartLegend, OutcomeTrendChart, RiskTrendChart } from '../../components/charts'
import {
  Button,
  Callout,
  DeptTile,
  Empty,
  Input,
  LoadState,
  Metric,
  Modal,
  PageHeader,
  Panel,
  Select,
  Status,
  Textarea,
  cx,
  metricSub,
  pct,
  signed,
  timeAgo,
} from '../../components/ui'
import { STAGES } from '../../lib/types'

const TOUR_STEPS: TourStep[] = [
  {
    title: 'Cyclowareness in sixty seconds',
    body: 'A real threat becomes targeted training for the exact people it would have worked on, and the result feeds back into who gets targeted next. Press → or click anywhere to advance.',
  },
  {
    target: '[data-tour="attention"]',
    title: 'Start here',
    body: 'Reports waiting to be triaged, AI-written training waiting for your approval, live simulations, and runs currently in flight. These four numbers are every way into the loop.',
  },
  {
    target: '[data-tour="loop"]',
    title: 'The loop, turning',
    body: 'Seven stages. The badge on a stage is how many runs are sitting there right now. Between Convert and Target there is a human gate — nothing reaches an employee without an analyst approving it.',
  },
  {
    target: '[data-tour="metrics"]',
    title: 'The evidence',
    body: 'Click rate should fall, report rate should rise, average risk should drift down. Where a window has too few events to be meaningful, it says so instead of showing a number.',
  },
  {
    target: '[data-tour="runs"]',
    title: 'Runs in flight',
    body: 'Each row is a live LoopRun. Open one to see the sandbox verdict, the generated module, who was targeted and exactly why.',
  },
  {
    target: '[data-tour="heatmap"]',
    title: 'Where the risk sits',
    body: 'Department roll-ups. The riskiest departments are targeted first when a matching threat enters the loop — targeted, never blasted to everyone.',
  },
  {
    target: '[data-tour="actions"]',
    title: 'Try it yourself',
    body: 'Submit any artifact — an email, a link, an SMS, a QR target — and watch it travel all seven stages.',
  },
]

export function AnalystDashboard() {
  const { data, error, refresh } = usePoll<Dash>(() => api.get('/api/dashboard/analyst'), 4000)
  const caps = useCapabilities()
  const [showSubmit, setShowSubmit] = useState(false)
  const [showReset, setShowReset] = useState(false)
  const [showTour, setShowTour] = useState(false)

  // Instant refresh on any stage transition; polling is the fallback.
  useLoopStream(refresh)

  useEffect(() => {
    if (data && !hasSeenTour()) {
      const t = setTimeout(() => setShowTour(true), 700)
      return () => clearTimeout(t)
    }
  }, [data])

  if (!data) return <LoadState error={error} label="Loading the loop" onRetry={refresh} />

  const m = data.metrics

  return (
    <div className="rise space-y-6">
      <PageHeader
        title="Loop"
        lede="Every threat currently travelling from report to measured behaviour change."
        actions={
          <span className="flex items-center gap-2" data-tour="actions">
            <Button variant="ghost" size="sm" onClick={() => setShowTour(true)}>
              <HelpCircle size={14} aria-hidden /> Tour
            </Button>
            {/* Wiping and re-seeding exists only in the exhibition build. */}
            {caps.demo_mode && (
              <Button variant="ghost" size="sm" onClick={() => setShowReset(true)}>
                <RotateCcw size={14} aria-hidden /> Reset demo
              </Button>
            )}
            <Button variant="primary" onClick={() => setShowSubmit(true)}>
              <Plus size={15} aria-hidden /> Submit artifact
            </Button>
          </span>
        }
      />

      {/* One strip, four readings. Four separate cards gave a queue of zero the
          same visual weight as the loop itself. */}
      <nav
        aria-label="Work waiting"
        data-tour="attention"
        className="grid grid-cols-2 divide-hair overflow-hidden rounded-panel border border-hair bg-panel sm:grid-cols-4 sm:divide-x sm:[&>*+*]:border-t-0"
      >
        <Counter to="/reports" label="Reports to triage" value={data.counts.new_reports} urgent />
        <Counter to="/training" label="Training to approve" value={data.counts.awaiting_approval} urgent />
        <Counter to="/simulations" label="Live simulations" value={data.counts.active_simulations} />
        <Counter to="/employees" label="Runs in flight" value={data.counts.active_runs} />
      </nav>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Panel
          tone="feature"
          title="The loop"
          subtitle="ingest → analyze → convert → target → train → measure → feedback"
          data-tour="loop"
        >
          <LoopViz activeRuns={data.active_runs} loopsClosed={data.counts.loops_closed} />
        </Panel>

        <div className="space-y-3" data-tour="metrics">
          <Metric
            label="Phishing click rate"
            value={pct(m.phishing_click_rate)}
            caption={metricSub(m.phishing_click_rate, m.simulation_sample, m.window_days, 'lower is better')}
            tone={m.phishing_click_rate !== null && m.phishing_click_rate > 0.25 ? 'danger' : 'neutral'}
          />
          <Metric
            label="Report rate"
            value={pct(m.report_rate)}
            caption={metricSub(m.report_rate, m.simulation_sample, m.window_days, 'the human sensor')}
            tone={m.report_rate !== null ? 'success' : 'neutral'}
          />
          <Metric
            label="Average risk score"
            value={m.avg_risk_score !== null ? m.avg_risk_score.toFixed(1) : '—'}
            caption="organisation-wide, 0–100"
            tone={m.avg_risk_score !== null && m.avg_risk_score >= 55 ? 'warning' : 'neutral'}
          />
          <Metric
            label="Training completion"
            value={pct(m.training_completion_rate)}
            caption={metricSub(m.training_completion_rate, m.training_sample, m.window_days, 'assigned modules finished')}
          />
        </div>
      </div>

      <Panel
        title="Runs in flight"
        actions={<span className="text-sm text-c3">{data.active_runs.length}</span>}
        data-tour="runs"
      >
        {data.active_runs.length === 0 ? (
          <Empty>Nothing in flight. Triage a report or submit an artifact to start a run.</Empty>
        ) : (
          <ul className="divide-hair">
            {data.active_runs.map((run) => (
              <RunRow key={run.id} run={run} />
            ))}
          </ul>
        )}
      </Panel>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel
          title="Behaviour over time"
          actions={
            <ChartLegend
              items={[
                { label: 'click rate', color: 'var(--color-series-1)' },
                { label: 'report rate', color: 'var(--color-series-2)' },
              ]}
            />
          }
        >
          <OutcomeTrendChart data={data.trend} />
        </Panel>
        <Panel title="Organisation risk">
          <RiskTrendChart data={data.trend} />
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel
          title="Risk by department"
          actions={
            <Link to="/employees" className="text-sm text-brand-fg hover:underline">
              All people
            </Link>
          }
          data-tour="heatmap"
        >
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
            {data.departments.map((d) => (
              <DeptTile
                key={d.id}
                name={d.name}
                avgRisk={d.avg_risk}
                employeeCount={d.employee_count}
                highRiskCount={d.high_risk_count}
              />
            ))}
          </div>
        </Panel>

        <Panel title="Risk events" subtitle="Every score movement, as it happens">
          {data.recent_events.length === 0 ? (
            <Empty>No scored events yet.</Empty>
          ) : (
            <ul className="divide-hair">
              {data.recent_events.map((e) => (
                <li key={e.id} className="text-sm flex items-center gap-3 py-1.5">
                  <span
                    className={cx(
                      'w-12 shrink-0 text-right font-mono font-semibold',
                      e.delta > 0 ? 'text-danger' : e.delta < 0 ? 'text-success' : 'text-c3',
                    )}
                  >
                    {signed(e.delta)}
                  </span>
                  <span className="w-32 shrink-0 truncate font-medium">{e.employee_name}</span>
                  <span className="flex-1 truncate text-c2">{e.reason}</span>
                  <span className="text-xs shrink-0 text-c3">{timeAgo(e.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel title="Closed loops" subtitle="Runs that reached measured feedback">
        {data.recent_runs.length === 0 ? (
          <Empty>No loop has closed yet.</Empty>
        ) : (
          <ul className="divide-hair">
            {data.recent_runs.map((run) => (
              <RunRow key={run.id} run={run} />
            ))}
          </ul>
        )}
      </Panel>

      {showSubmit && <SubmitArtifactModal onClose={() => setShowSubmit(false)} />}
      {showReset && (
        <ResetDemoModal
          onClose={() => setShowReset(false)}
          onDone={() => {
            setShowReset(false)
            void refresh()
          }}
        />
      )}
      {showTour && <Tour steps={TOUR_STEPS} onClose={() => setShowTour(false)} />}
    </div>
  )
}

/* --- pieces ---------------------------------------------------------------- */

function Counter({ to, label, value, urgent }: { to: string; label: string; value: number; urgent?: boolean }) {
  const hot = urgent && value > 0
  return (
    <Link to={to} className="group flex flex-col gap-1 px-4 py-3.5 transition-colors hover:bg-raised">
      <span className="label text-c3">{label}</span>
      <span className={cx('text-title font-semibold', hot ? 'text-warning' : 'text-c1')}>{value}</span>
    </Link>
  )
}

function RunRow({ run }: { run: RunSummary }) {
  const stage = STAGES.find((s) => s.n === run.current_stage)
  return (
    <li>
      <Link
        to={`/loop/${run.id}`}
        className="-mx-2 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-control px-2 py-2.5 transition-colors hover:bg-raised"
      >
        <span className="text-xs w-9 shrink-0 font-mono text-c3">#{run.id}</span>
        <span className="text-body min-w-48 flex-1 truncate font-medium">{run.threat_title}</span>
        {run.verdict && <Status value={run.verdict} />}
        {run.source && <Status value={run.source} />}
        <span className="flex items-center gap-2">
          <StageTracker history={run.stage_history} status={run.status} size="sm" />
          <span className="text-xs w-16 text-c2">{stage?.label}</span>
        </span>
        <Status value={run.status} />
        <span className="text-xs w-14 shrink-0 text-right text-c3">{timeAgo(run.created_at)}</span>
      </Link>
    </li>
  )
}

/* --- modals ---------------------------------------------------------------- */

function ResetDemoModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reset = async () => {
    setBusy(true)
    setError(null)
    try {
      await api.post('/api/admin/reset-demo')
      onDone()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Reset failed')
      setBusy(false)
    }
  }

  return (
    <Modal title="Reset the demo world?" size="sm" onClose={onClose}>
      <p className="text-body leading-relaxed text-c2">
        This wipes everything and restores a fresh <span className="text-c1">Caspian Dynamics</span> — 26 people, six
        months of history, seeded runs and simulations, re-anchored to today.
      </p>
      {error && (
        <div className="mt-3" aria-live="polite">
          <Callout tone="danger">{error}</Callout>
        </div>
      )}
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="danger" onClick={() => void reset()} busy={busy}>
          <RotateCcw size={14} aria-hidden /> Reset
        </Button>
      </div>
    </Modal>
  )
}

const ARTIFACT_TYPES = [
  { value: 'email', label: 'Email' },
  { value: 'url', label: 'URL' },
  { value: 'file', label: 'File (name or description)' },
  { value: 'sms', label: 'SMS' },
  { value: 'qr', label: 'QR code target' },
  { value: 'chat', label: 'Chat message' },
]

function SubmitArtifactModal({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const [artifactType, setArtifactType] = useState('email')
  const [title, setTitle] = useState('')
  const [sender, setSender] = useState('')
  const [subject, setSubject] = useState('')
  const [content, setContent] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    setBusy(true)
    setError(null)
    try {
      const meta: Record<string, string> = {}
      if (sender) meta.sender = sender
      if (subject) meta.subject = subject
      const res = await api.post<{ loop_run_id: number }>('/api/threats', {
        artifact_type: artifactType,
        artifact_ref: content,
        title: title || subject || `Manual ${artifactType} submission`,
        artifact_meta: meta,
      })
      navigate(`/loop/${res.loop_run_id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Submission failed')
      setBusy(false)
    }
  }

  return (
    <Modal title="Submit an artifact" size="lg" onClose={onClose}>
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Type" value={artifactType} onChange={(e) => setArtifactType(e.target.value)}>
            {ARTIFACT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
          <Input
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Short label for this threat"
          />
        </div>
        {artifactType === 'email' && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Sender"
              value={sender}
              onChange={(e) => setSender(e.target.value)}
              placeholder="billing@suspicious.example"
            />
            <Input label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
        )}
        <Textarea
          label="Artifact content"
          mono
          rows={8}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Paste the email body, the URL, the message text or a description of the file"
          hint="This is what the sandbox analyses and what the training is written from."
        />
        {error && (
          <div aria-live="polite">
            <Callout tone="danger">{error}</Callout>
          </div>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => void submit()} busy={busy} disabled={!content.trim()}>
            Start the loop
          </Button>
        </div>
      </div>
    </Modal>
  )
}
