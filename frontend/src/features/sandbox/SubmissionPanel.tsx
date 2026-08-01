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

import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Link2, Upload } from 'lucide-react'
import { ApiError } from '../../lib/api/client'
import { useSandboxUpload, useSandboxUrl } from '../../lib/api/mutations'
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
  const navigate = useNavigate()
  const [file, setFile] = useState<File | null>(null)
  const [password, setPassword] = useState('')
  const [url, setUrl] = useState('')

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
      title="Submit a sample"
      subtitle="The file is quarantined on arrival and parsed. It is never executed."
    >
      <Tabs defaultValue="file">
        <TabsList>
          <TabsTrigger value="file">Upload a file</TabsTrigger>
          <TabsTrigger value="url">Analyse a URL</TabsTrigger>
        </TabsList>

        <TabsContent value="file">
          <form onSubmit={onUpload} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label="File"
                hint="Up to the engine's size limit. Content is identified by its bytes, not by its name."
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
                label="Archive password (optional)"
                type="password"
                autoComplete="off"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                hint="Leave blank unless the archive is encrypted. If it is, analysis pauses and asks — the engine does not guess or brute-force passwords."
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
                Analyse file
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
              placeholder="https://example.com/invoice.zip"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              hint="The server downloads the content and analyses what comes back. It refuses to fetch private, loopback and cloud-metadata addresses, and says which rule it hit."
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
              Fetch and analyse
            </Button>
          </form>
        </TabsContent>
      </Tabs>
    </Panel>
  )
}
