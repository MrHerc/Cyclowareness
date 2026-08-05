/**
 * What this person has reported, and what happened to it.
 *
 * The reason this panel exists at all: an employee who reports something and
 * never hears back learns that reporting is pointless, and the human sensor —
 * the first stage of the whole loop — quietly stops working. So every row shows
 * where the report got to, including the two outcomes people fear: dismissed,
 * and still sitting in a queue.
 */

import { useT } from '../../lib/i18n'
import { Flag } from 'lucide-react'
import { EmptyState } from '../../components/states'
import { Accordion, AccordionItem, Badge, Panel } from '../../components/ui'
import type { Report } from '../../domain/types'
import { formatDateTime, humanise, timeAgo, truncate } from '../../lib/format'

export interface ReportHistoryProps {
  reports: Report[]
}

const STATUS_COPY: Record<string, string> = {
  new: 'Waiting for an analyst to read it.',
  in_loop: 'An analyst took it forward. It became a real threat record and started a loop.',
  dismissed: 'An analyst reviewed it and decided no action was needed. Reporting it was still right.',
}

export function ReportHistory({ reports }: ReportHistoryProps) {
  const t = useT()
  return (
    <Panel
      title={t('x.what-you-have-reported')}
      subtitle={t('x.every-report-you-have-sent')}
    >
      {reports.length === 0 ? (
        <EmptyState
          compact
          icon={Flag}
          headline="You have not reported anything yet"
          description={t('x.use-report-something-suspicious-at')}
        />
      ) : (
        <Accordion type="multiple" className="-my-3">
          {reports.map((report) => (
            <AccordionItem
              key={report.id}
              value={String(report.id)}
              heading={truncate(report.artifact_ref, 70) || humanise(report.artifact_type)}
              meta={<Badge status={report.status} size="sm" dot />}
            >
              <div className="space-y-3">
                <p className="text-sm text-fg-subtle">
                  {humanise(report.artifact_type)} · sent {timeAgo(report.created_at)} (
                  {formatDateTime(report.created_at)})
                </p>

                <p className="text-body text-fg-muted">
                  {STATUS_COPY[report.status] ?? 'This report has a status this screen does not recognise.'}
                </p>

                {report.note ? (
                  <div>
                    <span className="label text-fg-subtle">What you said</span>
                    <p className="mt-1 text-body text-fg-muted">{report.note}</p>
                  </div>
                ) : null}

                {report.triage_summary ? (
                  <div>
                    <span className="label text-fg-subtle">Automated first pass</span>
                    <p className="mt-1 text-body text-fg-muted">{report.triage_summary.summary}</p>
                  </div>
                ) : (
                  <p className="text-sm text-fg-faint">
                    No automated triage was recorded against this report.
                  </p>
                )}
              </div>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </Panel>
  )
}
