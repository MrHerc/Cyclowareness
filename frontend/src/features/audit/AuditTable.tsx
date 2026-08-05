/**
 * The trail, dense, with the payload one keypress away.
 *
 * The expanded row is the reason this table exists rather than a list of
 * sentences: a summary says what somebody meant to do, and the before/after
 * snapshot says what the database did. Both are shown, and the snapshot is
 * rendered as raw text in a `CodeBlock` — never linkified, never re-formatted,
 * because it routinely contains artifact references an analyst is about to
 * paste somewhere and a rewritten one is worse than none.
 *
 * Expansion is a real `<button>` with `aria-expanded`, and the detail row is
 * the element it controls. A `<tr>` with an onClick is invisible to a keyboard.
 */

import { Fragment, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { Badge, CodeBlock, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui'
import type { AuditEvent } from '../../domain/types'
import { cn, formatDateTime, humanise, timeAgo, truncate } from '../../lib/format'
import { objectIdentity, payloadText } from './data'

export interface AuditTableProps {
  events: AuditEvent[]
}

export function AuditTable({ events }: AuditTableProps) {
  const [expanded, setExpanded] = useState<number | null>(null)

  return (
    <Table containerClassName="max-h-[42rem]">
      <TableHeader>
        <TableRow>
          <TableHead className="w-8">
            <span className="sr-only">Expand</span>
          </TableHead>
          <TableHead>When</TableHead>
          <TableHead>Actor</TableHead>
          <TableHead>Action</TableHead>
          <TableHead>Object</TableHead>
          <TableHead>Summary</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {events.map((event) => {
          const open = expanded === event.id
          const identity = objectIdentity(event)
          return (
            <Fragment key={event.id}>
              <TableRow selected={open}>
                <TableCell className="align-top">
                  <button
                    type="button"
                    aria-expanded={open}
                    aria-controls={`audit-detail-${event.id}`}
                    onClick={() => setExpanded(open ? null : event.id)}
                    className="grid size-6 place-items-center rounded-chip text-fg-faint transition-colors hover:bg-raised hover:text-fg"
                  >
                    <ChevronRight
                      className={cn('size-4 transition-transform duration-150', open && 'rotate-90')}
                      aria-hidden="true"
                      strokeWidth={1.75}
                    />
                    <span className="sr-only">
                      {open ? 'Hide' : 'Show'} the payload for entry {event.id}
                    </span>
                  </button>
                </TableCell>

                <TableCell className="whitespace-nowrap align-top">
                  <span className="block text-fg">{timeAgo(event.at)}</span>
                  <span className="block text-xs text-fg-faint">{formatDateTime(event.at)}</span>
                </TableCell>

                <TableCell className="align-top">
                  <span className="block text-fg">{event.actor_email ?? 'Not recorded'}</span>
                  <span className="block text-xs text-fg-faint">
                    {event.actor_role ? humanise(event.actor_role) : 'Role not recorded'}
                  </span>
                </TableCell>

                <TableCell className="align-top">
                  <span className="tech text-fg">{event.action}</span>
                </TableCell>

                <TableCell className="align-top">
                  {identity ? (
                    <>
                      <span className="block text-fg">
                        {truncate(event.object_label || identity, 40)}
                      </span>
                      <span className="tech block text-xs text-fg-faint">{identity}</span>
                    </>
                  ) : (
                    <span className="text-fg-faint">No object</span>
                  )}
                </TableCell>

                <TableCell className="align-top">{event.summary}</TableCell>
              </TableRow>

              {open ? (
                <TableRow id={`audit-detail-${event.id}`}>
                  <TableCell colSpan={6} className="bg-base">
                    <div className="space-y-4 py-2">
                      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        <CodeBlock
                          label="Before"
                          value={payloadText(event.before)}
                          wrap
                          copyable
                          maxHeight="18rem"
                        />
                        <CodeBlock
                          label="After"
                          value={payloadText(event.after)}
                          wrap
                          copyable
                          maxHeight="18rem"
                        />
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-fg-faint">
                        <Badge size="sm" tone="neutral">
                          {`Entry #${event.id}`}
                        </Badge>
                        <span className="tech">
                          {event.ip_address ? `From ${event.ip_address}` : 'Source address not recorded'}
                        </span>
                        <span className="min-w-0 truncate">
                          {event.user_agent ? truncate(event.user_agent, 90) : 'User agent not recorded'}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : null}
            </Fragment>
          )
        })}
      </TableBody>
    </Table>
  )
}
