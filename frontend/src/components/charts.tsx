import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { TrendPoint } from '../lib/types'

/**
 * Recharts renders to SVG attributes, not classes, so it cannot read Tailwind
 * utilities — but it can read CSS custom properties. Routing every colour
 * through the same tokens as the rest of the UI is what lets the charts follow
 * the light/dark switch instead of staying stuck on a dark-only palette.
 */
const AXIS = { fontSize: 11, fill: 'var(--color-c3)' }
const GRID = 'var(--color-hair)'

const TOOLTIP = {
  contentStyle: {
    background: 'var(--color-panel)',
    border: '1px solid var(--color-line)',
    borderRadius: 8,
    fontSize: 12,
    color: 'var(--color-c1)',
    boxShadow: '0 8px 24px rgb(0 0 0 / 0.35)',
  },
  labelStyle: { color: 'var(--color-c2)', marginBottom: 4 },
  itemStyle: { padding: 0 },
}

function dayLabel(date: string): string {
  return new Date(date).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })
}

/** Click rate against report rate — the evidence the human sensor is improving. */
export function OutcomeTrendChart({ data, height = 220 }: { data: TrendPoint[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
        <defs>
          <linearGradient id="gradClick" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-series-1)" stopOpacity={0.22} />
            <stop offset="100%" stopColor="var(--color-series-1)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradReport" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-series-2)" stopOpacity={0.22} />
            <stop offset="100%" stopColor="var(--color-series-2)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="date" tick={AXIS} tickFormatter={dayLabel} tickLine={false} axisLine={false} minTickGap={40} />
        <YAxis tick={AXIS} tickFormatter={(v: number) => `${Math.round(v * 100)}%`} tickLine={false} axisLine={false} width={44} />
        <Tooltip
          {...TOOLTIP}
          formatter={(value, name) => [
            value === null || value === undefined ? 'not measured' : `${(Number(value) * 100).toFixed(1)}%`,
            String(name) === 'phishing_click_rate' ? 'Click rate' : 'Report rate',
          ]}
          labelFormatter={(label) => dayLabel(String(label))}
        />
        {/* connectNulls stays false on purpose: an unmeasured period must read
            as a gap, not as a line drawn through a value nobody recorded. */}
        <Area
          type="monotone"
          dataKey="phishing_click_rate"
          stroke="var(--color-series-1)"
          strokeWidth={2}
          fill="url(#gradClick)"
          dot={false}
          connectNulls={false}
        />
        <Area
          type="monotone"
          dataKey="report_rate"
          stroke="var(--color-series-2)"
          strokeWidth={2}
          fill="url(#gradReport)"
          dot={false}
          connectNulls={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

/** Organisation-wide average risk score. */
export function RiskTrendChart({ data, height = 220 }: { data: TrendPoint[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="date" tick={AXIS} tickFormatter={dayLabel} tickLine={false} axisLine={false} minTickGap={40} />
        <YAxis tick={AXIS} domain={[0, 100]} tickLine={false} axisLine={false} width={44} />
        <Tooltip
          {...TOOLTIP}
          formatter={(value) => [
            value === null || value === undefined ? 'not measured' : Number(value).toFixed(1),
            'Avg risk score',
          ]}
          labelFormatter={(label) => dayLabel(String(label))}
        />
        <Line
          type="monotone"
          dataKey="avg_risk_score"
          stroke="var(--color-series-3)"
          strokeWidth={2}
          dot={false}
          connectNulls={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

/** Shared legend so the two charts never drift in wording or swatch. */
export function ChartLegend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className="text-xs flex items-center gap-3 text-c2">
      {items.map((i) => (
        <span key={i.label} className="flex items-center gap-1.5">
          <span className="h-0.5 w-3.5 rounded-full" style={{ background: i.color }} aria-hidden />
          {i.label}
        </span>
      ))}
    </div>
  )
}
