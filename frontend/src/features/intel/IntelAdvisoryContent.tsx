/**
 * What the publisher said, kept separate from what we concluded.
 *
 * Two handling rules, both non-negotiable.
 *
 * - **Indicators are defanged and never linkified.** They are rendered through
 *   `CodeBlock`, which is contractually incapable of producing an anchor, and
 *   every value passes through `defang()` first. A live malicious URL that an
 *   analyst can click by accident inside their own tooling is an incident.
 * - **Reference links leave with no referrer.** They are third-party pages; the
 *   browser should not tell them which deployment sent the analyst.
 */

import { useT } from '../../lib/i18n'
import { ExternalLink } from 'lucide-react'
import { CodeBlock } from '../../components/ui'
import type { IntelItemDetail } from '../../domain/types'
import { defang, humanise } from '../../lib/format'

export interface IntelAdvisoryContentProps {
  item: IntelItemDetail
}

export function IntelAdvisoryContent({ item }: IntelAdvisoryContentProps) {
  const t = useT()
  const techniques = item.mitre_techniques ?? []
  const references = item.reference_urls ?? []
  const iocGroups = Object.entries(item.iocs ?? {}).filter(
    ([, values]) => Array.isArray(values) && values.length > 0,
  )

  return (
    <section className="space-y-5 border-t border-line-subtle pt-5">
      <h3 className="text-h text-fg">{t('y.as-published')}</h3>

      <div>
        <p className="label text-fg-faint">{t('p.mitre-attampck-techniques')}</p>
        {techniques.length === 0 ? (
          <p className="mt-1.5 text-sm text-fg-subtle">{t('p.the-source-named-no-technique')}</p>
        ) : (
          <ul className="mt-1.5 flex flex-wrap gap-1.5">
            {techniques.map((technique) => (
              <li
                key={technique}
                className="tech rounded-chip border border-line bg-raised px-2 py-0.5 text-fg-muted"
              >
                {technique}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <p className="label text-fg-faint">Indicators</p>
        {iocGroups.length === 0 ? (
          <p className="mt-1.5 text-sm text-fg-subtle">{t('p.the-source-published-no-indicators-with')}</p>
        ) : (
          <div className="mt-2 space-y-2">
            {iocGroups.map(([group, values]) => (
              <CodeBlock
                key={group}
                label={humanise(group)}
                copyable
                wrap
                maxHeight="12rem"
                value={values.map((value) => defang(String(value))).join('\n')}
              />
            ))}
            <p className="text-xs text-fg-faint">{t('p.defanged-for-display-and-never-rendered')}</p>
          </div>
        )}
      </div>

      <div>
        <p className="label text-fg-faint">References</p>
        {references.length === 0 ? (
          <p className="mt-1.5 text-sm text-fg-subtle">{t('p.the-source-published-no-references')}</p>
        ) : (
          <ul className="mt-1.5 space-y-1.5">
            {references.map((url) => (
              <li key={url}>
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-start gap-1.5 text-sm text-brand hover:underline"
                >
                  <ExternalLink className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                  <span className="break-all">{url}</span>
                </a>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-1.5 text-xs text-fg-faint">{t('p.external-pages-opened-in-a-new')}</p>
      </div>
    </section>
  )
}
