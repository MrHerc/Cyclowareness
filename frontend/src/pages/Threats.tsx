/**
 * Threat intake — everything entering the loop, and where it came from.
 *
 * Two kinds of thing arrive on this screen and they are never merged. Reports
 * from the human sensor are a queue: each one is a decision somebody owes an
 * employee who did the right thing. Threat records are history: they have
 * already been triaged and are on their way through the loop. Putting them in
 * one list would bury the decisions inside the archive.
 *
 * The queue therefore sits at the top as the page's single `feature` region and
 * is never behind a tab, while the artifact table and the curated feed stack
 * below it. Search and artifact type are page-wide and live in the URL; each
 * section adds the filters that mean something to its own records.
 */

import { useState } from 'react'
import { ShieldQuestion, Plus } from 'lucide-react'
import { DataSourceLabel, DemoDataBadge } from '../components/data'
import { useLocale } from '../lib/i18n'
import { Button, Input, Select } from '../components/ui'
import { IntelFeedList } from '../features/threats/IntelFeedList'
import { ReportQueue } from '../features/threats/ReportQueue'
import { SubmitArtifactDialog } from '../features/threats/SubmitArtifactDialog'
import { ThreatList } from '../features/threats/ThreatList'
import { ALL, artifactTypeOptions, useUrlParam } from '../features/threats/filters'
import { useFeed, useReports, useThreats } from '../lib/api/queries'
import { usePermission } from '../lib/auth/useAuth'
import { backingFor } from '../lib/demo/registry'

export default function Threats() {
  const { locale, t } = useLocale()
  const [query, setQuery] = useUrlParam('q', '')
  const [artifactType, setArtifactType] = useUrlParam('type', ALL)
  const [submitOpen, setSubmitOpen] = useState(false)
  const canSubmit = usePermission('threats.submit')
  const backing = backingFor('threats')

  // Read from the same caches the sections read, so the type filter offers the
  // types that are actually present rather than a list somebody guessed.
  const threats = useThreats()
  const reports = useReports()
  const feed = useFeed()
  const typeOptions = artifactTypeOptions([
    ...(threats.data ?? []).map((threat) => threat.artifact_type),
    ...(reports.data ?? []).map((report) => report.artifact_type),
    ...(feed.data ?? []).map((item) => item.artifact_type),
  ])

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-display text-fg">{t('page.threats.title')}</h1>
          <p lang={locale} className="mt-2 max-w-2xl text-body text-fg-muted">{t('page.threats.lead')}</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {backing.backing === 'live' ? (
              <DataSourceLabel source="live" />
            ) : (
              <DemoDataBadge detail={backing.note} />
            )}
            <span className="inline-flex items-center gap-1.5 text-xs text-fg-subtle">
              <ShieldQuestion className="size-3.5 shrink-0" aria-hidden="true" />
              Artifacts are held as inert text. Nothing on this page is fetched, rendered or
              linkified, and indicators are defanged.
            </span>
          </div>
        </div>

        {canSubmit ? (
          <Button
            variant="primary"
            onClick={() => setSubmitOpen(true)}
            icon={<Plus className="size-4" aria-hidden="true" />}
          >
            {t('u.submit-artifact')}
          </Button>
        ) : null}
      </header>

      <div className="flex flex-wrap items-end gap-3">
        <Input
          label={t('p.search-intake')}
          labelHidden
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('p.search-titles-senders-artifact-text-reporters')}
          className="min-w-0 flex-1 sm:max-w-md"
          autoComplete="off"
        />
        <Select
          label={t('p.artifact-type')}
          labelHidden
          options={typeOptions}
          value={artifactType}
          onValueChange={setArtifactType}
          className="w-52"
        />
      </div>

      <ReportQueue query={query} artifactType={artifactType} />
      <ThreatList query={query} artifactType={artifactType} />
      <IntelFeedList query={query} artifactType={artifactType} />

      <SubmitArtifactDialog open={submitOpen} onOpenChange={setSubmitOpen} />
    </div>
  )
}
