/**
 * Whether anything has ever read this document — and what happened when it
 * tried.
 *
 * The distinction this card exists to hold open: "never read", "read and
 * failed", and "read and produced rules" are three different states, and only
 * the third one licenses the reader to treat an empty rule list as "this
 * document contains no controls".
 *
 * When extraction cannot run, the API answers 200 with `attempted: false` and a
 * reason in plain language — because "we could not look, and here is why" is a
 * result the reviewer needs next to the document, not an exception swallowed by
 * a toast. That reason is rendered verbatim and stays on the page.
 */

import { useT } from '../../lib/i18n'
import { FileScan, Info } from 'lucide-react'
import { useState } from 'react'
import { AIProvenanceBadge } from '../../components/data'
import { Badge, Button, Panel, useToast } from '../../components/ui'
import { useExtractPolicyRules } from '../../lib/api/mutations'
import { bytes, formatDate } from '../../lib/format'
import { readExtractionResult, type ExtractionResult, type PolicyDetailResponse } from './data'
import {
  EXTRACTION_SOURCE_LABELS,
  EXTRACTION_STATUS_LABELS,
  EXTRACTION_STATUS_MEANING,
  extractionProvenance,
} from './vocabulary'

export interface PolicyExtractionProps {
  policy: PolicyDetailResponse
  canManage: boolean
  modelConnected?: boolean
}

export function PolicyExtraction({ policy, canManage, modelConnected }: PolicyExtractionProps) {
  const t = useT()
  const [outcome, setOutcome] = useState<ExtractionResult | null>(null)
  const extract = useExtractPolicyRules()
  const toast = useToast()

  const hasDocument = Boolean(policy.source_filename)

  const run = () => {
    setOutcome(null)
    extract.mutate(policy.id, {
      onSuccess: (raw) => {
        const result = readExtractionResult(raw)
        setOutcome(result)
        if (result?.attempted) {
          toast.show({
            title: `Extraction produced ${result.rules_proposed} proposed rule${result.rules_proposed === 1 ? '' : 's'}`,
            description: t('p.nothing-is-checked-against-them-until'),
            tone: 'success',
          })
        }
      },
      onError: (error) => {
        toast.show({
          title: t('p.the-extraction-request-failed'),
          description: error.message,
          tone: 'error',
        })
      },
    })
  }

  return (
    <Panel
      headingLevel={3}
      title={t('x.source-document-and-extraction')}
      subtitle={t('x.where-the-rules-came-from')}
      actions={
        canManage ? (
          <Button
            size="sm"
            variant="secondary"
            icon={<FileScan className="size-4" />}
            loading={extract.isPending}
            onClick={run}
          >
            {t('u.run-extraction')}
          </Button>
        ) : null
      }
    >
      <div className="space-y-4">
        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
          <div>
            <dt className="label text-fg-faint">Document</dt>
            <dd className="mt-1 text-sm text-fg">
              {hasDocument ? (
                <span className="tech break-all">{policy.source_filename}</span>
              ) : (
                <span className="text-fg-subtle">
                  {t('u.registered-as-metadata-only-no-document-was')}
                </span>
              )}
            </dd>
          </div>
          <div>
            <dt className="label text-fg-faint">{t('u.type-and-size')}</dt>
            <dd className="mt-1 text-sm text-fg-muted">
              {hasDocument
                ? `${policy.source_mime || 'MIME not recorded'} · ${bytes(policy.source_bytes)}`
                : '—'}
            </dd>
          </div>
          <div>
            <dt className="label text-fg-faint">{t('u.registered-by')}</dt>
            <dd className="mt-1 text-sm text-fg-muted">
              {policy.uploaded_by || 'Not recorded'} · {formatDate(policy.created_at)}
            </dd>
          </div>
          <div>
            <dt className="label text-fg-faint">{t('u.last-change')}</dt>
            <dd className="mt-1 text-sm text-fg-muted">{formatDate(policy.updated_at)}</dd>
          </div>
        </dl>

        <div className="rounded-control border border-line-subtle bg-base p-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge status={policy.extraction_status} size="sm" dot>
              {EXTRACTION_STATUS_LABELS[policy.extraction_status] ?? policy.extraction_status}
            </Badge>
            <AIProvenanceBadge
              provenance={extractionProvenance(policy.extraction_source)}
              generationSource={policy.extraction_source}
              modelConnected={modelConnected}
            />
            <span className="text-xs text-fg-faint">
              {EXTRACTION_SOURCE_LABELS[policy.extraction_source] ?? policy.extraction_source}
            </span>
          </div>

          <p className="mt-2 text-sm text-fg-muted">
            {EXTRACTION_STATUS_MEANING[policy.extraction_status] ??
              t('p.this-deployment-did-not-describe-the')}
          </p>

          {policy.extraction_error ? (
            <p className="mt-2 border-l-2 border-high/50 pl-3 text-sm text-fg">
              {policy.extraction_error}
            </p>
          ) : null}
        </div>

        {/* The result of the last attempt, kept on the page rather than in a toast. */}
        {outcome ? (
          <div
            role="status"
            aria-live="polite"
            className="flex items-start gap-3 rounded-control border border-line bg-elevated p-3"
          >
            <Info className="mt-0.5 size-4 shrink-0 text-fg-subtle" aria-hidden="true" />
            <div className="min-w-0 space-y-1">
              <p className="text-sm text-fg">
                {outcome.attempted
                  ? `An engine read the document and proposed ${outcome.rules_proposed} rule${outcome.rules_proposed === 1 ? '' : 's'}.`
                  : t('p.extraction-was-not-attempted')}
              </p>
              {outcome.reason ? (
                <p className="text-sm text-fg-muted">{outcome.reason}</p>
              ) : null}
              {outcome.attempted ? (
                <p className="text-xs text-fg-faint">{t('p.every-proposed-rule-sits-below-awaiting')}</p>
              ) : null}
            </div>
          </div>
        ) : null}

        {!canManage ? (
          <p className="text-xs text-fg-faint">{t('p.running-extraction-requires-the-policy-managemen')}</p>
        ) : null}
      </div>
    </Panel>
  )
}
