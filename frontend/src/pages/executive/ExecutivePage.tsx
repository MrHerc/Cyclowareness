import { FileText } from 'lucide-react'
import { api } from '../../lib/api'
import { usePoll } from '../../lib/usePoll'
import type { ExecutiveDashboard } from '../../lib/types'
import { ChartLegend, OutcomeTrendChart, RiskTrendChart } from '../../components/charts'
import {
  DeptTile,
  LoadState,
  Metric,
  PageHeader,
  Panel,
  Provenance,
  metricSub,
  pct,
} from '../../components/ui'

export function ExecutivePage() {
  const { data, error, refresh } = usePoll<ExecutiveDashboard>(
    () => api.get('/api/dashboard/executive'),
    15000,
  )

  if (!data) return <LoadState error={error} label="Preparing the executive briefing" onRetry={refresh} />

  const m = data.metrics

  // The improvement claim must end at the number it captions.
  //
  // This used to be first-measured minus LAST-MEASURED-SNAPSHOT, while the
  // headline above it showed the live 30-day window computed from actual
  // simulation outcomes. Those are two different series, so the tile read
  // "29%" over "down 21pp" when the real change against the earliest measured
  // point was 2.1pp. A CISO repeats this number to a board.
  //
  // Comparing the live headline against the earliest measured snapshot is the
  // only pairing where the caption describes the value it sits under.
  const measured = data.trend.filter((p) => p.phishing_click_rate !== null)
  const baseline = measured[0]?.phishing_click_rate ?? null
  const clickImproved =
    baseline !== null && m.phishing_click_rate !== null ? baseline - m.phishing_click_rate : null

  return (
    <div className="rise space-y-6">
      <PageHeader
        title="Executive view"
        lede="Human cyber-risk posture across the organisation, at a glance. Read-only."
      />

      <Panel
        tone="feature"
        title={
          <span className="flex items-center gap-2">
            <FileText size={15} className="text-brand-fg" aria-hidden />
            {data.briefing_source === 'anthropic' ? 'AI briefing' : 'Automated briefing'}
          </span>
        }
        subtitle="Current posture, written from the measurements below."
        /* The heading names the engine that actually wrote the paragraph. When
           no model is configured the text comes from a template, and the
           executive is the reader least able to tell the difference. */
        actions={<Provenance source={data.briefing_source} />}
      >
        {/* The briefing is rewritten on every poll, so it must be announced
            rather than silently swapped under a reader mid-sentence. */}
        <p className="text-lead text-c1" aria-live="polite">
          {data.briefing}
        </p>
      </Panel>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        <Metric
          label="Click rate"
          value={pct(m.phishing_click_rate)}
          caption={
            // Never pair an improvement claim with an unmeasured headline: the
            // trend can hold older measured periods while the current window is
            // empty, which rendered "—" above a confident "down 12pp".
            // 0.5pp is below the noise floor of a per-campaign rate, so nothing
            // is claimed until the movement is worth a sentence.
            m.phishing_click_rate !== null && clickImproved !== null && clickImproved > 0.005
              ? `down ${(clickImproved * 100).toFixed(1)}pp since the first measured period`
              : metricSub(m.phishing_click_rate, m.simulation_sample, m.window_days, 'lower is better')
          }
          tone={
            m.phishing_click_rate === null ? 'neutral' : m.phishing_click_rate > 0.25 ? 'danger' : 'success'
          }
          size="sm"
        />
        <Metric
          label="Report rate"
          value={pct(m.report_rate)}
          caption={metricSub(m.report_rate, m.simulation_sample, m.window_days, 'human sensor strength')}
          tone={m.report_rate !== null ? 'success' : 'neutral'}
          size="sm"
        />
        <Metric
          label="Avg risk score"
          value={m.avg_risk_score !== null ? m.avg_risk_score.toFixed(1) : '—'}
          caption="0–100, lower is safer"
          tone={m.avg_risk_score === null ? 'neutral' : m.avg_risk_score >= 55 ? 'warning' : 'success'}
          size="sm"
        />
        <Metric
          label="Training completion"
          value={pct(m.training_completion_rate)}
          caption={metricSub(m.training_completion_rate, m.training_sample, m.window_days, 'micro-modules')}
          size="sm"
        />
        <Metric
          label="Loops closed"
          value={data.loops_closed}
          caption="threat → training → measured"
          tone="brand"
          size="sm"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel
          title="Behaviour change, before and after"
          actions={
            <ChartLegend
              items={[
                { label: 'click rate', color: 'var(--color-series-1)' },
                { label: 'report rate', color: 'var(--color-series-2)' },
              ]}
            />
          }
        >
          <OutcomeTrendChart data={data.trend} height={240} />
        </Panel>
        <Panel title="Organisation risk trend">
          <RiskTrendChart data={data.trend} height={240} />
        </Panel>
      </div>

      <Panel title="Departments" subtitle="Average risk score, and how many people sit in the high band">
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
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
    </div>
  )
}
