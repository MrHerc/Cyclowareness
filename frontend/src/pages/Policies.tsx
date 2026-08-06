/**
 * The policy library.
 *
 * Every document the platform has been given, what state it is in, and — one
 * click away — the structured rules it was reduced to with the passage each one
 * came from. That last part is the whole point of the screen: a rule nobody can
 * trace back to a sentence in the source document is not checkable, and a rule
 * that is not checkable cannot honestly raise a finding.
 *
 * Filters and the open policy both live in the query string, so any view of
 * this library is a link.
 */

import { useT } from '../lib/i18n'
import { FileText } from 'lucide-react'
import { AsyncBoundary, EmptyState, SkeletonTable } from '../components/states'
import { Panel } from '../components/ui'
import type { DepartmentRisk, Policy, PolicyFinding } from '../domain/types'
import {
  ALL_FINDINGS_PAGE,
  isOpenFinding,
  itemsOf,
  pageMetaOf,
  showingLabel,
} from '../features/policy/data'
import { PolicyDrawer } from '../features/policy/PolicyDrawer'
import { PolicyFilters, type PolicyFilterKey } from '../features/policy/PolicyFilters'
import { PolicyHeader } from '../features/policy/PolicyHeader'
import { PolicyTable } from '../features/policy/PolicyTable'
import { useUrlFilters } from '../features/policy/useUrlFilters'
import { useDepartments, usePolicies, usePolicyFindings } from '../lib/api/queries'
import { useSearchParams } from 'react-router-dom'

const FILTER_KEYS = ['q', 'type', 'status', 'department'] as const satisfies readonly PolicyFilterKey[]

export default function Policies() {
  const t = useT()
  const filters = useUrlFilters<PolicyFilterKey>(FILTER_KEYS)
  const [params, setParams] = useSearchParams()

  const policies = usePolicies(filters.active)
  const departments = useDepartments()
  // Counted from real findings rather than guessed: the policy list response
  // carries no finding count of its own.
  const findings = usePolicyFindings(ALL_FINDINGS_PAGE)

  const rows = itemsOf<Policy>(policies.data)
  const meta = pageMetaOf(policies.data)
  const departmentRows = itemsOf<DepartmentRisk>(departments.data)

  const openFindings = new Map<number, number>()
  for (const finding of itemsOf<PolicyFinding>(findings.data)) {
    if (finding.policy_id === null || !isOpenFinding(finding)) continue
    openFindings.set(finding.policy_id, (openFindings.get(finding.policy_id) ?? 0) + 1)
  }

  const rawSelected = params.get('policy')
  const selectedId = rawSelected !== null && /^\d+$/.test(rawSelected) ? Number(rawSelected) : null

  const select = (id: number | null) => {
    setParams(
      (current) => {
        const next = new URLSearchParams(current)
        if (id === null) next.delete('policy')
        else next.set('policy', String(id))
        return next
      },
      { replace: true },
    )
  }

  /** The row's own URL. Built from the live params so a filtered view survives. */
  const hrefFor = (id: number) => {
    const next = new URLSearchParams(params)
    next.set('policy', String(id))
    return `/policy-intelligence/policies?${next.toString()}`
  }

  return (
    <div className="space-y-6">
      <PolicyHeader
        title={t('x.policy-library')}
        description={t('x.the-documents-the-organisation-is')}
      />

      <Panel
        title={t('x.registered-policies')}
        subtitle={showingLabel(rows.length, meta, 'policy', 'policies')}
        actions={
          filters.activeCount > 0 ? (
            <span className="text-xs text-fg-subtle">
              {filters.activeCount} filter{filters.activeCount === 1 ? '' : 's'} applied
            </span>
          ) : null
        }
        footer="Rule counts and the technologies a policy covers are held on the policy record itself, not on the list response — open a policy to see both. Open findings are counted from the findings loaded on this page."
      >
        <div className="space-y-4">
          <PolicyFilters filters={filters} departments={departmentRows} />

          <AsyncBoundary
            isLoading={policies.isLoading}
            error={rows.length > 0 ? null : policies.error}
            onRetry={() => void policies.refetch()}
            loadingLabel={t('x.loading-the-policy-library')}
            isEmpty={rows.length === 0}
            empty={
              <EmptyState
                icon={FileText}
                headline={
                  filters.activeCount > 0
                    ? t('p.no-policy-matches-these-filters')
                    : t('p.no-policies-have-been-registered')
                }
                description={
                  filters.activeCount > 0
                    ? t('p.clear-a-filter-to-widen-the')
                    : t('p.a-policy-appears-here-once-its')
                }
              />
            }
            skeleton={<SkeletonTable rows={6} cols={7} />}
          >
            <div className="-mx-5 -mb-5">
              <PolicyTable
                policies={rows}
                departments={departmentRows}
                openFindings={openFindings}
                selectedId={selectedId}
                hrefFor={hrefFor}
                onSelect={select}
              />
            </div>
          </AsyncBoundary>

          {meta.truncated && meta.note ? (
            <p className="text-xs text-fg-faint">{meta.note}</p>
          ) : null}
        </div>
      </Panel>

      <PolicyDrawer policyId={selectedId} onClose={() => select(null)} />
    </div>
  )
}
