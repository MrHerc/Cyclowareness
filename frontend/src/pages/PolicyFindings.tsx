/**
 * The findings queue.
 *
 * Every filter here is handed to the API, so "12 findings" under the table is a
 * server-side count over the whole store rather than a slice of one page. Where
 * the API has to fall back to a capped scan — the department filter, which runs
 * over a JSON column with no portable containment operator — it returns a note
 * saying the total is a floor, and that note is printed verbatim rather than
 * being rounded up into a confident number.
 *
 * A second, unfiltered query supplies the option lists. Its rows are what this
 * deployment actually holds, which is why the technology and source pickers
 * cannot offer a value that would return nothing.
 */

import { SearchX } from 'lucide-react'
import { AsyncBoundary, EmptyState, SkeletonTable } from '../components/states'
import { Panel } from '../components/ui'
import type { DepartmentRisk, Policy, PolicyFinding } from '../domain/types'
import { ALL_FINDINGS_PAGE, itemsOf, pageMetaOf, showingLabel } from '../features/policy/data'
import { FindingFilters } from '../features/policy/FindingFilters'
import { FindingsTable } from '../features/policy/FindingsTable'
import { PolicyHeader } from '../features/policy/PolicyHeader'
import { useUrlFilters } from '../features/policy/useUrlFilters'
import {
  FINDING_FILTER_KEYS,
  dueBefore,
  sourcePrefix,
  type FindingFilterKey,
} from '../features/policy/vocabulary'
import { useDepartments, usePolicies, usePolicyFindings } from '../lib/api/queries'

/** Distinct, sorted, empty values dropped. Used for every derived option list. */
function distinct(values: (string | null | undefined)[]): string[] {
  const seen = new Set<string>()
  for (const value of values) {
    const trimmed = value?.trim()
    if (trimmed) seen.add(trimmed)
  }
  return [...seen].sort((a, b) => a.localeCompare(b))
}

export default function PolicyFindings() {
  const filters = useUrlFilters<FindingFilterKey>(FINDING_FILTER_KEYS)

  // `due` is a readable preset in the URL; the API wants a date. `policy` is
  // passed under the API's own parameter name — the frozen endpoint table calls
  // it `policy_id`, which the server ignores, so using that name would produce
  // a filter that silently matched everything.
  const { due, ...passthrough } = filters.active
  const apiFilters: Record<string, string | number | undefined> = {
    ...passthrough,
    due_before: due ? dueBefore(due) : undefined,
    limit: 200,
  }

  const findings = usePolicyFindings(apiFilters)
  const catalogue = usePolicyFindings(ALL_FINDINGS_PAGE)
  const policies = usePolicies()
  const departments = useDepartments()

  const rows = itemsOf<PolicyFinding>(findings.data)
  const meta = pageMetaOf(findings.data)
  const everything = itemsOf<PolicyFinding>(catalogue.data)
  const library = itemsOf<Policy>(policies.data)
  const departmentRows = itemsOf<DepartmentRisk>(departments.data)

  const policyNames = new Map(library.map((policy) => [policy.id, policy.name]))

  return (
    <div className="space-y-6">
      <PolicyHeader
        title="Findings"
        description="Every place the world has moved away from a rule this organisation wrote down — with the evidence, the people affected, and what to do about it."
      />

      <Panel
        title="Findings queue"
        subtitle={showingLabel(rows.length, meta, 'finding', 'findings')}
        footer={meta.truncated && meta.note ? meta.note : undefined}
      >
        <div className="space-y-4">
          <FindingFilters
            filters={filters}
            policies={library}
            departments={departmentRows}
            technologies={distinct(everything.map((finding) => finding.technology))}
            sources={distinct(everything.map((finding) => sourcePrefix(finding.source)))}
            owners={distinct(everything.map((finding) => finding.owner_name))}
          />

          <AsyncBoundary
            isLoading={findings.isLoading}
            error={rows.length > 0 ? null : findings.error}
            onRetry={() => void findings.refetch()}
            loadingLabel="Loading findings"
            isEmpty={rows.length === 0}
            empty={
              <EmptyState
                icon={SearchX}
                headline={
                  filters.activeCount > 0
                    ? 'No finding matches these filters'
                    : 'No findings have been raised'
                }
                description={
                  filters.activeCount > 0
                    ? 'Clear one of the filters to widen the search. The department filter runs over a capped scan of the most recent findings, so an old one can fall outside it.'
                    : 'A finding is raised when threat intelligence matches a policy rule, when a policy review turns something up, or when an analyst records one directly.'
                }
              />
            }
            skeleton={<SkeletonTable rows={8} cols={7} />}
          >
            <div className="-mx-5 -mb-5">
              <FindingsTable findings={rows} policyNames={policyNames} />
            </div>
          </AsyncBoundary>
        </div>
      </Panel>
    </div>
  )
}
