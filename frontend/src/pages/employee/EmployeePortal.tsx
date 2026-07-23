import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Award,
  CheckCircle2,
  ChevronDown,
  Eye,
  Flame,
  GraduationCap,
  HelpCircle,
  Lock,
  Megaphone,
  PlayCircle,
  ScanEye,
  ShieldCheck,
  Target,
  type LucideIcon,
} from 'lucide-react'
import { api } from '../../lib/api'
import { usePoll } from '../../lib/usePoll'
import { Tour, hasSeenTour, type TourStep } from '../../components/Tour'
import type {
  AssignmentDetail,
  Badge as BadgeType,
  EmployeeDashboard,
  EmployeeDetail,
  Report,
} from '../../lib/types'
import {
  Button,
  Callout,
  Chip,
  ChoiceRow,
  Empty,
  GroupLabel,
  Input,
  LoadState,
  Metric,
  Modal,
  PageHeader,
  Panel,
  Provenance,
  Skeleton,
  Status,
  Textarea,
  channelLabel,
  cx,
  riskBand,
  signed,
  timeAgo,
} from '../../components/ui'

const PORTAL_TOUR_KEY = 'cyclo_tour_seen_portal'

const PORTAL_TOUR: TourStep[] = [
  {
    title: 'Your security portal',
    body: 'This is the employee side of the loop: real threats that targeted people like you become short, personal training — and completing it visibly lowers your risk score.',
  },
  {
    target: '[data-tour="me-training"]',
    title: 'Training made from real attacks',
    body: 'Each module here was generated from a real threat our sandbox analysed — and it tells you exactly why you were selected for it.',
  },
  {
    target: '[data-tour="me-risk"]',
    title: 'Your risk score',
    body: 'A transparent 0–100 score. Every change is listed with its reason — training lowers it, risky clicks raise it. Watch it move when you finish a module.',
  },
  {
    target: '[data-tour="me-report"]',
    title: 'Be the sensor',
    body: 'Seen something suspicious? One click reports it. Triage runs immediately, an analyst reviews it, and it can become training for your whole team — starting from you.',
  },
]

