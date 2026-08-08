/**
 * The policy library as a table.
 *
 * Two columns are deliberately honest about a gap. `GET /api/policy/policies`
 * answers with the policy record only — it carries neither a rule count nor the
 * technologies a policy's rules name, both of which live on the detail route.
 * Rather than firing a detail request per row (fifty policies, fifty requests)
 * or quietly printing a zero, those cells say "open" and the panel footer
 * explains where the numbers are. Open findings, by contrast, is a real count
 * derived from the findings the page loaded, and is labelled as such.
 *
 * The row opens the drawer; the name is also a real link carrying the policy in
 * the query string, so it can be middle-clicked and shared.
 */

import { Link } from 'react-router-dom'
import { useT } from '../../lib/i18n'
import {
  Badge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tooltip,
} from '../../components/ui'
import type { DepartmentRisk, Policy } from '../../domain/types'
import { cn, deadlineIn, formatDate } from '../../lib/format'
import { departmentNames } from './data'
import {
  EXTRACTION_STATUS_LABELS,
  POLICY_STATUS_LABELS,
  POLICY_TYPE_LABELS,
  extractionProvenance,
  EXTRACTION_SOURCE_LABELS,
} from './vocabulary'

export interface PolicyTableProps {
  policies: Policy[]
  departments: DepartmentRisk[]
  /** Open findings per policy id, counted from the findings this page loaded. */
  openFindings: Map<number, number>
  selectedId: number | null
  /**
   * The policy's own URL, filters and all. The name is a real link so it is
   * keyboard reachable and can be middle-clicked; the row click is only a
   * mouse convenience on top of it.
   */
  hrefFor: (id: number) => string
  onSelect: (id: number) => void
}

export function PolicyTable({
  policies,
  departments,
  openFindings,
  selectedId,
  hrefFor,
  onSelect,
}: PolicyTableProps) {
  const t = useT()
  const lookup = new Map(departments.map((department) => [department.id, department.name]))

  return (
    <Table containerClassName="max-h-[70vh]">
      <TableHeader>
        <TableRow>
          <TableHead>Policy</TableHead>
          <TableHead>Version</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Owner</TableHead>
          <TableHead>Effective</TableHead>
          <TableHead>{t('u.review-due')}</TableHead>
          <TableHead>{t('u.applies-to')}</TableHead>
          <TableHead>Extraction</TableHead>
          <TableHead numeric>Rules</TableHead>
          <TableHead numeric>{t('u.open-findings')}</TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {policies.map((policy) => {
          const review = deadlineIn(policy.review_date)
          const applicable = departmentNames(policy.applicable_departments, lookup)
          const open = openFindings.get(policy.id) ?? 0
          const provenance = extractionProvenance(policy.extraction_source)

          return (
            <TableRow
              key={policy.id}
              interactive
              selected={selectedId === policy.id}
              onClick={() => onSelect(policy.id)}
            >
              <TableCell className="max-w-[22rem]">
                <Link
                  to={hrefFor(policy.id)}
                  className="block text-fg hover:text-brand"
                  // The link and the row handler reach the same URL. Stopping
                  // here keeps it to one navigation rather than two.
                  onClick={(event) => event.stopPropagation()}
                >
                  <span className="block truncate">{policy.name}</span>
                  <span className="mt-0.5 block text-xs text-fg-subtle">
                    {POLICY_TYPE_LABELS[policy.policy_type] ?? policy.policy_type}
                  </span>
                </Link>
              </TableCell>

              <TableCell className="tech whitespace-nowrap">{policy.version}</TableCell>

              <TableCell>
                <Badge status={policy.status} size="sm" dot>
                  {POLICY_STATUS_LABELS[policy.status] ?? policy.status}
                </Badge>
              </TableCell>

              <TableCell className="max-w-[12rem] truncate">
                {policy.owner_name || <span className="text-fg-faint">{t('u.not-recorded')}</span>}
              </TableCell>

              <TableCell className="whitespace-nowrap">{formatDate(policy.effective_date)}</TableCell>

              <TableCell className={cn('whitespace-nowrap', review.overdue && 'text-high')}>
                {policy.review_date ? review.text : <span className="text-fg-faint">—</span>}
              </TableCell>

              <TableCell className="max-w-[14rem]">
                {applicable.length > 0 ? (
                  <span className="block truncate">{applicable.join(', ')}</span>
                ) : (
                  <span className="text-fg-faint">{t('u.organisation-wide')}</span>
                )}
              </TableCell>

              <TableCell>
                <Tooltip
                  content={`${EXTRACTION_SOURCE_LABELS[policy.extraction_source] ?? policy.extraction_source} · provenance: ${provenance.replace(/_/g, ' ')}`}
                >
                  <span>
                    <Badge status={policy.extraction_status} size="sm">
                      {EXTRACTION_STATUS_LABELS[policy.extraction_status] ??
                        policy.extraction_status}
                    </Badge>
                  </span>
                </Tooltip>
              </TableCell>

              <TableCell numeric>
                {typeof policy.rule_count === 'number' ? (
                  policy.rule_count
                ) : (
                  <Tooltip content="The policy list response carries no rule count. Open the policy to see its rule set, the technologies its rules name, and the evidence behind each one.">
                    <span className="text-fg-faint">—</span>
                  </Tooltip>
                )}
              </TableCell>

              <TableCell numeric className={cn(open > 0 && 'text-high')}>
                {open}
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
