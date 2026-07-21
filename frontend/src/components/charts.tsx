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

const AXIS = { fontSize: 10, fill: '#55658a' }
const GRID = '#16213a'

function tooltipStyle() {
  return {
    contentStyle: {
      background: '#0c1424',
      border: '1px solid #2a3a5c',
      borderRadius: 8,
      fontSize: 12,
    },
    labelStyle: { color: '#7e90b3' },
  }
}

function monthLabel(date: string): string {
  return new Date(date).toLocaleDateString('en', { month: 'short', day: 'numeric' })
}

/** Click-rate vs report-rate — the proof the human sensor is getting stronger. */
export function OutcomeTrendChart({ data, height = 220 }: { data: TrendPoint[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
        <defs>
          <linearGradient id="gradClick" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f87171" stopOpacity={0.25} />
            <stop offset="100%" stopColor="#f87171" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradReport" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2dd4bf" stopOpacity={0.25} />
            <stop offset="100%" stopColor="#2dd4bf" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="date" tick={AXIS} tickFormatter={monthLabel} tickLine={false} axisLine={false} minTickGap={40} />
        <YAxis tick={AXIS} tickFormatter={(v: number) => `${Math.round(v * 100)}%`} tickLine={false} axisLine={false} />
        <Tooltip
          {...tooltipStyle()}
          formatter={(value, name) => [
            value === null || value === undefined ? 'not measured' : `${(Number(value) * 100).toFixed(1)}%`,
            String(name) === 'phishing_click_rate' ? 'Click rate' : 'Report rate',
          ]}
          labelFormatter={(label) => monthLabel(String(label))}
        />
        {/* connectNulls stays false on purpose: an unmeasured period must read
            as a gap, not as a line drawn through a value nobody recorded. */}
        <Area
          type="monotone"
          dataKey="phishing_click_rate"
          stroke="#f87171"
          strokeWidth={2}
          fill="url(#gradClick)"
          dot={false}
          connectNulls={false}
        />
        <Area
          type="monotone"
          dataKey="report_rate"
          stroke="#2dd4bf"
          strokeWidth={2}
          fill="url(#gradReport)"
          dot={false}
          connectNulls={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

/** Average risk score trend. */
export function RiskTrendChart({ data, height = 220 }: { data: TrendPoint[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="date" tick={AXIS} tickFormatter={monthLabel} tickLine={false} axisLine={false} minTickGap={40} />
        <YAxis tick={AXIS} domain={[0, 100]} tickLine={false} axisLine={false} />
        <Tooltip
          {...tooltipStyle()}
          formatter={(value) => [
            value === null || value === undefined ? 'not measured' : Number(value).toFixed(1),
            'Avg risk score',
          ]}
          labelFormatter={(label) => monthLabel(String(label))}
        />
        <Line
          type="monotone"
          dataKey="avg_risk_score"
          stroke="#818cf8"
          strokeWidth={2}
          dot={false}
          connectNulls={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
