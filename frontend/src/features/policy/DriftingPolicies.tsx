/**
 * Which documents reality has drifted furthest from.
 *
 * Ranked by the count of findings still open against the policy, not by total
 * findings ever raised: a register that produced ten findings and had nine
 * closed is being maintained, and putting it above one with three untouched
 * criticals would point the reader at the wrong document.
 *
 * The rank is computed from the findings this screen actually loaded, so the
 * caption says how many that was. A "top five" over a truncated page is a
 * claim about a sample, and it has to look like one.
 */

import { useT } from '../../lib/i18n'
import { FileWarning } from 'lucide-react'
import { Link } from 'react-router-dom'
import { EmptyState } from '../../components/states'
import { Badge } from '../../components/ui'
import type { Policy, PolicyFinding } from '../../domain/types'
import { cn } from '../../lib/format'
import { openFindingsByPolicy } from './data'
import { POLICY_TYPE_LABELS, SEVERITY_ORDER } from './vocabulary'

interface Row {
  policyId: number
  name: string
  type: string | null
  version: string | null
  open: number
  worst: string
}

function worstSeverity(findings: PolicyFinding[]): string {
  for (const severity of SEVERITY_ORDER) {
    if (findings.some((finding) => finding.severity === severity)) return severity
  }
  return 'info'
}

export interface DriftingPoliciesProps {
  findings: PolicyFinding[]
  policies: Policy[]
  limit?: number
  className?: string
}

export function DriftingPolicies({
  findings,
  policies,
  limit = 5,
  className,
}: DriftingPoliciesProps) {
  const t = useT()
  const byPolicy = openFindingsByPolicy(findings)
  const lookup = new Map(policies.map((policy) => [policy.id, policy]))

  const rows: Row[] = [...byPolicy.entries()]
    .map(([policyId, group]) => {
      const policy = lookup.get(policyId)
      return {
        policyId,
        // A finding can outlive the page of policies loaded beside it; naming
        // the id is honest, inventing a title is not.
        name: policy?.name ?? group[0]?.policy_name ?? `Policy ${policyId}`,
        type: policy?.policy_type ?? null,
        version: policy?.version ?? null,
        open: group.length,
        worst: worstSeverity(group),
      }
    })
    .sort((a, b) => b.open - a.open || a.name.localeCompare(b.name))
    .slice(0, limit)

  if (rows.length === 0) {
    return (
      <EmptyState
        compact
        icon={FileWarning}
        headline="No policy has an open finding"
        description={t('x.a-policy-appears-here-as')}
      />
    )
  }

  return (
    <ol className={cn('divide-line', className)}>
      {rows.map((row) => (
        <li key={row.policyId}>
          <Link
            to={`/policy-intelligence/policies?policy=${row.policyId}`}
            className="flex items-center justify-between gap-3 py-2.5 transition-colors hover:text-fg"
          >
            <span className="min-w-0">
              <span className="block truncate text-body text-fg">{row.name}</span>
              <span className="mt-0.5 block text-xs text-fg-subtle">
                {row.type ? (POLICY_TYPE_LABELS[row.type] ?? row.type) : 'Type not loaded'}
                {row.version ? ` · v${row.version}` : ''}
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-2">
              <Badge status={row.worst} size="sm" />
              <span className="text-sm tabular-nums text-fg">{row.open}</span>
            </span>
          </Link>
        </li>
      ))}
    </ol>
  )
}
