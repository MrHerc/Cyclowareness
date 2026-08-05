/**
 * Reports — evidence, not a chart dump.
 *
 * Two claims are kept separate on this page, because conflating them is how a
 * security product ends up promising an auditor a file it cannot produce.
 *
 * The first is **coverage**: how many records sit behind each pack in the chosen
 * window. Those counts are computed from the same live queries the rest of the
 * product reads, so the date range genuinely scopes what is on offer rather
 * than relabelling a fixed list — move the window and the numbers move with it.
 *
 * The second is **capability**: whether this deployment can emit the pack at
 * all. Exactly one family can — the sandbox exports, which have real routes and
 * return real bytes. The rest name what is missing and link to the screen that
 * holds the records today. There is no disabled Generate button anywhere on
 * this page; a control that cannot work has no business looking like one.
 */

import { useMemo, useState } from 'react'
import { FlaskConical } from 'lucide-react'
import {
  DataSourceLabel,
  DateRangeSelector,
  SampleSizeLabel,
  defaultDateRange,
  type DateRangeValue,
} from '../components/data'
import { useLocale } from '../lib/i18n'
import { AsyncBoundary, EmptyState, SkeletonCard, SkeletonTable } from '../components/states'
import { Panel } from '../components/ui'
import { REPORT_TYPES, inRange } from '../features/reports/catalogue'
import { ReportTypeCard } from '../features/reports/ReportTypeCard'
import { SandboxExportTable } from '../features/reports/SandboxExportTable'
import {
  useDepartments,
  useIncidentRisks,
  useLoops,
  usePolicyFindings,
  useSandboxJobs,
} from '../lib/api/queries'
import { useAuth } from '../lib/auth/useAuth'
import { backingFor } from '../lib/demo/registry'
import { num } from '../lib/format'

/** A count is `null` until its query answers — never a placeholder 0. */
function countOf<T>(rows: T[] | undefined, predicate: (row: T) => boolean): number | null {
  return rows ? rows.filter(predicate).length : null
}

export default function Reports() {
  const { locale, t } = useLocale()
  const [range, setRange] = useState<DateRangeValue>(() => defaultDateRange('30d'))
  const backing = backingFor('reports')
  const { can } = useAuth()

  // Each pack's coverage is counted from the records it would be built from.
  // Nothing here is a separate "reporting" store that could drift from the
  // screens — that drift is the usual source of a report nobody can reconcile.
  //
  // Each query is gated on the permission the route behind it enforces. An
  // executive can open this page and cannot read loop runs; asking anyway would
  // spend a request to be told 403 and leave the card no better informed.
  const loops = useLoops(undefined, { enabled: can('loops.view') })
  const departments = useDepartments({ enabled: can('departments.view') })
  const findings = usePolicyFindings({ limit: 500 }, { enabled: can('policy.view') })
  const incidents = useIncidentRisks({}, { enabled: can('incident_risks.view') })
  const canReadSandbox = can('sandbox.view')
  const sandbox = useSandboxJobs({ limit: 100 }, { enabled: canReadSandbox })

  const samples = useMemo<Record<string, number | null>>(
    () => ({
      'closed-loop-evidence': countOf(
        loops.data,
        (run) => run.status === 'completed' && inRange(run.completed_at, range.from, range.to),
      ),
      'department-risk': departments.data ? departments.data.length : null,
      'policy-exposure': countOf(findings.data, (finding) =>
        inRange(finding.detected_at, range.from, range.to),
      ),
      'incident-remediation': countOf(incidents.data, (risk) =>
        inRange(risk.created_at, range.from, range.to),
      ),
    }),
    [loops.data, departments.data, findings.data, incidents.data, range.from, range.to],
  )

  // Only a settled job can be exported: a queued one has no verdict to assert.
  const exportable = useMemo(() => {
    const rows = sandbox.data ?? []
    return rows
      .filter((job) => job.status === 'completed' || job.status === 'failed')
      .filter((job) => inRange(job.completed_at ?? job.created_at, range.from, range.to))
  }, [sandbox.data, range.from, range.to])

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 max-w-3xl space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="label text-brand">Governance</p>
            <DataSourceLabel source="live" detail={backing.note} />
          </div>
          <h1 className="text-display text-fg">{t('page.reports.title')}</h1>
          <p lang={locale} className="text-body text-fg-muted">{t('page.reports.lead')}</p>
        </div>
        <DateRangeSelector
          value={range}
          onChange={setRange}
          label="Reporting window"
          className="shrink-0"
        />
      </header>

      <Panel
        tone="feature"
        title="Sandbox analysis exports"
        subtitle="The only packs this deployment generates. Each one is produced by the API from the stored analysis, in the format named on the button."
        actions={
          canReadSandbox ? (
            <SampleSizeLabel sample={exportable.length} noun="settled analyses in the window" />
          ) : null
        }
        flush
      >
        <div className="p-5 pb-0">
          <p className="text-body text-fg-muted">
            JSON carries the complete analyzer output, the score breakdown and every extracted
            indicator. STIX 2.1 carries the indicators as a bundle another tool can ingest. The PDF
            is the rendered report. All three are the stored analysis — re-running a sample is a
            separate action on the job itself.
          </p>
        </div>

        <div className="mt-4">
          {!canReadSandbox ? (
            <p className="px-5 pb-5 text-body text-fg-subtle">
              Your role cannot read sandbox analyses, so no export is offered here. An analyst can
              produce these files from the sandbox surface.
            </p>
          ) : (
          <AsyncBoundary
            isLoading={sandbox.isLoading}
            error={sandbox.data ? null : sandbox.error}
            onRetry={() => void sandbox.refetch()}
            loadingLabel="Loading sandbox analyses"
            skeleton={
              <div className="p-5 pt-0">
                <SkeletonTable rows={5} cols={5} />
              </div>
            }
            isEmpty={exportable.length === 0}
            empty={
              <div className="p-5 pt-0">
                <EmptyState
                  icon={FlaskConical}
                  headline="No settled analysis in this window"
                  description="An export becomes available once a sandbox job finishes. Widen the reporting window, or submit a file or URL to the sandbox to produce one."
                />
              </div>
            }
          >
            <SandboxExportTable jobs={exportable} />
            <p className="px-5 py-3 text-xs text-fg-faint">
              Showing {num(exportable.length)} of the {num((sandbox.data ?? []).length)} most recent
              jobs the API returns. Older analyses remain exportable from their own report page.
            </p>
          </AsyncBoundary>
          )}
        </div>
      </Panel>

      <section className="space-y-4">
        <div className="max-w-3xl">
          <h2 className="text-title text-fg">Packs this deployment cannot yet generate</h2>
          <p className="mt-1.5 text-body text-fg-muted">
            The records for each of these exist and are served by the API. What is missing is the
            route that renders them into a document. Each card names the gap rather than hiding it
            behind a button.
          </p>
        </div>

        <AsyncBoundary
          isLoading={
            loops.isLoading || departments.isLoading || findings.isLoading || incidents.isLoading
          }
          error={null}
          loadingLabel="Counting the records behind each pack"
          skeleton={
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <SkeletonCard lines={5} />
              <SkeletonCard lines={5} />
              <SkeletonCard lines={5} />
              <SkeletonCard lines={5} />
            </div>
          }
        >
          <div className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-2">
            {REPORT_TYPES.map((type) => (
              <ReportTypeCard
                key={type.id}
                type={type}
                sample={samples[type.id] ?? null}
                blocked={!can(type.permission)}
                range={range}
              />
            ))}
          </div>
        </AsyncBoundary>
      </section>
    </div>
  )
}
