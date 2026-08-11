/**
 * One policy, opened.
 *
 * A drawer rather than a route because the reading task is "check this row
 * against the library I am scanning" — a full page navigation loses the filtered
 * table the reader built to get here. The policy id lives in the query string
 * all the same, so an open drawer is a link somebody can send.
 *
 * The tabs are ordered by what a reviewer does: read the rules, check whether
 * anything ever read the document, look at what changed, then see what is
 * currently broken because of it.
 */

import { useT } from '../../lib/i18n'
import { ExternalLink } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { AsyncBoundary, EmptyState, SkeletonText } from '../../components/states'
import {
  Badge,
  Drawer,
  Panel,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../../components/ui'
import type { DepartmentRisk, PolicyFinding } from '../../domain/types'
import { useCapabilities, useDepartments, usePolicy, usePolicyFindings } from '../../lib/api/queries'
import { usePermission } from '../../lib/auth/useAuth'
import { deadlineIn, formatDate } from '../../lib/format'
import {
  departmentNames,
  itemsOf,
  technologiesOf,
  type PolicyDetailResponse,
} from './data'
import { FindingCard } from './FindingCard'
import { PolicyExtraction } from './PolicyExtraction'
import { PolicyRuleList } from './PolicyRuleList'
import { PolicyVersions } from './PolicyVersions'
import { POLICY_STATUS_LABELS, POLICY_TYPE_LABELS } from './vocabulary'

/**
 * Why this reads `policy` rather than `policy_id`: the frozen endpoint table
 * declares the finding filter as `policy_id`, but the API's parameter is
 * `policy`. Passing the declared name would produce a filter that silently
 * returned every finding in the deployment.
 */
function findingFilter(policyId: number): Record<string, string | number | undefined> {
  return { policy: policyId, limit: 100 }
}

function MetaRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="label text-fg-faint">{label}</dt>
      <dd className="mt-1 text-sm text-fg">{children}</dd>
    </div>
  )
}

export interface PolicyDrawerProps {
  policyId: number | null
  onClose: () => void
}

