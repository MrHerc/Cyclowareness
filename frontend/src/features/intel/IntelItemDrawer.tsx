/**
 * One advisory, answering the five questions this screen exists to ask.
 *
 * The order is deliberate and never changes: why it matters to us, what of ours
 * it touches, which policy it touches, who is exposed, and what to do about it.
 * The publisher's own material — indicators, references, techniques — comes
 * last, because it is the appendix to that argument rather than the argument.
 */

import { CalendarClock } from 'lucide-react'
import { DataSourceLabel, NoMeasurement } from '../../components/data'
import { AsyncBoundary, Skeleton } from '../../components/states'
import { Badge, Drawer } from '../../components/ui'
import { formatDate, num, timeAgo } from '../../lib/format'
import { useDepartments, useEmployees, useIntelItem } from '../../lib/api/queries'
import { IntelActions } from './IntelActions'
import { IntelAdvisoryContent } from './IntelAdvisoryContent'
import { IntelMatchAnswers } from './IntelMatchAnswers'
import { RELEVANCE_LABEL, SOURCE_LABEL, TYPE_LABEL } from './vocabulary'

export interface IntelItemDrawerProps {
  itemId: number | null
  onClose: () => void
  canManage: boolean
}

export function IntelItemDrawer({ itemId, onClose, canManage }: IntelItemDrawerProps) {
  const open = itemId !== null
  const query = useIntelItem(itemId ?? undefined)
  // The roster is only needed to name the people a match already identified.
  const departments = useDepartments({ enabled: open })
  const employees = useEmployees({}, { enabled: open })

  const item = query.data

  return (
    <Drawer
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
      size="lg"
      title={item?.external_id?.trim() || item?.title || 'Advisory'}
      description={
        item ? `${SOURCE_LABEL[item.source] ?? item.source} · ${TYPE_LABEL[item.intel_type] ?? item.intel_type}` : undefined
      }
    >
      <AsyncBoundary
        isLoading={query.isLoading}
        error={item ? null : query.error}
        onRetry={() => void query.refetch()}
        loadingLabel="Loading the advisory"
        skeleton={
          <div className="space-y-4">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-5/6" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        }
      >
        {item ? (
          <article className="space-y-5">
            <header className="space-y-3">
              <h2 className="text-title text-fg">{item.title}</h2>

              <div className="flex flex-wrap items-center gap-2">
                <Badge status={item.severity} dot />
                {item.dismissed_by ? (
                  <Badge status="dismissed" />
                ) : (
                  <Badge status={item.relevance}>
                    {RELEVANCE_LABEL[item.relevance] ?? item.relevance}
                  </Badge>
                )}
                <span className="text-sm text-fg-subtle">
                  {item.cvss_score === null || item.cvss_score === undefined ? (
                    <NoMeasurement
                      label="CVSS not scored"
                      reason="The publisher did not attach a CVSS score."
                    />
                  ) : (
                    <>
                      CVSS <span className="tech text-fg">{num(item.cvss_score, 1)}</span>
                    </>
                  )}
                </span>
              </div>

              {item.cvss_vector?.trim() ? (
                <p className="tech text-fg-faint">{item.cvss_vector}</p>
              ) : null}

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                <span className="inline-flex items-center gap-1.5 text-xs text-fg-faint">
                  <CalendarClock className="size-3.5 shrink-0" aria-hidden="true" />
                  Published {formatDate(item.published_at)} · {timeAgo(item.published_at)}
                </span>
                <DataSourceLabel
                  source="external"
                  detail={item.source_name?.trim() || SOURCE_LABEL[item.source] || item.source}
                />
              </div>

              <p className="text-body leading-relaxed text-fg-muted">
                {item.summary?.trim() || 'The source published no summary with this advisory.'}
              </p>
            </header>

            <IntelMatchAnswers
              item={item}
              departments={departments.data}
              employees={employees.data}
            />

            <IntelActions item={item} canManage={canManage} />

            <IntelAdvisoryContent item={item} />
          </article>
        ) : null}
      </AsyncBoundary>
    </Drawer>
  )
}
