/**
 * The right-hand column, identical on all three public pages.
 *
 * It says one thing and shows one thing. Every claim here is about what the
 * product does, never about what this deployment has measured — a number on the
 * sign-in screen has no sample size, no window and no way for a reader to check
 * it, so there are none.
 */

import { LoopSignature } from './LoopSignature'

export const HEADLINE = 'Turn real threats into measurable human resilience.'

// British spelling, like the other 223 occurrences in this frontend
// ("organisation", "behaviour", "sanitisation"). This sentence is the first
// prose a visitor reads and it was the only American one, which reads as copy
// pasted in from somewhere else. `analyzer` stays American where it names the
// server's own `static_analyzers` field — that is an identifier, not prose.
export const SUPPORTING =
  'Analyse real organisational risks, generate safe targeted training, validate every campaign through human approval, and continuously measure behavioural change.'

export function PublicAside() {
  return (
    <div className="flex w-full max-w-xl flex-col items-center gap-10">
      <div className="text-center">
        <p className="text-hero text-fg">{HEADLINE}</p>
        <p className="text-lead text-fg-muted mx-auto mt-4 max-w-lg">{SUPPORTING}</p>
      </div>
      <LoopSignature />
    </div>
  )
}

/** The same claim, compressed, for the widths where the figure is not drawn. */
export function CompactIntro() {
  return (
    <div>
      <p className="text-title text-fg">{HEADLINE}</p>
      <p className="text-body text-fg-muted mt-2">{SUPPORTING}</p>
    </div>
  )
}
