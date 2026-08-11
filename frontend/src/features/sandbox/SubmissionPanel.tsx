/**
 * Submitting a sample.
 *
 * Two things this form is careful about.
 *
 * - **The archive-password hint is written before the failure happens.** An
 *   encrypted archive parks itself and asks, and an analyst who learns that only
 *   after uploading has already lost a minute. The engine does not brute-force
 *   the password, and the copy says so in both places.
 *
 * - **The URL refusal is shown verbatim.** The server refuses to fetch private,
 *   loopback and cloud-metadata addresses, and its 422 names which rule it hit.
 *   Replacing that with "invalid URL" would throw away the only sentence that
 *   tells the analyst what to do next.
 */

import { useT } from '../../lib/i18n'
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Link2, Upload } from 'lucide-react'
import { ApiError } from '../../lib/api/client'
import { useSandboxUpload, useSandboxUrl } from '../../lib/api/mutations'
import { useSandboxCapabilities } from '../../lib/api/queries'
import { cn } from '../../lib/format'
import {
  Button,
  Field,
  Input,
  Panel,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../../components/ui'

const FILE_INPUT =
  'w-full rounded-control border border-line bg-base px-3 py-2 text-body text-fg ' +
  'transition-colors duration-150 hover:border-line-strong ' +
  'file:mr-3 file:rounded-chip file:border file:border-line file:bg-raised ' +
  'file:px-3 file:py-1 file:text-sm file:text-fg file:hover:bg-elevated'

function SubmissionError({ error }: { error: unknown }) {
  if (!(error instanceof Error)) return null
  const refused = error instanceof ApiError && error.kind === 'validation'
  return (
    <div
      role="alert"
      className={cn(
        'rounded-control border px-3 py-2 text-sm',
        refused ? 'border-medium/40 bg-medium/8 text-medium' : 'border-critical/40 bg-critical/8 text-critical',
      )}
    >
      {error.message}
    </div>
  )
}

export function SubmissionPanel() {
  const t = useT()
  const navigate = useNavigate()
  const [file, setFile] = useState<File | null>(null)
  const [password, setPassword] = useState('')
  const [url, setUrl] = useState('')
  // The server's own ceiling, never a constant here: a number hardcoded in the
  // browser is wrong the moment a deployment sets MAX_SAMPLE_MB.
  const maxMb = useSandboxCapabilities().data?.max_sample_mb

  const upload = useSandboxUpload({
    onSuccess: (job) => navigate(`/sandbox/${job.public_id}`),
  })
  const submitUrl = useSandboxUrl({
    onSuccess: (job) => navigate(`/sandbox/${job.public_id}`),
  })

  function onUpload(event: FormEvent) {
    event.preventDefault()
    if (!file) return
    upload.mutate({ file, password: password.trim() || undefined })
  }

  function onUrl(event: FormEvent) {
    event.preventDefault()
    const trimmed = url.trim()
    if (!trimmed) return
    submitUrl.mutate(trimmed)
  }

  return (
    <Panel
      tone="feature"
      title={t('x.submit-a-sample')}
      subtitle={t('x.the-file-is-quarantined-on')}
    >
      <Tabs defaultValue="file">
        <TabsList>
          <TabsTrigger value="file">{t('u.upload-a-file')}</TabsTrigger>
          <TabsTrigger value="url">{t('u.analyse-a-url')}</TabsTrigger>
        </TabsList>

        <TabsContent value="file">
          <form onSubmit={onUpload} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field
                label={t('u.file')}
                hint={
                  // NAMED BEFORE THE UPLOAD, not only in the 413 afterwards.
                  // `SampleTooLarge` has always stated the ceiling, but only to
                  // somebody who had already sent a file and waited for it to be
                  // refused. Falls back to the old wording when the server has
                  // not answered yet — a number invented client-side would be
                  // wrong the moment a deployment changes it.
                  maxMb
                    ? `Up to ${maxMb} MB. Content is identified by its bytes, not by its name.`
                    : "Up to the engine's size limit. Content is identified by its bytes, not by its name."
                }
                required
              >
                {(aria) => (
                  <input
                    {...aria}
                    type="file"
                    className={FILE_INPUT}
                    onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                  />
                )}
              </Field>

              <Input
                label={t('p.archive-password-optional')}
                type="password"
                autoComplete="off"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                hint={t('p.leave-blank-unless-the-archive-is')}
              />
            </div>

            <SubmissionError error={upload.error} />

            <div className="flex items-center gap-3">
              <Button
                type="submit"
                variant="primary"
                icon={<Upload className="size-4" aria-hidden="true" strokeWidth={1.75} />}
                loading={upload.isPending}
                disabled={!file}
              >
                {t('u.analyse-file')}
              </Button>
              <span className="text-xs text-fg-faint">
                {file ? file.name : 'No file chosen yet.'}
              </span>
            </div>
          </form>
        </TabsContent>

        <TabsContent value="url">
          <form onSubmit={onUrl} className="space-y-4">
            <Input
              label="URL"
              type="url"
              inputMode="url"
              autoComplete="off"
              placeholder={t('p.httpsexamplecominvoicezip')}
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              hint={t('p.the-server-downloads-the-content-and')}
              required
            />

            <SubmissionError error={submitUrl.error} />

            <Button
              type="submit"
              variant="primary"
              icon={<Link2 className="size-4" aria-hidden="true" strokeWidth={1.75} />}
              loading={submitUrl.isPending}
              disabled={!url.trim()}
            >
              {t('u.fetch-and-analyse')}
            </Button>
          </form>
        </TabsContent>
      </Tabs>
    </Panel>
  )
}
