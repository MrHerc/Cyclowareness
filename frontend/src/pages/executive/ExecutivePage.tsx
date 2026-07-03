import { FileText } from 'lucide-react'
import { api } from '../../lib/api'
import { usePoll } from '../../lib/usePoll'
import type { ExecutiveDashboard } from '../../lib/types'
import { OutcomeTrendChart, RiskTrendChart } from '../../components/charts'
import { Card, SectionTitle, Spinner, StatCard, cx, pct, riskTone } from '../../components/ui'

export function ExecutivePage() {
  const { data } = usePoll<ExecutiveDashboard>(() => api.get('/api/dashboard/executive'), 15000)

  if (!data) return <Spinner label="Preparing the executive briefing…" />

  const first = data.trend[0]
  const last = data.trend[data.trend.length - 1]
  const clickImproved = first && last ? first.phishing_click_rate - last.phishing_click_rate : 0

  return (
    <div className="fade-in space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Executive View</h1>
        <p className="text-sm text-muted">Human cyber-risk posture, at a glance. Read-only.</p>
      </div>

      {/* AI briefing */}
      <Card className="border-indigo/30 p-5">
        <SectionTitle>
          <span className="flex items-center gap-1.5">
            <FileText size={13} className="text-indigo" /> AI briefing — current posture
          </span>
        </SectionTitle>
        <p className="text-[15px] leading-relaxed text-ink/90">{data.briefing}</p>
      </Card>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        <StatCard
          label="Click rate"
          value={pct(data.metrics.phishing_click_rate)}
          sub={clickImproved > 0 ? `↓ ${(clickImproved * 100).toFixed(0)}pp since start` : 'last 30 days'}
          tone={data.metrics.phishing_click_rate > 0.25 ? 'bad' : 'good'}
        />
        <StatCard label="Report rate" value={pct(data.metrics.report_rate)} sub="human sensor strength" tone="accent" />
        <StatCard
          label="Avg risk score"
          value={data.metrics.avg_risk_score.toFixed(1)}
          sub="0–100, lower is safer"
          tone={data.metrics.avg_risk_score >= 55 ? 'warn' : 'good'}
        />
        <StatCard label="Training completion" value={pct(data.metrics.training_completion_rate)} sub="micro-modules" />
        <StatCard label="Loops closed" value={data.loops_closed} sub="threats → training → measured" tone="accent" />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
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
            Behaviour change — before / after
          </SectionTitle>
          <OutcomeTrendChart data={data.trend} height={240} />
        </Card>
        <Card className="p-5">
          <SectionTitle>Organisation risk trend</SectionTitle>
          <RiskTrendChart data={data.trend} height={240} />
        </Card>
      </div>

      <Card className="p-5">
        <SectionTitle>Departments</SectionTitle>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
          {data.departments.map((d) => {
            const tone = riskTone(d.avg_risk)
            return (
              <div key={d.id} className="rounded-lg border border-border bg-surface-2 p-3">
                <div className="truncate text-xs font-medium text-muted">{d.name}</div>
                <div className={cx('mt-1 text-xl font-bold tabular-nums', tone.text)}>{d.avg_risk.toFixed(0)}</div>
                <div className="text-[10px] text-faint">
                  {d.employee_count} people · {d.high_risk_count} high-risk
                </div>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-surface-3">
                  <div className={cx('h-full', tone.bar)} style={{ width: `${d.avg_risk}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}
