/**
 * Questions one to four: why this advisory touches this organisation.
 *
 * Everything here is derived from `IntelMatch` rows and nothing is inferred
 * from the advisory itself. That distinction is the point of the screen: the
 * publisher's claim about which products are affected is theirs, and the claim
 * that one of those products is something *we* approved is ours — so the two
 * are rendered in different places and labelled differently.
 *
 * The violet hue marks matcher output. It is machine reasoning: a comparison
 * this platform ran, not a person's judgement and not a model's prose.
 */

import { useT } from '../../lib/i18n'
import { ChevronRight, Library } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ConfidenceBadge } from '../../components/data'
import { Badge } from '../../components/ui'
import type { DepartmentRisk, Employee, IntelItemDetail } from '../../domain/types'
import { timeAgo } from '../../lib/format'
import { MatchedPolicy } from './MatchedPolicy'
import { NothingFound, Question } from './Question'
import { MATCH_TYPE_LABEL } from './vocabulary'

/** How many named people to render before collapsing to a count. */
const PEOPLE_SHOWN = 24

export interface IntelMatchAnswersProps {
  item: IntelItemDetail
  /** Undefined while the roster is loading or when it could not be read. */
  departments: DepartmentRisk[] | undefined
  employees: Employee[] | undefined
}

function unique(values: number[]): number[] {
  return [...new Set(values)]
}

/**
 * `affected_products` is whatever the publisher sent — the server carries it
 * through as free-form JSON. It is described defensively rather than indexed
 * into, because a feed entry that is a bare string (or null) must not take the
 * drawer down with it.
 */
function describeProduct(product: { vendor?: string; product?: string; versions?: string }): string {
  if (typeof product !== 'object' || product === null) return String(product ?? 'Unnamed entry')
  const parts = [product.vendor, product.product, product.versions]
    .filter((part) => typeof part === 'string' && part.trim())
    .join(' ')
  return parts || 'Unnamed product entry'
}

