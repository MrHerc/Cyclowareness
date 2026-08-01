/**
 * The triage table.
 *
 * Every column answers one of the questions a reviewer actually asks before
 * opening a run: how long has this been sitting, what was it, how bad, who
 * wrote the training, and how many people it would reach.
 *
 * Two columns are conditional. `sanitization` and `assigned analyst` are only
 * rendered when at least one row carries them — a column of em dashes teaches a
 * reader that the product tracks something it does not.
 */

import { ShieldQuestion, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { AIProvenanceBadge } from '../../components/data'
import {
  Badge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tooltip,
  TONE_TEXT,
} from '../../components/ui'
import { provenanceOf } from '../../domain/types'
import { cn, num, timeAgo } from '../../lib/format'
import type { QueueRow } from './contract'
import { waitLabel, waitTone } from './wait'

export interface QueueTableProps {
  rows: QueueRow[]
  /** `Capabilities.ai_provider === 'anthropic'`, or undefined while unknown. */
  modelConnected?: boolean
}

function Wait({ seconds, since }: { seconds: number; since: string | null }) {
  const tone = waitTone(seconds)
  return (
    <div className="min-w-0">
      <div className={cn('text-h', TONE_TEXT[tone])}>{waitLabel(seconds)}</div>
      <div className="text-xs text-fg-faint">{since ? timeAgo(since) : 'Arrival time not recorded'}</div>
    </div>
  )
}

function Severity({ row }: { row: QueueRow }) {
  if (!row.severity) {
    return (
      <Tooltip
        content={
          row.severityBasis ??
          'No severity was derived for this run, because the analysis stage recorded no verdict.'
        }
      >
        <span className="inline-flex items-center gap-1.5 text-sm text-fg-faint">
          <ShieldQuestion className="size-3.5" aria-hidden="true" />
          Not derived
        </span>
      </Tooltip>
    )
  }
  const badge = <Badge status={row.severity} />
  if (!row.severityBasis) return badge
  return <Tooltip content={row.severityBasis}>{badge}</Tooltip>
}

export function QueueTable({ rows, modelConnected }: QueueTableProps) {
  const showSanitization = rows.some((row) => row.sanitizationStatus !== null)
  const showAnalyst = rows.some((row) => row.assignedAnalyst !== null)

  return (
    <Table containerClassName="rounded-panel">
      <TableHeader>
        <TableRow>
          <TableHead>Waiting</TableHead>
          <TableHead>Threat</TableHead>
          <TableHead>Severity</TableHead>
          <TableHead>Generated training</TableHead>
          <TableHead numeric>Audience</TableHead>
          {showSanitization && <TableHead>Sanitisation</TableHead>}
          {showAnalyst && <TableHead>Analyst</TableHead>}
          <TableHead>
            <span className="sr-only">Open review</span>
          </TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.runId}>
            <TableCell>
              <Wait seconds={row.waitingSeconds} since={row.waitingSince} />
            </TableCell>

            <TableCell>
              <div className="min-w-0 max-w-sm">
                <Link
                  to={`/approvals/${row.runId}`}
                  className="text-body text-fg hover:text-brand focus-visible:text-brand"
                >
                  {row.threatTitle}
                </Link>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-fg-subtle">
                  <span className="tech">Run {row.runId}</span>
                  {row.threatType && <span>{row.threatType.replace(/_/g, ' ')}</span>}
                  {row.verdict && <Badge status={row.verdict} size="sm" />}
                  {row.awaitingSecondApproval && (
                    <Tooltip
                      content={`Endorsed by ${row.endorsedBy ?? 'another analyst'} and held at the gate. A different person has to approve it.`}
                    >
                      <Badge status="awaiting_review" size="sm">
                        Held for a second approver
                      </Badge>
                    </Tooltip>
                  )}
                </div>
              </div>
            </TableCell>

            <TableCell>
              <Severity row={row} />
            </TableCell>

            <TableCell>
              <div className="min-w-0 max-w-xs space-y-1.5">
                <div className="truncate text-body text-fg-muted">
                  {row.moduleTitle ?? 'No module was generated for this run'}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <AIProvenanceBadge
                    provenance={provenanceOf(row.generationSource)}
                    generationSource={row.generationSource}
                    modelConnected={modelConnected}
                  />
                  {row.quizQuestions !== null && row.quizQuestions > 0 && (
                    <span className="text-xs text-fg-faint">
                      {row.quizQuestions} questions
                      {row.estMinutes !== null ? ` · ${row.estMinutes} min` : ''}
                    </span>
                  )}
                </div>
              </div>
            </TableCell>

            <TableCell numeric>
              {row.proposedTargets === null ? (
                <Tooltip content="The queue did not report a proposed audience for this run. It is computed when the review opens.">
                  <span className="text-sm text-fg-faint">—</span>
                </Tooltip>
              ) : (
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 text-body',
                    row.proposedTargets === 0 ? 'text-fg-faint' : 'text-fg',
                  )}
                >
                  <Users className="size-3.5 text-fg-faint" aria-hidden="true" />
                  {num(row.proposedTargets)}
                </span>
              )}
            </TableCell>

            {showSanitization && (
              <TableCell>
                {row.sanitizationStatus ? (
                  <Badge status={row.sanitizationStatus} size="sm" />
                ) : (
                  <span className="text-sm text-fg-faint">Not reported</span>
                )}
              </TableCell>
            )}

            {showAnalyst && (
              <TableCell>
                <span className="text-sm text-fg-muted">{row.assignedAnalyst ?? 'Unassigned'}</span>
              </TableCell>
            )}

            <TableCell>
              <Link
                to={`/approvals/${row.runId}`}
                className={cn(
                  'inline-flex h-8 items-center rounded-control border border-line-strong px-3',
                  'text-sm text-fg hover:border-brand/50 hover:bg-raised',
                )}
              >
                Review
              </Link>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
