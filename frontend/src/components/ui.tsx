import type { HTMLAttributes, ReactNode } from 'react'
import { CircleAlert, Loader2, RefreshCw, Sparkles, X } from 'lucide-react'
import { useEscape } from '../lib/useEscape'

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

/** Human wording for a delivery channel. Single source of truth. */
const CHANNEL_LABELS: Record<string, string> = {
  email: 'Email',
  url: 'URL',
  file: 'File',
  sms: 'SMS',
  qr: 'QR code',
  chat: 'Chat',
  web: 'Web',
}

export function Badge({ value, label }: { value: string; label?: string }) {
  // Channel values are prettified automatically: the same record used to read
  // "email" in a list and "Email" in its own drawer, because getting it right
  // depended on each call site remembering to pass `label`.
  const text = label ?? CHANNEL_LABELS[value] ?? value
  return (
    <span
      className={cx(
        'inline-flex items-center whitespace-nowrap rounded-md border px-1.5 py-0.5 text-[11px] font-medium',
        badgePalette[value] ?? 'bg-muted/10 text-muted border-border-2',
      )}
    >
      {text.replace(/_/g, ' ')}
    </span>
  )
}

/**
 * Small labelled chip for indicators, targeting reasons and IOC tags.
 *
 * One concept that had drifted into three border opacities and two corner
 * radii across the analyst and employee views.
 */
export function Chip({
  children,
  tone = 'indigo',
}: {
  children: ReactNode
  tone?: 'indigo' | 'warn' | 'accent' | 'muted'
}) {
  const tones = {
    indigo: 'border-indigo/30 bg-indigo/10 text-indigo',
    warn: 'border-warn/30 bg-warn/10 text-warn',
    accent: 'border-accent/30 bg-accent/10 text-accent',
    muted: 'border-border-2 bg-surface-3 text-muted',
  }
  return (
    <span className={cx('inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px]', tones[tone])}>
      {children}
    </span>
  )
}

/**
 * Segmented control used for status filters.
 *
 * Was hand-rolled three times at two different sizes and with no ARIA, so
 * screen readers heard a row of unlabelled buttons.
 */
