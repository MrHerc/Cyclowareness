/**
 * External material a learner can go to after a module.
 *
 * Every row states WHEN the link was last confirmed to exist. That is the whole
 * design: the server already refuses to serve anything unverified, so showing
 * the date is not a second gate — it is the difference between "here is a link"
 * and "here is a link, and this is how old our confidence in it is". A resource
 * list that omits it asks the reader to take the URL on faith, which is what
 * this catalogue was built to avoid.
 *
 * Titles and channel names come from the provider, recorded at verification.
 * Nothing here is written by a model, and nothing here is written by the person
 * who filed the row — so the list cannot describe a video as something it isn't.
 *
 * Links open in a new tab with `rel="noopener noreferrer"`: these are
 * third-party destinations, and the page that opens them should not be
 * reachable through `window.opener`.
 */

import { useT } from '../../lib/i18n'
import { ExternalLink } from 'lucide-react'
import type { TrainingResource } from '../../domain/types'
import { formatDate } from '../../lib/format'
import { Panel } from '../../components/ui'

export interface ResourcePanelProps {
  resources: TrainingResource[]
  isLoading: boolean
  error: unknown
  /** Shown when the catalogue holds nothing for this module's channel. */
  emptyNote?: string
  headingLevel?: 2 | 3 | 4
}

const PROVIDER_LABEL: Record<string, string> = {
  youtube: 'YouTube',
  coursera: 'Coursera',
  udemy: 'Udemy',
}

function minutes(seconds: number | null): string | null {
  if (seconds === null || seconds <= 0) return null
  return `${Math.round(seconds / 60)} min`
}

export function ResourcePanel({
  resources,
  isLoading,
  error,
  emptyNote,
  headingLevel = 3,
}: ResourcePanelProps) {
  const t = useT()
  return (
    <Panel
      title={t('x.where-to-learn-more')}
      subtitle={t('x.external-material-each-link-checked')}
      headingLevel={headingLevel}
    >
      {isLoading ? (
        <p className="text-sm text-fg-subtle">{t('p.loading-resources')}</p>
      ) : error ? (
        // Stated, not swallowed. An empty list and a failed request look the
        // same to a reader, and only one of them means "we have nothing".
        <p className="text-sm text-fg-subtle">{t('p.the-resource-catalogue-could-not-be')}</p>
      ) : resources.length === 0 ? (
        <p className="text-sm text-fg-subtle">
          {emptyNote ??
            t('p.nothing-verified-for-this-channel-yet')}
        </p>
      ) : (
        <ul className="divide-y divide-line-subtle">
          {resources.map((resource) => {
            const length = minutes(resource.duration_seconds)
            return (
              <li key={resource.id} className="py-3 first:pt-0 last:pb-0">
                <a
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-start gap-2 text-body text-fg hover:text-brand-fg"
                >
                  <ExternalLink
                    className="mt-0.5 size-4 shrink-0 text-fg-faint group-hover:text-brand-fg"
                    aria-hidden="true"
                    strokeWidth={1.75}
                  />
                  <span className="min-w-0 underline-offset-4 group-hover:underline">
                    {resource.title}
                  </span>
                </a>
                <p className="mt-1 pl-6 text-xs text-fg-faint">
                  {PROVIDER_LABEL[resource.provider] ?? resource.provider}
                  {resource.author ? ` · ${resource.author}` : ''}
                  {length ? ` · ${length}` : ''}
                  {resource.verified_at
                    ? ` · link checked ${formatDate(resource.verified_at)}`
                    : ''}
                </p>
              </li>
            )
          })}
        </ul>
      )}
    </Panel>
  )
}