export function PolicyDrawer({ policyId, onClose }: PolicyDrawerProps) {
  const t = useT()
  const open = policyId !== null
  const query = usePolicy(policyId ?? undefined)
  const findings = usePolicyFindings(policyId !== null ? findingFilter(policyId) : {}, {
    enabled: policyId !== null,
  })
  const departments = useDepartments()
  const capabilities = useCapabilities()
  const canManage = usePermission('policy.manage')

  const policy = query.data as PolicyDetailResponse | undefined
  const findingRows = itemsOf<PolicyFinding>(findings.data)
  const departmentLookup = new Map(
    itemsOf<DepartmentRisk>(departments.data).map((department) => [department.id, department.name]),
  )

  const rules = policy?.rules ?? []
  const versions = policy?.versions ?? []
  const technologies = technologiesOf(rules)
  const applicable = departmentNames(policy?.applicable_departments, departmentLookup)
  const review = deadlineIn(policy?.review_date)

  return (
    <Drawer
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
      side="right"
      size="lg"
      title={policy?.name ?? 'Policy'}
      description={
        policy
          ? `${POLICY_TYPE_LABELS[policy.policy_type] ?? policy.policy_type} · version ${policy.version}`
          : t('p.loading-the-policy-record')
      }
    >
      <AsyncBoundary
        isLoading={query.isLoading}
        error={policy ? null : query.error}
        onRetry={() => void query.refetch()}
        loadingLabel={t('x.loading-the-policy')}
        skeleton={<SkeletonText lines={10} />}
      >
        {policy ? (
          <div className="space-y-5">
            <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
              <MetaRow label={t('u.status')}>
                <Badge status={policy.status} size="sm" dot>
                  {POLICY_STATUS_LABELS[policy.status] ?? policy.status}
                </Badge>
              </MetaRow>
              <MetaRow label={t('u.owner')}>
                {policy.owner_name ? (
                  <span>
                    {policy.owner_name}
                    {policy.owner_email ? (
                      <span className="block text-xs text-fg-subtle">{policy.owner_email}</span>
                    ) : null}
                  </span>
                ) : (
                  <span className="text-fg-subtle">{t('u.no-owner-recorded')}</span>
                )}
              </MetaRow>
              <MetaRow label={t('p.effective-from')}>{formatDate(policy.effective_date)}</MetaRow>
              <MetaRow label={t('u.review-due')}>
                {policy.review_date ? (
                  <span className={review.overdue ? 'text-high' : undefined}>
                    {formatDate(policy.review_date)} · {review.text}
                  </span>
                ) : (
                  <span className="text-fg-subtle">{t('u.no-review-date-set')}</span>
                )}
              </MetaRow>
              <MetaRow label={t('u.applies-to')}>
                {applicable.length > 0 ? (
                  applicable.join(', ')
                ) : (
                  <span className="text-fg-subtle">
                    {t('u.no-departments-named-this-policy-is-organisation')}
                  </span>
                )}
              </MetaRow>
              <MetaRow label={t('p.technologies-named-by-its-rules')}>
                {technologies.length > 0 ? (
                  <span className="tech">{technologies.join(', ')}</span>
                ) : (
                  <span className="text-fg-subtle">
                    {rules.length === 0
                      ? t('p.no-rules-exist-yet-so-nothing')
                      : t('p.none-of-its-rules-names-a')}
                  </span>
                )}
              </MetaRow>
            </dl>

            {policy.notes ? (
              <p className="rounded-control border border-line-subtle bg-base p-3 text-sm text-fg-muted">
                {policy.notes}
              </p>
            ) : null}

            <Tabs defaultValue="rules">
              <TabsList>
                <TabsTrigger value="rules">Rules · {rules.length}</TabsTrigger>
                <TabsTrigger value="document">Document</TabsTrigger>
                <TabsTrigger value="history">History · {versions.length}</TabsTrigger>
                <TabsTrigger value="findings">Findings · {findingRows.length}</TabsTrigger>
              </TabsList>

              <TabsContent value="rules">
                <PolicyRuleList
                  rules={rules}
                  extractionSource={policy.extraction_source}
                  modelConnected={
                    capabilities.data ? capabilities.data.ai_provider === 'anthropic' : undefined
                  }
                  canReview={canManage}
                  emptyDescription={
                    policy.extraction_status === 'extracted'
                      ? t('p.an-extraction-run-completed-and-wrote')
                      : t('p.nothing-has-produced-rules-for-this')
                  }
                />
              </TabsContent>

              <TabsContent value="document">
                <PolicyExtraction
                  policy={policy}
                  canManage={canManage}
                  modelConnected={
                    capabilities.data ? capabilities.data.ai_provider === 'anthropic' : undefined
                  }
                />
              </TabsContent>

              <TabsContent value="history">
                <Panel
                  headingLevel={3}
                  title={t('x.version-history')}
                  subtitle={t('x.written-whenever-a-rule-is')}
                >
                  <PolicyVersions versions={versions} />
                </Panel>
              </TabsContent>

              <TabsContent value="findings">
                <AsyncBoundary
                  isLoading={findings.isLoading}
                  error={findingRows.length > 0 ? null : findings.error}
                  onRetry={() => void findings.refetch()}
                  loadingLabel={t('x.loading-findings-against-this-policy')}
                  isEmpty={findingRows.length === 0}
                  empty={
                    <EmptyState
                      compact
                      headline={t('u.no-findings-against-this-policy')}
                      description={t('x.a-finding-appears-here-when')}
                    />
                  }
                  skeleton={<SkeletonText lines={4} />}
                >
                  <div className="space-y-3">
                    {findingRows.map((finding) => (
                      <FindingCard
                        key={finding.id}
                        finding={finding}
                        policyName={policy.name}
                      />
                    ))}
                    <Link
                      to={`/policy-intelligence/findings?policy=${policy.id}`}
                      className="inline-flex items-center gap-1.5 text-sm text-brand hover:underline"
                    >
                      <ExternalLink className="size-3.5" aria-hidden="true" />
                      {t('u.open-these-in-the-findings-queue')}
                    </Link>
                  </div>
                </AsyncBoundary>
              </TabsContent>
            </Tabs>
          </div>
        ) : null}
      </AsyncBoundary>
    </Drawer>
  )
}