export function EmployeePortal() {
  const { data: dash, error: dashError, status: dashStatus, refresh } = usePoll<EmployeeDashboard>(
    () => api.get('/api/dashboard/employee'),
    4000,
  )
  const { data: assignments, refresh: refreshAssignments } = usePoll<AssignmentDetail[]>(
    () => api.get('/api/training/my'),
    4000,
  )
  const { data: myReports, refresh: refreshReports } = usePoll<Report[]>(() => api.get('/api/reports/my'), 6000)
  const { data: me } = usePoll<EmployeeDetail>(() => api.get('/api/employees/me'), 10000)
  const [showReport, setShowReport] = useState(false)
  const [showTour, setShowTour] = useState(false)

  useEffect(() => {
    if (dash && !hasSeenTour(PORTAL_TOUR_KEY)) {
      const t = setTimeout(() => setShowTour(true), 700)
      return () => clearTimeout(t)
    }
  }, [dash])

  // Only a 403 actually means "no employee profile". Reporting a dead API or a
  // 500 with that copy sends the analyst chasing a permissions problem that
  // does not exist.
  if (!dash && dashStatus === 403) {
    return (
      <div className="rise mx-auto max-w-md py-20 text-center">
        <h1 className="text-title">This portal is for employee accounts</h1>
        <p className="text-body mt-2 text-c2">
          Your account is not linked to an employee profile, so there is no personal security portal to show.
        </p>
        <Link to="/" className="text-sm mt-5 inline-block text-brand-fg hover:underline">
          Back to the dashboard
        </Link>
      </div>
    )
  }
  if (!dash) return <LoadState error={dashError} label="Loading your portal" onRetry={refresh} />

  const assignmentsLoading = assignments === undefined || assignments === null
  const pending = (assignments ?? []).filter((a) => a.status === 'assigned' || a.status === 'in_progress')
  const done = (assignments ?? []).filter((a) => a.status === 'completed')
  const expired = (assignments ?? []).filter((a) => a.status === 'expired')
  // Trust the dashboard payload for the count on first paint (issue: the
  // "All caught up" flash) — the detailed list arrives a beat later.
  const pendingCount = assignmentsLoading ? dash.assignments.pending : pending.length
  const avgScore = dash.assignments.avg_score

  return (
    <div className="rise space-y-6">
      <PageHeader
        title={`Hello, ${dash.employee.name.split(' ')[0]}`}
        lede={`${dash.employee.role_title} · ${dash.employee.department}`}
        actions={
          <>
            <Button variant="ghost" size="sm" onClick={() => setShowTour(true)}>
              <HelpCircle size={14} aria-hidden /> Tour
            </Button>
            <span data-tour="me-report">
              <Button variant="primary" onClick={() => setShowReport(true)}>
                <Megaphone size={15} aria-hidden /> Report suspicious
              </Button>
            </span>
          </>
        }
      />

      {/* 1 — what to do now. The page always opens by saying it. */}
      {pendingCount > 0 ? (
        <Link
          to={pending[0] ? `/learn/${pending[0].id}` : '#'}
          className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-panel border border-brand/30 bg-brand/8 px-4 py-3 transition-colors hover:border-brand/60"
        >
          <GraduationCap size={16} className="shrink-0 text-brand-fg" aria-hidden />
          <span className="text-sm min-w-48 flex-1">
            <span className="font-semibold text-brand-fg">
              {pendingCount} training module{pendingCount > 1 ? 's' : ''} waiting for you
            </span>
            <span className="text-c2">
              {' '}
              — built from real threats that targeted people in your role. About three minutes each.
            </span>
          </span>
          <span className="text-sm flex shrink-0 items-center gap-1.5 font-medium text-brand-fg">
            Start now <ArrowRight size={15} aria-hidden />
          </span>
        </Link>
      ) : (
        <div className="flex items-center gap-3 rounded-panel border border-success/25 bg-success/8 px-4 py-3">
          <CheckCircle2 size={16} className="shrink-0 text-success" aria-hidden />
          <p className="text-sm text-c2">
            <span className="font-medium text-success">All clear.</span> No training assigned right now — keep reporting
            anything suspicious and your score stays low.
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        {/* 2 — the training itself, and why you were chosen for it. */}
        <Panel
          tone={pendingCount > 0 ? 'feature' : 'default'}
          title="Your micro-training"
          subtitle="Written from threats that reached this company"
          actions={
            <span className="text-sm text-c3">{pendingCount > 0 ? `${pendingCount} to complete` : 'up to date'}</span>
          }
          data-tour="me-training"
        >
          {assignmentsLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-32" />
              <Skeleton className="h-32 opacity-60" />
            </div>
          ) : pending.length === 0 ? (
            <Empty icon={<ShieldCheck size={20} aria-hidden />}>
              Nothing assigned — you are up to date. When a real threat targets your role or department, the loop turns
              it into a short module and it appears here, with the reason you were selected.
            </Empty>
          ) : (
            <div className="space-y-3">
              {pending.map((a) => (
                <PendingTrainingCard key={a.id} assignment={a} />
              ))}
            </div>
          )}

          {(done.length > 0 || expired.length > 0) && (
            <div className="mt-6 border-t border-hair pt-4">
              <GroupLabel
                right={
                  avgScore !== null ? (
                    <span className="text-xs text-c3">
                      avg quiz score <span className="font-semibold text-c1">{avgScore.toFixed(0)}%</span>
                    </span>
                  ) : undefined
                }
              >
                Finished
              </GroupLabel>
              <ul className="divide-hair">
                {done.map((a) => (
                  <li key={a.id}>
                    <Link
                      to={`/learn/${a.id}`}
                      className="text-sm -mx-2 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-control px-2 py-2 transition-colors hover:bg-raised"
                    >
                      <CheckCircle2
                        size={14}
                        className={cx('shrink-0', (a.score ?? 0) >= 60 ? 'text-success' : 'text-warning')}
                        aria-hidden
                      />
                      <span className="min-w-40 flex-1 truncate font-medium">{a.module.title}</span>
                      <span
                        className={cx('font-mono font-semibold', (a.score ?? 0) >= 60 ? 'text-success' : 'text-warning')}
                      >
                        {a.score !== null ? `${a.score.toFixed(0)}%` : 'no score'}
                      </span>
                      <span className="text-xs w-16 shrink-0 text-c3">{timeAgo(a.completed_at)}</span>
                      <span className="text-xs shrink-0 text-brand-fg">Review</span>
                    </Link>
                  </li>
                ))}
                {expired.map((a) => (
                  <li key={a.id} className="text-sm -mx-2 px-2 py-2">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="min-w-40 flex-1 truncate font-medium text-c2">{a.module.title}</span>
                      <Status value="expired" />
                      <span className="text-xs w-16 shrink-0 text-right text-danger">+4 risk</span>
                    </div>
                    {/* The reason this row exists at all, said out loud rather
                        than hidden in a title attribute nobody hovers. */}
                    <p className="text-xs mt-0.5 text-c3">
                      Its window closed before you finished it, so it added 4 points to your risk score.
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Panel>

        {/* 3 — the score, and what moved it. */}
        <Panel title="Your risk score" data-tour="me-risk">
          <div className="flex justify-center">
            <RiskDial score={dash.employee.risk_score} />
          </div>

          <div className="text-xs mt-1 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-c3">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden /> 0–39 low
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-warning" aria-hidden /> 40–59 elevated
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-danger" aria-hidden /> 60+ high
            </span>
          </div>

          <p className="text-sm mt-3 text-center text-c2">
            {dash.employee.risk_score < 40
              ? 'Attackers would have a hard time with you. Keep it there.'
              : dash.employee.risk_score < 60
                ? 'Some signals need attention — completing training brings this down fast.'
                : 'You are a likely target right now. The modules above are your fastest way down.'}
          </p>

          {me && me.recent_events.length >= 2 && (
            <div className="mt-5">
              <GroupLabel right={<span className="text-xs text-c3">last {Math.min(me.recent_events.length, 15)} events</span>}>
                Your trend
              </GroupLabel>
              <RiskSparkline currentScore={me.current_risk_score} events={me.recent_events} />
            </div>
          )}

          <div className="mt-5 border-t border-hair pt-4">
            <GroupLabel>What moved it recently</GroupLabel>
            <ul className="space-y-1.5">
              {(me?.recent_events ?? []).slice(0, 4).map((e) => (
                <li key={e.id} className="text-xs flex items-center gap-2.5">
                  <span
                    className={cx(
                      'w-10 shrink-0 text-right font-mono font-semibold',
                      e.delta > 0 ? 'text-danger' : e.delta < 0 ? 'text-success' : 'text-c3',
                    )}
                  >
                    {signed(e.delta)}
                  </span>
                  <span className="flex-1 truncate text-c2">{e.reason}</span>
                </li>
              ))}
              {(!me || me.recent_events.length === 0) && (
                <li className="text-xs text-c3">No events yet — your score is at its baseline.</li>
              )}
            </ul>
          </div>
        </Panel>
      </div>

      {/* 4 — what you reported, and what happened to it. */}
      <Panel
        title="Your reports"
        subtitle="Triaged on submission, then reviewed by an analyst"
        actions={<span className="text-sm text-c3">{myReports?.length ?? 0}</span>}
      >
        {!myReports || myReports.length === 0 ? (
          <Empty icon={<Megaphone size={20} aria-hidden />}>
            Seen something odd? Use “Report suspicious” — triage runs on the spot and your report can become training for
            the whole company.
          </Empty>
        ) : (
          <ul className="space-y-1.5">
            {myReports.map((r) => (
              <ReportRow key={r.id} report={r} />
            ))}
          </ul>
        )}
      </Panel>

      {/* 5 — recognition. Last and quiet on purpose: the score above is the
          measurement, this is only encouragement. */}
      <Panel title="Points and standings" subtitle="Encouragement, not measurement — your risk score is the real reading">
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          <div>
            <GroupLabel>Scorecard</GroupLabel>
            <div className="grid grid-cols-2 gap-2">
              <Metric size="sm" label="Points" value={dash.gamification.points} />
              <Metric
                size="sm"
                label="Streak"
                value={dash.gamification.streak}
                tone={dash.gamification.streak > 0 ? 'warning' : 'neutral'}
              />
              <Metric size="sm" label="Reports" value={dash.gamification.reports_submitted} />
              <Metric size="sm" label="Avg quiz" value={avgScore !== null ? `${avgScore.toFixed(0)}%` : '—'} />
            </div>
            {dash.gamification.rank !== null && (
              <p className="text-sm mt-2.5 text-c2">
                You are <span className="font-semibold text-c1">#{dash.gamification.rank}</span> company-wide.
              </p>
            )}
          </div>

          <div>
            <GroupLabel
              right={
                <span className="text-xs text-c3">
                  {dash.gamification.badges.filter((b) => b.earned).length}/{dash.gamification.badges.length} earned
                </span>
              }
            >
              Badges
            </GroupLabel>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {dash.gamification.badges.map((b) => (
                <BadgeTile key={b.id} badge={b} />
              ))}
            </div>
          </div>

          <div className="md:col-span-2 xl:col-span-1">
            <GroupLabel>Standings</GroupLabel>
            <ul className="space-y-1">
              {dash.gamification.leaderboard.slice(0, 5).map((row, i) => (
                <LeaderRow
                  key={row.employee_id}
                  rank={i + 1}
                  name={row.name}
                  value={row.points}
                  mine={row.employee_id === dash.employee.id}
                />
              ))}
              {/* always show YOUR row, even outside the top 5 */}
              {dash.gamification.rank !== null && dash.gamification.rank > 5 && (
                <>
                  <li className="text-xs py-0.5 text-center text-c3" aria-hidden>
                    ···
                  </li>
                  <LeaderRow
                    rank={dash.gamification.rank}
                    name={dash.employee.name}
                    value={dash.gamification.points}
                    mine
                  />
                </>
              )}
              {dash.gamification.rank === null && (
                <li className="text-xs rounded-control bg-raised px-2.5 py-2 text-c3">
                  Complete your first module to enter the leaderboard.
                </li>
              )}
            </ul>

            <div className="mt-4 border-t border-hair pt-3">
              <GroupLabel right={<span className="text-xs text-c3">safest first</span>}>Team standings</GroupLabel>
              <ul className="space-y-1">
                {dash.gamification.team_leaderboard.slice(0, 4).map((t, i) => (
                  <LeaderRow key={t.department_id} rank={i + 1} name={t.name} value={t.avg_risk.toFixed(0)} mine={t.is_mine} />
                ))}
              </ul>
            </div>
          </div>
        </div>
      </Panel>

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
      {showTour && <Tour steps={PORTAL_TOUR} storageKey={PORTAL_TOUR_KEY} onClose={() => setShowTour(false)} />}
    </div>
  )
}

/* --- training ---------------------------------------------------------------- */

function PendingTrainingCard({ assignment: a }: { assignment: AssignmentDetail }) {
  return (
    <Link
      to={`/learn/${a.id}`}
      className="group block rounded-control border border-line bg-raised p-4 transition-colors hover:border-brand"
    >
      {/* Where this module came from — the loop, visible, and honest about
          whether a live model or the offline generator wrote it. */}
      <div className="flex flex-wrap items-center gap-2">
        {a.module.ai_generated && <Provenance source={a.module.generation_source} audience="employee" />}
        <Chip>{channelLabel(a.module.channel)}</Chip>
        <span className="text-xs text-c3">about {a.module.est_minutes} min</span>
        <span className="text-xs ml-auto text-c3">{timeAgo(a.assigned_at)}</span>
      </div>

      <h3 className="text-h mt-2.5 group-hover:text-brand-fg">{a.module.title}</h3>
      <p className="text-sm mt-1 line-clamp-2 text-c2">{a.module.description}</p>

      {a.targeting_reasons.length > 0 && (
        <div className="mt-3">
          <span className="label text-c3">Why you</span>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {a.targeting_reasons.map((r) => (
              <Chip key={r} tone="info">
                {r}
              </Chip>
            ))}
          </div>
        </div>
      )}

      <div className="text-sm mt-3.5 flex items-center gap-1.5 font-semibold text-brand-fg">
        <PlayCircle size={16} aria-hidden /> Start training
        <ArrowRight size={14} aria-hidden className="transition-transform group-hover:translate-x-0.5" />
      </div>
    </Link>
  )
}

/* --- risk dial + sparkline ---------------------------------------------------- */

function useAnimatedNumber(target: number, durationMs = 700): number {
  const [value, setValue] = useState(target)
  const fromRef = useRef(target)
  useEffect(() => {
    const from = fromRef.current
    if (from === target) return
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs)
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(from + (target - from) * eased)
      if (t < 1) raf = requestAnimationFrame(tick)
      else fromRef.current = target
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, durationMs])
  return value
}

/** Band → the CSS variable the SVG needs; thresholds stay in `riskBand`. */
const BAND_STROKE: Record<string, string> = {
  danger: 'var(--color-danger)',
  warning: 'var(--color-warning)',
  success: 'var(--color-success)',
}

function RiskDial({ score }: { score: number }) {
  const animated = useAnimatedNumber(score)
  const band = riskBand(animated)
  const color = BAND_STROKE[band.tone] ?? 'var(--color-c2)'
  const radius = 56
  const circumference = 2 * Math.PI * radius
  const arc = (270 / 360) * circumference
  const filled = (Math.min(100, Math.max(0, animated)) / 100) * arc
  return (
    <svg
      viewBox="0 0 140 140"
      className="h-36 w-36"
      role="img"
      aria-label={`Risk score ${score.toFixed(0)} out of 100, ${band.label.toLowerCase()}`}
    >
      <g transform="rotate(135 70 70)">
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          stroke="var(--color-sunken)"
          strokeWidth="10"
          strokeDasharray={`${arc} ${circumference}`}
          strokeLinecap="round"
        />
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          style={{ stroke: color }}
          strokeWidth="10"
          strokeDasharray={`${filled} ${circumference}`}
          strokeLinecap="round"
        />
      </g>
      <text x="70" y="66" textAnchor="middle" style={{ fill: color }} fontSize="30" fontWeight="600">
        {animated.toFixed(0)}
      </text>
      <text x="70" y="86" textAnchor="middle" fill="var(--color-c3)" fontSize="10">
        {band.label.toLowerCase()} risk
      </text>
    </svg>
  )
}

function RiskSparkline({ currentScore, events }: { currentScore: number; events: EmployeeDetail['recent_events'] }) {
  // events arrive newest-first; walk backwards to reconstruct the score path.
  const recent = events.slice(0, 15)
  const scores: number[] = [currentScore]
  for (const e of recent) {
    scores.push(Math.max(0, Math.min(100, scores[scores.length - 1] - e.delta)))
  }
  scores.reverse() // oldest → newest, ending at the current score

  // A single point is not a trend: with one score the divisor below is zero and
  // the polyline degenerates. Guard here rather than trusting every caller to
  // check the event count first.
  if (scores.length < 2) return null

  const w = 260
  const h = 44
  const min = Math.min(...scores)
  const max = Math.max(...scores)
  const span = Math.max(6, max - min)
  const pts = scores.map((s, i) => {
    const x = (i / (scores.length - 1)) * (w - 4) + 2
    const y = h - 4 - ((s - (min - 2)) / span) * (h - 10)
    return { x, y }
  })
  const last = pts[pts.length - 1]
  const improving = scores[scores.length - 1] <= scores[0]
  const stroke = improving ? 'var(--color-success)' : 'var(--color-danger)'
  return (
    <div className="flex items-center gap-2">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="h-11 w-full"
        preserveAspectRatio="none"
        role="img"
        aria-label={`Risk score path over the last ${scores.length - 1} events, ${improving ? 'improving' : 'rising'}`}
      >
        <polyline
          points={pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}
          fill="none"
          style={{ stroke }}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <circle cx={last.x} cy={last.y} r="2.5" style={{ fill: stroke }} />
      </svg>
      <span className={cx('text-xs shrink-0 font-semibold', improving ? 'text-success' : 'text-danger')}>
        {improving ? '↓ improving' : '↑ rising'}
      </span>
    </div>
  )
}

/* --- recognition -------------------------------------------------------------- */

function LeaderRow({ rank, name, value, mine }: { rank: number; name: string; value: number | string; mine?: boolean }) {
  return (
    <li
      className={cx(
        'text-sm flex items-center gap-2.5 rounded-control px-2.5 py-1.5',
        mine ? 'bg-brand/12 text-brand-fg' : 'text-c2',
      )}
    >
      <span className="text-xs w-5 shrink-0 font-semibold">{rank}</span>
      <span className="flex-1 truncate">
        {name}
        {mine ? ' (you)' : ''}
      </span>
      <span className="text-xs font-mono font-semibold">{value}</span>
    </li>
  )
}

const BADGE_ICONS: Record<string, LucideIcon> = { Eye, ScanEye, Target, Flame, GraduationCap, ShieldCheck }

function BadgeTile({ badge }: { badge: BadgeType }) {
  const Icon = BADGE_ICONS[badge.icon] ?? Award
  const progress = Math.max(0, Math.min(1, badge.earned ? 1 : badge.progress))
  return (
    <div
      className={cx(
        'flex min-h-[118px] flex-col items-center rounded-control border p-2.5 text-center',
        badge.earned ? 'border-brand/40 bg-brand/8' : 'border-hair bg-raised',
      )}
    >
      <div
        className={cx(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border',
          badge.earned ? 'border-brand/50 bg-brand/12 text-brand-fg' : 'border-line bg-sunken text-c3',
        )}
      >
        {badge.earned ? <Icon size={16} aria-hidden /> : <Lock size={14} aria-hidden />}
      </div>
      <div className={cx('text-xs mt-1.5 font-semibold leading-tight', badge.earned ? 'text-c1' : 'text-c2')}>
        {badge.name}
      </div>
      <div className="text-xs mt-0.5 line-clamp-2 flex-1 leading-tight text-c3">{badge.description}</div>
      {/* The progress row is always reserved so the grid stays aligned, and the
          state is written out — the colour alone never carries it. */}
      <div className="mt-1.5 w-full">
        <div className="h-1 w-full overflow-hidden rounded-full bg-sunken" aria-hidden>
          <div
            className={cx('h-full rounded-full', badge.earned ? 'bg-brand' : 'bg-info')}
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <div className={cx('text-xs mt-1', badge.earned ? 'text-brand-fg' : 'text-c3')}>
          {badge.earned ? 'Earned' : `${Math.round(progress * 100)}%`}
        </div>
      </div>
    </div>
  )
}

/* --- reports ------------------------------------------------------------------ */

function reportStory(r: Report): { text: string; tone: string } {
  if (r.status === 'in_loop')
    return {
      text: r.linked_loop_run_id
        ? 'Your report started a response loop — training was generated from it, for the whole team.'
        : 'Your report is in the response loop.',
      tone: 'text-brand-fg',
    }
  if (r.status === 'dismissed')
    return { text: 'Reviewed — it turned out to be safe. Reporting it was still the right call.', tone: 'text-c2' }
  return { text: 'An analyst is reviewing this now.', tone: 'text-warning' }
}

function ReportRow({ report: r }: { report: Report }) {
  const [open, setOpen] = useState(false)
  const story = reportStory(r)
  const ref = r.artifact_ref.length > 70 ? `${r.artifact_ref.slice(0, 70)}…` : r.artifact_ref
  return (
    <li className="rounded-control border border-hair bg-panel">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="text-sm flex w-full flex-wrap items-center gap-x-3 gap-y-1.5 px-3 py-2.5 text-left"
      >
        <Chip>{channelLabel(r.artifact_type)}</Chip>
        {r.triage_summary && <Status value={r.triage_summary.suspicion_level} />}
        <span className="min-w-40 flex-1 truncate text-c2">{ref}</span>
        <span className={cx('text-xs hidden shrink-0 sm:inline', story.tone)}>{story.text.split('—')[0].trim()}</span>
        <span className="text-xs shrink-0 text-c3">{timeAgo(r.created_at)}</span>
        <ChevronDown size={14} className={cx('shrink-0 text-c3 transition-transform', open && 'rotate-180')} aria-hidden />
      </button>
      {open && (
        <div className="rise border-t border-hair px-3 py-3">
          <p className={cx('text-sm font-medium', story.tone)}>{story.text}</p>
          {r.triage_summary && (
            <div className="mt-2.5">
              <Callout tone="brand" title="Triage verdict">
                <p className="text-c2">{r.triage_summary.summary}</p>
                {r.triage_summary.indicators.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {r.triage_summary.indicators.map((ind) => (
                      <Chip key={ind} tone="warning">
                        {ind}
                      </Chip>
                    ))}
                  </div>
                )}
              </Callout>
            </div>
          )}
        </div>
      )}
    </li>
  )
}

/* --- report modal -------------------------------------------------------------- */

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
  const [created, setCreated] = useState<Report | null>(null)

  const submit = async () => {
    setBusy(true)
    setError(null)
    try {
      const report = await api.post<Report>('/api/reports', {
        artifact_type: artifactType,
        artifact_ref: content,
        note,
      })
      setCreated(report)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to submit')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      title={created ? 'Report received' : 'Report something suspicious'}
      onClose={created ? onSubmitted : onClose}
    >
      {created ? (
        <div className="rise" aria-live="polite">
          <p className="text-body text-c2">
            Triage has already run on it. An analyst reviews it next, and if it becomes a training module you will see it
            in this portal.
          </p>
          {created.triage_summary && (
            <div className="mt-4">
              <Callout
                tone="brand"
                title="Triage verdict"
                actions={<Status value={created.triage_summary.suspicion_level} />}
              >
                <p className="text-c2">{created.triage_summary.summary}</p>
                {created.triage_summary.indicators.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {created.triage_summary.indicators.map((ind) => (
                      <Chip key={ind} tone="warning">
                        {ind}
                      </Chip>
                    ))}
                  </div>
                )}
              </Callout>
            </div>
          )}
          <div className="mt-5 flex justify-end">
            <Button variant="primary" onClick={onSubmitted}>
              Done
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <ChoiceRow label="What did you receive?" options={REPORT_TYPES} value={artifactType} onChange={setArtifactType} />
          <Textarea
            label="What you saw"
            mono
            rows={6}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Paste the message, the link, or describe what you saw"
            hint="This is the text triage reads, and what any training would be written from."
          />
          <Input
            label="Anything else"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional — what made it look wrong to you"
          />
          {error && (
            <div role="alert">
              <Callout tone="danger">{error}</Callout>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => void submit()} busy={busy} disabled={!content.trim()}>
              <Megaphone size={14} aria-hidden /> Submit report
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
