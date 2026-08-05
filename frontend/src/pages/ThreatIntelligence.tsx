/**
 * Threat Intelligence.
 *
 * The premise of the screen, in one line: an external advisory only matters
 * here if it matches something this organisation actually runs or actually
 * approved. So the feed is a queue of judgements waiting to be made, the match
 * count is the column that decides which rows are worth opening, and every
 * advisory answers the same five questions in the same order.
 *
 * The screen also has to be honest about its own reach. No intelligence source
 * is wired into this build, so "check sources now" reports that nothing was
 * contacted rather than playing a fetch animation over an unchanged list. That
 * panel is the first thing on the page on a narrow viewport, and it is the one
 * feature-toned surface here.
 *
 * Filters and the open advisory live in the URL: "the unassessed CISA
 * advisories" is a view an analyst should be able to send to a colleague.
 */

import { Radar } from 'lucide-react'
import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useLocale } from '../lib/i18n'
import { DemoDataBadge } from '../components/data'
import { AsyncBoundary, EmptyState, SkeletonTable, StateAction } from '../components/states'
import { Panel } from '../components/ui'
import type { IntelItem, IntelMatch } from '../domain/types'
import { IntelFeedTable } from '../features/intel/IntelFeedTable'
import { IntelFilters, type IntelFilterValues } from '../features/intel/IntelFilters'
import { IntelItemDrawer } from '../features/intel/IntelItemDrawer'
import { IntelSourceCoverage } from '../features/intel/IntelSourceCoverage'
import { IntelViewCounts } from '../features/intel/IntelViewCounts'
import { readPage } from '../features/intel/vocabulary'
import { useIntelItems, useIntelMatches } from '../lib/api/queries'
import { usePermission } from '../lib/auth/useAuth'
import { backingFor } from '../lib/demo/registry'
import { num } from '../lib/format'

const FILTER_KEYS = ['source', 'type', 'severity', 'relevance', 'q'] as const

