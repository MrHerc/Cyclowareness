/**
 * One sandbox job, in full.
 *
 * The order of this page is an argument: the verdict, then what ran and what did
 * not, then every observation, then the arithmetic. A reader who stops half-way
 * has still been told the blind spot before they have been told the findings —
 * which is the opposite of how a scanner usually presents itself.
 *
 * Composition only. The hooks live here; everything that draws lives in
 * `features/sandbox/`.
 */

import { ArrowLeft } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import type { SandboxJobDetail } from '../domain/types'
import { AnalyzerDetail } from '../features/sandbox/AnalyzerDetail'
import { ArchiveChildren } from '../features/sandbox/ArchiveChildren'
import { FeedbackPanel } from '../features/sandbox/FeedbackPanel'
import { IocPanel } from '../features/sandbox/IocPanel'
import { FailurePanel, PasswordPrompt, ProgressPanel } from '../features/sandbox/JobStatePanels'
import { JobToolbar } from '../features/sandbox/JobToolbar'
import { ScoreBreakdownPanel } from '../features/sandbox/ScoreBreakdownPanel'
import { SignalList } from '../features/sandbox/SignalList'
import { TierStatement } from '../features/sandbox/TierStatement'
import { TopReasons } from '../features/sandbox/TopReasons'
import { VerdictHeader } from '../features/sandbox/VerdictHeader'
import { collectSignals } from '../features/sandbox/shared'
import { AsyncBoundary, SkeletonCard } from '../components/states'
import { useSandboxJob } from '../lib/api/queries'

export default function SandboxDetail() {
  const { id } = useParams<{ id: string }>()
  const query = useSandboxJob(id)
  const job = query.data

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link
        to="/sandbox"
        className="inline-flex items-center gap-1.5 text-sm text-fg-subtle hover:text-fg"
      >
        <ArrowLeft className="size-4" aria-hidden="true" strokeWidth={1.75} />
        Back to submissions
      </Link>

      <AsyncBoundary
        isLoading={query.isLoading}
        error={job ? null : query.error}
        onRetry={() => void query.refetch()}
        loadingLabel="Loading the analysis report"
        skeleton={
          <div className="space-y-6">
            <SkeletonCard metric lines={5} />
            <SkeletonCard lines={4} />
            <SkeletonCard lines={6} />
          </div>
        }
      >
        {job ? <Report job={job} /> : null}
      </AsyncBoundary>
    </div>
  )
}

function Report({ job }: { job: SandboxJobDetail }) {
  const completed = job.status === 'completed'
  const signals = collectSignals(job.analysis)
  // A job created before the scoring stage carries an empty breakdown object,
  // not a zeroed one. Rendering the arithmetic of a score that was never
  // computed would invent the one number this page exists to justify.
  const hasBreakdown = Boolean(job.score_breakdown && Object.keys(job.score_breakdown).length > 0)

  return (
    <div className="space-y-6">
      <VerdictHeader job={job} />
      <JobToolbar job={job} />

      {job.status === 'queued' || job.status === 'running' ? <ProgressPanel job={job} /> : null}
      {job.status === 'awaiting_password' ? <PasswordPrompt job={job} /> : null}
      {job.status === 'failed' ? <FailurePanel job={job} /> : null}

      {completed ? (
        <>
          {hasBreakdown ? <TopReasons reasons={job.score_breakdown.top_reasons} /> : null}
          <TierStatement tiers={job.tiers} />
          <SignalList signals={signals} />
          {hasBreakdown ? (
            <ScoreBreakdownPanel
              breakdown={job.score_breakdown}
              ruleScore={job.rule_score}
              modelScore={job.ai_score}
              finalScore={job.final_score}
            />
          ) : null}
          <IocPanel iocs={job.iocs} />
          <AnalyzerDetail analysis={job.analysis} />
          {job.children.length > 0 ? <ArchiveChildren members={job.children} /> : null}
          <FeedbackPanel job={job} />
        </>
      ) : null}
    </div>
  )
}
