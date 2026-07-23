/**
 * The mark is the invention: one stroke that leaves, travels the full circle
 * and re-enters itself as an arrowhead, around a solid centre — the threat
 * goes out, comes back changed, and the person in the middle is what it acts
 * on. It is drawn rather than picked from an icon set on purpose: a stock
 * shield glyph in a rounded box is the single most recognisable "generated
 * dashboard" signature there is.
 */
export function LoopMark({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {/* the cycle — a near-complete ring, opened at the top */}
      <path
        d="M20.4 4.9a12.2 12.2 0 1 1-8.8 0"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      {/* the return: the stroke re-entering itself */}
      <path d="M19.1 1.4 22.9 5.2 19.1 9" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      {/* what the loop acts on */}
      <circle cx="16" cy="16" r="4.1" fill="currentColor" />
    </svg>
  )
}

export function Wordmark({ compact }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <LoopMark size={compact ? 20 : 24} className="text-brand-fg" />
      <span className="flex flex-col">
        <span className="text-h leading-none tracking-tight">Cyclowareness</span>
        {!compact && (
          <span className="label mt-1 text-c3">Closed-loop awareness</span>
        )}
      </span>
    </span>
  )
}
