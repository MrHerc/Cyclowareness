/**
 * The audit log.
 *
 * One rule shapes this page: **never imply the list is complete when it is
 * not.** The API returns `total` and `truncated` on every response, and both are
 * printed — "showing 100 of 412 matching entries" is a different claim from
 * "412 things happened", and a governance surface may not blur them. The page
 * size is a control rather than a constant so an analyst can widen the read to
 * the API's own cap instead of guessing what fell off the end.
 *
 * Every filter is handed to the server, so the count under the table describes
 * the whole store rather than the rows on screen. The window and the filters
 * live in the URL because an audit search is something people send each other:
 * "everything Kamran did to a policy last week" has to survive being pasted
 * into a chat window.
 */

import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ScrollText } from 'lucide-react'
import {
  DataSourceLabel,
  defaultDateRange,
  fromISODate,
  type DateRangeValue,
  type DateRangePreset,
} from '../components/data'
import { useT } from '../lib/i18n'
import { AsyncBoundary, EmptyState, SkeletonTable } from '../components/states'
import { Panel } from '../components/ui'
import { AuditFilters } from '../features/audit/AuditFilters'
import { AuditTable } from '../features/audit/AuditTable'
import {
  AUDIT_FILTER_KEYS,
  actionCountsOf,
  auditPageOf,
  distinct,
  type AuditFilterKey,
} from '../features/audit/data'
import { useUrlFilters } from '../features/policy/useUrlFilters'
import { useAuditActions, useAuditLog } from '../lib/api/queries'
import { backingFor } from '../lib/demo/registry'
import { num } from '../lib/format'

const DEFAULT_LIMIT = 100
const PRESETS: DateRangePreset[] = ['7d', '30d', '90d', 'quarter', 'custom']

/** The object types the log holds, read from an unfiltered sample of it. */
const CATALOGUE_QUERY = { limit: 500 } as const

export default function AuditLog() {
  const t = useT()
  const [params, setParams] = useSearchParams()
  const filters = useUrlFilters<AuditFilterKey>(AUDIT_FILTER_KEYS)
  const backing = backingFor('audit')

  // The window is held in the URL alongside the filters. Both writers use the
  // functional form of setParams so neither clobbers the other's keys.
  const range = useMemo<DateRangeValue>(() => {
    const fallback = defaultDateRange('30d')
    const preset = params.get('preset')
    const from = params.get('from')
    const to = params.get('to')
    const valid = (value: string | null): value is string => !!value && fromISODate(value) !== null
    if (!valid(from) || !valid(to)) return fallback
    const chosen = PRESETS.find((candidate) => candidate === preset) ?? 'custom'
    return { preset: chosen, from, to }
  }, [params])

  const limit = useMemo(() => {
    const raw = Number(params.get('limit'))
    return Number.isFinite(raw) && raw > 0 ? Math.min(raw, 500) : DEFAULT_LIMIT
  }, [params])

  function patchParams(patch: Record<string, string | null>) {
    setParams(
      (current) => {
        const next = new URLSearchParams(current)
        for (const [key, value] of Object.entries(patch)) {
          if (value === null) next.delete(key)
          else next.set(key, value)
        }
        return next
      },
      { replace: true },
    )
  }

  // The API takes datetimes; the selector works in calendar days. Both ends are
  // widened to cover the whole day so a same-day window is not an empty one.
  const query = {
    ...filters.active,
    since: `${range.from}T00:00:00Z`,
    until: `${range.to}T23:59:59Z`,
    limit,
  }

  const log = useAuditLog(query)
  const actions = useAuditActions()
  const catalogue = useAuditLog(CATALOGUE_QUERY)

  const page = useMemo(() => auditPageOf(log.data), [log.data])
  const actionCounts = useMemo(() => actionCountsOf(actions.data), [actions.data])
  const objectTypes = useMemo(
    () => distinct(auditPageOf(catalogue.data).events.map((event) => event.object_type)),
    [catalogue.data],
  )

  const footer =
    page.events.length === 0
      ? undefined
      : page.truncated
        ? `Showing the ${num(page.events.length)} most recent of ${num(page.total)} matching entries. This list is not complete — narrow the window or the filters, or raise the page size.`
        : `Showing all ${num(page.total)} entries that match these filters.`

  return (
    <div className="space-y-6">
      <header className="min-w-0 max-w-3xl space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="label text-brand">System</p>
          <DataSourceLabel source="live" detail={backing.note} />
        </div>
        <h1 className="text-display text-fg">{t('page.audit.title')}</h1>
        <p className="text-body text-fg-muted">
          Every material change the platform made, who made it, and the state of the record on both
          sides of it. The trail is written by the API in the same transaction as the change, and
          there is no route that can append to it — which is what makes it worth reading.
        </p>
      </header>

      <Panel
        title="Trail"
        subtitle="Newest first. Expand an entry to see the before and after snapshot."
        footer={footer}
        flush
      >
        <div className="p-5">
          <AuditFilters
            filters={filters}
            actions={actionCounts}
            objectTypes={objectTypes}
            range={range}
            onRangeChange={(next) =>
              patchParams({ preset: next.preset, from: next.from, to: next.to })
            }
            limit={limit}
            onLimitChange={(next) =>
              patchParams({ limit: next === DEFAULT_LIMIT ? null : String(next) })
            }
          />
        </div>

        <AsyncBoundary
          isLoading={log.isLoading}
          error={log.data ? null : log.error}
          onRetry={() => void log.refetch()}
          loadingLabel="Loading the audit trail"
          skeleton={
            <div className="px-5 pb-5">
              <SkeletonTable rows={10} cols={6} />
            </div>
          }
          isEmpty={page.events.length === 0}
          empty={
            <div className="px-5 pb-5">
              <EmptyState
                icon={ScrollText}
                headline={
                  filters.activeCount > 0
                    ? 'No entry matches these filters'
                    : 'Nothing was recorded in this window'
                }
                description={
                  filters.activeCount > 0
                    ? 'Clear a filter or widen the window. An action filter also matches every verb beneath it, so a family name is usually a better place to start than an exact one.'
                    : 'An entry is written whenever an approval is decided, a policy rule is reviewed, an integration is changed, or an incident risk moves. Widen the window to reach older activity.'
                }
              />
            </div>
          }
        >
          <AuditTable events={page.events} />
        </AsyncBoundary>
      </Panel>
    </div>
  )
}
