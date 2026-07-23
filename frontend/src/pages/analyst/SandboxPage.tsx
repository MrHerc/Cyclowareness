import { useEffect, useId, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Globe, ScanLine, Upload } from 'lucide-react'
import { api, getSession } from '../../lib/api'
import { usePoll } from '../../lib/usePoll'
import type { SandboxCapabilities, SandboxJobSummary } from '../../lib/types'
import {
  Button,
  Callout,
  Empty,
  Input,
  LoadState,
  PageHeader,
  Panel,
  Skeleton,
  Status,
  Tabs,
  timeAgo,
} from '../../components/ui'

/**
 * Multipart upload — api.ts always sends JSON, so this one endpoint needs a raw
 * fetch. Content-Type is deliberately NOT set: the browser writes the multipart
 * boundary itself. Auth header mirrors api.ts exactly.
 */
async function uploadFile(file: File, password: string): Promise<{ public_id: string }> {
  const session = getSession()
  const form = new FormData()
  form.append('file', file)
  if (password) form.append('password', password)

  let res: Response
  try {
    res = await fetch('/api/sandbox/upload', {
      method: 'POST',
      headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
      body: form,
    })
  } catch {
    throw new Error("Can't reach the sandbox API — make sure the backend is running, then try again.")
  }
  if (!res.ok) {
    let detail = res.statusText
    try {
      const data = await res.json()
      detail = typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail)
    } catch {
      /* keep statusText */
    }
    throw new Error(detail)
  }
  return res.json() as Promise<{ public_id: string }>
}

export function SandboxPage() {
  const { data: jobs, error: jobsError, refresh } = usePoll<SandboxJobSummary[]>(
    () => api.get('/api/sandbox/jobs'),
    4000,
  )
  const [caps, setCaps] = useState<SandboxCapabilities | null>(null)

  useEffect(() => {
    let alive = true
    api
      .get<SandboxCapabilities>('/api/sandbox/capabilities')
      .then((c) => alive && setCaps(c))
      .catch(() => {
        /* capability line is advisory; a failure just hides it */
      })
    return () => {
      alive = false
    }
  }, [])

  return (
    <div className="rise space-y-6">
      <PageHeader
        title="Sandbox"
        lede="ZORBOX statically analyses a file or URL and returns a scored, explainable verdict. Nothing is ever executed."
      />

      {caps && <CapabilityLine caps={caps} />}

      <SubmissionPanel />

      <Panel
        title="Recent jobs"
        subtitle="Every submission, newest first"
        actions={<span className="text-sm text-c3">{jobs?.length ?? 0}</span>}
      >
        {!jobs ? (
          jobsError ? (
            <LoadState error={jobsError} label="Loading jobs" onRetry={refresh} />
          ) : (
            <div className="space-y-2" aria-hidden>
              <Skeleton className="h-11" />
              <Skeleton className="h-11" />
              <Skeleton className="h-11" />
            </div>
          )
        ) : jobs.length === 0 ? (
          <Empty icon={<ScanLine size={20} aria-hidden />}>
            No samples analysed yet. Upload a file or submit a URL above to begin.
          </Empty>
        ) : (
          <ul className="divide-hair">
            {jobs.map((job) => (
              <JobRow key={job.public_id} job={job} />
            ))}
          </ul>
        )}
      </Panel>
    </div>
  )
}

/* --- capability honesty line ---------------------------------------------- */

function CapabilityLine({ caps }: { caps: SandboxCapabilities }) {
  const analyzers = caps.static_analyzers?.length ?? 0
  const yaraLoaded = caps.yara?.loaded ?? 0
  return (
    <div className="text-sm flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-control border border-hair bg-panel px-4 py-2.5 text-c2">
      <span className="flex items-center gap-1.5">
        <ScanLine size={14} className="text-c3" aria-hidden />
        {analyzers} static {analyzers === 1 ? 'analyzer' : 'analyzers'}
      </span>
      <span className="text-c3" aria-hidden>
        ·
      </span>
      <span>
        {yaraLoaded} YARA {yaraLoaded === 1 ? 'rule' : 'rules'} loaded
      </span>
      <span className="text-c3" aria-hidden>
        ·
      </span>
      <span className={caps.dynamic_worker ? undefined : 'text-warning'}>
        {caps.dynamic_worker
          ? 'dynamic detonation available'
          : 'dynamic detonation not available on this host — analysis is static only'}
      </span>
    </div>
  )
}

