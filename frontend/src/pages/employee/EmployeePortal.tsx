import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Award, Flame, Megaphone, PlayCircle, Trophy, X } from 'lucide-react'
import { api } from '../../lib/api'
import { usePoll } from '../../lib/usePoll'
import type { AssignmentDetail, EmployeeDashboard, Report } from '../../lib/types'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  SectionTitle,
  Spinner,
  channelLabel,
  cx,
  riskTone,
  timeAgo,
} from '../../components/ui'

export function EmployeePortal() {
  const { data: dash, refresh } = usePoll<EmployeeDashboard>(() => api.get('/api/dashboard/employee'), 4000)
  const { data: assignments, refresh: refreshAssignments } = usePoll<AssignmentDetail[]>(
    () => api.get('/api/training/my'),
    4000,
  )
  const { data: myReports, refresh: refreshReports } = usePoll<Report[]>(() => api.get('/api/reports/my'), 6000)
  const [showReport, setShowReport] = useState(false)

  if (!dash) return <Spinner label="Loading your portal…" />

  const tone = riskTone(dash.employee.risk_score)
  const pending = (assignments ?? []).filter((a) => a.status === 'assigned' || a.status === 'in_progress')
  const done = (assignments ?? []).filter((a) => a.status === 'completed')

  return (
    <div className="fade-in space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Salam, {dash.employee.name.split(' ')[0]} 👋</h1>
          <p className="text-sm text-muted">
            {dash.employee.role_title} · {dash.employee.department}
          </p>
        </div>
        <Button onClick={() => setShowReport(true)} className="px-4 py-2 text-[15px]">
          <Megaphone size={16} /> Report suspicious
        </Button>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* risk score */}
        <Card className="p-5">
          <SectionTitle>Your risk score</SectionTitle>
          <div className="flex items-center justify-center py-2">
            <RiskDial score={dash.employee.risk_score} />
          </div>
          <p className="text-center text-xs text-muted">
            {tone.label} risk — completing training and reporting suspicious messages lowers it.
          </p>
          <div className="mt-4 space-y-1">
            {dash.risk_breakdown.slice(0, 5).map((f) => (
              <div key={f.factor} className="flex items-center justify-between text-xs">
                <span className="truncate text-muted">{f.label}</span>
                <span className={cx('font-mono font-semibold', f.contribution >= 0 ? 'text-bad' : 'text-good')}>
                  {f.contribution > 0 ? '+' : ''}
                  {f.contribution.toFixed(1)}
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* gamification */}
        <Card className="p-5">
          <SectionTitle>Your scorecard</SectionTitle>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg border border-border bg-surface-2 p-3">
              <Award size={16} className="mx-auto text-accent" />
              <div className="mt-1 text-xl font-bold tabular-nums">{dash.gamification.points}</div>
              <div className="text-[10px] text-faint">points</div>
            </div>
            <div className="rounded-lg border border-border bg-surface-2 p-3">
              <Flame size={16} className={cx('mx-auto', dash.gamification.streak > 0 ? 'text-warn' : 'text-faint')} />
              <div className="mt-1 text-xl font-bold tabular-nums">{dash.gamification.streak}</div>
              <div className="text-[10px] text-faint">streak</div>
            </div>
            <div className="rounded-lg border border-border bg-surface-2 p-3">
              <Megaphone size={16} className="mx-auto text-indigo" />
              <div className="mt-1 text-xl font-bold tabular-nums">{dash.gamification.reports_submitted}</div>
              <div className="text-[10px] text-faint">reports</div>
            </div>
          </div>
          {dash.gamification.rank && (
            <p className="mt-3 text-center text-xs text-muted">
              You're <span className="font-bold text-accent">#{dash.gamification.rank}</span> on the leaderboard
            </p>
          )}
        </Card>

        {/* leaderboard */}
        <Card className="p-5">
          <SectionTitle>
            <span className="flex items-center gap-1.5">
              <Trophy size={13} className="text-warn" /> Leaderboard
            </span>
          </SectionTitle>
          <div className="space-y-1">
            {dash.gamification.leaderboard.map((row, i) => (
              <div
                key={row.employee_id}
                className={cx(
                  'flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm',
                  row.employee_id === dash.employee.id ? 'bg-accent/10 text-accent' : 'text-muted',
                )}
              >
                <span className="w-5 text-xs font-bold">{i + 1}</span>
                <span className="flex-1 truncate">{row.name}</span>
                <span className="font-mono text-xs font-semibold tabular-nums">{row.points}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* assigned training */}
      <Card className="p-5">
        <SectionTitle right={<span className="text-[11px] text-faint">{pending.length} to complete</span>}>
          Your assigned micro-training
        </SectionTitle>
        {pending.length === 0 ? (
          <EmptyState>All caught up — no training assigned right now. 🎉</EmptyState>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {pending.map((a) => (
              <Link
                key={a.id}
                to={`/learn/${a.id}`}
                className="group rounded-xl border border-accent/30 bg-accent/5 p-4 transition-colors hover:border-accent/60"
              >
                <div className="flex items-center gap-2">
                  <Badge value={a.module.channel} label={channelLabel(a.module.channel)} />
                  <span className="text-[11px] text-faint">~{a.module.est_minutes} min</span>
                  <span className="ml-auto text-[11px] text-faint">{timeAgo(a.assigned_at)}</span>
                </div>
                <h3 className="mt-2 text-sm font-semibold group-hover:text-accent">{a.module.title}</h3>
                <p className="mt-1 line-clamp-2 text-xs text-muted">{a.module.description}</p>
                {a.targeting_reasons.length > 0 && (
                  <p className="mt-2 text-[11px] italic text-indigo">
                    Why you: {a.targeting_reasons[0]}
                  </p>
                )}
                <div className="mt-3 flex items-center gap-1.5 text-sm font-medium text-accent">
                  <PlayCircle size={15} /> Start training
                </div>
              </Link>
            ))}
          </div>
        )}

        {done.length > 0 && (
          <div className="mt-5 border-t border-border pt-4">
            <SectionTitle>Completed</SectionTitle>
            <div className="space-y-1.5">
              {done.map((a) => (
                <div key={a.id} className="flex items-center gap-3 rounded-lg bg-surface-2 px-3 py-2 text-xs">
                  <span className="flex-1 truncate font-medium">{a.module.title}</span>
                  <span className={cx('font-mono font-bold tabular-nums', (a.score ?? 0) >= 60 ? 'text-good' : 'text-warn')}>
                    {a.score?.toFixed(0)}%
                  </span>
                  <span className="text-faint">{a.completed_at ? timeAgo(a.completed_at) : ''}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* my reports */}
      <Card className="p-5">
        <SectionTitle>Your reports (human sensor)</SectionTitle>
        {!myReports || myReports.length === 0 ? (
          <EmptyState>
            Seen something odd? Hit <span className="text-accent">Report suspicious</span> — every report makes the
            whole company safer and lowers your risk score.
          </EmptyState>
        ) : (
          <div className="space-y-1.5">
            {myReports.map((r) => (
              <div key={r.id} className="flex items-center gap-3 rounded-lg bg-surface-2 px-3 py-2 text-xs">
                <Badge value={r.artifact_type} label={channelLabel(r.artifact_type)} />
                <span className="flex-1 truncate text-muted">{r.artifact_ref.slice(0, 80)}…</span>
                <Badge value={r.status} />
                <span className="text-faint">{timeAgo(r.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {showReport && (
        <ReportModal
          onClose={() => setShowReport(false)}
          onSubmitted={() => {
            setShowReport(false)
            void refresh()
            void refreshReports()
            void refreshAssignments()
          }}
        />
      )}
    </div>
  )
}

function RiskDial({ score }: { score: number }) {
  const tone = riskTone(score)
  const angle = (Math.min(100, score) / 100) * 270 - 135
  const color = score >= 60 ? '#f87171' : score >= 40 ? '#fbbf24' : '#34d399'
  const radius = 56
  const circumference = 2 * Math.PI * radius
  const arc = (270 / 360) * circumference
  const filled = (Math.min(100, score) / 100) * arc
  return (
    <svg viewBox="0 0 140 140" className="h-36 w-36">
      <g transform="rotate(135 70 70)">
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          stroke="#18234a"
          strokeWidth="10"
          strokeDasharray={`${arc} ${circumference}`}
          strokeLinecap="round"
        />
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeDasharray={`${filled} ${circumference}`}
          strokeLinecap="round"
        />
      </g>
      <text x="70" y="66" textAnchor="middle" fill={color} fontSize="30" fontWeight="700">
        {score.toFixed(0)}
      </text>
      <text x="70" y="86" textAnchor="middle" fill="#7e90b3" fontSize="10">
        {tone.label} risk
      </text>
      <g transform={`rotate(${angle} 70 70)`} opacity={0}>
        <circle cx="70" cy="14" r="3" fill={color} />
      </g>
    </svg>
  )
}

const REPORT_TYPES = [
  { value: 'email', label: 'Email' },
  { value: 'sms', label: 'SMS / text' },
  { value: 'qr', label: 'QR code' },
  { value: 'chat', label: 'Chat (Teams/Slack)' },
  { value: 'url', label: 'Website / link' },
  { value: 'file', label: 'File / attachment' },
]

function ReportModal({ onClose, onSubmitted }: { onClose: () => void; onSubmitted: () => void }) {
  const [artifactType, setArtifactType] = useState('email')
  const [content, setContent] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const submit = async () => {
    setBusy(true)
    setError(null)
    try {
      await api.post('/api/reports', { artifact_type: artifactType, artifact_ref: content, note })
      setSubmitted(true)
      setTimeout(onSubmitted, 1600)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to submit')
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl border border-border bg-surface p-5 shadow-2xl fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {submitted ? (
          <div className="py-8 text-center">
            <div className="text-3xl">🛡️</div>
            <h3 className="mt-2 text-lg font-semibold text-good">Report received — thank you!</h3>
            <p className="mt-1 text-sm text-muted">
              You just acted as the company's early-warning sensor. Your risk score went down.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold">Report something suspicious</h3>
              <button onClick={onClose} className="text-muted hover:text-ink">
                <X size={17} />
              </button>
            </div>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {REPORT_TYPES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setArtifactType(t.value)}
                    className={cx(
                      'rounded-lg border px-2.5 py-1 text-xs transition-colors',
                      artifactType === t.value
                        ? 'border-accent/60 bg-accent/10 text-accent'
                        : 'border-border bg-surface-2 text-muted hover:border-border-2',
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={6}
                placeholder="Paste the message, link or describe what you saw…"
                className="w-full resize-y rounded-lg border border-border bg-surface-2 px-3 py-2 font-mono text-xs outline-none placeholder:text-faint focus:border-accent/60"
              />
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Anything else? (optional)"
                className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none placeholder:text-faint focus:border-accent/60"
              />
              {error && <div className="text-xs text-bad">{error}</div>}
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={onClose}>
                  Cancel
                </Button>
                <Button onClick={() => void submit()} busy={busy} disabled={!content.trim()}>
                  <Megaphone size={14} /> Submit report
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
