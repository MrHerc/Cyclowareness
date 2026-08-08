/**
 * One connection, in the state the server actually reports.
 *
 * The temptation on this screen is a wall of green. The seeded world contains
 * connections that have failed, that synced only part of a catalogue, and that
 * have never been touched — and each of those is rendered as what it is, with
 * the provider's own error text quoted rather than compressed into a chip.
 *
 * Two dates are kept apart deliberately. `last_sync_at` is when a sync last
 * *reached* the provider; the sync control on this card does not move it,
 * because no provider client exists in this build and overwriting a real
 * outcome with a non-attempt would destroy the only true record on the row.
 */

import { useT } from '../../lib/i18n'
import { useState } from 'react'
import { BookOpen, PlugZap, Power, RefreshCw, Settings2 } from 'lucide-react'
import { LastUpdated } from '../../components/data'
import { Badge, Button, Panel, useToast } from '../../components/ui'
import type { Integration } from '../../domain/types'
import { useIntegrationAction } from '../../lib/api/mutations'
import { usePermission } from '../../lib/auth/useAuth'
import { humanise, num } from '../../lib/format'
import {
  STATUS_MEANING,
  SYNC_STATUS_MEANING,
  configEntries,
  providerLabel,
  syncOutcomeOf,
  syncRefused,
} from './data'

export interface IntegrationCardProps {
  integration: Integration
  onConfigure: (integration: Integration) => void
  onDisable: (integration: Integration) => void
  onViewCourses: (integration: Integration) => void
}

export function IntegrationCard({
  integration,
  onConfigure,
  onDisable,
  onViewCourses,
}: IntegrationCardProps) {
  const t = useT()
  const canManage = usePermission('integrations.manage')
  const toast = useToast()
  const [outcome, setOutcome] = useState<string | null>(null)

  const sync = useIntegrationAction('sync', {
    onSuccess: (data) => {
      const result = syncOutcomeOf(data)
      if (result && !result.attempted) {
        // Not a failure and not a success: nothing was requested. The card says
        // so in place, because a toast disappears and this is the answer to
        // "did my sync do anything".
        setOutcome(result.error ?? t('p.the-provider-was-not-contacted'))
        toast.show({
          title: t('p.no-sync-was-attempted'),
          description: t('p.no-provider-client-exists-in-this'),
          tone: 'warning',
        })
        return
      }
      setOutcome(null)
      toast.show({
        title: 'Sync completed',
        description: result
          ? `${num(result.coursesImported)} course(s) imported.`
          : t('p.the-provider-answered'),
        tone: 'success',
      })
    },
    onError: (error) => {
      setOutcome(error.message)
      toast.show({ title: 'Sync refused', description: error.message, tone: 'error' })
    },
  })

  const entries = configEntries(integration.config_summary)
  const refused = syncRefused(integration.status)
  const statusNote = STATUS_MEANING[integration.status] ?? humanise(integration.status)
  const syncNote = SYNC_STATUS_MEANING[integration.last_sync_status] ?? null

  return (
    <Panel
      headingLevel={3}
      title={integration.display_name}
      subtitle={providerLabel(integration.provider)}
      actions={<Badge status={integration.status} dot />}
      className="flex h-full flex-col"
      bodyClassName="flex flex-1 flex-col gap-4"
    >
      <p className="text-sm text-fg-muted">{statusNote}</p>

      {integration.capabilities.length ? (
        <div>
          <p className="label text-fg-faint">{t('p.declared-capabilities')}</p>
          <p className="mt-1.5 flex flex-wrap gap-1.5">
            {integration.capabilities.map((capability) => (
              <span
                key={capability}
                className="tech rounded-chip border border-line-subtle bg-base px-1.5 py-0.5 text-xs text-fg-subtle"
              >
                {capability}
              </span>
            ))}
          </p>
        </div>
      ) : null}

      {entries.length ? (
        <div>
          <p className="label text-fg-faint">{t('p.stored-configuration')}</p>
          <dl className="mt-1.5 grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-[minmax(0,auto)_minmax(0,1fr)]">
            {entries.map((entry) => (
              <div key={entry.key} className="contents">
                <dt className="text-sm text-fg-subtle">{entry.label}</dt>
                <dd className="min-w-0 break-words text-sm text-fg">
                  {entry.value === null ? (
                    <span className="text-fg-faint">
                      {t('u.withheld-this-key-is-credential-shaped-and')}
                    </span>
                  ) : (
                    entry.value
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      ) : (
        <p className="text-sm text-fg-subtle">{t('p.no-configuration-has-been-stored-for')}</p>
      )}

      <div className="rounded-control border border-line-subtle bg-base px-3 py-2.5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <Badge status={integration.last_sync_status} size="sm" />
          <LastUpdated at={integration.last_sync_at} prefix={t('u.last-sync')} />
          <span className="text-xs text-fg-faint">
            {num(integration.courses_imported)} course(s) imported
          </span>
        </div>
        {syncNote ? <p className="mt-1.5 text-xs text-fg-subtle">{syncNote}</p> : null}
        {integration.last_sync_error ? (
          <p className="mt-1.5 text-sm text-critical">{integration.last_sync_error}</p>
        ) : null}
      </div>

      {outcome ? (
        <p
          role="status"
          className="rounded-control border border-medium/35 bg-medium/5 px-3 py-2.5 text-sm text-fg-muted"
        >
          {outcome}
        </p>
      ) : null}

      {/* What "Sync now" will actually do, in the layout rather than in a
          tooltip: it is the difference between an operator believing a
          catalogue was refreshed and knowing it was not. */}
      {canManage ? (
        <p className="text-xs text-fg-subtle">
          {refused
            ? t('p.a-sync-against-a-connection-that')
            : t('p.a-sync-asks-the-provider-for')}
        </p>
      ) : null}

      <div className="mt-auto flex flex-wrap gap-2 pt-1">
        <Button
          variant="secondary"
          size="sm"
          icon={<BookOpen className="size-4" aria-hidden="true" strokeWidth={1.75} />}
          onClick={() => onViewCourses(integration)}
        >
          Courses
        </Button>

        {canManage ? (
          <>
            <Button
              variant="secondary"
              size="sm"
              icon={<Settings2 className="size-4" aria-hidden="true" strokeWidth={1.75} />}
              onClick={() => onConfigure(integration)}
            >
              Configure
            </Button>
            <Button
              variant="outline"
              size="sm"
              icon={<RefreshCw className="size-4" aria-hidden="true" strokeWidth={1.75} />}
              loading={sync.isPending}
              onClick={() => {
                setOutcome(null)
                sync.mutate({ id: integration.id, body: { scope: 'all' } })
              }}
            >
              {t('u.sync-now')}
            </Button>
            {integration.status === 'disabled' ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-fg-faint">
                <Power className="size-3.5 shrink-0" aria-hidden="true" strokeWidth={1.75} />
                {t('u.already-disabled')}
              </span>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                icon={<PlugZap className="size-4" aria-hidden="true" strokeWidth={1.75} />}
                onClick={() => onDisable(integration)}
              >
                Disable
              </Button>
            )}
          </>
        ) : null}
      </div>
    </Panel>
  )
}
