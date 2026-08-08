/**
 * One campaign, with its outcome rates on the face of it.
 *
 * The list endpoint returns campaigns without their outcomes, so this card asks
 * for the detail itself. That is deliberate rather than lazy: the alternative
 * is a list that shows a target count and no behaviour, which is exactly the
 * "attendance, not behaviour" reporting this product exists to replace. The
 * detail query is keyed the same way the detail page keys it, so opening a
 * campaign from here is instant.
 *
 * The card is not one big click target. `HonestMetric` puts a definition
 * popover beside each rate, and a button inside a link is neither operable by
 * keyboard nor valid HTML — so the title carries the link and the metrics stay
 * interactive.
 */

import { useT } from '../../lib/i18n'
import { ArrowRight, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { HonestMetric } from '../../components/data'
import { Skeleton } from '../../components/states'
import { Badge, Card, StatusDot } from '../../components/ui'
import type { Simulation } from '../../domain/types'
import { useSimulation } from '../../lib/api/queries'
import { channelLabel, formatDate, num } from '../../lib/format'
import {
  CLICK_RATE_DEFINITION,
  REPORT_RATE_DEFINITION,
  unmeasuredRemedy,
  withheldReason,
} from './outcomeMetrics'

export interface CampaignCardProps {
  simulation: Simulation
}

function MetricSkeleton() {
  return (
    <div>
      <Skeleton className="h-2.5 w-20" />
      <Skeleton className="mt-3 h-8 w-24" />
      <Skeleton className="mt-3 h-2.5 w-32" />
    </div>
  )
}

export function CampaignCard({ simulation }: CampaignCardProps) {
  const t = useT()
  const detail = useSimulation(simulation.id)
  const stats = detail.data?.stats ?? null

  const launched = simulation.launched_at
    ? `Launched ${formatDate(simulation.launched_at)}`
    : `Created ${formatDate(simulation.created_at)}`

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-h text-fg">
            <Link
              to={`/simulations/${simulation.id}`}
              className="hover:text-brand focus-visible:text-brand"
            >
              {simulation.name}
            </Link>
          </h3>
          <p className="mt-1 text-sm text-fg-subtle">
            {channelLabel(simulation.channel)} · {launched}
          </p>
        </div>
        <StatusDot status={simulation.status} className="shrink-0" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="neutral" size="sm">
          <Users className="size-3.5 shrink-0" aria-hidden="true" />
          {stats
            ? `${num(stats.targets)} targeted`
            : detail.isLoading
              ? 'Counting targets'
              : t('p.target-count-unavailable')}
        </Badge>
        {stats ? (
          <span className="text-xs text-fg-faint">
            {num(stats.resolved)} of {num(stats.targets)} resolved
          </span>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {detail.isLoading ? (
          <>
            <MetricSkeleton />
            <MetricSkeleton />
          </>
        ) : detail.error || !stats ? (
          <p className="text-sm text-fg-faint sm:col-span-2" role="status">{t('p.outcomes-for-this-campaign-could-not')}</p>
        ) : (
          <>
            <HonestMetric
              label={t('u.click-rate')}
              value={stats.click_rate}
              format="percent"
              sample={stats.resolved}
              sampleNoun={t('u.resolved-targets')}
              source="live"
              definition={CLICK_RATE_DEFINITION}
              unmeasuredReason={withheldReason(stats)}
              unmeasuredRemedy={unmeasuredRemedy(simulation.status)}
            />
            <HonestMetric
              label={t('u.report-rate')}
              value={stats.report_rate}
              format="percent"
              sample={stats.resolved}
              sampleNoun={t('u.resolved-targets')}
              source="live"
              definition={REPORT_RATE_DEFINITION}
              unmeasuredReason={withheldReason(stats)}
              unmeasuredRemedy={unmeasuredRemedy(simulation.status)}
            />
          </>
        )}
      </div>

      <Link
        to={`/simulations/${simulation.id}`}
        className="inline-flex items-center gap-1.5 self-start text-sm text-brand hover:underline"
      >
        {t('u.open-campaign')}
        <ArrowRight className="size-3.5 shrink-0" aria-hidden="true" />
      </Link>
    </Card>
  )
}
