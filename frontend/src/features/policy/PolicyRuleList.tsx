/**
 * The structured rules a document was reduced to — and the passage each one
 * came out of.
 *
 * The evidence quote is not decoration. A rule without the sentence it was
 * extracted from is a machine's assertion about a document, and a reviewer
 * approving one is approving a claim rather than a control. So the quote is
 * rendered at full length, in the reviewer's reading order, directly under the
 * statement it is supposed to justify — never behind a disclosure.
 *
 * Proposed rules are visually separated from active ones because they mean
 * different things: an active rule is what the organisation is checked against
 * today, and a proposed one is a suggestion nobody has accepted. Rendering them
 * in one undifferentiated list is how a machine's guess becomes policy.
 */

import { useT, type MessageKey } from '../../lib/i18n'
import { Check, FileQuestion, X } from 'lucide-react'
import { useState } from 'react'
import { AIProvenanceBadge, ConfidenceBadge } from '../../components/data'
import { EmptyState } from '../../components/states'
import { Badge, Button, Panel } from '../../components/ui'
import type { PolicyRule } from '../../domain/types'
import { cn, formatDate } from '../../lib/format'
import { RuleReviewDialog, type RuleDecision } from './RuleReviewDialog'
import { RULE_TYPE_LABELS, ruleProvenance } from './vocabulary'

/**
 * Module scope cannot call a hook, so these hold KEYS and the component
 * resolves them. `STATUS_KEY` is shared with the per-rule badge below — the
 * four status words were written twice before, once here and once in
 * `RULE_STATUS_LABELS`, which is how a panel ends up half-translated.
 */
const STATUS_KEY: Record<string, MessageKey> = {
  proposed: 'p.proposed',
  active: 'p.active',
  superseded: 'p.superseded',
  rejected: 'p.rejected',
}

const GROUPS: { status: string; headingKey: MessageKey; blurbKey: MessageKey }[] = [
  {
    status: 'proposed',
    headingKey: 'p.proposed-awaiting-a-human',
    blurbKey: 'p.nothing-is-checked-against-these-a',
  },
  {
    status: 'active',
    headingKey: 'p.active',
    blurbKey: 'p.the-rules-this-organisation-is-actually',
  },
  {
    status: 'superseded',
    headingKey: 'p.superseded',
    blurbKey: 'p.replaced-by-a-later-rule-kept',
  },
  {
    status: 'rejected',
    headingKey: 'p.rejected',
    blurbKey: 'p.a-reviewer-discarded-these-they-were',
  },
]

interface RuleRowProps {
  rule: PolicyRule
  extractionSource: string
  modelConnected?: boolean
  canReview: boolean
  onReview: (rule: PolicyRule, decision: RuleDecision) => void
}

