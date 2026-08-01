/**
 * The append-only history of one policy's rule set.
 *
 * A snapshot is written every time activation or supersession changes what the
 * organisation is checked against — which is what lets anyone answer "what did
 * this policy say on the day that finding was raised" without trusting the
 * current rows. This view shows the change summary and which rule keys moved;
 * the snapshot itself is held server-side and is not editable from here.
 */

import { History } from 'lucide-react'
import { EmptyState } from '../../components/states'
import type { PolicyVersion } from '../../domain/types'
import { cn, formatDateTime } from '../../lib/format'

function keysOf(diff: Record<string, unknown> | null, field: string): string[] {
  if (!diff) return []
  const value = diff[field]
  if (!Array.isArray(value)) return []
  return value.flatMap((entry) => {
    if (typeof entry === 'string') return [entry]
    if (entry && typeof entry === 'object' && 'rule_key' in entry) {
      const key = (entry as { rule_key?: unknown }).rule_key
      return typeof key === 'string' ? [key] : []
    }
    return []
  })
}

function DiffKeys({ label, keys, tone }: { label: string; keys: string[]; tone: string }) {
  if (keys.length === 0) return null
  return (
    <p className="text-xs">
      <span className={cn('label mr-2', tone)}>{label}</span>
      <span className="tech text-fg-muted">{keys.join(', ')}</span>
    </p>
  )
}

export interface PolicyVersionsProps {
  versions: PolicyVersion[]
  className?: string
}

export function PolicyVersions({ versions, className }: PolicyVersionsProps) {
  if (versions.length === 0) {
    return (
      <EmptyState
        compact
        icon={History}
        headline="No version snapshots yet"
        description="A snapshot is written the first time a rule is activated or superseded on this policy. A document whose rules nobody has reviewed has no history to show."
        className={className}
      />
    )
  }

  return (
    <ol className={cn('space-y-3', className)}>
      {versions.map((version) => (
        <li
          key={version.id}
          className="rounded-control border border-line-subtle bg-base p-3"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-body text-fg">Version {version.version}</p>
            <p className="text-xs text-fg-faint">{formatDateTime(version.created_at)}</p>
          </div>

          {version.change_summary ? (
            <p className="mt-1.5 text-sm text-fg-muted">{version.change_summary}</p>
          ) : null}

          <div className="mt-2 space-y-1">
            <DiffKeys label="Added" keys={keysOf(version.diff, 'added')} tone="text-safe" />
            <DiffKeys label="Removed" keys={keysOf(version.diff, 'removed')} tone="text-high" />
            <DiffKeys label="Changed" keys={keysOf(version.diff, 'changed')} tone="text-medium" />
          </div>

          <p className="mt-2 text-xs text-fg-faint">
            {version.changed_by ? `Recorded for ${version.changed_by}` : 'Author not recorded'}
          </p>
        </li>
      ))}
    </ol>
  )
}
