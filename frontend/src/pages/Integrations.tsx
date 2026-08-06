/**
 * Integrations — connection states, reported rather than decorated.
 *
 * The first thing this page says is the thing a buyer most needs to hear: no
 * external provider is connected in this deployment. Everything below it is
 * then readable as what it is — real connection records, in genuinely different
 * states, with demonstration course data behind the ones that hold any.
 *
 * The status filter lives in the URL because "the two connections in error" is
 * a view somebody sends to a colleague, and a filtered screen that cannot be
 * linked to is a screen that gets photographed instead.
 */

import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Link2, ShieldOff } from 'lucide-react'
import { useLocale, type MessageKey } from '../lib/i18n'
import { DemoDataBadge } from '../components/data'
import { AsyncBoundary, EmptyState, SkeletonCard } from '../components/states'
import { Badge, Panel, Select } from '../components/ui'
import type { Integration } from '../domain/types'
import { ConfigureDialog } from '../features/integrations/ConfigureDialog'
import { CoursesDrawer } from '../features/integrations/CoursesDrawer'
import { DisableDialog } from '../features/integrations/DisableDialog'
import { IntegrationCard } from '../features/integrations/IntegrationCard'
import { groupOf } from '../features/integrations/data'
import { useIntegrations } from '../lib/api/queries'
import { backingFor } from '../lib/demo/registry'
import { humanise, num } from '../lib/format'

const GROUPS: { key: 'learning' | 'identity'; title: MessageKey; blurb: MessageKey }[] = [
  {
    key: 'learning',
    title: 'p.learning-platforms',
    blurb: 'p.where-approved-training-would-be-delivered',
  },
  {
    key: 'identity',
    title: 'p.identity-providers',
    blurb: 'p.single-signon-and-directory-sync-neither',
  },
]

export default function Integrations() {
  const { locale, t } = useLocale()
  const [params, setParams] = useSearchParams()
  const backing = backingFor('integrations')

  const [configuring, setConfiguring] = useState<Integration | null>(null)
  const [disabling, setDisabling] = useState<Integration | null>(null)
  const [viewing, setViewing] = useState<Integration | null>(null)

  const integrations = useIntegrations()
  const rows = useMemo(() => integrations.data ?? [], [integrations.data])
  const status = params.get('status') ?? 'all'

  function setStatus(value: string) {
    const next = new URLSearchParams(params)
    if (!value || value === 'all') next.delete('status')
    else next.set('status', value)
    setParams(next, { replace: true })
  }

  // The status menu is built from the states this deployment actually holds, so
  // it can never offer a filter that matches nothing.
  const counts = useMemo(() => {
    const map = new Map<string, number>()
    for (const row of rows) map.set(row.status, (map.get(row.status) ?? 0) + 1)
    return map
  }, [rows])

  const statusOptions = useMemo(
    () => [
      { value: 'all', label: `Every state (${num(rows.length)})` },
      ...[...counts.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([value, count]) => ({ value, label: `${humanise(value)} (${num(count)})` })),
    ],
    [counts, rows.length],
  )

  const visible = useMemo(
    () => (status === 'all' ? rows : rows.filter((row) => row.status === status)),
    [rows, status],
  )

  return (
    <div className="space-y-6">
      <header className="space-y-4">
        <div className="min-w-0 max-w-3xl space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="label text-brand">System</p>
            <DemoDataBadge detail={backing.note} />
          </div>
          <h1 className="text-display text-fg">{t('page.integrations.title')}</h1>
          <p lang={locale} className="text-body text-fg-muted">{t('page.integrations.lead')}</p>
        </div>

        {/* The capability statement, above everything it qualifies. Neutral
            rather than a risk hue: an unconnected provider is a fact about this
            deployment, not a finding about the organisation. */}
        <div className="flex gap-3 rounded-panel border border-dashed border-line-strong bg-surface px-4 py-3">
          <ShieldOff
            className="mt-0.5 size-4 shrink-0 text-fg-subtle"
            aria-hidden="true"
            strokeWidth={1.75}
          />
          <div className="min-w-0 space-y-1">
            <p className="text-body text-fg">{t('p.no-external-provider-is-connected-in')}</p>
            <p className="text-sm text-fg-muted">{t('p.the-connection-records-their-states-and')}</p>
          </div>
        </div>
      </header>

      <Panel>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {[...counts.entries()]
              .sort((a, b) => a[0].localeCompare(b[0]))
              .map(([value, count]) => (
                <Badge key={value} status={value} size="sm" dot>
                  {`${humanise(value)} · ${num(count)}`}
                </Badge>
              ))}
            {rows.length === 0 ? (
              <span className="text-sm text-fg-subtle">No connection records exist.</span>
            ) : null}
          </div>
          <Select
            label={t('p.connection-state')}
            options={statusOptions}
            value={status}
            onValueChange={setStatus}
            className="w-56"
          />
        </div>
      </Panel>

      <AsyncBoundary
        isLoading={integrations.isLoading}
        error={integrations.data ? null : integrations.error}
        onRetry={() => void integrations.refetch()}
        loadingLabel={t('x.loading-integrations')}
        skeleton={
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <SkeletonCard lines={4} />
            <SkeletonCard lines={4} />
            <SkeletonCard lines={4} />
            <SkeletonCard lines={4} />
          </div>
        }
        isEmpty={visible.length === 0}
        empty={
          <EmptyState
            icon={Link2}
            headline={
              rows.length === 0
                ? t('p.no-connection-has-been-registered')
                : t('p.no-connection-is-in-that-state')
            }
            description={
              rows.length === 0
                ? t('p.a-connection-record-appears-once-a')
                : t('p.choose-another-state-or-set-the')
            }
          />
        }
      >
        <div className="space-y-8">
          {GROUPS.map((group) => {
            const members = visible.filter((row) => groupOf(row.provider) === group.key)
            if (members.length === 0) return null
            return (
              <section key={group.key} className="space-y-4">
                <div className="max-w-3xl">
                  <h2 className="text-title text-fg">{t(group.title)}</h2>
                  <p className="mt-1 text-body text-fg-muted">{t(group.blurb)}</p>
                </div>
                <div className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-2">
                  {members.map((integration) => (
                    <IntegrationCard
                      key={integration.id}
                      integration={integration}
                      onConfigure={setConfiguring}
                      onDisable={setDisabling}
                      onViewCourses={setViewing}
                    />
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      </AsyncBoundary>

      {configuring ? (
        <ConfigureDialog
          integration={configuring}
          open
          onOpenChange={(next) => {
            if (!next) setConfiguring(null)
          }}
        />
      ) : null}

      {disabling ? (
        <DisableDialog
          integration={disabling}
          open
          onOpenChange={(next) => {
            if (!next) setDisabling(null)
          }}
        />
      ) : null}

      <CoursesDrawer
        integration={viewing}
        open={viewing !== null}
        onOpenChange={(next) => {
          if (!next) setViewing(null)
        }}
      />
    </div>
  )
}
