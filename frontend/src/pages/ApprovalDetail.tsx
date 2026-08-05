/**
 * The approval workspace: threat, generated training, and the decision.
 *
 * Composition only. The page owns the two queries, the two mutations and the
 * editor's draft state; the three columns are presentation and receive
 * everything as props.
 *
 * The run's state is stated at the top and repeated in the decision panel,
 * because the single most dangerous thing this screen could do is let somebody
 * believe they are approving something that was decided ten minutes ago by
 * a colleague.
 */

import { useT } from '../lib/i18n'
import { ArrowLeft, Clock } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AsyncBoundary, EmptyState, Skeleton, SkeletonCard, SkeletonText } from '../components/states'
import { Badge, Panel, Separator, Tooltip, TONE_TEXT } from '../components/ui'
import { LoopStatusBadge } from '../components/loop'
import { AudiencePanel } from '../features/approvals/AudiencePanel'
import { adaptDetail } from '../features/approvals/contract'
import { waitLabel, waitTone } from '../features/approvals/wait'
import { DecisionPanel, type DecisionKind } from '../features/approvals/DecisionPanel'
import { clearDraft, editsDiffer, editsFrom, readDraft, writeDraft, type ModuleEdits } from '../features/approvals/draft'
import { HistoryTimeline } from '../features/approvals/HistoryTimeline'
import { ModuleEditor } from '../features/approvals/ModuleEditor'
import { SafetyPanel } from '../features/approvals/SafetyPanel'
import { ThreatPanel } from '../features/approvals/ThreatPanel'
import { TrainingPreview } from '../features/approvals/TrainingPreview'
import { useApprovalHistory } from '../features/approvals/useApprovalHistory'
import { provenanceOf, type LoopStatus } from '../domain/types'
import { ApiError } from '../lib/api/client'
import { useApprovalDecision, useUpdateModule } from '../lib/api/mutations'
import { useApproval, useCapabilities } from '../lib/api/queries'
import { usePermission } from '../lib/auth/useAuth'
import { cn, formatDateTime } from '../lib/format'

const LOOP_STATUSES: readonly string[] = [
  'running',
  'awaiting_approval',
  'awaiting_training',
  'completed',
  'failed',
]

function messageFrom(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message
  return fallback
}

function detailFrom(result: unknown, fallback: string): string {
  const detail = (result as { detail?: unknown } | null)?.detail
  return typeof detail === 'string' && detail !== '' ? detail : fallback
}

function WorkspaceSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,20rem)_minmax(0,1fr)_minmax(0,22rem)]">
      <SkeletonCard lines={6} />
      <div className="space-y-4">
        <Skeleton className="h-9 w-64" />
        <SkeletonText lines={8} />
      </div>
      <SkeletonCard lines={6} />
    </div>
  )
}

export default function ApprovalDetail() {
  const { id } = useParams<{ id: string }>()
  const runId = id ?? ''

  // Keyed, and not incidentally: react-router reuses this element when the id
  // changes, and the workspace holds a comment, a restored draft and unsaved
  // module edits. Without a remount, run 2 opens carrying run 1's edits.
  return <Workspace key={runId} runId={runId} />
}