export function IntelMatchAnswers({ item, departments, employees }: IntelMatchAnswersProps) {
  const t = useT()
  const matches = item.matches ?? []

  const technologies = matches
    .filter((match) => match.matched_technology?.trim())
    .map((match) => ({
      id: match.id,
      technology: match.matched_technology as string,
      version: match.matched_version?.trim() || null,
      type: match.match_type,
    }))

  const policyMatches = matches.filter((match) => match.matched_policy_id !== null)

  const departmentIds = unique(matches.flatMap((match) => match.affected_department_ids ?? []))
  const employeeIds = unique(matches.flatMap((match) => match.affected_employee_ids ?? []))

  const products = item.affected_products ?? []

  return (
    <>
      <Question index={1} heading="Why does this matter to this organisation?">
        {matches.length === 0 ? (
          <NothingFound
            headline="Nothing of ours matched this advisory."
            detail={t('p.the-platform-compared-it-against-the')}
          />
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="label text-ai">Machine-derived</span>
              <p className="text-sm text-fg-subtle">
                {matches.length === 1 ? 'One match' : `${matches.length} matches`} recorded by the
                platform's comparison. Each carries the sentence it was recorded with.
              </p>
            </div>
            <ul className="space-y-2">
              {matches.map((match) => (
                <li key={match.id} className="rounded-control border border-line bg-base p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="ai" size="sm">
                      {MATCH_TYPE_LABEL[match.match_type] ?? match.match_type}
                    </Badge>
                    <ConfidenceBadge value={match.confidence} />
                    {match.created_finding_id ? (
                      <Link
                        to={`/policy-intelligence/findings/${match.created_finding_id}`}
                        className="inline-flex items-center gap-1.5 text-xs text-brand hover:underline"
                      >
                        Finding #{match.created_finding_id} raised
                      </Link>
                    ) : null}
                  </div>
                  <p className="mt-2 text-body leading-relaxed text-fg">{match.explanation}</p>
                  <p className="mt-1.5 text-xs text-fg-faint">Recorded {timeAgo(match.created_at)}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Question>

      <Question index={2} heading="Which approved technologies are affected?">
        <div className="space-y-4">
          {technologies.length === 0 ? (
            <NothingFound
              headline="No approved technology was matched."
              detail={t('p.no-match-named-a-technology-from')}
            />
          ) : (
            <ul className="space-y-1.5">
              {technologies.map((entry) => (
                <li
                  key={entry.id}
                  className="flex flex-wrap items-baseline justify-between gap-2 rounded-control border border-line-subtle bg-base px-3 py-2"
                >
                  <span className="tech text-fg">
                    {entry.technology}
                    {entry.version ? <span className="text-fg-muted"> {entry.version}</span> : null}
                  </span>
                  <span className="text-xs text-fg-faint">
                    {entry.version ? t('p.version-recorded-here') : 'No version recorded'} ·{' '}
                    {MATCH_TYPE_LABEL[entry.type] ?? entry.type}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <div>
            <p className="label text-fg-faint">{t('p.affected-products-as-published')}</p>
            {products.length === 0 ? (
              <p className="mt-1.5 text-sm text-fg-subtle">{t('p.the-source-did-not-list-affected')}</p>
            ) : (
              <ul className="mt-1.5 space-y-1">
                {products.map((product, index) => (
                  <li key={index} className="tech text-fg-muted">
                    {describeProduct(product)}
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-1.5 text-xs text-fg-faint">{t('p.published-by-the-source-cyclowareness-did')}</p>
          </div>
        </div>
      </Question>

      <Question index={3} heading="Which policy is affected?">
        {policyMatches.length === 0 ? (
          <NothingFound
            headline="No policy rule was matched."
            detail={t('p.no-extracted-rule-an-approved-version')}
          />
        ) : (
          <div className="space-y-4">
            {policyMatches.map((match) => (
              <MatchedPolicy
                key={match.id}
                policyId={match.matched_policy_id as number}
                ruleId={match.matched_rule_id}
              />
            ))}
            <Link
              to="/policy-intelligence/policies"
              className="inline-flex items-center gap-1.5 text-sm text-brand hover:underline"
            >
              <Library className="size-4" aria-hidden="true" />
              Open the policy library
            </Link>
          </div>
        )}
      </Question>

      <Question index={4} heading="Which users or departments are exposed?">
        {departmentIds.length === 0 && employeeIds.length === 0 ? (
          <NothingFound
            headline="No department or person was named."
            detail={t('p.exposure-is-carried-by-the-match')}
          />
        ) : (
          <div className="space-y-4">
            <div>
              <p className="label text-fg-faint">
                Departments ({departmentIds.length})
              </p>
              <ul className="mt-1.5 flex flex-wrap gap-1.5">
                {departmentIds.map((id) => {
                  const department = departments?.find((candidate) => candidate.id === id)
                  return (
                    <li
                      key={id}
                      className="rounded-chip border border-line bg-raised px-2 py-0.5 text-sm text-fg-muted"
                    >
                      {department
                        ? department.name
                        : departments
                          ? `Department #${id} — no longer in the department list`
                          : `Department #${id}`}
                    </li>
                  )
                })}
              </ul>
              {departmentIds.length > 0 ? (
                <Link
                  to="/departments"
                  className="mt-2 inline-flex items-center gap-1.5 text-sm text-brand hover:underline"
                >
                  Open department risk
                </Link>
              ) : null}
            </div>

            <div>
              <p className="label text-fg-faint">People ({employeeIds.length})</p>
              {employeeIds.length === 0 ? (
                <p className="mt-1.5 text-sm text-fg-subtle">{t('p.no-individual-was-named-the-exposure')}</p>
              ) : (
                <>
                  <ul className="mt-1.5 flex flex-wrap gap-1.5">
                    {employeeIds.slice(0, PEOPLE_SHOWN).map((id) => {
                      const employee = employees?.find((candidate) => candidate.id === id)
                      if (employees && !employee) {
                        return (
                          <li key={id} className="text-sm text-fg-faint">
                            Employee #{id} — no longer on the roster
                          </li>
                        )
                      }
                      return (
                        <li key={id}>
                          <Link
                            to={`/employees/${id}`}
                            className="inline-flex items-center gap-1.5 rounded-chip border border-line bg-raised px-2 py-0.5 text-sm text-fg-muted hover:border-line-strong hover:text-fg"
                          >
                            {employee ? employee.name : `Employee #${id}`}
                            <ChevronRight className="size-3 shrink-0 opacity-60" aria-hidden="true" />
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                  {employeeIds.length > PEOPLE_SHOWN ? (
                    <p className="mt-2 text-xs text-fg-faint">
                      and {employeeIds.length - PEOPLE_SHOWN} more named by these matches.
                    </p>
                  ) : null}
                </>
              )}
            </div>
          </div>
        )}
      </Question>
    </>
  )
}
