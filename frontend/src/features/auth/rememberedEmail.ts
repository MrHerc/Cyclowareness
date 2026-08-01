/**
 * "Remember me", stated exactly.
 *
 * It remembers the ADDRESS, on this device, and nothing else. It does not
 * lengthen the session and it does not keep the password anywhere — the token's
 * lifetime is the server's decision and the UI has no business implying it can
 * extend it. A checkbox that quietly means something larger than its label is
 * the kind of small dishonesty a security product cannot afford.
 */

const KEY = 'cyclo.remember-email'

export function rememberedEmail(): string | null {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

export function setRememberedEmail(email: string | null): void {
  try {
    if (email) localStorage.setItem(KEY, email)
    else localStorage.removeItem(KEY)
  } catch {
    /* private browsing, quota — failing to remember must not fail the sign-in */
  }
}
