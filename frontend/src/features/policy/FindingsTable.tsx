/**
 * The findings queue as a table.
 *
 * Sorted by the API (newest detection first) rather than re-sorted here: a
 * table that reorders a server-paged result client-side is showing the reader
 * "the top five of page one", which is not the top five of anything.
 *
 * Confidence sits beside severity because the pair is the instruction. A
 * critical finding nobody is confident in gets read before it gets acted on.
 */

import { Link } from 'react-router-dom'
import { ConfidenceBadge } from '../../components/data'
import {
  Badge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui'
import type { PolicyFinding } from '../../domain/types'
import { cn, deadlineIn, timeAgo } from '../../lib/format'
import { FINDING_STATUS_LABELS, FINDING_TYPE_LABELS, sourceLabel } from './vocabulary'

export interface FindingsTableProps {
  findings: PolicyFinding[]
  /** Policy id → name, so a row can name the document without a second request. */
  policyNames: Map<number, string>
}

export function FindingsTable({ findings, policyNames }: FindingsTableProps) {
  return (
    <Table containerClassName="max-h-[70vh]">
      <TableHeader>
        <TableRow>
          <TableHead>Severity</TableHead>
          <TableHead>Finding</TableHead>
          <TableHead>Policy</TableHead>
          <TableHead>Technology</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Confidence</TableHead>
          <TableHead>Source</TableHead>
          <TableHead>Owner</TableHead>
          <TableHead>Due</TableHead>
          <TableHead>Age</TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {findings.map((finding) => {
          const due = deadlineIn(finding.due_date)
          const policyName =
            finding.policy_id !== null
              ? (policyNames.get(finding.policy_id) ?? finding.policy_name ?? null)
              : null

          return (
            // Not `interactive`: the title is the link, and a pointer cursor
            // across a row where only one cell navigates teaches the wrong thing.
            <TableRow key={finding.id}>
              <TableCell>
                <Badge status={finding.severity} size="sm" dot />
              </TableCell>

              <TableCell className="max-w-[26rem]">
                <Link
                  to={`/policy-intelligence/findings/${finding.id}`}
                  className="block text-fg hover:text-brand"
                >
                  <span className="block truncate">{finding.title}</span>
                  <span className="mt-0.5 block text-xs text-fg-subtle">
                    {FINDING_TYPE_LABELS[finding.finding_type] ?? finding.finding_type}
                  </span>
                </Link>
              </TableCell>

              <TableCell className="max-w-[14rem]">
                {policyName ? (
                  <span className="block truncate">{policyName}</span>
                ) : (
                  <span className="text-fg-faint">Not tied to a policy</span>
                )}
              </TableCell>

              <TableCell className="max-w-[12rem]">
                {finding.technology ? (
                  <span className="tech block truncate">{finding.technology}</span>
                ) : (
                  <span className="text-fg-faint">—</span>
                )}
              </TableCell>

              <TableCell>
                <Badge status={finding.status} size="sm">
                  {FINDING_STATUS_LABELS[finding.status] ?? finding.status}
                </Badge>
              </TableCell>

              <TableCell>
                <ConfidenceBadge value={finding.confidence} />
              </TableCell>

              <TableCell className="whitespace-nowrap text-xs">
                {sourceLabel(finding.source)}
              </TableCell>

              <TableCell className="max-w-[10rem] truncate">
                {finding.owner_name || <span className="text-fg-faint">Unassigned</span>}
              </TableCell>

              <TableCell className={cn('whitespace-nowrap', due.overdue && 'text-high')}>
                {finding.due_date ? due.text : <span className="text-fg-faint">—</span>}
              </TableCell>

              <TableCell className="whitespace-nowrap text-fg-faint">
                {timeAgo(finding.detected_at)}
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
