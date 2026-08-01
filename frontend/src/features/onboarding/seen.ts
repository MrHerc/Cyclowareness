/**
 * Whether the first-run explanation has been shown on this device.
 *
 * It lives beside the session in `localStorage` rather than on the server
 * because there is no endpoint for it, and inventing one in the client — a
 * "profile" that only this browser knows about — would be a preference the
 * product cannot honour anywhere else. What it actually is, is a device fact,
 * so that is where it is stored and that is what the copy implies.
 */

const KEY = 'cyclo.onboarding-seen'

export function hasSeenOnboarding(): boolean {
  try {
    return localStorage.getItem(KEY) === 'true'
  } catch {
    // No storage means no memory of it. Showing the primer again is the safe
    // failure — skipping it silently is not.
    return false
  }
}

export function markOnboardingSeen(): void {
  try {
    localStorage.setItem(KEY, 'true')
  } catch {
    /* private browsing — the primer simply appears again next time */
  }
}
