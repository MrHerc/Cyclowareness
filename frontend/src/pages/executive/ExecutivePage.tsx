import { FileText } from 'lucide-react'
import { api } from '../../lib/api'
import { usePoll } from '../../lib/usePoll'
import type { ExecutiveDashboard } from '../../lib/types'
import { OutcomeTrendChart, RiskTrendChart } from '../../components/charts'
import { Card, DeptRiskTile, LoadState, SectionTitle, StatCard, metricSub, pct } from '../../components/ui'

export function ExecutivePage() {
  const { data, error, refresh } = usePoll<ExecutiveDashboard>(
    () => api.get('/api/dashboard/executive'),
    15000,
  )

  if (!data) return <LoadState error={error} label="Preparing the executive briefing…" onRetry={refresh} />

  // Only claim improvement when both endpoints were actually measured.
  // A first-minus-last delta across gaps is not evidence, and this number is
  // the one a CISO repeats to their board.
  const measured = data.trend.filter((p) => p.phishing_click_rate !== null)
  const first = measured[0]
  const last = measured[measured.length - 1]
  const clickImproved =
    measured.length >= 2 && first && last
      ? (first.phishing_click_rate as number) - (last.phishing_click_rate as number)
      : null

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
          sub={
            // Never pair an improvement claim with an unmeasured headline: the
            // trend can hold older measured periods while the current window is
            // empty, which rendered "—" above "↓ 12pp" — a number a CISO repeats.
            data.metrics.phishing_click_rate !== null && clickImproved !== null && clickImproved > 0
              ? `↓ ${(clickImproved * 100).toFixed(0)}pp across ${measured.length} measured periods`
              : metricSub(
                  data.metrics.phishing_click_rate,
                  data.metrics.simulation_sample,
                  data.metrics.window_days,
                  'lower is better',
                )
          }
          tone={
            data.metrics.phishing_click_rate === null
              ? 'neutral'
              : data.metrics.phishing_click_rate > 0.25
                ? 'bad'
                : 'good'
          }
        />
        <StatCard
          label="Report rate"
          value={pct(data.metrics.report_rate)}
          sub={metricSub(data.metrics.report_rate, data.metrics.simulation_sample, data.metrics.window_days, 'human sensor strength')}
          tone="accent"
        />
        <StatCard
          label="Avg risk score"
          value={data.metrics.avg_risk_score !== null ? data.metrics.avg_risk_score.toFixed(1) : '—'}
          sub="0–100, lower is safer"
          tone={data.metrics.avg_risk_score !== null && data.metrics.avg_risk_score >= 55 ? 'warn' : 'good'}
        />
        <StatCard
          label="Training completion"
          value={pct(data.metrics.training_completion_rate)}
          sub={metricSub(data.metrics.training_completion_rate, data.metrics.training_sample, data.metrics.window_days, 'micro-modules')}
        />
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
    </div>
  )
}
