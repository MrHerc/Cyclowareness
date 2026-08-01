/**
 * What has entered the platform most recently, and how sure the analyser is.
 *
 * The verdict and the confidence travel together on every row on purpose: a
 * "malicious" chip on its own invites an analyst to treat a low-confidence
 * guess the same way as a high-confidence one, and this is the list they scan
 * fastest.
 */

import { Inbox } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ConfidenceBadge } from '../../components/data'
import { AsyncBoundary, EmptyState, SkeletonRow } from '../../components/states'
import { Badge, Button, Panel } from '../../components/ui'
import type { Threat } from '../../domain/types'
import { humanise, timeAgo } from '../../lib/format'

const SHOWN = 6

export interface ThreatIntakePanelProps {
  threats: Threat[]
  isLoading: boolean
  error: unknown
  onRetry: () => void
}

export function ThreatIntakePanel({ threats, isLoading, error, onRetry }: ThreatIntakePanelProps) {
  const latest = [...threats]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, SHOWN)

  return (
    <Panel
      title="Latest threat intake"
      subtitle="The most recent artifacts the platform accepted"
      actions={
        <Button size="sm" variant="ghost" asChild>
          <Link to="/threats">All threats</Link>
        </Button>
      }
    >
      <AsyncBoundary
        isLoading={isLoading}
        error={error}
        onRetry={onRetry}
        loadingLabel="Loading threat intake"
        isEmpty={latest.length === 0}
        empty={
          <EmptyState
            compact
            icon={Inbox}
            headline="Nothing has been submitted"
            description="Threats appear here when an employee reports one, an analyst submits one, or an item is pushed from the intelligence feed."
          />
        }
        skeleton={
          <div className="space-y-2">
            {[0, 1, 2].map((row) => (
              <SkeletonRow key={row} leading={false} />
            ))}
          </div>
        }
      >
        <ul className="divide-y divide-line-subtle">
          {latest.map((threat) => (
            <li key={threat.id} className="py-3 first:pt-0 last:pb-0">
              <div className="flex items-start justify-between gap-3">
                <Link
                  to={`/threats/${threat.id}`}
                  className="min-w-0 text-body text-fg underline-offset-4 hover:underline"
                >
                  <span className="block truncate">{threat.title}</span>
                </Link>
                <span className="shrink-0 text-xs text-fg-faint">{timeAgo(threat.created_at)}</span>
              </div>

              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                {threat.verdict ? (
                  <Badge status={threat.verdict} size="sm" />
                ) : (
                  <span className="rounded-chip border border-dashed border-line px-2 py-0.5 text-xs text-fg-faint">
                    Not yet analysed
                  </span>
                )}
                <ConfidenceBadge value={threat.confidence} />
                <span className="text-xs text-fg-subtle">
                  {humanise(threat.source)} · {humanise(threat.artifact_type)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </AsyncBoundary>
    </Panel>
  )
}
