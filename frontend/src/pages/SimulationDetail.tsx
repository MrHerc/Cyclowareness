/**
 * One campaign, end to end: what was sent, to whom, and what they did.
 *
 * Counts and rates are kept visibly separate. Counts are facts — this many
 * people were targeted, this many have a recorded outcome. Rates are
 * measurements with a denominator, and when that denominator is zero the page
 * says so instead of drawing a reassuring 0%.
 */

import { ArrowLeft, ListChecks } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { HonestMetric } from '../components/data'
import { AsyncBoundary, EmptyState, SkeletonCard, SkeletonTable } from '../components/states'
import { Badge, Panel, Separator } from '../components/ui'
import { CampaignActions } from '../features/simulations/CampaignActions'
import { LurePreview } from '../features/simulations/LurePreview'
import {
  CLICK_RATE_DEFINITION,
  REPORT_RATE_DEFINITION,
  unmeasuredRemedy,
} from '../features/simulations/outcomeMetrics'
import { TargetTable } from '../features/simulations/TargetTable'
import { useSimulation } from '../lib/api/queries'
import { usePermission } from '../lib/auth/useAuth'
import { channelLabel, formatDateTime, num } from '../lib/format'
import type { SimulationDetail as SimulationDetailModel } from '../domain/types'

function CountStat({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="min-w-0">
      <p className="label text-fg-subtle">{label}</p>
      <p className="mt-1 text-title tabular-nums text-fg">{num(value)}</p>
      {hint ? <p className="mt-0.5 text-xs text-fg-faint">{hint}</p> : null}
    </div>
  )
}

function Outcomes({ simulation }: { simulation: SimulationDetailModel }) {
  const { stats, targets } = simulation
  const ignored = targets.filter((target) => target.outcome === 'ignored').length
  const pending = targets.filter((target) => target.outcome === 'pending').length

  return (
    <Panel
      title="Outcomes"
      subtitle="Rates are divided by the targets that have a recorded outcome, not by everyone targeted."
      tone="feature"
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <HonestMetric
          label="Click rate"
          value={stats.click_rate}
          format="percent"
          sample={stats.resolved}
          sampleNoun="resolved targets"
          source="live"
          definition={CLICK_RATE_DEFINITION}
          unmeasuredReason="No target in this campaign has a recorded outcome"
          unmeasuredRemedy={unmeasuredRemedy(simulation.status)}
        />
        <HonestMetric
          label="Report rate"
          value={stats.report_rate}
          format="percent"
          sample={stats.resolved}
          sampleNoun="resolved targets"
          source="live"
          definition={REPORT_RATE_DEFINITION}
          unmeasuredReason="No target in this campaign has a recorded outcome"
          unmeasuredRemedy={unmeasuredRemedy(simulation.status)}
        />
      </div>

      <Separator className="my-5" />

      <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
        <CountStat label="Targeted" value={stats.targets} />
        <CountStat label="Resolved" value={stats.resolved} hint="Has a recorded outcome" />
        <CountStat label="Clicked" value={stats.clicked} />
        <CountStat label="Reported" value={stats.reported} />
        <CountStat label="Pending" value={pending} hint={`${num(ignored)} ignored`} />
      </div>
    </Panel>
  )
}

export default function SimulationDetail() {
  const { id } = useParams<{ id: string }>()
  const simulation = useSimulation(id)
  const canManage = usePermission('simulations.manage')
  const data = simulation.data

  return (
    <div className="space-y-6">
      <Link
        to="/simulations"
        className="inline-flex items-center gap-1.5 text-sm text-fg-subtle hover:text-fg"
      >
        <ArrowLeft className="size-3.5 shrink-0" aria-hidden="true" />
        All campaigns
      </Link>

      <AsyncBoundary
        isLoading={simulation.isLoading}
        error={data ? null : simulation.error}
        onRetry={() => void simulation.refetch()}
        loadingLabel="Loading campaign"
        skeleton={
          <div className="space-y-6">
            <SkeletonCard metric lines={2} />
            <SkeletonTable rows={6} cols={5} />
          </div>
        }
      >
        {data ? (
          <div className="space-y-6">
            <header className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-display text-fg">{data.name}</h1>
                  <Badge status={data.status} dot />
                </div>
                <p className="mt-2 text-sm text-fg-subtle">
                  {channelLabel(data.channel)} · Created {formatDateTime(data.created_at)}
                  {data.launched_at ? ` · Launched ${formatDateTime(data.launched_at)}` : ''}
                  {data.completed_at ? ` · Closed ${formatDateTime(data.completed_at)}` : ''}
                </p>
              </div>
              {canManage ? <CampaignActions simulation={data} /> : null}
            </header>

            <Outcomes simulation={data} />

            <Panel
              title="Lure"
              subtitle="Exactly what this campaign stored. It is never rendered as a live link."
            >
              <LurePreview
                value={data.lure_preview}
                channel={data.channel}
                sourceLabel={
                  data.template_threat_id
                    ? `Analyzed threat #${data.template_threat_id}`
                    : data.lure_template_id
                      ? data.lure_template_id
                      : 'No lure source recorded'
                }
                sourceHref={
                  data.template_threat_id ? `/threats/${data.template_threat_id}` : undefined
                }
              />
            </Panel>

            <Panel
              title="Targets"
              subtitle={`${num(data.targets.length)} ${data.targets.length === 1 ? 'person was' : 'people were'} selected when this campaign was created. The target set is fixed at creation.`}
              flush
            >
              {data.targets.length === 0 ? (
                <div className="p-5">
                  <EmptyState
                    compact
                    icon={ListChecks}
                    headline="This campaign has no targets"
                    description="Targets are chosen when the campaign is created, from departments and risk bands. A campaign with none cannot be measured."
                  />
                </div>
              ) : (
                <TargetTable simulation={data} canRecord={canManage} />
              )}
            </Panel>
          </div>
        ) : null}
      </AsyncBoundary>
    </div>
  )
}
