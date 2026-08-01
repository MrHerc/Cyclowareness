/**
 * The incident-risk list.
 *
 * Confidentiality is a column rather than a detail, because it is the field
 * that decides what the person named by the row is allowed to read. An analyst
 * scanning the queue needs to know which of these people have been told what
 * happened to them and which have not, and that fact is invisible everywhere
 * else on the screen.
 *
 * The subject count is genuinely absent from the list response — `IncidentRiskOut`
 * does not carry one — so the cell says "not listed" rather than a zero or a
 * dash. A zero here would read as "nobody is on the hook", which is a claim the
 * list payload does not support.
 */

import { Lock } from 'lucide-react'
import { Link } from 'react-router-dom'
import { NoMeasurement } from '../../components/data'
import {
  Badge,
  StatusDot,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tooltip,
} from '../../components/ui'
import { deadlineIn, formatDate } from '../../lib/format'
import type { IncidentRisk } from '../../domain/types'
import { confidentialityLabel, hidesIncidentDetail, riskTypeLabel } from './vocabulary'

export interface IncidentRiskTableProps {
  risks: IncidentRisk[]
}

export function IncidentRiskTable({ risks }: IncidentRiskTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Risk</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Severity</TableHead>
          <TableHead>Status</TableHead>
          <TableHead numeric>Subjects</TableHead>
          <TableHead>Deadline</TableHead>
          <TableHead>Confidentiality</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {risks.map((risk) => {
          const due = deadlineIn(risk.deadline)
          const redacted = hidesIncidentDetail(risk.confidentiality)

          return (
            <TableRow key={risk.id}>
              <TableCell className="max-w-80">
                <Link
                  to={`/incident-risks/${risk.id}`}
                  className="text-body font-medium text-fg hover:text-brand"
                >
                  {risk.title}
                </Link>
                <span className="mt-0.5 flex items-center gap-2">
                  {risk.incident_ref ? (
                    <span className="tech text-fg-faint">{risk.incident_ref}</span>
                  ) : (
                    <span className="text-xs text-fg-faint">No incident reference</span>
                  )}
                  {risk.reopened_count > 0 && (
                    <Badge size="sm" status="reopened">
                      Reopened ×{risk.reopened_count}
                    </Badge>
                  )}
                </span>
              </TableCell>

              <TableCell className="whitespace-nowrap">{riskTypeLabel(risk.risk_type)}</TableCell>

              <TableCell>
                <Badge size="sm" status={risk.severity} />
              </TableCell>

              <TableCell>
                <StatusDot status={risk.status} />
              </TableCell>

              <TableCell numeric>
                {typeof risk.subject_count === 'number' ? (
                  risk.subject_count
                ) : (
                  <NoMeasurement
                    label="Not listed"
                    reason="The list response does not carry a subject count. Open the risk to see who is attached."
                    className="justify-end text-xs"
                  />
                )}
              </TableCell>

              <TableCell className="whitespace-nowrap">
                {risk.deadline ? (
                  <span className={due.overdue ? 'text-high' : 'text-fg-muted'}>
                    <span className="block">{due.text}</span>
                    <span className="block text-xs text-fg-faint">{formatDate(risk.deadline)}</span>
                  </span>
                ) : (
                  <span className="text-xs text-fg-faint">No deadline</span>
                )}
              </TableCell>

              <TableCell>
                <Tooltip
                  content={
                    redacted
                      ? 'The incident narrative and the evidence are withheld from the affected employee at this level.'
                      : 'The affected employee sees the incident narrative and the evidence.'
                  }
                >
                  <span className="inline-flex items-center gap-1.5 text-sm">
                    {redacted && <Lock size={13} className="shrink-0 text-medium" aria-hidden="true" />}
                    <span className={redacted ? 'text-medium' : 'text-fg-muted'}>
                      {confidentialityLabel(risk.confidentiality)}
                    </span>
                  </span>
                </Tooltip>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
