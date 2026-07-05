import type { HTMLAttributes, ReactNode } from 'react'
import { Loader2 } from 'lucide-react'

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ')
}

// --- primitives ---------------------------------------------------------------

export function Card({
  children,
  className,
  onClick,
  ...rest
}: {
  children: ReactNode
  className?: string
  onClick?: () => void
} & Omit<HTMLAttributes<HTMLDivElement>, 'className' | 'onClick'>) {
  return (
    <div
      onClick={onClick}
      className={cx(
        'rounded-xl border border-border bg-surface',
        onClick && 'cursor-pointer transition-colors hover:border-border-2',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  )
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">{children}</h2>
      {right}
    </div>
  )
}

type ButtonVariant = 'primary' | 'ghost' | 'danger' | 'subtle'

export function Button({
  children,
  onClick,
  variant = 'primary',
  disabled,
  busy,
  className,
  type = 'button',
}: {
  children: ReactNode
  onClick?: () => void
  variant?: ButtonVariant
  disabled?: boolean
  busy?: boolean
  className?: string
  type?: 'button' | 'submit'
}) {
  const styles: Record<ButtonVariant, string> = {
    primary:
      'bg-accent/15 text-accent border border-accent/40 hover:bg-accent/25 disabled:opacity-40',
    ghost: 'bg-transparent text-muted border border-border hover:text-ink hover:border-border-2 disabled:opacity-40',
    danger: 'bg-bad/10 text-bad border border-bad/40 hover:bg-bad/20 disabled:opacity-40',
    subtle: 'bg-surface-2 text-ink border border-border hover:border-border-2 disabled:opacity-40',
  }
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || busy}
      className={cx(
        'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
        styles[variant],
        className,
      )}
    >
      {busy && <Loader2 size={14} className="animate-spin" />}
      {children}
    </button>
  )
}

const badgePalette: Record<string, string> = {
  // verdicts
  malicious: 'bg-bad/10 text-bad border-bad/40',
  suspicious: 'bg-warn/10 text-warn border-warn/40',
  benign: 'bg-good/10 text-good border-good/40',
  // severities
  critical: 'bg-crit/15 text-crit border-crit/50',
  high: 'bg-bad/10 text-bad border-bad/40',
  medium: 'bg-warn/10 text-warn border-warn/40',
  low: 'bg-muted/10 text-muted border-border-2',
  // loop / general statuses
  running: 'bg-accent/10 text-accent border-accent/40',
  awaiting_approval: 'bg-warn/10 text-warn border-warn/40',
  awaiting_training: 'bg-indigo/10 text-indigo border-indigo/40',
  completed: 'bg-good/10 text-good border-good/40',
  failed: 'bg-bad/10 text-bad border-bad/40',
  // assignment / report / sim
  assigned: 'bg-indigo/10 text-indigo border-indigo/40',
  in_progress: 'bg-accent/10 text-accent border-accent/40',
  expired: 'bg-bad/10 text-bad border-bad/40',
  new: 'bg-warn/10 text-warn border-warn/40',
  in_loop: 'bg-accent/10 text-accent border-accent/40',
  dismissed: 'bg-muted/10 text-muted border-border-2',
  draft: 'bg-muted/10 text-muted border-border-2',
  active: 'bg-accent/10 text-accent border-accent/40',
  pending_review: 'bg-warn/10 text-warn border-warn/40',
  approved: 'bg-good/10 text-good border-good/40',
  rejected: 'bg-bad/10 text-bad border-bad/40',
  // sim outcomes
  clicked: 'bg-bad/10 text-bad border-bad/40',
  reported: 'bg-good/10 text-good border-good/40',
  ignored: 'bg-muted/10 text-muted border-border-2',
  pending: 'bg-muted/10 text-muted border-border-2',
  // threat sources
  human_sensor: 'bg-accent/10 text-accent border-accent/40',
  feed: 'bg-indigo/10 text-indigo border-indigo/40',
  manual: 'bg-muted/10 text-muted border-border-2',
}

export function Badge({ value, label }: { value: string; label?: string }) {
  return (
    <span
      className={cx(
        'inline-flex items-center whitespace-nowrap rounded-md border px-1.5 py-0.5 text-[11px] font-medium',
        badgePalette[value] ?? 'bg-muted/10 text-muted border-border-2',
      )}
    >
      {(label ?? value).replace(/_/g, ' ')}
    </span>
  )
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-muted">
      <Loader2 size={18} className="animate-spin" />
      {label && <span className="text-sm">{label}</span>}
    </div>
  )
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-faint">
      {children}
    </div>
  )
}

export function StatCard({
  label,
  value,
  sub,
  tone = 'neutral',
}: {
  label: string
  value: ReactNode
  sub?: ReactNode
  tone?: 'neutral' | 'good' | 'bad' | 'accent' | 'warn'
}) {
  const tones = {
    neutral: 'text-ink',
    good: 'text-good',
    bad: 'text-bad',
    accent: 'text-accent',
    warn: 'text-warn',
  }
  return (
    <Card className="p-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{label}</div>
      <div className={cx('mt-1.5 text-2xl font-semibold tabular-nums', tones[tone])}>{value}</div>
      {sub && <div className="mt-1 text-xs text-faint">{sub}</div>}
    </Card>
  )
}

// --- risk helpers ---------------------------------------------------------------

export function riskTone(score: number): { text: string; bar: string; label: string } {
  if (score >= 60) return { text: 'text-bad', bar: 'bg-bad', label: 'High' }
  if (score >= 40) return { text: 'text-warn', bar: 'bg-warn', label: 'Elevated' }
  return { text: 'text-good', bar: 'bg-good', label: 'Low' }
}

export function RiskBar({ score, className }: { score: number; className?: string }) {
  const tone = riskTone(score)
  return (
    <div className={cx('flex items-center gap-2', className)}>
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-surface-3">
        <div className={cx('h-full rounded-full', tone.bar)} style={{ width: `${Math.min(100, score)}%` }} />
      </div>
      <span className={cx('text-xs font-semibold tabular-nums', tone.text)}>{score.toFixed(0)}</span>
    </div>
  )
}

// --- formatting -------------------------------------------------------------------

export function pct(v: number | null | undefined, digits = 0): string {
  if (v === null || v === undefined) return '—'
  return `${(v * 100).toFixed(digits)}%`
}

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return '—'
  // Backend datetimes may arrive without a timezone suffix (SQLite): treat as UTC
  const normalized = /[zZ]$|[+-]\d\d:\d\d$/.test(iso) ? iso : `${iso}Z`
  const then = new Date(normalized).getTime()
  const seconds = Math.max(0, (Date.now() - then) / 1000)
  if (seconds < 60) return `${Math.floor(seconds)}s ago`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

export function channelLabel(t: string): string {
  const map: Record<string, string> = {
    email: 'Email',
    url: 'URL',
    file: 'File',
    sms: 'SMS',
    qr: 'QR code',
    chat: 'Chat',
    web: 'Web',
  }
  return map[t] ?? t
}
