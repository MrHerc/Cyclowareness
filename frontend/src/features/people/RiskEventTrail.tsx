/**
 * Every score movement, newest first.
 *
 * The delta column is the audit trail: it holds the change the engine actually
 * applied, which at the 0 and 100 rails is not the same as the change the
 * weight table asked for. Where an event came out of a loop run, the run is a
 * real link — that is the join between "a threat arrived" and "this person's
 * number moved", and it is the whole argument of the product.
 */

import { ArrowUpRight, History } from 'lucide-react'
import { Link } from 'react-router-dom'
import { EmptyState } from '../../components/states'
import {
  Badge,
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tooltip,
} from '../../components/ui'
import type { RiskEvent } from '../../domain/types'
import { cn, formatDateTime, signed, timeAgo } from '../../lib/format'
import { signalFor } from './riskModel'

export interface RiskEventTrailProps {
  events: RiskEvent[]
  /** True when the reader may follow a loop-run link. */
  canOpenLoops: boolean
}

export function RiskEventTrail({ events, canOpenLoops }: RiskEventTrailProps) {
  if (events.length === 0) {
    return (
      <EmptyState
        icon={History}
        compact
        headline="No risk events recorded"
        description="This person's score is still exactly their role baseline. Events appear the moment the engine records a simulation outcome, a completed module, a report or an analyst adjustment."
      />
    )
  }

  return (
    <Table containerClassName="max-h-[36rem]">
      <TableCaption>
        The {events.length} most recent events the API returns for this person. The breakdown above
        sums every event that has not been withdrawn; a withdrawn event stays listed here, struck
        through and marked, because the record of the accusation and of its withdrawal both matter.
      </TableCaption>

      <TableHeader>
        <TableRow>
          <TableHead>When</TableHead>
          <TableHead>Signal</TableHead>
          <TableHead numeric>Delta</TableHead>
          <TableHead>Reason</TableHead>
          <TableHead>Loop run</TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {events.map((event) => {
          const spec = signalFor(event.type)
          // A withdrawn event is still returned by the API and still belongs in
          // the trail — the record of the accusation and of its withdrawal is
          // the point. What it must NOT do is look live. The caption below
          // admitted a withdrawn row could be here and gave the reader no way
          // to tell which one; an analyst reading "Clicked a simulated phish
          // +12.0" in red has no idea the organisation formally revoked it.
          const withdrawn = Boolean(event.revoked_at)

          return (
            <TableRow key={event.id} className={cn(withdrawn && 'opacity-60')}>
              <TableCell className="whitespace-nowrap">
                <Tooltip content={formatDateTime(event.created_at)}>
                  <span>{timeAgo(event.created_at)}</span>
                </Tooltip>
              </TableCell>

              <TableCell>
                <Badge
                  size="sm"
                  tone={
                    withdrawn
                      ? 'neutral'
                      : event.delta > 0
                        ? 'critical'
                        : event.delta < 0
                          ? 'safe'
                          : 'neutral'
                  }
                >
                  {spec?.label ?? event.type}
                </Badge>
              </TableCell>

              <TableCell
                numeric
                className={cn(
                  withdrawn
                    ? 'text-fg-faint line-through'
                    : event.delta > 0
                      ? 'text-critical'
                      : event.delta < 0
                        ? 'text-safe'
                        : 'text-fg-muted',
                )}
              >
                {event.delta === 0 ? '0.0' : signed(event.delta, 1)}
              </TableCell>

              <TableCell className="max-w-96">
                <span className={cn('block break-words', withdrawn && 'line-through')}>
                  {event.reason}
                </span>
                {withdrawn ? (
                  <span className="mt-0.5 block text-xs text-fg-faint">
                    Withdrawn after review — not counted in the score
                  </span>
                ) : null}
              </TableCell>

              <TableCell>
                {event.loop_run_id === null ? (
                  <span className="text-xs text-fg-faint">Not from a loop</span>
                ) : canOpenLoops ? (
                  <Link
                    to={`/loops/${event.loop_run_id}`}
                    className="inline-flex items-center gap-1 text-sm text-brand hover:underline"
                  >
                    Run {event.loop_run_id}
                    <ArrowUpRight className="size-3.5" aria-hidden="true" />
                  </Link>
                ) : (
                  <span className="text-sm text-fg-muted">Run {event.loop_run_id}</span>
                )}
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
