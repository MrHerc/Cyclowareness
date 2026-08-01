/**
 * The curated feed: real-world items an analyst can put into stage 1.
 *
 * Nothing here was measured by this deployment, so every card carries an
 * external-source label and the indicators are shown defanged. A feed item is a
 * claim by somebody else until an analyst decides it is relevant to this
 * organisation — which is what the push control is, and why it is the only
 * control on the card.
 *
 * `pushed_to_loop` is the server's own flag. A second push answers 409, so the
 * button states that it has already been used rather than offering a click that
 * cannot work.
 */

import { useState } from 'react'
import { CheckCircle2, ListFilter, Rss } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { DataSourceLabel } from '../../components/data'
import { AsyncBoundary, EmptyState, SkeletonCard } from '../../components/states'
import { Badge, Button, Panel, Select, useToast } from '../../components/ui'
import type { FeedItem } from '../../domain/types'
import { useFeed } from '../../lib/api/queries'
import { usePermission } from '../../lib/auth/AuthProvider'
import { defang, formatDate, humanise } from '../../lib/format'
import { ALL, matchesQuery, matchesValue, SEVERITY_OPTIONS, useUrlParam } from './filters'
import { usePushFeedItemToLoop } from './hooks'
import { ActionError, ArtifactTypeTag } from './IntakeAtoms'

export interface IntelFeedListProps {
  query: string
  artifactType: string
}

/** The first few indicators, defanged. The full set lands on the threat record. */
function indicatorPreview(iocs: Record<string, string[]>): { label: string; values: string[] }[] {
  return Object.entries(iocs ?? {})
    .filter(([, values]) => Array.isArray(values) && values.length > 0)
    .map(([key, values]) => ({ label: humanise(key), values: values.slice(0, 3) }))
}

export function IntelFeedList({ query, artifactType }: IntelFeedListProps) {
  const navigate = useNavigate()
  const toast = useToast()
  const canAct = usePermission('threats.submit')
  const [severity, setSeverity] = useUrlParam('sev', ALL)
  const [failedId, setFailedId] = useState<number | null>(null)

  const feed = useFeed()
  const push = usePushFeedItemToLoop()

  const all = feed.data ?? []
  const visible = all.filter(
    (item) =>
      matchesValue(severity, item.severity) &&
      matchesValue(artifactType, item.artifact_type) &&
      matchesQuery(query, [item.title, item.summary, item.threat_type, item.source_name]),
  )

  function handlePush(item: FeedItem) {
    setFailedId(null)
    push.mutate(item.id, {
      onSuccess: (data) => {
        toast.show({
          title: `Loop run ${data.loop_run_id} started`,
          description: `"${item.title}" is now a threat record and is being analysed.`,
          tone: 'success',
        })
        navigate(`/loops/${data.loop_run_id}`)
      },
      onError: (error) => {
        setFailedId(item.id)
        toast.show({ title: 'The feed item was not pushed', description: error.message, tone: 'error' })
      },
    })
  }

  return (
    <Panel
      title="Curated intel feed"
      subtitle="Real-world items an analyst can push into stage 1 of the loop."
      actions={
        <Select
          label="Severity"
          labelHidden
          options={SEVERITY_OPTIONS}
          value={severity}
          onValueChange={setSeverity}
          className="w-44"
        />
      }
    >
      <AsyncBoundary
        isLoading={feed.isLoading}
        error={feed.data ? null : feed.error}
        onRetry={() => void feed.refetch()}
        loadingLabel="Loading the curated feed"
        skeleton={
          <div className="space-y-3">
            <SkeletonCard lines={2} />
            <SkeletonCard lines={2} />
          </div>
        }
        isEmpty={visible.length === 0}
        empty={
          all.length === 0 ? (
            <EmptyState
              compact
              icon={Rss}
              headline="The curated feed is empty"
              description="This feed is filled by the platform, not by an external subscription. When it holds items, an analyst can push any of them into the loop from here."
            />
          ) : (
            <EmptyState
              compact
              icon={ListFilter}
              headline="No feed item matches these filters"
              description={`${all.length} item${all.length === 1 ? ' is' : 's are'} in the feed. Clear the severity, type or search filter to see them.`}
            />
          )
        }
      >
        <ul className="space-y-3">
          {visible.map((item) => {
            const indicators = indicatorPreview(item.iocs)
            const busy = push.isPending && push.variables === item.id
            return (
              <li
                key={item.id}
                className="rounded-panel border border-line-subtle bg-elevated p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-h text-fg">{item.title}</h3>
                    <p className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm text-fg-subtle">
                      <DataSourceLabel source="external" detail={item.source_name} />
                      <span aria-hidden="true" className="text-fg-faint">
                        ·
                      </span>
                      <time dateTime={item.published_at}>{formatDate(item.published_at)}</time>
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <Badge status={item.severity} size="sm" />
                    <ArtifactTypeTag type={item.artifact_type} />
                  </div>
                </div>

                <p className="mt-3 text-body text-fg-muted">{item.summary}</p>

                <p className="mt-2 text-sm text-fg-subtle">{humanise(item.threat_type)}</p>

                {indicators.length > 0 ? (
                  <dl className="mt-3 space-y-1">
                    {indicators.map((group) => (
                      <div key={group.label} className="flex flex-wrap gap-x-2 gap-y-1">
                        <dt className="text-xs text-fg-faint">{group.label}</dt>
                        <dd className="tech min-w-0 break-all text-fg-muted">
                          {group.values.map((value) => defang(value)).join('  ')}
                        </dd>
                      </div>
                    ))}
                  </dl>
                ) : null}

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {item.pushed_to_loop ? (
                    <span className="inline-flex items-center gap-1.5 text-sm text-safe">
                      <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
                      Already pushed into the loop
                    </span>
                  ) : canAct ? (
                    <Button variant="secondary" size="sm" loading={busy} onClick={() => handlePush(item)}>
                      Push into stage 1
                    </Button>
                  ) : (
                    <p className="text-sm text-fg-faint">
                      Pushing a feed item into the loop requires the analyst role.
                    </p>
                  )}
                </div>

                {failedId === item.id ? <ActionError error={push.error} className="mt-2" /> : null}
              </li>
            )
          })}
        </ul>
      </AsyncBoundary>
    </Panel>
  )
}
