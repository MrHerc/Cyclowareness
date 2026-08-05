/**
 * The simulation programme.
 *
 * A campaign list that shows only how many people were targeted is an
 * attendance register. This one leads with behaviour — click rate and report
 * rate per campaign, each carrying the number of targets it was divided by —
 * and a campaign nobody has recorded an outcome for says "not measured" rather
 * than reporting a flattering 0%.
 *
 * Filters live in the URL because "the active email campaigns" is a thing an
 * analyst sends to a colleague, and a filtered view that cannot be linked to is
 * a view that gets screenshotted instead.
 */

import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Send } from 'lucide-react'
import { useLocale } from '../lib/i18n'
import { AsyncBoundary, EmptyState, SkeletonCard } from '../components/states'
import {
  Button,
  Input,
  Panel,
  Select,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../components/ui'
import { CampaignCard } from '../features/simulations/CampaignCard'
import { CreateCampaignDialog } from '../features/simulations/CreateCampaignDialog'
import { useSimulations } from '../lib/api/queries'
import { usePermission } from '../lib/auth/useAuth'
import { channelLabel, num } from '../lib/format'
import type { Simulation, SimulationStatus } from '../domain/types'

const STATUS_TABS: { value: string; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
]

function matches(simulation: Simulation, status: string, channel: string, query: string): boolean {
  if (status !== 'all' && simulation.status !== (status as SimulationStatus)) return false
  if (channel !== 'all' && simulation.channel !== channel) return false
  if (query && !simulation.name.toLowerCase().includes(query.toLowerCase())) return false
  return true
}

export default function Simulations() {
  const { locale, t } = useLocale()
  const [params, setParams] = useSearchParams()
  const [dialogOpen, setDialogOpen] = useState(false)
  const canManage = usePermission('simulations.manage')

  const simulations = useSimulations()
  const status = params.get('status') ?? 'all'
  const channel = params.get('channel') ?? 'all'
  const query = params.get('q') ?? ''

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params)
    if (!value || value === 'all') next.delete(key)
    else next.set(key, value)
    setParams(next, { replace: true })
  }

  const all = useMemo(() => simulations.data ?? [], [simulations.data])

  // Channels are read off the data rather than a fixed list: the API derives a
  // campaign's channel from its lure, so a hard-coded menu would eventually
  // offer a filter that matches nothing.
  const channelOptions = useMemo(() => {
    const seen = [...new Set(all.map((item) => item.channel).filter(Boolean))].sort()
    return [
      { value: 'all', label: 'Every channel' },
      ...seen.map((value) => ({ value, label: channelLabel(value) })),
    ]
  }, [all])

  const counts = useMemo(() => {
    const map = new Map<string, number>([['all', all.length]])
    for (const item of all) map.set(item.status, (map.get(item.status) ?? 0) + 1)
    return map
  }, [all])

  const visible = useMemo(
    () => all.filter((item) => matches(item, status, channel, query)),
    [all, status, channel, query],
  )

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-display text-fg">{t('page.simulations.title')}</h1>
          <p lang={locale} className="mt-2 max-w-2xl text-lead text-fg-muted">{t('page.simulations.lead')}</p>
        </div>
        {canManage ? (
          <Button
            variant="primary"
            onClick={() => setDialogOpen(true)}
            icon={<Plus className="size-4" aria-hidden="true" />}
          >
            New campaign
          </Button>
        ) : null}
      </header>

      {/* The status strip is a real tab list over one panel — the campaign grid
          below it — rather than four buttons that happen to look like tabs. */}
      <Tabs
        value={status}
        onValueChange={(value) => setParam('status', value)}
        className="space-y-6"
      >
        <Panel>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <TabsList>
              {STATUS_TABS.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value}>
                  {tab.label}
                  <span className="ml-2 text-xs text-fg-faint">
                    {num(counts.get(tab.value) ?? 0)}
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>

            <div className="flex flex-wrap items-end gap-3">
              <Select
                label="Channel"
                options={channelOptions}
                value={channel}
                onValueChange={(value) => setParam('channel', value)}
                className="w-44"
              />
              <Input
                label="Search campaigns"
                type="search"
                value={query}
                onChange={(event) => setParam('q', event.target.value)}
                placeholder="Campaign name"
                className="w-56"
              />
            </div>
          </div>
        </Panel>

        <TabsContent value={status} className="mt-0">
          <AsyncBoundary
            isLoading={simulations.isLoading}
            error={simulations.data ? null : simulations.error}
            onRetry={() => void simulations.refetch()}
            loadingLabel={t('x.loading-simulation-campaigns')}
            skeleton={
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <SkeletonCard metric lines={2} />
                <SkeletonCard metric lines={2} />
                <SkeletonCard metric lines={2} />
                <SkeletonCard metric lines={2} />
              </div>
            }
            isEmpty={visible.length === 0}
            empty={
              all.length === 0 ? (
                <EmptyState
                  icon={Send}
                  headline="No campaigns have been created"
                  description={t('x.a-campaign-appears-here-once')}
                  action={
                    canManage ? (
                      <Button variant="primary" onClick={() => setDialogOpen(true)}>
                        New campaign
                      </Button>
                    ) : undefined
                  }
                />
              ) : (
                <EmptyState
                  icon={Send}
                  headline="No campaign matches these filters"
                  description={t('x.widen-the-status-channel-or')}
                  action={
                    <Button variant="secondary" onClick={() => setParams(new URLSearchParams())}>
                      Clear filters
                    </Button>
                  }
                />
              )
            }
          >
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {visible.map((simulation) => (
                <CampaignCard key={simulation.id} simulation={simulation} />
              ))}
            </div>
            <p className="mt-4 text-xs text-fg-faint">
              Showing {num(visible.length)} of {num(all.length)} campaigns. The API returns the 50
              most recently created.
            </p>
          </AsyncBoundary>
        </TabsContent>
      </Tabs>

      {canManage ? (
        <CreateCampaignDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      ) : null}
    </div>
  )
}
