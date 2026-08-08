/**
 * One module: what the employee will see, and everything behind it.
 *
 * Read mode and edit mode are separate rather than an always-editable page.
 * This content is frequently sitting at the approval gate holding a loop run,
 * and an analyst reviewing it needs to read exactly what an employee will read
 * — not a form that happens to contain the same words.
 *
 * The gating run is resolved from the approval queue, which is the only list
 * that joins a module to the run waiting on it.
 */

import { useT } from '../lib/i18n'
import { useMemo, useState } from 'react'
import { ArrowLeft, PenLine } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { AsyncBoundary, SkeletonCard, SkeletonText } from '../components/states'
import { Badge, Button, Panel } from '../components/ui'
import { ModuleEditor } from '../features/training/ModuleEditor'
import { ModuleMetaPanel } from '../features/training/ModuleMetaPanel'
import { ModuleReader } from '../features/training/ModuleReader'
import { ResourcePanel } from '../features/training/ResourcePanel'
import { GenerationNotice, VersionHistoryNotice } from '../features/training/StudioNotices'
import {
  useApprovalQueue,
  useCapabilities,
  useModuleResources,
  useThreat,
  useTrainingModule,
} from '../lib/api/queries'
import { usePermission } from '../lib/auth/useAuth'

export default function TrainingDetail() {
  const t = useT()
  const { id } = useParams<{ id: string }>()
  const [editing, setEditing] = useState(false)
  const canAuthor = usePermission('training.author')

  const module = useTrainingModule(id)
  const capabilities = useCapabilities()
  const data = module.data

  // The module record has no run pointer; the queue is where the join lives.
  const queue = useApprovalQueue()
  const moduleResources = useModuleResources(id)
  const threat = useThreat(data?.threat_id ?? undefined)

  const gateRunId = useMemo(() => {
    if (!data) return null
    const item = (queue.data ?? []).find((entry) => entry.module_id === data.id)
    return item ? item.run_id : null
  }, [queue.data, data])

  const modelConnected = capabilities.data
    ? capabilities.data.ai_provider === 'anthropic'
    : undefined

  return (
    <div className="space-y-6">
      <Link
        to="/training"
        className="inline-flex items-center gap-1.5 text-sm text-fg-subtle hover:text-fg"
      >
        <ArrowLeft className="size-3.5 shrink-0" aria-hidden="true" />
        {t('u.training-studio')}
      </Link>

      <AsyncBoundary
        isLoading={module.isLoading}
        error={data ? null : module.error}
        onRetry={() => void module.refetch()}
        loadingLabel={t('x.loading-training-module')}
        skeleton={
          <div className="space-y-6">
            <SkeletonText lines={2} />
            <SkeletonCard lines={5} />
            <SkeletonCard lines={4} />
          </div>
        }
      >
        {data ? (
          <div className="space-y-6">
            <header className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-display text-fg">{data.title}</h1>
                  <Badge status={data.status} dot />
                </div>
                <p className="mt-2 max-w-2xl text-sm text-fg-subtle">
                  {editing
                    ? t('p.you-are-editing-the-content-an')
                    : t('p.this-is-the-module-exactly-as')}
                </p>
              </div>
              {canAuthor && !editing ? (
                <Button
                  variant="primary"
                  onClick={() => setEditing(true)}
                  icon={<PenLine className="size-4" aria-hidden="true" />}
                >
                  {t('u.edit-module')}
                </Button>
              ) : null}
            </header>

            {editing ? (
              <ModuleEditor
                module={data}
                onSaved={() => setEditing(false)}
                onCancel={() => setEditing(false)}
              />
            ) : (
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
                <div className="min-w-0 space-y-6">
                  <ModuleReader module={data} />

                  {/* Matched on the module's CHANNEL — the one the loop set from
                      the real threat this was built from — so a person who fell
                      for a QR lure is offered material about QR lures. Nothing
                      here is inferred from the module's prose: a confident wrong
                      match sends somebody to a video about a different attack. */}
                  <ResourcePanel
                    resources={moduleResources.data ?? []}
                    isLoading={moduleResources.isLoading}
                    error={moduleResources.data ? null : moduleResources.error}
                    headingLevel={2}
                  />
                </div>

                <div className="min-w-0 space-y-6">
                  <ModuleMetaPanel
                    module={data}
                    threat={threat.data ?? null}
                    gateLoading={queue.isLoading}
                    gateRunId={gateRunId}
                    modelConnected={modelConnected}
                  />
                  <VersionHistoryNotice />
                  {!canAuthor ? (
                    <Panel title={t('x.editing')} headingLevel={2}>
                      <p className="text-body text-fg-muted">{t('p.your-role-can-read-this-module')}</p>
                    </Panel>
                  ) : null}
                  <GenerationNotice />
                </div>
              </div>
            )}
          </div>
        ) : null}
      </AsyncBoundary>
    </div>
  )
}
