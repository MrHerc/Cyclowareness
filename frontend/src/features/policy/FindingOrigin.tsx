/**
 * Where a finding's claim came from.
 *
 * `source` is a dotted namespace ("intel:CVE-…", "policy:exception-expiry"), so
 * the reader gets the prefix in words and the raw reference underneath — the
 * reference is what makes the claim checkable, and it is mono because it is
 * read character by character.
 *
 * The absent-advisory case is spelled out rather than left blank. "This finding
 * did not come from intelligence" and "the advisory it cited is gone from the
 * store" are different facts, and the API sends a note for the second one
 * precisely so the UI does not collapse them.
 */

import { useT } from '../../lib/i18n'
import { ExternalLink } from 'lucide-react'
import { Panel } from '../../components/ui'
import { formatDate } from '../../lib/format'
import type { PolicyFindingDetailResponse } from './data'
import { sourceLabel } from './vocabulary'

function isUrl(value: string | null | undefined): boolean {
  return typeof value === 'string' && /^https?:\/\//i.test(value)
}

export interface FindingOriginProps {
  finding: PolicyFindingDetailResponse
}

export function FindingOrigin({ finding }: FindingOriginProps) {
  const t = useT()
  return (
    <Panel title={t('x.where-this-came-from')}>
      <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
        <div>
          <dt className="label text-fg-faint">Source</dt>
          <dd className="mt-1 text-sm text-fg">{sourceLabel(finding.source)}</dd>
        </div>
        <div>
          <dt className="label text-fg-faint">Published</dt>
          <dd className="mt-1 text-sm text-fg-muted">
            {finding.published_at ? formatDate(finding.published_at) : 'Not stated'}
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="label text-fg-faint">Reference</dt>
          <dd className="mt-1 text-sm">
            {finding.source_ref ? (
              isUrl(finding.source_ref) ? (
                <a
                  href={finding.source_ref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 break-all text-brand hover:underline"
                >
                  <ExternalLink className="size-3.5 shrink-0" aria-hidden="true" />
                  {finding.source_ref}
                </a>
              ) : (
                <span className="tech break-all text-fg">{finding.source_ref}</span>
              )
            ) : (
              <span className="text-fg-faint">None recorded</span>
            )}
          </dd>
        </div>
      </dl>

      {finding.intel_item ? (
        <div className="mt-3 rounded-control border border-line-subtle bg-base p-3">
          <p className="label text-fg-faint">Advisory</p>
          <p className="mt-1 text-sm text-fg">{finding.intel_item.title}</p>
          {finding.intel_item.source_url ? (
            <a
              href={finding.intel_item.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 block break-all text-xs text-brand hover:underline"
            >
              {finding.intel_item.source_url}
            </a>
          ) : null}
        </div>
      ) : null}

      {finding.intel_lookup_note ? (
        <p className="mt-3 border-l-2 border-medium/50 pl-3 text-sm text-fg-muted">
          {finding.intel_lookup_note}
        </p>
      ) : null}
    </Panel>
  )
}
