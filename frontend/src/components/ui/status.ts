/**
 * Every backend status string, mapped to a tone — once.
 *
 * The product has more than twenty status enums (loop, module, assignment,
 * finding, integration, sandbox job, incident subject…) and they share words.
 * If each screen picked its own colour for `failed`, the same fact would look
 * different in the approval queue and in the run detail, and a viewer would
 * learn nothing from colour at all. So: one table, consulted by `Badge` and
 * `StatusDot`, and never bypassed.
 *
 * Two rules the table encodes:
 *
 * - **Brand is not health.** `running` / `in_progress` / `active` are cyan
 *   because the loop is moving, which is a process fact. A green `completed`
 *   and a cyan `running` are answering different questions.
 * - **A closed decision is not a risk.** `rejected`, `dismissed`, `superseded`
 *   and `false_positive` are neutral. Painting a human's considered "no" in
 *   orange invents an alarm nobody raised.
 *
 * An unknown string falls back to neutral and `humanise()`. Adding a colour for
 * a value the server does not send is how a UI grows a state that cannot occur.
 */

export type StatusTone = 'critical' | 'high' | 'medium' | 'low' | 'safe' | 'brand' | 'ai' | 'neutral'

interface StatusMeaning {
  tone: StatusTone
  /** Something is happening right now — the dot pulses. */
  live?: boolean
  /** Only where `humanise()` gets it wrong. */
  label?: string
}

const STATUS: Record<string, StatusMeaning> = {
  /* --- something is wrong ------------------------------------------------- */
  critical: { tone: 'critical' },
  malicious: { tone: 'critical' },
  failed: { tone: 'critical' },
  error: { tone: 'critical' },
  urgent: { tone: 'critical' },
  clicked: { tone: 'critical' },
  open: { tone: 'critical' },

  /* --- worth attention ---------------------------------------------------- */
  high: { tone: 'high' },
  suspicious: { tone: 'high' },
  expired: { tone: 'high' },
  overdue: { tone: 'high' },
  degraded: { tone: 'high' },
  partial: { tone: 'high' },
  reopened: { tone: 'high' },
  awaiting_password: { tone: 'high' },

  /* --- waiting on a human ------------------------------------------------- */
  medium: { tone: 'medium' },
  awaiting_approval: { tone: 'medium' },
  awaiting_training: { tone: 'medium' },
  awaiting_review: { tone: 'medium' },
  pending_review: { tone: 'medium' },
  under_review: { tone: 'medium' },
  in_review: { tone: 'medium' },
  proposed: { tone: 'medium' },
  accepted_risk: { tone: 'medium' },

  /* --- informational ------------------------------------------------------ */
  low: { tone: 'low' },
  monitoring: { tone: 'low' },
  relevant: { tone: 'low' },

  /* --- healthy / done ----------------------------------------------------- */
  completed: { tone: 'safe' },
  approved: { tone: 'safe' },
  accepted: { tone: 'safe' },
  resolved: { tone: 'safe' },
  closed: { tone: 'safe' },
  connected: { tone: 'safe' },
  benign: { tone: 'safe' },
  extracted: { tone: 'safe' },
  reported: { tone: 'safe' },
  reviewed: { tone: 'safe' },
  ok: { tone: 'safe', label: 'OK' },

  /* --- the loop is moving ------------------------------------------------- */
  running: { tone: 'brand', live: true },
  in_progress: { tone: 'brand', live: true },
  active: { tone: 'brand', live: true },
  in_loop: { tone: 'brand' },
  remediation_planned: { tone: 'brand' },
  training_assigned: { tone: 'brand' },

  /* --- nothing to report -------------------------------------------------- */
  queued: { tone: 'neutral' },
  pending: { tone: 'neutral' },
  new: { tone: 'neutral' },
  draft: { tone: 'neutral' },
  assigned: { tone: 'neutral' },
  info: { tone: 'neutral' },
  ignored: { tone: 'neutral' },
  dismissed: { tone: 'neutral' },
  rejected: { tone: 'neutral' },
  waived: { tone: 'neutral' },
  retired: { tone: 'neutral' },
  superseded: { tone: 'neutral' },
  false_positive: { tone: 'neutral' },
  not_applicable: { tone: 'neutral' },
  not_attempted: { tone: 'neutral' },
  not_configured: { tone: 'neutral' },
  configured: { tone: 'neutral' },
  disabled: { tone: 'neutral' },
  never: { tone: 'neutral' },
  unassessed: { tone: 'neutral' },
}

export function statusMeaning(status: string | null | undefined): StatusMeaning {
  if (!status) return { tone: 'neutral' }
  return STATUS[status.toLowerCase()] ?? { tone: 'neutral' }
}

export function statusTone(status: string | null | undefined): StatusTone {
  return statusMeaning(status).tone
}

/* ============================================================================
   Tone -> classes. The only place a status turns into colour.
   ========================================================================== */

/** Tinted pill: readable text on a wash of its own hue. */
export const TONE_PILL: Record<StatusTone, string> = {
  critical: 'bg-critical/12 text-critical border-critical/35',
  high: 'bg-high/12 text-high border-high/35',
  medium: 'bg-medium/12 text-medium border-medium/35',
  low: 'bg-low/12 text-low border-low/35',
  safe: 'bg-safe/12 text-safe border-safe/35',
  brand: 'bg-brand/12 text-brand border-brand/35',
  ai: 'bg-ai/12 text-ai border-ai/35',
  neutral: 'bg-raised text-fg-muted border-line',
}

export const TONE_DOT: Record<StatusTone, string> = {
  critical: 'bg-critical',
  high: 'bg-high',
  medium: 'bg-medium',
  low: 'bg-low',
  safe: 'bg-safe',
  brand: 'bg-brand',
  ai: 'bg-ai',
  neutral: 'bg-fg-subtle',
}

export const TONE_TEXT: Record<StatusTone, string> = {
  critical: 'text-critical',
  high: 'text-high',
  medium: 'text-medium',
  low: 'text-low',
  safe: 'text-safe',
  brand: 'text-brand',
  ai: 'text-ai',
  neutral: 'text-fg-muted',
}
