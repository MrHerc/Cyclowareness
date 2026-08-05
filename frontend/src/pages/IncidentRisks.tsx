/**
 * Incident Risks — the obligations incident response charges to named people.
 *
 * This is the one surface in the product where a record has somebody's name on
 * it and makes a demand of them on another team's authority. The list is built
 * around the two facts that follow from that: how long the person has, and what
 * they are allowed to be told.
 *
 * The page composes; it holds no fetching logic of its own beyond the query
 * whose filters live in the URL.
 */

import { Plus, ShieldAlert } from 'lucide-react'
import { useState } from 'react'
import { useLocale } from '../lib/i18n'
import { DataSourceLabel } from '../components/data'
import { AsyncBoundary, EmptyState, SkeletonTable, StateAction } from '../components/states'
import { Button, Panel } from '../components/ui'
import { CreateIncidentRiskDialog } from '../features/incident-risks/CreateIncidentRiskDialog'
import { IncidentRiskFilters } from '../features/incident-risks/IncidentRiskFilters'
import { IncidentRiskTable } from '../features/incident-risks/IncidentRiskTable'
import { useRiskFilters } from '../features/incident-risks/useRiskFilters'
import { incidentRiskPageOf } from '../features/incident-risks/wire'
import { useIncidentRisks } from '../lib/api/queries'
import { usePermission } from '../lib/auth/useAuth'
import { backingFor } from '../lib/demo/registry'

export default function IncidentRisks() {
  const { locale, t } = useLocale()
  const [creating, setCreating] = useState(false)
  const filterState = useRiskFilters()
  const canManage = usePermission('incident_risks.manage')
  const risks = useIncidentRisks(filterState.query)
  const surface = backingFor('incident-risks')

  const page = incidentRiskPageOf(risks.data)
  const filtered = filterState.activeCount > 0

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-title text-fg">{t('page.incident-risks.title')}</h1>
          <p lang={locale} className="mt-1 max-w-2xl text-body text-fg-muted">{t('page.incident-risks.lead')}</p>
          <div className="mt-2">
            <DataSourceLabel
              source={surface.backing === 'live' ? 'live' : 'demo'}
              detail={surface.note}
            />
          </div>
        </div>

        {canManage && (
          <Button
            variant="primary"
            icon={<Plus size={15} aria-hidden="true" />}
            onClick={() => setCreating(true)}
          >
            Open a risk
          </Button>
        )}
      </header>

      <Panel
        flush
        title={t('x.open-and-closed-risks')}
        subtitle={
          page.total !== null
            ? `${page.items.length} shown of ${page.total} matching${
                page.truncated ? ' — narrow the filters to reach the rest' : ''
              }`
            : undefined
        }
      >
        <div className="border-b border-line-subtle px-5 py-4">
          <IncidentRiskFilters state={filterState} />
        </div>

        <AsyncBoundary
          isLoading={risks.isLoading}
          error={risks.data ? null : risks.error}
          onRetry={() => void risks.refetch()}
          loadingLabel={t('x.loading-incident-risks')}
          skeleton={
            <SkeletonTable rows={6} cols={7} header={false} className="rounded-none border-0" />
          }
          isEmpty={page.items.length === 0}
          empty={
            <EmptyState
              compact
              icon={ShieldAlert}
              headline={
                filtered ? 'No risk matches these filters' : 'No incident risk has been opened'
              }
              description={
                filtered
                  ? 'Every incident risk is excluded by the current selection. Clear the filters to see the whole set.'
                  : 'A risk appears here when incident response charges an exposure to named people — a credential entered on a spoofed portal, a file sent to the wrong recipient, a procedure skipped under pressure.'
              }
              action={
                filtered ? (
                  <StateAction tone="quiet" onClick={filterState.reset}>
                    Clear filters
                  </StateAction>
                ) : canManage ? (
                  <StateAction onClick={() => setCreating(true)}>Open a risk</StateAction>
                ) : undefined
              }
            />
          }
        >
          <IncidentRiskTable risks={page.items} />
        </AsyncBoundary>
      </Panel>

      {canManage && <CreateIncidentRiskDialog open={creating} onOpenChange={setCreating} />}
    </div>
  )
}
