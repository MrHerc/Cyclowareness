/**
 * What this person caught.
 *
 * Deliberately framed as a contribution rather than an incident list. In this
 * model reporting is worth −4 to a score, and the reporter is dropped from a
 * loop's targets unless something else independently flagged them: the person
 * who reports is the sensor, not the failure. A screen that files their reports
 * under "activity" alongside their mistakes teaches the opposite lesson.
 */

import { ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge } from '../../components/ui'
import type { Report } from '../../domain/types'
import { formatDateTime, humanise, timeAgo, truncate } from '../../lib/format'

export interface EmployeeReportsProps {
  reports: Report[]
  name: string
  /** True when the reader may open a linked loop run. */
  canOpenLoops: boolean
  /** How many reports the list endpoint returned in total. */
  scanned: number
}

export function EmployeeReports({ reports, name, canOpenLoops, scanned }: EmployeeReportsProps) {
  if (reports.length === 0) {
    return (
      <p className="text-sm text-fg-subtle">
        No report from {name} appears in the {scanned} most recent reports the platform holds. That is
        not a mark against them — it only means the human sensor has not fired from this desk
        recently.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <p className="flex items-start gap-2 text-body text-fg-muted">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-safe" aria-hidden="true" />
        <span>
          {name} has sent {reports.length} suspicious {reports.length === 1 ? 'artifact' : 'artifacts'}{' '}
          to the analyst queue. Each one lowers their score, because catching something is the
          behaviour the model is trying to produce.
        </span>
      </p>

      <ul className="divide-line">
        {reports.map((report) => (
          <li key={report.id} className="py-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge status={report.status} size="sm" dot />
              <span className="text-sm text-fg-muted">{humanise(report.artifact_type)}</span>
              <span className="text-xs text-fg-faint" title={formatDateTime(report.created_at)}>
                {timeAgo(report.created_at)}
              </span>
              {report.linked_loop_run_id !== null ? (
                canOpenLoops ? (
                  <Link
                    to={`/loops/${report.linked_loop_run_id}`}
                    className="text-sm text-brand hover:underline"
                  >
                    Run {report.linked_loop_run_id}
                  </Link>
                ) : (
                  <span className="text-sm text-fg-muted">Run {report.linked_loop_run_id}</span>
                )
              ) : null}
            </div>

            <p className="tech mt-1.5 break-all text-fg-subtle">{truncate(report.artifact_ref, 160)}</p>
            {report.note ? <p className="mt-1 text-sm text-fg-muted">{report.note}</p> : null}
          </li>
        ))}
      </ul>

      <p className="text-xs text-fg-subtle">
        Matched against the {scanned} most recent reports the platform returns, so an older report
        may exist without appearing here.
      </p>
    </div>
  )
}
