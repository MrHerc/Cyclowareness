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

const GROUPS: { key: 'learning' | 'identity'; title: string; blurb: string }[] = [
  {
    key: 'learning',
    title: 'Learning platforms',
    blurb:
      'Where approved training would be delivered, and where completions would be read back so measurement is not taken on trust.',
  },
  {
    key: 'identity',
    title: 'Identity providers',
    blurb:
      'Single sign-on and directory sync. Neither is wired here: this deployment authenticates against its own user table.',
  },
]

export default function Integrations() {
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
          <h1 className="text-display text-fg">Integrations</h1>
          <p className="text-body text-fg-muted">
            Connections to the learning platforms training would be delivered through, and to the
            identity providers people would sign in with.
          </p>
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
            <p className="text-body text-fg">No external provider is connected in this deployment.</p>
            <p className="text-sm text-fg-muted">
              The connection records, their states and every action below are real and audited. No
              sync client is compiled into this build, so nothing on this page can reach a provider —
              a sync says so rather than inventing a result. The course catalogues attached to these
              connections are demonstration data.
            </p>
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
            label="Connection state"
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
        loadingLabel="Loading integrations"
        skeleton={
          <div className="grid gap-4 xl:grid-cols-2">
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
                ? 'No connection has been registered'
                : 'No connection is in that state'
            }
            description={
              rows.length === 0
                ? 'A connection record appears once a provider is registered with the platform. This deployment ships a set of them so the states can be demonstrated.'
                : 'Choose another state, or set the filter back to every state.'
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
                  <h2 className="text-title text-fg">{group.title}</h2>
                  <p className="mt-1 text-body text-fg-muted">{group.blurb}</p>
                </div>
                <div className="grid items-stretch gap-4 xl:grid-cols-2">
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