function Workspace({ runId }: { runId: string }) {
  const t = useT()
  const approval = useApproval(runId)
  const history = useApprovalHistory(runId)
  const capabilities = useCapabilities()
  const canDecide = usePermission('approvals.decide')

  const decision = useApprovalDecision()
  const updateModule = useUpdateModule()

  const detail = useMemo(() => (approval.data ? adaptDetail(approval.data) : null), [approval.data])
  const module = detail?.module ?? null

  /* --- the editor's state ------------------------------------------------
     Restored once, from this browser's draft if there is one. `readDraft` runs
     inside the initialiser so a poll never resurrects a discarded draft. */
  const [draft] = useState(() => (runId ? readDraft(runId) : null))
  const [comment, setComment] = useState(draft?.comment ?? '')
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(draft?.savedAt ?? null)
  const [edits, setEdits] = useState<ModuleEdits | null>(draft?.edits ?? null)
  const [syncedModuleId, setSyncedModuleId] = useState<number | null>(null)
  const [editing, setEditing] = useState(false)
  const [editedThisSession, setEditedThisSession] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  // Kept apart so a refused save is reported in the editor and a refused
  // decision in the decision panel, rather than both showing the same sentence.
  const [saveError, setSaveError] = useState<string | null>(null)
  const [decisionError, setDecisionError] = useState<string | null>(null)

  const baseline = useMemo(() => (module ? editsFrom(module) : null), [module])

  // Adjusting state while rendering, rather than in an effect: the module
  // arrives after the first paint, and an effect would render one frame of an
  // empty editor over content that is already known.
  if (module && syncedModuleId !== module.id) {
    setSyncedModuleId(module.id)
    if (!edits) setEdits(baseline)
  }

  const dirty = Boolean(edits && baseline && editsDiffer(edits, baseline))
  const busy = decision.isPending || updateModule.isPending

  const provenance = module
    ? provenanceOf(module.generation_source, {
        approved: module.status === 'approved',
        edited: dirty || editedThisSession,
      })
    : 'unknown'

  const modelConnected = capabilities.data ? capabilities.data.ai_provider === 'anthropic' : undefined

  async function saveModule(): Promise<boolean> {
    if (!module || !edits) return false
    setSaveError(null)
    try {
      await updateModule.mutateAsync({
        id: module.id,
        body: {
          title: edits.title,
          description: edits.description,
          content: edits.content,
          quiz: edits.quiz,
          takeaway: edits.takeaway,
        },
      })
      setEditedThisSession(true)
      setEditing(false)
      return true
    } catch (caught) {
      setSaveError(messageFrom(caught, 'The module could not be saved.'))
      return false
    }
  }

  async function onDecide(kind: DecisionKind) {
    setDecisionError(null)
    setResult(null)

    if (kind === 'approve_with_edits' && !(await saveModule())) return

    const body =
      kind === 'reject'
        ? { decision: 'reject' as const, comment }
        : kind === 'request_revision'
          ? { decision: 'request_revision' as const, comment }
          : kind === 'second_approval'
            ? { decision: 'approve' as const, comment, require_second_approval: true }
            : { decision: 'approve' as const, comment }

    try {
      const outcome = await decision.mutateAsync({ runId, ...body })
      setResult(detailFrom(outcome, 'The decision was recorded.'))
      clearDraft(runId)
      setDraftSavedAt(null)
      void history.refetch()
    } catch (caught) {
      setDecisionError(messageFrom(caught, 'The decision could not be recorded.'))
    }
  }

  const revisionRequested =
    detail?.awaitingApproval === true &&
    history.data !== undefined &&
    history.data.length > 0 &&
    history.data[history.data.length - 1]?.action === 'request_revision'

  return (
    <div className="space-y-5">
      <Link
        to="/approvals"
        className="inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-brand"
      >
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        Approval gate
      </Link>

      <AsyncBoundary
        isLoading={approval.isLoading}
        error={approval.data ? null : approval.error}
        onRetry={approval.error?.retryable ? () => void approval.refetch() : undefined}
        loadingLabel={t('x.loading-the-approval-workspace')}
        skeleton={<WorkspaceSkeleton />}
      >
        {detail === null ? (
          <EmptyState
            headline="This run could not be loaded"
            description={t('x.the-approval-workspace-needs-a')}
          />
        ) : (
          <div className="space-y-5">
            <header className="space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 space-y-1">
                  <h1 className="text-title text-fg">
                    {detail.threat?.title ?? `Loop run ${detail.runId}`}
                  </h1>
                  <p className="text-sm text-fg-subtle">
                    <span className="tech">Run {detail.runId}</span>
                    {detail.createdAt ? ` · reached the gate ${formatDateTime(detail.createdAt)}` : ''}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {detail.severity && (
                    <Tooltip content={detail.severityBasis ?? 'Derived from the analyser verdict.'}>
                      <Badge status={detail.severity} dot />
                    </Tooltip>
                  )}
                  {detail.runStatus && LOOP_STATUSES.includes(detail.runStatus) ? (
                    <LoopStatusBadge status={detail.runStatus as LoopStatus} />
                  ) : (
                    detail.runStatus && <Badge status={detail.runStatus} dot />
                  )}
                  {detail.waitingSeconds !== null && (
                    <span
                      className={cn(
                        'inline-flex items-center gap-1.5 text-sm',
                        TONE_TEXT[waitTone(detail.waitingSeconds)],
                      )}
                    >
                      <Clock className="size-3.5" aria-hidden="true" />
                      waiting {waitLabel(detail.waitingSeconds)}
                    </span>
                  )}
                </div>
              </div>

              <Panel tone={detail.awaitingApproval ? 'feature' : 'quiet'} className="px-5 py-3">
                <p className="text-body text-fg-muted">
                  {detail.awaitingApproval ? (
                    revisionRequested ? (
                      <>
                        <span className="text-medium">Revision requested.</span> The run is still at
                        the gate and the module is unchanged. Edit the content and decide again.
                      </>
                    ) : detail.secondApproval.held ? (
                      <>
                        <span className="text-brand">Held for a second approver.</span> An
                        endorsement is recorded and the loop has not advanced. A different person
                        must approve it.
                      </>
                    ) : (
                      <>
                        <span className="text-brand">Awaiting approval.</span> This run is stopped
                        between conversion and targeting. Nothing has been assigned to anyone.
                      </>
                    )
                  ) : (
                    <>
                      <span className="text-fg">This run has already left the gate.</span> Its status
                      is {detail.runStatus ?? 'unknown'}. The workspace below is the record of what
                      was reviewed, and no decision can be recorded against it.
                    </>
                  )}
                </p>
              </Panel>
            </header>

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,20rem)_minmax(0,1fr)_minmax(0,22rem)]">
              <div className="min-w-0">
                <ThreatPanel detail={detail} />
              </div>

              <div className="min-w-0 space-y-5">
                {editing && edits ? (
                  <ModuleEditor
                    value={edits}
                    onChange={setEdits}
                    onSave={() => void saveModule()}
                    onCancel={() => {
                      setEdits(baseline)
                      setSaveError(null)
                      setEditing(false)
                    }}
                    saving={updateModule.isPending}
                    error={saveError}
                    dirty={dirty}
                  />
                ) : (
                  <TrainingPreview
                    module={module}
                    edits={edits}
                    provenance={provenance}
                    modelConnected={modelConnected}
                    generationLabel={detail.generationLabel}
                    dirty={dirty}
                    onEdit={
                      canDecide && detail.awaitingApproval && module ? () => setEditing(true) : null
                    }
                  />
                )}

                <HistoryTimeline entries={history.data ?? []} loading={history.isLoading} />
              </div>

              <div className="min-w-0 space-y-5 xl:sticky xl:top-[4.75rem] xl:self-start">
                <DecisionPanel
                  awaitingApproval={detail.awaitingApproval}
                  canDecide={canDecide}
                  audienceCount={detail.audience.length}
                  hasModule={module !== null}
                  dirty={dirty}
                  failedChecks={detail.safety.failed}
                  comment={comment}
                  onCommentChange={setComment}
                  onDecide={(kind) => void onDecide(kind)}
                  busy={busy}
                  result={result}
                  error={decisionError ?? saveError}
                  draftSavedAt={draftSavedAt}
                  onSaveDraft={() =>
                    setDraftSavedAt(writeDraft(runId, { comment, edits: dirty ? edits : null }))
                  }
                  onDiscardDraft={() => {
                    clearDraft(runId)
                    setDraftSavedAt(null)
                  }}
                />

                <SafetyPanel
                  safety={detail.safety}
                  provenance={provenance}
                  generationSource={module?.generation_source ?? null}
                  generationLabel={detail.generationLabel}
                  modelConnected={modelConnected}
                  secondApproval={detail.secondApproval}
                />

                <Separator fade className="xl:hidden" />

                <AudiencePanel members={detail.audience} targetingNote={detail.targetingNote} />
              </div>
            </div>
          </div>
        )}
      </AsyncBoundary>
    </div>
  )
}
