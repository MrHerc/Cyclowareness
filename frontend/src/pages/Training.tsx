/**
 * The Training Studio — the analyst's content workspace.
 *
 * The list is organised by review state because that is the only question an
 * analyst opens this screen to answer: what is waiting on me. Everything else
 * is context.
 *
 * There is no "new module" button. Modules are written by the loop's conversion
 * stage from a real threat, and a studio generate control would be a second,
 * untraceable way for content to exist. The panel at the bottom says so and
 * points at the path that does work.
 */

import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { GraduationCap } from 'lucide-react'
import { useLocale } from '../lib/i18n'
import { AsyncBoundary, EmptyState, SkeletonTable } from '../components/states'
import { Button, Input, Panel, Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui'
import { ModuleTable } from '../features/training/ModuleTable'
import { GenerationNotice } from '../features/training/StudioNotices'
import { useCapabilities, useThreats, useTrainingModules } from '../lib/api/queries'
import { num } from '../lib/format'
import type { ModuleStatus, Threat, TrainingModule } from '../domain/types'

const STATUS_TABS: { value: string; label: string }[] = [
  { value: 'pending_review', label: 'Pending review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'all', label: 'All' },
]

function matches(module: TrainingModule, status: string, query: string): boolean {
  if (status !== 'all' && module.status !== (status as ModuleStatus)) return false
  if (!query) return true
  const needle = query.toLowerCase()
  return (
    module.title.toLowerCase().includes(needle) ||
    module.description.toLowerCase().includes(needle)
  )
}

export default function Training() {
  const { locale, t } = useLocale()
  const [params, setParams] = useSearchParams()
  // The whole list is fetched once so the tab counts are real rather than
  // "however many the current filter returned".
  const modules = useTrainingModules()
  const threats = useThreats()
  const capabilities = useCapabilities()

  const status = params.get('status') ?? 'pending_review'
  const query = params.get('q') ?? ''

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params)
    if (!value) next.delete(key)
    else next.set(key, value)
    setParams(next, { replace: true })
  }

  const all = useMemo(() => modules.data ?? [], [modules.data])

  const threatsById = useMemo(() => {
    const map = new Map<number, Threat>()
    for (const threat of threats.data ?? []) map.set(threat.id, threat)
    return map
  }, [threats.data])

  const counts = useMemo(() => {
    const map = new Map<string, number>([['all', all.length]])
    for (const module of all) map.set(module.status, (map.get(module.status) ?? 0) + 1)
    return map
  }, [all])

  const visible = useMemo(
    () => all.filter((module) => matches(module, status, query)),
    [all, status, query],
  )

  const modelConnected = capabilities.data
    ? capabilities.data.ai_provider === 'anthropic'
    : undefined

  return (
    <div className="space-y-6">
      <header className="max-w-3xl">
        <h1 className="text-display text-fg">{t('page.training.title')}</h1>
        <p lang={locale} className="mt-2 text-lead text-fg-muted">{t('page.training.lead')}</p>
      </header>

      {/* The review-state strip is a real tab list over the table below it. */}
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

            <Input
              label="Search modules"
              type="search"
              value={query}
              onChange={(event) => setParam('q', event.target.value)}
              placeholder="Title or description"
              className="w-64"
            />
          </div>
        </Panel>

        <TabsContent value={status} className="mt-0">
          <AsyncBoundary
            isLoading={modules.isLoading}
            error={modules.data ? null : modules.error}
            onRetry={() => void modules.refetch()}
            loadingLabel="Loading training modules"
            skeleton={<SkeletonTable rows={8} cols={6} />}
            isEmpty={visible.length === 0}
            empty={
              all.length === 0 ? (
                <EmptyState
                  icon={GraduationCap}
                  headline="No training module exists yet"
                  description="A module appears here when a loop run reaches its conversion stage and turns an analyzed threat into training. Put an artifact into Threat Intake to start one."
                  action={
                    <Button variant="secondary" asChild>
                      <Link to="/threats">Open Threat Intake</Link>
                    </Button>
                  }
                />
              ) : (
                <EmptyState
                  icon={GraduationCap}
                  headline="No module matches this view"
                  description="Change the review state or clear the search to see the modules that do exist."
                  action={
                    <Button variant="secondary" onClick={() => setParams(new URLSearchParams())}>
                      Clear filters
                    </Button>
                  }
                />
              )
            }
          >
            <Panel flush>
              <ModuleTable
                modules={visible}
                threats={threatsById}
                modelConnected={modelConnected}
              />
            </Panel>
            <p className="mt-3 text-xs text-fg-faint">
              Showing {num(visible.length)} of {num(all.length)} modules. The API returns the 100
              most recently created.
            </p>
          </AsyncBoundary>
        </TabsContent>
      </Tabs>

      <GenerationNotice />
    </div>
  )
}
