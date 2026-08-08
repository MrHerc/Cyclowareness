/**
 * Which external systems are actually connected — including the ones that are
 * not.
 *
 * This panel leads with the failures and keeps the never-configured providers
 * visible underneath as a count rather than hiding them. A dashboard that lists
 * only the healthy connections lets a buyer assume the rest are healthy too,
 * and this deployment genuinely has no LMS or identity provider attached.
 *
 * `last_sync_error` is printed verbatim when the server sent one. Paraphrasing
 * an integration's own error message is how a support call starts from the
 * wrong place.
 */

import { useT } from '../../lib/i18n'
import { Link2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { AsyncBoundary, EmptyState, SkeletonRow } from '../../components/states'
import { Badge, Button, Panel } from '../../components/ui'
import type { Integration, IntegrationStatus } from '../../domain/types'
import { timeAgo, truncate } from '../../lib/format'

/** Worst first. Everything below `connected` is noise on an operations screen. */
const RANK: Record<IntegrationStatus, number> = {
  error: 0,
  degraded: 1,
  connected: 2,
  configured: 3,
  disabled: 4,
  not_configured: 5,
}

export interface IntegrationHealthPanelProps {
  integrations: Integration[]
  isLoading: boolean
  error: unknown
  onRetry: () => void
}

export function IntegrationHealthPanel({
  integrations,
  isLoading,
  error,
  onRetry,
}: IntegrationHealthPanelProps) {
  const t = useT()
  const attention = integrations
    .filter((integration) => RANK[integration.status] <= RANK.connected)
    .sort((a, b) => RANK[a.status] - RANK[b.status])
  const dormant = integrations.length - attention.length

  return (
    <Panel
      title={t('x.integration-health')}
      headingLevel={4}
      subtitle={
        dormant > 0
          ? `${dormant} further ${dormant === 1 ? 'provider is' : 'providers are'} not configured in this deployment`
          : t('p.external-learning-and-identity-systems')
      }
      actions={
        <Button size="sm" variant="ghost" asChild>
          <Link to="/integrations">Manage</Link>
        </Button>
      }
    >
      <AsyncBoundary
        isLoading={isLoading}
        error={error}
        onRetry={onRetry}
        loadingLabel={t('x.loading-integrations')}
        isEmpty={attention.length === 0}
        empty={
          <EmptyState
            compact
            icon={Link2}
            headline={t('u.no-provider-is-connected')}
            description={t('x.training-is-delivered-inside-cyclowareness')}
            action={
              <Button size="sm" variant="secondary" asChild>
                <Link to="/integrations">{t('u.open-integrations')}</Link>
              </Button>
            }
          />
        }
        skeleton={
          <div className="space-y-2">
            {[0, 1].map((row) => (
              <SkeletonRow key={row} leading={false} />
            ))}
          </div>
        }
      >
        <ul className="divide-y divide-line-subtle">
          {attention.map((integration) => (
            <li key={integration.id} className="py-3 first:pt-0 last:pb-0">
              <div className="flex items-start justify-between gap-3">
                <span className="min-w-0 truncate text-body text-fg">
                  {integration.display_name}
                </span>
                <Badge status={integration.status} size="sm" dot />
              </div>
              <p className="mt-1 text-xs text-fg-subtle">
                {integration.last_sync_at
                  ? `Last sync ${timeAgo(integration.last_sync_at)} · ${integration.last_sync_status === 'ok' ? 'succeeded' : integration.last_sync_status}`
                  : 'Never synced'}
                {integration.courses_imported > 0
                  ? ` · ${integration.courses_imported} courses imported`
                  : ''}
              </p>
              {integration.last_sync_error ? (
                <p className="tech mt-1 break-words text-xs text-critical">
                  {truncate(integration.last_sync_error, 160)}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      </AsyncBoundary>
    </Panel>
  )
}
