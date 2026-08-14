/**
 * Assigned training — the experience the whole loop exists to deliver.
 *
 * Four phases: lesson, quiz, result, and a review path for an assignment that
 * is already finished. The page owns exactly two pieces of state that matter —
 * which phase is on screen, and the answers — because the answers must survive
 * moving between questions and back to the lesson. Losing them would be a bug
 * the person notices and the platform never records.
 *
 * The assignment is marked in progress on arrival, not on the first click. Being
 * here IS starting it, and a status that lags what the person is actually doing
 * makes every completion-rate downstream slightly wrong.
 */

import { useT } from '../lib/i18n'
import { ResourcePanel } from '../features/training/ResourcePanel'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { AIProvenanceBadge } from '../components/data'
import { AsyncBoundary, SkeletonCard } from '../components/states'
import { Badge } from '../components/ui'
import { provenanceOf, type QuizResult } from '../domain/types'
import { ReportSuspiciousDialog } from '../features/portal/ReportSuspiciousDialog'
import { CompletedReview } from '../features/portal/training/CompletedReview'
import { LessonPhase } from '../features/portal/training/LessonPhase'
import { QuizPhase } from '../features/portal/training/QuizPhase'
import { ResultPhase } from '../features/portal/training/ResultPhase'
import { useCompleteAssignment, useStartAssignment } from '../lib/api/mutations'
import { useAssignment, useCapabilities, useModuleResources } from '../lib/api/queries'

type Phase = 'lesson' | 'quiz'

function TrainingSkeleton() {
  return (
    <div className="space-y-6">
      <SkeletonCard lines={6} />
      <SkeletonCard lines={3} />
    </div>
  )
}

export default function PortalTraining() {
  const t = useT()
  const { id } = useParams<{ id: string }>()
  const assignment = useAssignment(id)
  const capabilities = useCapabilities()

  const [phase, setPhase] = useState<Phase>('lesson')
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [result, setResult] = useState<QuizResult | null>(null)

  // Wall-clock time on the module. Started when the page mounts, which is the
  // only moment this client can honestly claim the person began.
  const openedAt = useRef(Date.now())
  const startedRef = useRef(false)

  const start = useStartAssignment()
  const complete = useCompleteAssignment({
    onSuccess: (data) => {
      setResult(data)
      setConfirmOpen(false)
    },
    // Close the confirmation on failure too: the error panel lives on the page
    // behind it, and a modal that stays up hides the reason nothing happened.
    onError: () => setConfirmOpen(false),
  })

  const detail = assignment.data ?? null
  const lessonResources = useModuleResources(detail?.module.id)
  const quiz = useMemo(() => detail?.module.quiz ?? [], [detail])

  const startMutate = start.mutate
  useEffect(() => {
    if (!detail || startedRef.current) return
    if (detail.status !== 'assigned') return
    startedRef.current = true
    startMutate(detail.id)
  }, [detail, startMutate])

  const answerList = useMemo(
    () => quiz.map((_, position) => answers[position] ?? null),
    [quiz, answers],
  )

  function handleSubmit() {
    if (!detail) return
    if (answerList.some((answer) => answer === null)) return
    complete.mutate({
      id: detail.id,
      answers: answerList as number[],
      time_spent_seconds: Math.max(1, Math.round((Date.now() - openedAt.current) / 1000)),
    })
  }

  const modelConnected = capabilities.data
    ? capabilities.data.ai_provider === 'anthropic'
    : undefined

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* This page had NO h1 at all — it opened on a back link and its first
          heading was an h2. A reader navigating by heading landed with nothing
          telling them where they were, on the one surface a non-technical
          employee actually uses.

          Visually hidden rather than drawn, because the module's own title is
          already the largest thing on the page; a second copy would be noise for
          everyone who can see it and the fix is for everyone who cannot. It
          names the module once loaded, and says what the page is before then. */}
      <h1 className="sr-only">{detail ? detail.module.title : t('u.your-training-module-2')}</h1>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/portal"
          className="inline-flex items-center gap-2 text-sm text-fg-muted hover:text-fg"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          {t('u.my-security')}
        </Link>

        {detail ? (
          <div className="flex flex-wrap items-center gap-2">
            <AIProvenanceBadge
              provenance={provenanceOf(detail.module.generation_source, {
                approved: detail.module.status === 'approved',
              })}
              generationSource={detail.module.generation_source}
              modelConnected={modelConnected}
            />
            <Badge status={result ? 'completed' : detail.status} size="sm" dot />
          </div>
        ) : null}
      </div>

      <AsyncBoundary
        isLoading={assignment.isLoading}
        error={detail ? null : assignment.error}
        onRetry={() => void assignment.refetch()}
        loadingLabel={t('x.loading-your-training-module')}
        skeleton={<TrainingSkeleton />}
      >
        {detail ? (
          result ? (
            <ResultPhase
              result={result}
              module={detail.module}
              questions={quiz}
              answers={answerList}
            />
          ) : detail.status === 'completed' || detail.status === 'expired' ? (
            <CompletedReview assignment={detail} />
          ) : phase === 'lesson' ? (
            <div className="space-y-6">
              <LessonPhase
                module={detail.module}
                questionCount={quiz.length}
                onReportConcern={() => setReportOpen(true)}
                onContinue={() => setPhase('quiz')}
              />
              {/* The LMS half of the lesson: the verified external material —
                  YouTube/Coursera courses matched to this module's channel —
                  shown to the EMPLOYEE, not only to the analyst studio. */}
              <ResourcePanel
                resources={lessonResources.data ?? []}
                isLoading={lessonResources.isLoading}
                error={lessonResources.data ? null : lessonResources.error}
                headingLevel={2}
              />
            </div>
          ) : (
            <QuizPhase
              questions={quiz}
              answers={answerList}
              index={index}
              onIndex={setIndex}
              onAnswer={(questionIndex, optionIndex) =>
                setAnswers((current) => ({ ...current, [questionIndex]: optionIndex }))
              }
              onBackToLesson={() => setPhase('lesson')}
              onSubmit={handleSubmit}
              submitting={complete.isPending}
              error={complete.error}
              confirmOpen={confirmOpen}
              onConfirmOpenChange={setConfirmOpen}
            />
          )
        ) : null}
      </AsyncBoundary>

      <ReportSuspiciousDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        modelConnected={modelConnected}
      />
    </div>
  )
}
