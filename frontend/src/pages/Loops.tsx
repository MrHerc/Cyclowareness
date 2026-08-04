/**
 * Closed Loops — every threat travelling the seven stages.
 *
 * Filters live in the URL rather than in component state. Two reasons: the
 * Command Center links here with `?stage=4` when someone clicks a stage node,
 * and an analyst who has narrowed the list to the three failed runs needs to be
 * able to paste that view into a chat message.
 */

import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Radar } from 'lucide-react'
import { useT } from '../lib/i18n'
import { DataSourceLabel, LastUpdated } from '../components/data'
import { AsyncBoundary, EmptyState, SkeletonTable } from '../components/states'
import { Button, Panel } from '../components/ui'
import { LoopsFilters } from '../features/loops/LoopsFilters'
import { LoopsTable } from '../features/loops/LoopsTable'
import { applyFilters, isStatusFilter, parseStage, stageLabel } from '../features/loops/filters'
import type { StatusFilter } from '../features/loops/filters'
import { useLoops } from '../lib/api/queries'

export default function Loops() {
  const t = useT()
  const [params, setParams] = useSearchParams()

  const statusParam = params.get('status')
  const status: StatusFilter = isStatusFilter(statusParam) ? statusParam : 'all'
  const stage = parseStage(params.get('stage'))
  const query = params.get('q') ?? ''

  const runs = useLoops(status === 'all' ? undefined : status)

  const loaded = useMemo(() => runs.data ?? [], [runs.data])
  const visible = useMemo(() => applyFilters(loaded, { stage, query }), [loaded, stage, query])

  /** One writer for the query string, so a filter change never drops another. */
  const patch = (next: Record<string, string | null>) => {
    const merged = new URLSearchParams(params)
    for (const [key, value] of Object.entries(next)) {
      if (value === null || value === '') merged.delete(key)
      else merged.set(key, value)
    }
    // Replace rather than push: typing six characters into the search box must
    // not put six entries between the analyst and the back button.
    setParams(merged, { replace: true })
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-title text-fg">{t('page.loops.title')}</h1>
          <p className="mt-1 max-w-2xl text-body text-fg-muted">
            Every threat that entered Cyclowareness, and exactly how far around the seven stages it
            has travelled. Nothing here advances past stage three without a human decision.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <DataSourceLabel source="live" detail="Loop run records" />
          <LastUpdated at={runs.dataUpdatedAt ? new Date(runs.dataUpdatedAt).toISOString() : null} />
        </div>
      </header>

      <LoopsFilters
        status={status}
        onStatusChange={(next) => patch({ status: next === 'all' ? null : next })}
        stage={stage}
        onStageChange={(next) => patch({ stage: next === null ? null : String(next) })}
        query={query}
        onQueryChange={(next) => patch({ q: next })}
        shown={visible.length}
        total={loaded.length}
        onClear={() => patch({ status: null, stage: null, q: null })}
      />

      <AsyncBoundary
        isLoading={runs.isLoading}
        // A failed background poll must not replace a list that is still on screen.
        error={runs.data ? null : runs.error}
        onRetry={() => void runs.refetch()}
        loadingLabel="Loading loop runs"
        skeleton={<SkeletonTable rows={8} cols={8} />}
        isEmpty={visible.length === 0}
        empty={
          loaded.length === 0 ? (
            <EmptyState
              icon={Radar}
              headline="No loop runs yet"
              description="A run appears here the moment a threat is submitted, pushed from the curated feed, or promoted from an employee report. Each one then carries its own record of the seven stages."
              action={
                <Button asChild variant="primary">
                  <Link to="/threats">Go to threat intake</Link>
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={Radar}
              headline="No run matches these filters"
              description={`${loaded.length} run${loaded.length === 1 ? '' : 's'} loaded, but none is ${
                stage === null ? 'a match' : `sitting at ${stageLabel(stage)}`
              } for the current search. Widen the filters to see the rest.`}
              action={
                <Button variant="secondary" onClick={() => patch({ status: null, stage: null, q: null })}>
                  Clear filters
                </Button>
              }
            />
          )
        }
      >
        <Panel flush>
          <LoopsTable runs={visible} />
        </Panel>
      </AsyncBoundary>
    </div>
  )
}