export default function ThreatIntelligence() {
  const { locale, t } = useLocale()
  const [searchParams, setSearchParams] = useSearchParams()
  const canManage = usePermission('intel.manage')
  const backing = backingFor('threat-intelligence')

  const values: IntelFilterValues = useMemo(
    () => ({
      source: searchParams.get('source') ?? '',
      type: searchParams.get('type') ?? '',
      severity: searchParams.get('severity') ?? '',
      relevance: searchParams.get('relevance') ?? '',
      q: searchParams.get('q') ?? '',
    }),
    [searchParams],
  )

  const itemsQuery = useIntelItems({
    source: values.source || undefined,
    // The API reads this filter as `type` (a FastAPI query alias) while the
    // frozen endpoint table names it `intel_type`. Both are sent so the filter
    // works whichever name the deployment honours; the unread one is ignored.
    type: values.type || undefined,
    intel_type: values.type || undefined,
    severity: values.severity || undefined,
    relevance: values.relevance || undefined,
    q: values.q || undefined,
  })
  const matchesQuery = useIntelMatches()

  const page = readPage<IntelItem>(itemsQuery.data)
  const matchPage = readPage<IntelMatch>(matchesQuery.data)

  /**
   * Matches per advisory. Null everywhere when the API returned only part of
   * the match list — a partial list can prove a match exists but never that one
   * does not, and a confident 0 in that state would be a fabrication.
   */
  const matchIndex = useMemo(() => {
    if (matchesQuery.isError || matchPage.truncated) return null
    const index = new Map<number, number>()
    for (const match of matchPage.items) {
      index.set(match.intel_item_id, (index.get(match.intel_item_id) ?? 0) + 1)
    }
    return index
  }, [matchesQuery.isError, matchPage.truncated, matchPage.items])

  function matchCountFor(item: IntelItem): number | null {
    if (typeof item.match_count === 'number') return item.match_count
    if (!matchIndex) return null
    return matchIndex.get(item.id) ?? 0
  }

  const matchedCount = matchIndex
    ? page.items.filter((item) => (matchCountFor(item) ?? 0) > 0).length
    : null

  const hasFilters = FILTER_KEYS.some((key) => values[key])

  function setFilter(key: keyof IntelFilterValues, value: string) {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value)
    else next.delete(key)
    setSearchParams(next)
  }

  function clearFilters() {
    const next = new URLSearchParams(searchParams)
    for (const key of FILTER_KEYS) next.delete(key)
    setSearchParams(next)
  }

  const selectedParam = searchParams.get('item')
  const selectedId = selectedParam && /^\d+$/.test(selectedParam) ? Number(selectedParam) : null

  function selectItem(id: number | null) {
    const next = new URLSearchParams(searchParams)
    if (id === null) next.delete('item')
    else next.set('item', String(id))
    setSearchParams(next)
  }

  const resultLabel =
    page.total === null || page.total === page.items.length
      ? `${num(page.items.length)} advisories`
      : `Showing ${num(page.items.length)} of ${num(page.total)} advisories`

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-display text-fg">{t('page.intel.title')}</h1>
          <p lang={locale} className="mt-2 max-w-2xl text-lead text-fg-muted">{t('page.intel.lead')}</p>
        </div>
        {backing.backing === 'live' ? null : <DemoDataBadge detail={backing.note} />}
      </header>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start">
        <aside className="space-y-5 lg:order-2">
          <IntelSourceCoverage
            latestPublishedAt={page.items[0]?.published_at ?? null}
            canRefresh={canManage}
          />
          <IntelViewCounts items={page.items} total={page.total} matched={matchedCount} />
        </aside>

        <div className="min-w-0 lg:order-1">
          <Panel
            title="Advisory feed"
            subtitle="Newest publication first. Open one to see what of ours it touches."
            flush
          >
            <div className="border-b border-line-subtle p-5">
              <IntelFilters
                values={values}
                onChange={setFilter}
                onClear={clearFilters}
                resultLabel={resultLabel}
              />
            </div>

            <AsyncBoundary
              isLoading={itemsQuery.isLoading}
              error={page.items.length > 0 ? null : itemsQuery.error}
              onRetry={() => void itemsQuery.refetch()}
              loadingLabel="Loading advisories"
              skeleton={
                <SkeletonTable rows={8} cols={5} header={false} className="rounded-none border-0" />
              }
              isEmpty={page.items.length === 0}
              empty={
                <EmptyState
                  icon={Radar}
                  headline={
                    hasFilters
                      ? 'No advisory matches these filters'
                      : 'No advisory is stored in this deployment'
                  }
                  description={
                    hasFilters
                      ? 'Nothing stored here matches the source, type, severity, assessment and search you have set. Clearing them shows everything this deployment holds.'
                      : 'Advisories reach this module by being seeded or entered by hand — no external source is configured, so nothing arrives on its own. Configure one and fetched advisories will appear here.'
                  }
                  action={
                    hasFilters ? (
                      <StateAction tone="quiet" onClick={clearFilters}>
                        Clear filters
                      </StateAction>
                    ) : undefined
                  }
                  compact
                  className="py-10"
                />
              }
            >
              <IntelFeedTable
                items={page.items}
                selectedId={selectedId}
                onSelect={(id) => selectItem(id)}
                matchCountFor={matchCountFor}
              />
            </AsyncBoundary>

            {matchIndex === null && page.items.length > 0 ? (
              <p className="border-t border-line-subtle px-5 py-3 text-xs text-fg-faint">
                The API returned only part of the match list, so match counts are not shown here.
                Open an advisory to see every match recorded against it.
              </p>
            ) : null}
          </Panel>
        </div>
      </div>

      <IntelItemDrawer
        itemId={selectedId}
        onClose={() => selectItem(null)}
        canManage={canManage}
      />
    </div>
  )
}
