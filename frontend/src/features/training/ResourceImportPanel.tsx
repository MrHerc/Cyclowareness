/**
 * Add external material to the catalogue — and see exactly what was refused.
 *
 * The operator pastes URLs; the server fetches each one and stores only what
 * answered. The report renders ALL three buckets, rejections first, because the
 * rejection reason is usually the thing the operator needs to act on — a video
 * that has been taken down, a playlist where a single video was expected, a
 * Udemy link this deployment cannot verify because udemy.com refuses automated
 * checks. "3 of 8 added" with the five losses named beats a green toast.
 *
 * There is no title field. The provider names the resource during verification;
 * letting the importer name it is how a catalogue ends up describing a video as
 * something it is not.
 */

import { useT } from '../../lib/i18n'
import { useState } from 'react'
import { Link2 } from 'lucide-react'
import type { TrainingResourceTopic } from '../../domain/types'
import { ApiError } from '../../lib/api/client'
import { useImportResources } from '../../lib/api/mutations'
import { useTrainingResourceTopics } from '../../lib/api/queries'
import { Button, Panel, Select, Textarea } from '../../components/ui'

export function ResourceImportPanel() {
  const t = useT()
  const topics = useTrainingResourceTopics()
  const [urls, setUrls] = useState('')
  const [topic, setTopic] = useState('phishing')
  const importer = useImportResources()

  const parsed = urls
    .split(/\s+/)
    .map((url) => url.trim())
    .filter((url) => url.startsWith('https://'))

  const options = (topics.data ?? []).map((row: TrainingResourceTopic) => ({
    value: row.key,
    // The count sits in the label so the operator can see which topics are
    // thin BEFORE deciding where to put effort.
    label: `${row.label} (${row.count})`,
  }))

  return (
    <Panel
      title={t('x.add-external-material')}
      subtitle={t('x.paste-video-or-course-urls')}
      headingLevel={2}
    >
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault()
          if (parsed.length === 0 || importer.isPending) return
          importer.mutate({ urls: parsed, topic, channel: 'email' })
        }}
      >
        <Textarea
          id="resource-import-urls"
          label="URLs, one per line"
          rows={4}
          value={urls}
          onChange={(event) => setUrls(event.target.value)}
          hint={`https:// links from YouTube or Coursera. ${parsed.length} recognised.`}
        />

        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-56">
            <Select
              label="File under"
              options={options.length > 0 ? options : [{ value: topic, label: topic }]}
              value={topic}
              onValueChange={setTopic}
            />
          </div>
          <Button
            type="submit"
            icon={<Link2 className="size-4" aria-hidden="true" />}
            disabled={parsed.length === 0}
            loading={importer.isPending}
          >
            Verify and add
          </Button>
        </div>

        {importer.error ? (
          <p className="text-sm text-critical">
            {importer.error instanceof ApiError
              ? importer.error.message
              : 'The import request failed.'}
          </p>
        ) : null}

        {importer.data ? (
          <div className="space-y-2 text-sm" aria-live="polite">
            {importer.data.rejected.length > 0 ? (
              <div>
                <p className="font-medium text-critical">
                  Refused ({importer.data.rejected.length}) — each with the reason:
                </p>
                <ul className="mt-1 space-y-1 text-fg-muted">
                  {importer.data.rejected.map((line) => (
                    <li key={line} className="break-all">
                      {line}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <p className="text-fg-muted">
              Stored: {importer.data.stored.length} · Re-verified:{' '}
              {importer.data.updated.length}
            </p>
          </div>
        ) : null}
      </form>
    </Panel>
  )
}
