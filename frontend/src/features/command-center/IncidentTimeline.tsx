/**
 * The audit trail as a horizontal timeline — the reference design's centrepiece,
 * driven by real events rather than the reference's decoration.
 *
 * A node per event on a dotted rail, the time chip below it, the action above.
 * The reference invents "Unauthorized access attempt blocked" and a red tint to
 * imply severity; this reads `action` off the real audit row and tints a node
 * ONLY where the action is genuinely adverse — a rejection, a block, a failure.
 * A green product that paints every event red to look busy is the same lie as a
 * seeded chart, one layer over.
 *
 * Newest on the right, because a timeline the eye reads left-to-right should end
 * at "now". Empty is stated, never faked with placeholder nodes.
 */

import { Link } from 'react-router-dom'
import type { AuditEvent } from '../../domain/types'
import { cn, formatTime, humanise } from '../../lib/format'

export interface IncidentTimelineProps {
  events: AuditEvent[]
  /** How many nodes to draw. The rail is horizontal, so this is small. */
  limit?: number
}

/** Actions whose plain meaning is adverse. Everything else is neutral — an
 *  approval and a submission are not incidents, and colouring them would make
 *  the one node that IS an incident invisible. */
const ADVERSE = /reject|block|fail|deny|revoke|refus|quarantin|dispute|contest|breach/i

function isAdverse(action: string): boolean {
  return ADVERSE.test(action)
}

/** `remediation.dispute_resolved` -> "Remediation dispute resolved". The dot
 *  separates object from verb in the audit action; a reader wants a phrase, not
 *  a dotted path. */
function actionPhrase(action: string): string {
  return humanise(action.replace(/\./g, ' '))
}

export function IncidentTimeline({ events, limit = 6 }: IncidentTimelineProps) {
  // Oldest-to-newest across the rail, capped, with the newest kept.
  const nodes = [...events].slice(0, limit).reverse()

  return (
    <section
      aria-labelledby="timeline-heading"
      className="rounded-panel border border-line bg-elevated p-5 shadow-panel"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 id="timeline-heading" className="text-h text-fg">
          Incident timeline
        </h2>
        <Link
          to="/audit"
          className="label text-fg-faint underline-offset-4 hover:text-fg-subtle hover:underline"
        >
          Full audit log
        </Link>
      </div>

      {nodes.length === 0 ? (
        <p className="mt-6 text-sm text-fg-faint">
          No audit events yet. Every decision that crosses the human gate is recorded here.
        </p>
      ) : (
        <div className="mt-8 overflow-x-auto pb-2">
          <ol
            className="grid min-w-max gap-x-6"
            style={{ gridTemplateColumns: `repeat(${nodes.length}, minmax(9rem, 1fr))` }}
          >
            {nodes.map((event, index) => {
              const adverse = isAdverse(event.action)
              return (
                <li key={event.id} className="relative flex flex-col items-start">
                  {/* the label above the node */}
                  <div
                    className={cn(
                      'mb-4 min-h-[2.75rem] rounded-control border px-3 py-2 text-xs leading-snug',
                      adverse
                        ? 'border-critical/30 bg-critical/10 text-fg'
                        : 'border-line-subtle bg-surface text-fg-muted',
                    )}
                  >
                    <span className="block font-medium text-fg">{actionPhrase(event.action)}</span>
                    {event.object_label ? (
                      <span className="tech mt-0.5 block truncate text-fg-faint">
                        {event.object_label}
                      </span>
                    ) : null}
                  </div>

                  {/* the rail: a dotted line behind, a filled node on it */}
                  <div className="relative flex h-6 w-full items-center">
                    {index < nodes.length - 1 ? (
                      <span
                        aria-hidden="true"
                        className="absolute left-3 right-0 top-1/2 border-t border-dashed border-line"
                      />
                    ) : null}
                    <span
                      className={cn(
                        'relative z-10 grid size-6 place-items-center rounded-full border',
                        adverse
                          ? 'border-critical/40 bg-critical/15'
                          : 'border-brand/40 bg-brand/15',
                      )}
                    >
                      <span
                        className={cn(
                          'size-2 rounded-full',
                          adverse ? 'bg-critical' : 'bg-brand',
                        )}
                      />
                    </span>
                  </div>

                  {/* the time chip below the node */}
                  <span className="tech mt-3 rounded-chip border border-line-subtle bg-surface px-2.5 py-1 text-xs text-fg-subtle">
                    {formatTime(event.at)}
                  </span>
                </li>
              )
            })}
          </ol>
        </div>
      )}
    </section>
  )
}
