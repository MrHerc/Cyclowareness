/**
 * How long something has waited, as a tone and as a phrase.
 *
 * Separate from the rest of the queue's vocabulary because it is the one thing
 * on this surface the product invents rather than reads. The thresholds are a
 * convention of the approval screens — no service level in the platform defines
 * them — and the queue says so on screen, because a red row otherwise implies a
 * commitment nobody made.
 */

export type WaitTone = 'neutral' | 'medium' | 'high' | 'critical'

const HOUR = 3600

export const WAIT_THRESHOLDS = { medium: 4 * HOUR, high: 24 * HOUR, critical: 72 * HOUR } as const

export function waitTone(seconds: number): WaitTone {
  if (seconds >= WAIT_THRESHOLDS.critical) return 'critical'
  if (seconds >= WAIT_THRESHOLDS.high) return 'high'
  if (seconds >= WAIT_THRESHOLDS.medium) return 'medium'
  return 'neutral'
}

/** "3d 4h" / "18h" / "42m" — a wait reads differently from a timestamp. */
export function waitLabel(seconds: number): string {
  if (seconds < 60) return 'under a minute'
  if (seconds < HOUR) return `${Math.floor(seconds / 60)}m`
  if (seconds < 24 * HOUR) {
    const hours = Math.floor(seconds / HOUR)
    const minutes = Math.floor((seconds % HOUR) / 60)
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
  }
  const days = Math.floor(seconds / (24 * HOUR))
  const hours = Math.floor((seconds % (24 * HOUR)) / HOUR)
  return hours > 0 ? `${days}d ${hours}h` : `${days}d`
}
