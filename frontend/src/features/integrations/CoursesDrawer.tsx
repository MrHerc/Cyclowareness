/**
 * The catalogue as last imported — with the reason it looks the way it does.
 *
 * The dangerous case here is the one that looks fine: a short list left behind
 * by a partial sync renders exactly like a complete small catalogue. The API
 * writes a sentence per sync state saying which of the two this is, and that
 * sentence is printed verbatim at the top rather than being summarised into a
 * count. Two courses out of eleven is not a catalogue.
 */

import { useT } from '../../lib/i18n'
import { useMemo, useState } from 'react'
import { BookOpen, Tag } from 'lucide-react'
import { AsyncBoundary, EmptyState, SkeletonRow } from '../../components/states'
import { Badge, Button, Drawer, Input } from '../../components/ui'
import type { ExternalCourse, Integration } from '../../domain/types'
import { useExternalCourses } from '../../lib/api/queries'
import { usePermission } from '../../lib/auth/useAuth'
import { duration, humanise, num, timeAgo } from '../../lib/format'
import { coursePageOf } from './data'
import { MapCourseDialog } from './MapCourseDialog'

export interface CoursesDrawerProps {
  integration: Integration | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CoursesDrawer({ integration, open, onOpenChange }: CoursesDrawerProps) {
  const t = useT()
  const canManage = usePermission('integrations.manage')
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<ExternalCourse | null>(null)

  const courses = useExternalCourses(open && integration ? integration.id : undefined)
  const page = useMemo(() => coursePageOf(courses.data as unknown), [courses.data])

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return page.items
    return page.items.filter(
      (course) =>
        course.title.toLowerCase().includes(needle) ||
        (course.description ?? '').toLowerCase().includes(needle) ||
        course.topics.some((topic) => topic.toLowerCase().includes(needle)) ||
        course.mapped_behaviors.some((behaviour) => behaviour.toLowerCase().includes(needle)),
    )
  }, [page.items, query])

  const vocabulary = useMemo(
    () => [...new Set(page.items.flatMap((course) => course.mapped_behaviors))],
    [page.items],
  )

  const mapped = page.items.filter((course) => course.mapped_behaviors.length > 0).length

  return (
    <>
      <Drawer
        title={integration ? `${integration.display_name} courses` : 'Courses'}
        description={t('x.what-this-connection-has-mirrored')}
        open={open}
        onOpenChange={onOpenChange}
        side="right"
        size="lg"
      >
        <div className="space-y-4">
          {page.note ? (
            <p className="rounded-control border border-line bg-base px-3 py-2.5 text-sm text-fg-muted">
              {page.note}
            </p>
          ) : null}

          <div className="flex flex-wrap items-end justify-between gap-3">
            <p className="text-sm text-fg-subtle">
              {num(mapped)} of {num(page.items.length)} shown courses carry a behaviour mapping.
              {page.truncated ? ` The API returned ${num(page.items.length)} of ${num(page.total)}.` : ''}
            </p>
            <Input
              label={t('p.search-courses')}
              labelHidden
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('p.title-topic-or-behaviour')}
              className="w-56"
            />
          </div>

          <AsyncBoundary
            isLoading={courses.isLoading}
            error={courses.data ? null : courses.error}
            onRetry={() => void courses.refetch()}
            loadingLabel={t('x.loading-imported-courses')}
            skeleton={
              <div className="space-y-2">
                <SkeletonRow leading={false} />
                <SkeletonRow leading={false} />
                <SkeletonRow leading={false} />
              </div>
            }
            isEmpty={visible.length === 0}
            empty={
              <EmptyState
                compact
                icon={BookOpen}
                headline={
                  page.items.length === 0
                    ? t('p.no-course-has-been-imported')
                    : t('p.no-course-matches-this-search')
                }
                description={
                  page.items.length === 0
                    ? t('p.courses-appear-once-a-sync-imports')
                    : t('p.clear-the-search-to-see-the')
                }
              />
            }
          >
            <ul className="space-y-3">
              {visible.map((course) => (
                <li
                  key={course.id}
                  className="rounded-panel border border-line bg-elevated p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-body font-medium text-fg">{course.title}</p>
                      <p className="tech mt-0.5 text-xs text-fg-faint">{course.external_ref}</p>
                    </div>
                    {course.active ? null : <Badge status="disabled" size="sm">Inactive</Badge>}
                  </div>

                  {course.description ? (
                    <p className="mt-2 text-sm text-fg-muted">{course.description}</p>
                  ) : null}

                  <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-faint">
                    {course.provider_name ? <span>{course.provider_name}</span> : null}
                    {course.duration_minutes !== null ? (
                      <span>{duration(course.duration_minutes * 60_000)}</span>
                    ) : (
                      <span>{t('u.duration-not-recorded')}</span>
                    )}
                    {course.language ? <span>{course.language}</span> : null}
                    <span>
                      {course.last_synced_at
                        ? `Synced ${timeAgo(course.last_synced_at)}`
                        : 'Never synced'}
                    </span>
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Tag className="size-3.5 shrink-0 text-fg-faint" aria-hidden="true" strokeWidth={1.75} />
                    {course.mapped_behaviors.length ? (
                      course.mapped_behaviors.map((behaviour) => (
                        <Badge key={behaviour} tone="brand" size="sm">
                          {humanise(behaviour)}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-xs text-fg-subtle">
                        {t('u.not-mapped-to-any-behaviour-targeting-will')}
                      </span>
                    )}
                  </div>

                  {canManage ? (
                    <div className="mt-3">
                      <Button variant="outline" size="sm" onClick={() => setEditing(course)}>
                        {t('u.edit-mapping')}
                      </Button>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          </AsyncBoundary>
        </div>
      </Drawer>

      {integration ? (
        <MapCourseDialog
          integrationId={integration.id}
          course={editing}
          vocabulary={vocabulary}
          open={editing !== null}
          onOpenChange={(next) => {
            if (!next) setEditing(null)
          }}
        />
      ) : null}
    </>
  )
}