export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  fill,
}: {
  tabs: readonly { key: T; label: string }[]
  value: T
  onChange: (key: T) => void
  fill?: boolean
}) {
  return (
    <div
      role="tablist"
      className={cx('flex gap-1 rounded-lg border border-border bg-surface p-1', !fill && 'w-fit')}
    >
      {tabs.map((t) => (
        <button
          key={t.key}
          role="tab"
          aria-selected={value === t.key}
          onClick={() => onChange(t.key)}
          className={cx(
            'rounded-md px-3.5 py-1.5 text-[13px] font-medium transition-colors',
            fill && 'flex-1',
            value === t.key ? 'bg-accent/15 text-accent' : 'text-muted hover:text-ink',
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

/**
 * Callout for AI-produced or explanatory content.
 *
 * The indigo "AI said this" panel had drifted into five shapes with three
 * different header treatments; this is the one shape.
 */
export function InfoPanel({
  title,
  icon,
  tone = 'indigo',
  right,
  children,
}: {
  title: string
  icon?: ReactNode
  tone?: 'indigo' | 'accent'
  right?: ReactNode
  children: ReactNode
}) {
  const tones = {
    indigo: 'border-indigo/25 bg-indigo/5',
    accent: 'border-accent/25 bg-accent/5',
  }
  const heads = { indigo: 'text-indigo', accent: 'text-accent' }
  return (
    <div className={cx('rounded-lg border p-3', tones[tone])}>
      <div className="flex items-center justify-between gap-2">
        <div className={cx('flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide', heads[tone])}>
          {icon}
          {title}
        </div>
        {right}
      </div>
      <div className="mt-1.5 text-[13px] leading-relaxed">{children}</div>
    </div>
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

/**
 * The single place a page waits for its first payload.
 *
 * `usePoll` keeps `data` at null when a request fails, so a page that only
 * checks `if (!data) return <Spinner/>` spins forever whenever the API is
 * unreachable — hiding the one actionable message the client produces. Always
 * pass the poll's `error` through here instead.
 */
export function LoadState({
  error,
  label,
  onRetry,
}: {
  error: string | null
  label?: string
  onRetry?: () => void
}) {
  if (!error) return <Spinner label={label} />
  return (
    <div className="fade-in py-12 text-center">
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-xl border border-bad/40 bg-bad/5 px-5 py-6">
        <CircleAlert size={22} className="text-bad" />
        <p className="text-sm leading-relaxed text-bad">{error}</p>
        {onRetry && (
          <Button variant="ghost" onClick={onRetry}>
            <RefreshCw size={13} /> Try again
          </Button>
        )}
      </div>
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

/** Shimmering placeholder shown while data loads — never fake an empty state. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cx('animate-pulse rounded-lg bg-surface-3/60', className)} />
}

/**
 * Honest provenance for generated content. Content written by the offline
 * generator must never be presentable as live-model output — the analyst
 * approving it needs to know which engine actually wrote it.
 */
export function GenerationSourceBadge({ source }: { source: string }) {
  if (source === 'mock') {
    return (
      <span
        title="Written by the offline generator, not a live model. Review this closely before approving."
        className="inline-flex items-center rounded-md border border-warn/40 bg-warn/10 px-1.5 py-0.5 text-[10px] font-medium text-warn"
      >
        Offline generator
      </span>
    )
  }
  if (source === 'anthropic') {
    return (
      <span className="inline-flex items-center rounded-md border border-indigo/30 bg-indigo/10 px-1.5 py-0.5 text-[10px] font-medium text-indigo">
        AI generated
      </span>
    )
  }
  return null
}

/**
 * Employee-facing provenance chip.
 *
 * Both variants are derived from a real analyzed threat — that is what the
 * loop does. Only the live-model variant may claim to be AI-built; content the
 * offline generator wrote must not borrow that credit. "Offline generator" is
 * internal jargon, so employees simply see the claim we can stand behind.
 */
export function ThreatOriginChip({ source }: { source: string }) {
  const aiWritten = source === 'anthropic'
  return (
    <span
      className={cx(
        'flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium',
        aiWritten ? 'border-indigo/30 bg-indigo/10 text-indigo' : 'border-accent/30 bg-accent/10 text-accent',
      )}
    >
      <Sparkles size={10} />
      {aiWritten ? 'AI-built from a real threat' : 'Built from a real threat'}
    </span>
  )
}

/**
 * A labelled number.
 *
 * `size="sm"` replaces the three near-identical local `MiniStat` components
 * that had drifted apart in label size, weight, colour and tracking.
 * `align="center"` + `icon` covers the employee scorecard variant.
 */
export function StatCard({
  label,
  value,
  sub,
  tone = 'neutral',
  size = 'md',
  icon,
  align = 'left',
}: {
  label: string
  value: ReactNode
  sub?: ReactNode
  tone?: 'neutral' | 'good' | 'bad' | 'accent' | 'warn' | 'indigo'
  size?: 'sm' | 'md'
  icon?: ReactNode
  align?: 'left' | 'center'
}) {
  const tones = {
    neutral: 'text-ink',
    good: 'text-good',
    bad: 'text-bad',
    accent: 'text-accent',
    warn: 'text-warn',
    indigo: 'text-indigo',
  }
  const sm = size === 'sm'
  return (
    <Card
      className={cx(
        sm ? 'bg-surface-2 p-3' : 'p-4',
        align === 'center' && 'text-center',
      )}
    >
      {icon && <div className={cx('mb-1', align === 'center' && 'flex justify-center')}>{icon}</div>}
      <div
        className={cx(
          'font-semibold uppercase tracking-[0.12em] text-muted',
          sm ? 'text-[10px]' : 'text-[11px]',
        )}
      >
        {label}
      </div>
      <div className={cx('font-semibold tabular-nums', sm ? 'mt-1 text-lg' : 'mt-1.5 text-2xl', tones[tone])}>
        {value}
      </div>
      {sub && <div className={cx('mt-1 text-faint', sm ? 'text-[10px]' : 'text-xs')}>{sub}</div>}
    </Card>
  )
}

/**
 * One department's risk, as shown on the analyst heatmap, the executive view
 * and the employees filter — previously three tiles that had drifted in radius,
 * caption wording and whether the bar existed at all.
 */
export function DeptRiskTile({
  name,
  avgRisk,
  employeeCount,
  highRiskCount,
  selected,
  onClick,
}: {
  name: string
  avgRisk: number
  employeeCount: number
  highRiskCount: number
  selected?: boolean
  onClick?: () => void
}) {
  const tone = riskTone(avgRisk)
  const inner = (
    <>
      <div className="truncate text-xs font-medium text-muted">{name}</div>
      <div className={cx('mt-1 text-xl font-bold tabular-nums', tone.text)}>{avgRisk.toFixed(0)}</div>
      <div className="text-[10px] text-faint">
        {employeeCount} people · {highRiskCount} high-risk
      </div>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-surface-3">
        <div className={cx('h-full', tone.bar)} style={{ width: `${Math.min(100, avgRisk)}%` }} />
      </div>
    </>
  )
  const base = 'rounded-lg border p-3 text-left transition-colors'
  if (!onClick) {
    return <div className={cx(base, 'border-border bg-surface-2')}>{inner}</div>
  }
  return (
    <button
      onClick={onClick}
      aria-pressed={selected}
      className={cx(
        base,
        selected ? 'border-accent/60 bg-accent/5' : 'border-border bg-surface-2 hover:border-border-2',
      )}
    >
      {inner}
    </button>
  )
}

// --- overlays ---------------------------------------------------------------------

const MODAL_SIZES = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-xl',
} as const

/**
 * Centred dialog. One scrim, one panel treatment, real dialog semantics and
 * Escape-to-close built in — previously four hand-rolled copies, one of which
 * had no close affordance at all.
 */
export function Modal({
  title,
  onClose,
  size = 'md',
  children,
  hideHeader,
}: {
  title: string
  onClose: () => void
  size?: keyof typeof MODAL_SIZES
  children: ReactNode
  hideHeader?: boolean
}) {
  useEscape(onClose)
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cx(
          'w-full rounded-2xl border border-border bg-surface p-5 shadow-2xl fade-in',
          MODAL_SIZES[size],
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {!hideHeader && (
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-base font-semibold">{title}</h3>
            <button onClick={onClose} aria-label="Close" className="text-muted transition-colors hover:text-ink">
              <X size={17} />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  )
}

/** Right-side panel. Same scrim and dismissal rules as Modal. */
export function Drawer({
  title,
  onClose,
  width = 'max-w-md',
  children,
}: {
  title: string
  onClose: () => void
  width?: string
  children: ReactNode
}) {
  useEscape(onClose)
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cx(
          'h-full w-full overflow-y-auto border-l border-border bg-surface p-6 shadow-2xl fade-in',
          width,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
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

/**
 * Caption for a windowed rate. When the sample is too small the caption says
 * so — with the actual n — instead of dressing a missing measurement up as a
 * healthy one.
 */
export function metricSub(
  value: number | null,
  sample: number,
  windowDays: number,
  hint: string,
): string {
  if (value === null) {
    return sample === 0
      ? `no events in the last ${windowDays} days`
      : `not enough data yet (n=${sample})`
  }
  return `last ${windowDays} days (n=${sample}) — ${hint}`
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
