/**
 * The policy an advisory landed on, resolved rather than referenced.
 *
 * A match carries `matched_policy_id` and `matched_rule_id` and nothing else.
 * Printing "policy #7" answers the question with a foreign key, so this fetches
 * the policy and shows the rule's own statement and the passage it was
 * extracted from — the part a human can check.
 */

import { useT } from '../../lib/i18n'
import { AsyncBoundary, Skeleton } from '../../components/states'
import { Badge } from '../../components/ui'
import { usePolicy } from '../../lib/api/queries'
import { formatDate, humanise } from '../../lib/format'

export interface MatchedPolicyProps {
  policyId: number
  ruleId: number | null
}

export function MatchedPolicy({ policyId, ruleId }: MatchedPolicyProps) {
  const t = useT()
  const query = usePolicy(policyId)
  const policy = query.data
  const rule = ruleId === null ? null : policy?.rules.find((candidate) => candidate.id === ruleId)

  return (
    <AsyncBoundary
      isLoading={query.isLoading}
      error={policy ? null : query.error}
      onRetry={() => void query.refetch()}
      loadingLabel={t('x.loading-the-matched-policy')}
      skeleton={
        <div className="space-y-2">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/4" />
        </div>
      }
    >
      {policy ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-body text-fg">{policy.name}</span>
            <span className="tech text-fg-faint">v{policy.version}</span>
            <Badge status={policy.status} size="sm" />
          </div>

          <dl className="grid grid-cols-1 gap-x-4 gap-y-1 text-sm sm:grid-cols-[8rem_1fr]">
            <dt className="text-fg-subtle">Owner</dt>
            <dd className="text-fg-muted">{policy.owner_name?.trim() || 'Not recorded'}</dd>
            <dt className="text-fg-subtle">Effective</dt>
            <dd className="text-fg-muted">{formatDate(policy.effective_date)}</dd>
          </dl>

          {rule ? (
            <div className="rounded-control border border-line-subtle bg-base p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="tech text-fg-muted">{rule.rule_key}</span>
                <Badge status={rule.status} size="sm" />
                <span className="text-xs text-fg-faint">{humanise(rule.rule_type)}</span>
              </div>
              <p className="mt-2 text-body text-fg">{rule.statement}</p>
              {rule.evidence_quote ? (
                <blockquote className="mt-2 border-l-2 border-line pl-3 text-sm italic text-fg-muted">
                  “{rule.evidence_quote}”
                  {rule.evidence_location ? (
                    <span className="mt-1 block not-italic text-xs text-fg-faint">
                      {rule.evidence_location}
                    </span>
                  ) : null}
                </blockquote>
              ) : (
                <p className="mt-2 text-xs text-fg-faint">{t('p.no-passage-was-recorded-for-this')}</p>
              )}
            </div>
          ) : ruleId === null ? (
            <p className="text-sm text-fg-subtle">{t('p.the-match-named-this-policy-but')}</p>
          ) : (
            <p className="text-sm text-fg-subtle">
              Rule #{ruleId} is no longer present on this policy — it may have been superseded
              since the match was recorded.
            </p>
          )}
        </div>
      ) : null}
    </AsyncBoundary>
  )
}
