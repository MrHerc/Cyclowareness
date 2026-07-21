import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertTriangle, HelpCircle, Inbox, Plus, RotateCcw, Send } from 'lucide-react'
import { Tour, hasSeenTour, type TourStep } from '../../components/Tour'
import { api } from '../../lib/api'
import { usePoll } from '../../lib/usePoll'
import { useLoopStream } from '../../lib/useLoopStream'
import { useEscape } from '../../lib/useEscape'
import { useCapabilities } from '../../lib/useCapabilities'
import type { AnalystDashboard as Dash, RunSummary } from '../../lib/types'
import { LoopViz, StageTracker } from '../../components/LoopViz'
import { OutcomeTrendChart, RiskTrendChart } from '../../components/charts'
import {
  Badge,
  Button,
  Card,
  DeptRiskTile,
  EmptyState,
  LoadState,
  Modal,
  SectionTitle,
  StatCard,
  cx,
  metricSub,
  pct,
  timeAgo,
} from '../../components/ui'
import { STAGES } from '../../lib/types'

const TOUR_STEPS: TourStep[] = [
  {
    title: 'Welcome to Cyclowareness',
    body: "This is a closed-loop security-awareness platform. In 60 seconds you'll see how a real threat becomes personalized training for the exact people at risk — and how the result feeds back in. Use → or click anywhere to advance.",
  },
  {
    target: '[data-tour="loop"]',
    title: 'The loop, turning live',
    body: 'Every threat travels these seven stages: ingest → analyze → convert → target → train → measure → feedback. The number in each node is how many runs are at that stage right now. Click a run below to watch it move.',
  },
  {
    target: '[data-tour="attention"]',
    title: 'What needs you',
    body: 'Reported threats to triage, AI-generated training awaiting your approval, active simulations and runs in flight. These are your entry points into the loop.',
  },
  {
    target: '[data-tour="metrics"]',
    title: 'The proof it works',
    body: 'Four outcome metrics. Click rate should fall, report rate (your human sensors) should rise, and the average risk score should drift down as training lands. This is the before/after evidence.',
  },
  {
    target: '[data-tour="active-runs"]',
    title: 'Active loop runs',
    body: 'Each row is a live LoopRun with its stage tracker. Click any run to open the full timeline, the sandbox verdict, the AI-generated module and the targeting rationale.',
  },
  {
    target: '[data-tour="heatmap"]',
    title: 'Where the risk is',
    body: 'Department risk roll-ups. The riskiest departments get targeted first when a matching threat enters the loop — targeted, never blasted to everyone.',
  },
  {
    target: '[data-tour="actions"]',
    title: 'Start a loop yourself',
    body: 'Submit any artifact — an email, URL, SMS or QR target — and watch it flow through all seven stages. Reset demo restores a fresh world between exhibition visitors. That\'s the tour!',
  },
]