/* --- submission ------------------------------------------------------------ */

const SUBMIT_TABS = [
  { key: 'file', label: 'Upload a file' },
  { key: 'url', label: 'Analyse a URL' },
] as const

function SubmissionPanel() {
  const navigate = useNavigate()
  const fileId = useId()
  const [tab, setTab] = useState<'file' | 'url'>('file')
  const [file, setFile] = useState<File | null>(null)
  const [password, setPassword] = useState('')
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSubmit = tab === 'file' ? file !== null : url.trim().length > 0

  const submit = async () => {
    if (!canSubmit) return
    setBusy(true)
    setError(null)
    try {
      const res =
        tab === 'file'
          ? await uploadFile(file as File, password.trim())
          : await api.post<{ public_id: string }>('/api/sandbox/url', { url: url.trim() })
      navigate(`/sandbox/${res.public_id}`)
    } catch (e) {
      // The URL endpoint returns a verbatim "Refusing to fetch: ..." on SSRF
      // blocks — that message is genuinely useful, so show it exactly.
      setError(e instanceof Error ? e.message : 'Submission failed')
      setBusy(false)
    }
  }

  return (
    <Panel tone="feature" title="Submit to the sandbox" subtitle="Static analysis only — the sample is never run.">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          if (!busy) void submit()
        }}
      >
        <Tabs
          label="Submission type"
          tabs={SUBMIT_TABS}
          value={tab}
          onChange={(k) => {
            setTab(k)
            setError(null)
          }}
        />

        {tab === 'file' ? (
          <div className="space-y-4">
            <div className="min-w-0">
              <label htmlFor={fileId} className="label mb-1.5 block text-c3">
                File to analyse
              </label>
              <input
                id={fileId}
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="text-sm block w-full cursor-pointer rounded-control border border-line bg-raised text-c1 outline-none transition-colors file:mr-3 file:cursor-pointer file:border-0 file:border-r file:border-line file:bg-sunken file:px-3 file:py-2 file:text-sm file:font-medium file:text-c1 hover:border-line-strong focus:border-brand"
              />
            </div>
            <Input
              label="Archive password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Optional"
              autoComplete="off"
              hint="Optional. An encrypted archive submitted without a password will pause and ask for one."
            />
          </div>
        ) : (
          <Input
            label="URL to analyse"
            type="url"
            inputMode="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/path"
            hint="Fetched server-side and analysed statically. It is never opened in a browser."
          />
        )}

        {error && (
          <div role="alert" aria-live="assertive">
            <Callout tone="danger" title="Submission failed">
              {error}
            </Callout>
          </div>
        )}

        <div className="flex justify-end">
          <Button type="submit" variant="primary" busy={busy} disabled={!canSubmit}>
            {tab === 'file' ? <Upload size={15} aria-hidden /> : <Globe size={15} aria-hidden />}
            Analyse
          </Button>
        </div>
      </form>
    </Panel>
  )
}

/* --- jobs list ------------------------------------------------------------- */

function JobRow({ job }: { job: SandboxJobSummary }) {
  const name = job.source === 'url' ? job.submitted_url || job.original_name : job.original_name
  const done = job.status === 'completed'
  const meta = [job.family, job.mime].filter(Boolean).join(' · ')
  return (
    <li>
      <Link
        to={`/sandbox/${job.public_id}`}
        className="-mx-2 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-control px-2 py-2.5 transition-colors hover:bg-raised"
      >
        <span className="min-w-48 flex-1 truncate">
          <span className="text-body block truncate font-medium">{name || 'Unnamed sample'}</span>
          {meta && <span className="text-xs block truncate text-c3">{meta}</span>}
        </span>

        <Status value={job.status} />

        {done ? (
          <>
            <Status value={job.risk_level} />
            <span className="text-sm w-8 shrink-0 text-right font-mono font-semibold">
              {typeof job.final_score === 'number' ? Math.round(job.final_score) : '—'}
            </span>
          </>
        ) : (
          <span className="text-xs w-40 truncate text-c2">{job.stage || '—'}</span>
        )}

        <span className="text-xs w-14 shrink-0 text-right text-c3">{timeAgo(job.created_at)}</span>
      </Link>
    </li>
  )
}
