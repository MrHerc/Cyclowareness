/**
 * The label / value / reference rows behind a finding or an incident risk.
 *
 * A finding without its evidence is an assertion, and an assertion is what a
 * customer's security team refuses to act on. The `ref` is the part that makes a
 * row checkable — the CVE, the log line, the passage the rule was extracted
 * from — so it is rendered in mono and, when it is a URL, as a real link.
 *
 * Matches `PolicyFinding.evidence` and `IncidentRisk.evidence` exactly.
 */

import { ExternalLink } from 'lucide-react'
import { cn } from '../../lib/format'

export interface EvidenceItem {
  label: string
  value: string
  /** Where it came from: a URL, a CVE id, a file path, a line reference. */
  ref?: string
}

export interface EvidenceListProps {
  items: EvidenceItem[] | null | undefined
  /** Renders values in mono. Use for hashes, IPs, versions — not for prose. */
  mono?: boolean
  /** Overrides the honest default when the caller knows why it is empty. */
  emptyMessage?: string
  className?: string
}

function isUrl(ref: string): boolean {
  return /^https?:\/\//i.test(ref)
}

export function EvidenceList({ items, mono = false, emptyMessage, className }: EvidenceListProps) {
  if (!items || items.length === 0) {
    return (
      <p className={cn('text-sm text-fg-faint', className)}>
        {emptyMessage ?? 'No evidence was recorded for this.'}
      </p>
    )
  }

  return (
    <dl className={cn('divide-line', className)}>
      {items.map((item, index) => (
        <div
          key={`${item.label}-${index}`}
          className="grid gap-1 py-2.5 sm:grid-cols-[minmax(8rem,14rem)_1fr] sm:gap-4"
        >
          <dt className="text-sm text-fg-subtle">{item.label}</dt>
          <dd className={cn('text-sm text-fg', mono && 'tech')}>
            <span className="break-words">{item.value}</span>
            {item.ref ? (
              isUrl(item.ref) ? (
                <a
                  href={item.ref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex items-center gap-1.5 text-xs text-brand hover:underline"
                >
                  <ExternalLink className="size-3.5 shrink-0" aria-hidden="true" />
                  <span className="break-all">{item.ref}</span>
                </a>
              ) : (
                <span className="tech mt-1 block text-fg-faint">{item.ref}</span>
              )
            ) : null}
          </dd>
        </div>
      ))}
    </dl>
  )
}