export function AnalystDashboard() {
  const { data, error, refresh } = usePoll<Dash>(() => api.get('/api/dashboard/analyst'), 4000)
  const caps = useCapabilities()
  const [showSubmit, setShowSubmit] = useState(false)
  const [showReset, setShowReset] = useState(false)
  const [showTour, setShowTour] = useState(false)

  // Instant refresh on any loop-stage transition (polling is the fallback).
  useLoopStream(refresh)

  // Auto-launch the tour once, after the dashboard has data to spotlight.
  useEffect(() => {
    if (data && !hasSeenTour()) {
      const t = setTimeout(() => setShowTour(true), 700)
      return () => clearTimeout(t)
    }
  }, [data])

  if (!data) return <LoadState error={error} label="Loading the loop…" onRetry={refresh} />

  // Comes from a SQL count — recent_runs is capped at 10 and would saturate.
  const loopsClosed = data.counts.loops_closed

  return (
    <div className="fade-in space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Loop Dashboard</h1>
          <p className="text-sm text-muted">
            Live view of every threat travelling through the closed loop.
          </p>
        </div>
        <div className="flex items-center gap-2" data-tour="actions">
          <Button variant="ghost" onClick={() => setShowTour(true)}>
            <HelpCircle size={14} /> Take the tour
          </Button>
          {/* Wiping and re-seeding only exists in the exhibition build. */}
          {caps.demo_mode && (
            <Button variant="ghost" onClick={() => setShowReset(true)}>
              <RotateCcw size={14} /> Reset demo
            </Button>
          )}
          <Button onClick={() => setShowSubmit(true)}>
            <Plus size={15} /> Submit artifact
          </Button>
        </div>
      </div>

      {/* attention strip */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" data-tour="attention">
        <AttentionCard
          to="/reports"
          icon={<Inbox size={15} />}
          label="New reports to triage"
          value={data.counts.new_reports}
          hot={data.counts.new_reports > 0}
        />
        <AttentionCard
          to="/training"
          icon={<AlertTriangle size={15} />}
          label="Training awaiting approval"
          value={data.counts.awaiting_approval}
          hot={data.counts.awaiting_approval > 0}
        />
        <AttentionCard
          to="/simulations"
          icon={<Send size={15} />}
          label="Active simulations"
          value={data.counts.active_simulations}
        />
        <AttentionCard to="/" icon={<Loop />} label="Loop runs in flight" value={data.counts.active_runs} />
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        {/* THE LOOP — the signature visual, deliberately outweighting every
            other card on the page: accent border, inner glow, larger title. */}
        <Card className="relative overflow-hidden border-accent/25 p-5 xl:col-span-2">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 -top-24 h-48 bg-[radial-gradient(ellipse_at_center,rgba(45,212,191,0.10),transparent_70%)]"
          />
          <div data-tour="loop" className="relative">
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h2 className="text-base font-semibold tracking-tight">
                The Loop <span className="text-accent">— live</span>
              </h2>
              <span className="hidden text-[11px] text-faint sm:inline">
                ingest → analyze → convert → target → train → measure → feedback
              </span>
            </div>
            <LoopViz activeRuns={data.active_runs} loopsClosed={loopsClosed} />
          </div>
        </Card>

        {/* outcome metrics — a rate with too small a sample renders as
            "not enough data", never as a fabricated number */}
        <div className="space-y-3" data-tour="metrics">
          <StatCard
            label="Phishing click rate"
            value={pct(data.metrics.phishing_click_rate)}
            sub={metricSub(data.metrics.phishing_click_rate, data.metrics.simulation_sample, data.metrics.window_days, 'lower is better')}
            tone={data.metrics.phishing_click_rate !== null && data.metrics.phishing_click_rate > 0.25 ? 'bad' : 'neutral'}
          />
          <StatCard
            label="Report rate (human sensor)"
            value={pct(data.metrics.report_rate)}
            sub={metricSub(data.metrics.report_rate, data.metrics.simulation_sample, data.metrics.window_days, 'higher is better')}
            tone="accent"
          />
          <StatCard
            label="Avg risk score"
            value={data.metrics.avg_risk_score !== null ? data.metrics.avg_risk_score.toFixed(1) : '—'}
            sub="org-wide, 0–100"
            tone={data.metrics.avg_risk_score !== null && data.metrics.avg_risk_score >= 55 ? 'warn' : 'good'}
          />
          <StatCard
            label="Training completion"
            value={pct(data.metrics.training_completion_rate)}
            sub={metricSub(data.metrics.training_completion_rate, data.metrics.training_sample, data.metrics.window_days, 'assigned modules completed')}
            tone="neutral"
          />
        </div>
      </div>

      {/* active runs */}
      <Card className="p-5" data-tour="active-runs">
        <SectionTitle right={<span className="text-[11px] text-faint">{data.active_runs.length} in flight</span>}>
          Active loop runs
        </SectionTitle>
        {data.active_runs.length === 0 ? (
          <EmptyState>No active runs — report or submit an artifact to start the loop.</EmptyState>
        ) : (
          <div className="space-y-2">
            {data.active_runs.map((run) => (
              <RunRow key={run.id} run={run} />
            ))}
          </div>
        )}
      </Card>

      <div className="grid gap-5 xl:grid-cols-2">
        {/* trend charts — the proof the loop works */}
        <Card className="p-5">
          <SectionTitle
            right={
              <div className="flex items-center gap-3 text-[11px]">
                <span className="flex items-center gap-1 text-bad">
                  <span className="h-1.5 w-3 rounded-full bg-bad" /> click rate
                </span>
                <span className="flex items-center gap-1 text-accent">
                  <span className="h-1.5 w-3 rounded-full bg-accent" /> report rate
                </span>
              </div>
            }
          >
            Behaviour change over time
          </SectionTitle>
          <OutcomeTrendChart data={data.trend} />
        </Card>
        <Card className="p-5">
          <SectionTitle>Org risk trend</SectionTitle>
          <RiskTrendChart data={data.trend} />
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        {/* department heatmap */}
        <Card className="p-5" data-tour="heatmap">
          <SectionTitle right={<Link to="/employees" className="text-[11px] text-accent hover:underline">all employees →</Link>}>
            Department risk heatmap
          </SectionTitle>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
            {data.departments.map((d) => (
              <DeptRiskTile
                key={d.id}
                name={d.name}
                avgRisk={d.avg_risk}
                employeeCount={d.employee_count}
                highRiskCount={d.high_risk_count}
              />
            ))}
          </div>
        </Card>

        {/* recent risk events */}
        <Card className="p-5">
          <SectionTitle>Live risk events</SectionTitle>
          <div className="space-y-1.5">
            {data.recent_events.map((e) => (
              <div key={e.id} className="flex items-center gap-3 rounded-lg px-2 py-1.5 text-xs hover:bg-surface-2">
                <span
                  className={cx(
                    'w-12 shrink-0 text-right font-mono font-semibold tabular-nums',
                    e.delta > 0 ? 'text-bad' : e.delta < 0 ? 'text-good' : 'text-muted',
                  )}
                >
                  {e.delta > 0 ? '+' : ''}
                  {e.delta.toFixed(1)}
                </span>
                <span className="w-28 shrink-0 truncate font-medium">{e.employee_name}</span>
                <span className="flex-1 truncate text-muted">{e.reason}</span>
                <span className="shrink-0 text-faint">{timeAgo(e.created_at)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* recently closed */}
      <Card className="p-5">
        <SectionTitle>Recently closed loops</SectionTitle>
        {data.recent_runs.length === 0 ? (
          <EmptyState>No completed runs yet.</EmptyState>
        ) : (
          <div className="space-y-2">
            {data.recent_runs.map((run) => (
              <RunRow key={run.id} run={run} />
            ))}
          </div>
        )}
      </Card>

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
      <div className="flex gap-3">
        <div className="h-fit rounded-lg border border-warn/40 bg-warn/10 p-2 text-warn">
          <RotateCcw size={16} />
        </div>
        <p className="text-sm leading-relaxed text-muted">
          This wipes all current data and restores a fresh <span className="text-ink">Caspian Dynamics</span> world —
          26 employees, six months of history, seeded loop runs and simulations — re-anchored to today. Perfect for a
          clean start between exhibition visitors.
        </p>
      </div>
      {error && <div className="mt-3 text-xs text-bad">{error}</div>}
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="danger" onClick={() => void reset()} busy={busy}>
          <RotateCcw size={14} /> Reset to fresh demo
        </Button>
      </div>
    </Modal>
  )
}

function Loop() {
  return <span className="inline-block h-3.5 w-3.5 rounded-full border-2 border-current" />
}

function AttentionCard({
  to,
  icon,
  label,
  value,
  hot,
}: {
  to: string
  icon: React.ReactNode
  label: string
  value: number
  hot?: boolean
}) {
  return (
    <Link
      to={to}
      className={cx(
        'flex items-center gap-3 rounded-xl border p-3.5 transition-colors',
        hot
          ? 'border-warn/40 bg-warn/5 hover:border-warn/70'
          : 'border-border bg-surface hover:border-border-2',
      )}
    >
      <div className={cx('rounded-lg border p-2', hot ? 'border-warn/40 text-warn' : 'border-border text-muted')}>
        {icon}
      </div>
      <div>
        <div className={cx('text-lg font-bold leading-none tabular-nums', hot ? 'text-warn' : 'text-ink')}>
          {value}
        </div>
        <div className="mt-1 text-[11px] text-muted">{label}</div>
      </div>
    </Link>
  )
}

function RunRow({ run }: { run: RunSummary }) {
  const stage = STAGES.find((s) => s.n === run.current_stage)
  return (
    <Link
      to={`/loop/${run.id}`}
      className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-border bg-surface-2 px-3.5 py-2.5 transition-colors hover:border-accent/40"
    >
      <span className="font-mono text-[11px] text-faint">#{run.id}</span>
      <span className="min-w-40 flex-1 truncate text-sm font-medium">{run.threat_title}</span>
      {run.verdict && <Badge value={run.verdict} />}
      {run.threat_type && <Badge value={run.threat_type} />}
      {run.source && <Badge value={run.source} />}
      <div className="flex items-center gap-2">
        <StageTracker history={run.stage_history} status={run.status} size="sm" />
        <span className="w-20 text-[11px] text-muted">{stage?.label}</span>
      </div>
      <Badge value={run.status} />
      <span className="text-[11px] text-faint">{timeAgo(run.created_at)}</span>
    </Link>
  )
}

// --- submit artifact modal -------------------------------------------------------

const ARTIFACT_TYPES = [
  { value: 'email', label: 'Email' },
  { value: 'url', label: 'URL' },
  { value: 'file', label: 'File (name/description)' },
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
  useEscape(onClose)

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
    <Modal title="Submit artifact into the loop" size="lg" onClose={onClose}>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted">Type</span>
              <select
                value={artifactType}
                onChange={(e) => setArtifactType(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent/60"
              >
                {ARTIFACT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted">Title</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Short label for this threat"
                className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none placeholder:text-faint focus:border-accent/60"
              />
            </label>
          </div>
          {artifactType === 'email' && (
            <div className="grid grid-cols-2 gap-3">
              <input
                value={sender}
                onChange={(e) => setSender(e.target.value)}
                placeholder="Sender (e.g. billing@suspicious.xyz)"
                className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none placeholder:text-faint focus:border-accent/60"
              />
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Subject"
                className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none placeholder:text-faint focus:border-accent/60"
              />
            </div>
          )}
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted">
              Artifact content
            </span>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={7}
              placeholder="Paste the email body, URL, message text or file description…"
              className="w-full resize-y rounded-lg border border-border bg-surface-2 px-3 py-2 font-mono text-xs outline-none placeholder:text-faint focus:border-accent/60"
            />
          </label>
          {error && <div className="text-xs text-bad">{error}</div>}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={() => void submit()} busy={busy} disabled={!content.trim()}>
              Start the loop
            </Button>
          </div>
        </div>
    </Modal>
  )
}
