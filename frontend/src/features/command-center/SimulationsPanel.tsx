/**
 * Campaigns that are live and still collecting outcomes.
 *
 * No click rate is shown here on purpose. The list endpoint returns campaign
 * records without their per-campaign statistics, and computing a rate from a
 * denominator this screen does not have would be exactly the fabrication the
 * rest of the product refuses. The rate lives on the campaign's own page, where
 * its sample size is available to print beside it.
 */

import { useT } from '../../lib/i18n'
import { Send } from 'lucide-react'
import { Link } from 'react-router-dom'
import { AsyncBoundary, EmptyState, SkeletonRow } from '../../components/states'
import { Badge, Button, Panel } from '../../components/ui'
import type { Simulation } from '../../domain/types'
import { channelLabel, timeAgo } from '../../lib/format'

export interface SimulationsPanelProps {
  simulations: Simulation[]
  isLoading: boolean
  error: unknown
  onRetry: () => void
}

export function SimulationsPanel({
  simulations,
  isLoading,
  error,
  onRetry,
}: SimulationsPanelProps) {
  const t = useT()
  const active = simulations.filter((simulation) => simulation.status === 'active')
  const drafts = simulations.filter((simulation) => simulation.status === 'draft').length

  return (
    <Panel
      title={t('x.active-simulations')}
      headingLevel={4}
      subtitle={
        drafts > 0
          ? `${drafts} further ${drafts === 1 ? 'campaign is' : 'campaigns are'} in draft and not delivering`
          : 'Campaigns launched and still collecting outcomes'
      }
      actions={
        <Button size="sm" variant="ghost" asChild>
          <Link to="/simulations">All simulations</Link>
        </Button>
      }
    >
      <AsyncBoundary
        isLoading={isLoading}
        error={error}
        onRetry={onRetry}
        loadingLabel={t('x.loading-simulations')}
        isEmpty={active.length === 0}
        empty={
          <EmptyState
            compact
            icon={Send}
            headline="No campaign is running"
            description={t('x.a-simulation-appears-here-once')}
            action={
              <Button size="sm" variant="secondary" asChild>
                <Link to="/simulations">Open simulations</Link>
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
          {active.map((simulation) => (
            <li key={simulation.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <Link
                  to={`/simulations/${simulation.id}`}
                  className="block truncate text-body text-fg underline-offset-4 hover:underline"
                >
                  {simulation.name}
                </Link>
                <p className="mt-0.5 text-xs text-fg-subtle">
                  {channelLabel(simulation.channel)}
                  {simulation.launched_at
                    ? ` · launched ${timeAgo(simulation.launched_at)}`
                    : ' · launch time not recorded'}
                </p>
              </div>
              <Badge status={simulation.status} size="sm" dot />
            </li>
          ))}
        </ul>
      </AsyncBoundary>
    </Panel>
  )
}