function RuleRow({ rule, extractionSource, modelConnected, canReview, onReview }: RuleRowProps) {
  const t = useT()
  const proposed = rule.status === 'proposed'

  return (
    <li
      className={cn(
        'rounded-panel border p-4',
        proposed ? 'border-medium/35 bg-elevated' : 'border-line-subtle bg-base',
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="tech break-all text-fg-subtle">{rule.rule_key}</p>
          <p className="text-body text-fg">{rule.statement}</p>
        </div>
        <Badge status={rule.status} size="sm">
          {STATUS_KEY[rule.status] ? t(STATUS_KEY[rule.status]) : rule.status}
        </Badge>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Badge tone="neutral" size="sm">
          {RULE_TYPE_LABELS[rule.rule_type] ?? rule.rule_type}
        </Badge>
        {rule.technology ? (
          <span className="tech text-fg-muted">{rule.technology}</span>
        ) : null}
        {rule.version_spec ? (
          <span className="tech text-fg-muted">{rule.version_spec}</span>
        ) : null}
        <ConfidenceBadge value={rule.confidence} />
        <AIProvenanceBadge
          provenance={ruleProvenance(rule.confidence, extractionSource)}
          generationSource={extractionSource}
          modelConnected={modelConnected}
        />
      </div>

      {rule.evidence_quote ? (
        <blockquote className="mt-3 border-l-2 border-brand/40 pl-3">
          <p className="text-sm italic text-fg-muted">“{rule.evidence_quote}”</p>
          <footer className="mt-1 text-xs text-fg-faint">
            {rule.evidence_location || t('p.location-in-the-document-was-not-recorded')}
          </footer>
        </blockquote>
      ) : (
        <p className="mt-3 text-sm text-fg-faint">{t('p.no-passage-was-recorded-for-this')}</p>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-fg-faint">
          {rule.reviewed_by
            ? t('p.reviewed-by-on', { who: rule.reviewed_by, when: formatDate(rule.reviewed_at) })
            : t('p.not-yet-reviewed-by-anyone')}
        </p>

        {proposed && canReview ? (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              icon={<X className="size-4" />}
              onClick={() => onReview(rule, 'reject')}
            >
              {t('p.reject')}
            </Button>
            <Button
              size="sm"
              variant="primary"
              icon={<Check className="size-4" />}
              onClick={() => onReview(rule, 'activate')}
            >
              {t('p.activate')}
            </Button>
          </div>
        ) : null}
      </div>
    </li>
  )
}

export interface PolicyRuleListProps {
  rules: PolicyRule[]
  /** The policy's `extraction_source` — drives every rule's provenance badge. */
  extractionSource: string
  modelConnected?: boolean
  canReview: boolean
  /** Shown when the policy has no rules at all: says why, from the parent. */
  emptyDescription: string
  className?: string
}

export function PolicyRuleList({
  rules,
  extractionSource,
  modelConnected,
  canReview,
  emptyDescription,
  className,
}: PolicyRuleListProps) {
  const t = useT()
  const [target, setTarget] = useState<{ rule: PolicyRule; decision: RuleDecision } | null>(null)
  const [open, setOpen] = useState(false)

  const openReview = (rule: PolicyRule, decision: RuleDecision) => {
    setTarget({ rule, decision })
    setOpen(true)
  }

  if (rules.length === 0) {
    return (
      <EmptyState
        compact
        icon={FileQuestion}
        headline={t('p.no-rules-on-this-policy')}
        description={emptyDescription}
        className={className}
      />
    )
  }

  const known = new Set(GROUPS.map((group) => group.status))
  const other = rules.filter((rule) => !known.has(rule.status))

  return (
    <div className={cn('space-y-5', className)}>
      {GROUPS.map((group) => {
        const inGroup = rules.filter((rule) => rule.status === group.status)
        if (inGroup.length === 0) return null

        return (
          <Panel
            key={group.status}
            tone={group.status === 'proposed' ? 'feature' : 'quiet'}
            headingLevel={4}
            title={`${t(group.headingKey)} · ${inGroup.length}`}
            subtitle={t(group.blurbKey)}
          >
            <ul className="space-y-3">
              {inGroup.map((rule) => (
                <RuleRow
                  key={rule.id}
                  rule={rule}
                  extractionSource={extractionSource}
                  modelConnected={modelConnected}
                  canReview={canReview}
                  onReview={openReview}
                />
              ))}
            </ul>
          </Panel>
        )
      })}

      {other.length > 0 ? (
        <Panel
          tone="quiet"
          headingLevel={4}
          title={`Other · ${other.length}`}
          subtitle={t('x.rules-whose-status-this-build')}
        >
          <ul className="space-y-3">
            {other.map((rule) => (
              <RuleRow
                key={rule.id}
                rule={rule}
                extractionSource={extractionSource}
                modelConnected={modelConnected}
                canReview={false}
                onReview={openReview}
              />
            ))}
          </ul>
        </Panel>
      ) : null}

      <RuleReviewDialog
        rule={target?.rule ?? null}
        decision={target?.decision ?? 'activate'}
        open={open}
        onOpenChange={setOpen}
      />
    </div>
  )
}
