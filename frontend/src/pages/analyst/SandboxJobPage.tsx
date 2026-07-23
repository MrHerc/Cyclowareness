import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Copy,
  Download,
  FileWarning,
  FlaskConical,
  Lock,
  Microscope,
  RefreshCw,
  ShieldCheck,
  ThumbsDown,
  ThumbsUp,
} from 'lucide-react'
import { api, ApiError, getSession } from '../../lib/api'
import { usePoll } from '../../lib/usePoll'
import type {
  AnalyzerResultView,
  SandboxJobDetail,
  SandboxJobSummary,
  RiskLevel,
} from '../../lib/types'
import {
  Button,
  Callout,
  Chip,
  Empty,
  GroupLabel,
  Input,
  LoadState,
  PageHeader,
  Panel,
  Status,
  TD,
  TH,
  Table,
  Textarea,
  cx,
  timeAgo,
} from '../../components/ui'

/* -----------------------------------------------------------------------------
   Helpers
   -------------------------------------------------------------------------- */

const SEV_RANK: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1, info: 0 }

/** Risk verdict → status tone. Never brand — a verdict is not the thing we point at. */
function riskText(level: RiskLevel): string {
  if (level === 'critical' || level === 'high') return 'text-danger'
  if (level === 'medium') return 'text-warning'
  return 'text-success'
}

function humanKey(key: string): string {
  return key.replace(/[_-]+/g, ' ').replace(/^./, (c) => c.toUpperCase())
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(2)} MB`
}

const IOC_CATEGORIES = ['urls', 'domains', 'ips', 'emails', 'hashes', 'file_paths', 'registry_keys', 'mutexes'] as const

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/**
 * Downloads an authenticated export. A plain `<a href>` cannot carry the JWT the
 * API requires, so we fetch with the Bearer header and hand the browser a blob.
 */
async function downloadExport(path: string, filename: string): Promise<void> {
  const session = getSession()
  const res = await fetch(path, {
    headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
  })
  if (!res.ok) throw new ApiError(res.status, `Export failed (${res.status})`)
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/* -----------------------------------------------------------------------------
   Page
   -------------------------------------------------------------------------- */

export function SandboxJobPage() {
  const { id } = useParams()
  const { data: job, error: loadError, refresh } = usePoll<SandboxJobDetail>(
    () => api.get(`/api/sandbox/jobs/${id}`),
    2500,
    [id],
  )

  if (!job) return <LoadState error={loadError} label="Loading the analysis" onRetry={refresh} />

  const running = job.status === 'queued' || job.status === 'running'
  const sb = job.score_breakdown

  // Every signal, from every analyzer, worst-severity first.
  const signals = Object.values(job.analysis ?? {})
    .flatMap((a) => (a.signals ?? []).map((s) => ({ ...s, analyzer: a.analyzer })))
    .sort((x, y) => (SEV_RANK[y.severity] ?? 0) - (SEV_RANK[x.severity] ?? 0))

  const topReasons = (sb?.top_reasons ?? []).slice(0, 3)
  const iocEntries = IOC_CATEGORIES.map((cat) => ({ cat, values: job.iocs?.[cat] ?? [] })).filter(
    (e) => e.values.length > 0,
  )
  const analyzers = Object.values(job.analysis ?? {})
  const children = job.children ?? []

  return (
    <div className="rise space-y-6">
      <PageHeader
        breadcrumb={
          <>
            <Link to="/sandbox" className="inline-flex items-center gap-1 hover:text-c1">
              <ArrowLeft size={14} aria-hidden /> Sandbox
            </Link>
            <ChevronRight size={13} className="text-c3" aria-hidden />
            <span className="text-c3 tech">{job.public_id}</span>
          </>
        }
        title={job.original_name || job.submitted_url || 'Unnamed submission'}
        lede="Static analysis report — one submission, every analyzer, one explainable verdict."
        actions={
          <>
            <Status value={job.status} />
            <Chip>{job.source === 'archive_member' ? 'archive member' : job.source}</Chip>
            <span className="text-xs text-c3">submitted {timeAgo(job.created_at)}</span>
          </>
        }
      />

      {/* 3 — FAILED */}
      {job.status === 'failed' && <FailedPanel error={job.error} jobId={job.public_id} onDone={refresh} />}

      {/* 2 — AWAITING PASSWORD */}
      {job.status === 'awaiting_password' && <PasswordPanel jobId={job.public_id} onDone={refresh} />}

      {/* 1 — VERDICT */}
      <Panel tone="feature">
        {running && (
          <div className="mb-4" aria-live="polite">
            <div className="mb-2 flex items-center gap-2 text-sm text-brand-fg">
              <Microscope size={15} aria-hidden />
              Analysing — static analyzers running. This report updates as each one reports back.
            </div>
            <div className="scan relative h-1 overflow-hidden rounded-full bg-sunken" aria-hidden />
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-[auto_1fr]">
          {/* the number */}
          <div className="flex flex-col items-start gap-2 border-hair md:border-r md:pr-6">
            <div className="label text-c3">Verdict</div>
            <div className="flex items-baseline gap-1.5">
              <span className={cx('text-display font-semibold tabular-nums', riskText(job.risk_level))}>
                {Math.round(job.final_score)}
              </span>
              <span className="text-h text-c3">/ 100</span>
            </div>
            <Status value={job.risk_level} label={`${humanKey(job.risk_level)} risk`} />
            {running && <span className="text-xs text-c3">provisional while analysing</span>}
          </div>

          {/* file identity */}
          <dl className="grid grid-cols-2 gap-x-5 gap-y-2.5 self-center sm:grid-cols-3">
            <IdentityField label="File name" value={job.original_name || '—'} />
            {job.submitted_url && <IdentityField label="Submitted URL" value={job.submitted_url} tech />}
            <IdentityField label="Size" value={formatBytes(job.size_bytes)} />
            <IdentityField label="MIME" value={job.mime || '—'} />
            <IdentityField label="Magic" value={job.magic || '—'} />
            <IdentityField label="Family" value={job.family || '—'} />
            <div className="col-span-2 sm:col-span-3">
              <HashField label="SHA-256" value={job.sha256} />
            </div>
            {job.md5 && (
              <div className="col-span-2 sm:col-span-3">
                <HashField label="MD5" value={job.md5} />
              </div>
            )}
          </dl>
        </div>

        {/* extension mismatch — a strong signal on its own */}
        {job.extension_mismatch && (
          <div className="mt-4">
            <Callout tone="danger" title="Extension mismatch" icon={<FileWarning size={13} aria-hidden />}>
              The file's real content does not match the extension its name claims. Disguising a file type this way is a
              deliberate evasion technique and is treated as a strong indicator on its own.
            </Callout>
          </div>
        )}

        {/* top reasons — the headline justification */}
        {topReasons.length > 0 && (
          <div className="mt-5">
            <GroupLabel>Why this score</GroupLabel>
            <ol className="divide-hair">
              {topReasons.map((r, i) => (
                <li key={r.id} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
                  <span className="text-sm mt-0.5 w-4 shrink-0 text-right font-mono text-c3">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-body font-medium">{r.title}</span>
                      <Status value={r.severity} />
                    </div>
                    {r.detail && <p className="text-sm mt-0.5 leading-relaxed text-c2">{r.detail}</p>}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}
      </Panel>

      <div className="grid gap-6 xl:grid-cols-5">
        {/* left spine — the honesty statement, and the actions */}
        <div className="space-y-6 xl:col-span-2 xl:sticky xl:top-4 xl:self-start">
          <TiersPanel tiers={job.tiers} />
          <ExportsPanel jobId={job.public_id} currentFeedback={job.feedback} onDone={refresh} />
        </div>

        {/* right — the evidence */}
        <div className="space-y-6 xl:col-span-3">
          <SignalsPanel signals={signals} running={running} />
          {sb && <ScoreBreakdownPanel sb={sb} ruleScore={job.rule_score} modelScore={job.ai_score} />}
          <IocsPanel entries={iocEntries} />
          <AnalyzersPanel analyzers={analyzers} />
          {children.length > 0 && <ChildrenPanel members={children} />}
        </div>
      </div>
    </div>
  )
}

/* -----------------------------------------------------------------------------
   Header pieces
   -------------------------------------------------------------------------- */

function IdentityField({ label, value, tech }: { label: string; value: string; tech?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="label text-c3">{label}</dt>
      <dd className={cx('mt-0.5 truncate text-c1', tech ? 'tech' : 'text-sm')} title={value}>
        {value}
      </dd>
    </div>
  )
}

function HashField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard unavailable — the value is still selectable on the page */
    }
  }
  return (
    <div className="min-w-0">
      <dt className="label mb-0.5 flex items-center gap-2 text-c3">
        {label}
        <button
          type="button"
          onClick={() => void copy()}
          className="inline-flex items-center gap-1 rounded-chip border border-hair px-1.5 py-0.5 text-c3 transition-colors hover:border-line-strong hover:text-c1"
        >
          {copied ? <Check size={11} aria-hidden /> : <Copy size={11} aria-hidden />}
          <span className="text-xs">{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </dt>
      <dd className="tech text-c1">{value}</dd>
      <span className="sr-only" aria-live="polite">
        {copied ? `${label} copied to clipboard` : ''}
      </span>
    </div>
  )
}

/* -----------------------------------------------------------------------------
   2 — Awaiting password
   -------------------------------------------------------------------------- */

function PasswordPanel({ jobId, onDone }: { jobId: string; onDone: () => Promise<void> }) {
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    setBusy(true)
    setError(null)
    try {
      await api.post(`/api/sandbox/jobs/${jobId}/password`, { password })
      await onDone()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open the archive with that password')
      setBusy(false)
    }
  }

  return (
    <Panel tone="feature">
      <Callout tone="brand" title="Encrypted archive" icon={<Lock size={13} aria-hidden />}>
        This submission is a password-protected archive. The engine does not guess or crack passwords — supply the one
        you were given and it will extract and analyse the contents.
      </Callout>
      <form
        className="mt-4 flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
      >
        <div className="min-w-56 flex-1">
          <Input
            label="Archive password"
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            hint="Typed by you — never stored beyond this extraction."
          />
        </div>
        <Button type="submit" variant="primary" busy={busy} disabled={!password}>
          Unlock and analyse
        </Button>
      </form>
      {error && (
        <div className="mt-3" role="alert">
          <Callout tone="danger">{error}</Callout>
        </div>
      )}
    </Panel>
  )
}

/* -----------------------------------------------------------------------------
   3 — Failed
   -------------------------------------------------------------------------- */

function FailedPanel({ error, jobId, onDone }: { error: string | null; jobId: string; onDone: () => Promise<void> }) {
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const reanalyze = async () => {
    setBusy(true)
    setActionError(null)
    try {
      await api.post(`/api/sandbox/jobs/${jobId}/reanalyze`)
      await onDone()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Reanalyze failed')
      setBusy(false)
    }
  }

  return (
    <Panel>
      <Callout
        tone="danger"
        title="Analysis failed"
        actions={
          <Button size="sm" variant="secondary" busy={busy} onClick={() => void reanalyze()}>
            <RefreshCw size={13} aria-hidden /> Reanalyze
          </Button>
        }
      >
        {error || 'The analysis did not complete. You can queue it again.'}
      </Callout>
      {actionError && (
        <div className="mt-3" role="alert">
          <Callout tone="danger">{actionError}</Callout>
        </div>
      )}
    </Panel>
  )
}

/* -----------------------------------------------------------------------------
   4 — Tiers (the honesty statement)
   -------------------------------------------------------------------------- */

function TiersPanel({ tiers }: { tiers: SandboxJobDetail['tiers'] }) {
  const entries = Object.entries(tiers ?? {})
  return (
    <Panel title="Analysis coverage" subtitle="Which tiers actually ran">
      {entries.length === 0 ? (
        <Empty>No tier information reported yet.</Empty>
      ) : (
        <ul className="space-y-3">
          {entries.map(([name, tier]) => {
            const unavailable = tier.unavailable_analyzers ?? {}
            return (
              <li key={name} className="rounded-control border border-hair bg-raised p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm flex items-center gap-2 font-medium">
                    {name === 'static' ? (
                      <ShieldCheck size={14} className="text-success" aria-hidden />
                    ) : (
                      <FlaskConical size={14} className="text-warning" aria-hidden />
                    )}
                    {humanKey(name)}
                  </span>
                  <Status value={tier.ran ? 'completed' : 'awaiting_approval'} label={tier.ran ? 'Ran' : 'Not run'} />
                </div>
                {tier.detail && <p className="text-sm mt-1.5 leading-relaxed text-c2">{tier.detail}</p>}
                {Object.keys(unavailable).length > 0 && (
                  <dl className="mt-2 space-y-1 border-t border-hair pt-2">
                    {Object.entries(unavailable).map(([an, reason]) => (
                      <div key={an} className="text-xs flex gap-2 text-c3">
                        <dt className="shrink-0 font-medium text-c2">{an}</dt>
                        <dd className="m-0">{reason}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </li>
            )
          })}
        </ul>
      )}
      <p className="text-xs mt-3 leading-relaxed text-c3">
        No behavioural (dynamic) detonation runs on this host, so nothing in this report reflects the sample being
        executed. Every finding below comes from static inspection only.
      </p>
    </Panel>
  )
}

/* -----------------------------------------------------------------------------
   5 — Signals
   -------------------------------------------------------------------------- */

function SignalsPanel({
  signals,
  running,
}: {
  signals: { id: string; title: string; severity: string; detail: string; analyzer: string }[]
  running: boolean
}) {
  return (
    <Panel title="Signals" subtitle="Every observation, worst first" actions={<span className="text-sm text-c3">{signals.length}</span>}>
      {signals.length === 0 ? (
        <Empty>{running ? 'No signals raised yet — analysis still in progress.' : 'No signals were raised.'}</Empty>
      ) : (
        <ul className="divide-hair">
          {signals.map((s) => (
            <li key={`${s.analyzer}:${s.id}`} className="py-3 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-center gap-2">
                <Status value={s.severity} />
                <span className="text-body font-medium">{s.title}</span>
                <Chip tone="brand">{s.analyzer}</Chip>
              </div>
              {s.detail && <p className="text-sm mt-1 leading-relaxed text-c2">{s.detail}</p>}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

/* -----------------------------------------------------------------------------
   6 — Score breakdown
   -------------------------------------------------------------------------- */

function ScoreBreakdownPanel({
  sb,
  ruleScore,
  modelScore,
}: {
  sb: NonNullable<SandboxJobDetail['score_breakdown']>
  ruleScore: number
  modelScore: number
}) {
  const bands = sb.rule?.bands ?? []
  const contributions = sb.model?.contributions ?? []
  const maxAbs = Math.max(...contributions.map((c) => Math.abs(c.contribution)), 0.0001)

  return (
    <Panel title="Score breakdown" subtitle="How the number is built">
      <div className="rounded-control border border-hair bg-sunken px-3 py-2 font-mono text-xs text-c2">
        {sb.formula || `final = 0.6 × rule (${ruleScore.toFixed(0)}) + 0.4 × model (${modelScore.toFixed(0)})`}
      </div>

      <details className="group mt-4" open>
        <summary className="text-sm cursor-pointer list-none font-medium text-brand-fg">
          <span className="inline-flex items-center gap-1.5">
            <ChevronRight size={14} className="transition-transform group-open:rotate-90" aria-hidden />
            Rule component · {sb.rule?.signal_count ?? 0} signals · score {(sb.rule?.score ?? 0).toFixed(0)}
          </span>
        </summary>
        {bands.length === 0 ? (
          <p className="text-sm mt-2 text-c3">No rule bands contributed.</p>
        ) : (
          <Table minWidth={420}>
            <thead>
              <tr>
                <TH>Severity</TH>
                <TH numeric>Signals</TH>
                <TH numeric>Contribution</TH>
              </tr>
            </thead>
            <tbody>
              {bands.map((b) => (
                <tr key={b.severity}>
                  <TD>
                    <Status value={b.severity} />
                  </TD>
                  <TD numeric>{b.count}</TD>
                  <TD numeric>+{b.contribution.toFixed(1)}</TD>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </details>

      <details className="group mt-4" open>
        <summary className="text-sm cursor-pointer list-none font-medium text-brand-fg">
          <span className="inline-flex items-center gap-1.5">
            <ChevronRight size={14} className="transition-transform group-open:rotate-90" aria-hidden />
            Model component · score {(sb.model?.score ?? 0).toFixed(0)}
          </span>
        </summary>

        {/* Provenance, verbatim — this model is expert-weighted, not a trained classifier. */}
        {sb.model?.provenance && (
          <div className="mt-2">
            <Callout tone="info" title="Model provenance">
              {sb.model.provenance}
            </Callout>
          </div>
        )}

        {contributions.length > 0 && (
          <div className="mt-3">
            <GroupLabel right={<span className="text-xs text-c3">bias {(sb.model?.bias ?? 0).toFixed(2)}</span>}>
              Per-feature contribution
            </GroupLabel>
            <ul className="space-y-2">
              {contributions.map((c) => {
                const up = c.contribution >= 0
                const width = (Math.abs(c.contribution) / maxAbs) * 100
                return (
                  <li key={c.feature} className="text-xs">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="truncate text-c2" title={humanKey(c.feature)}>
                        {humanKey(c.feature)}
                      </span>
                      <span className={cx('shrink-0 font-mono font-semibold', up ? 'text-danger' : 'text-success')}>
                        {up ? '+' : ''}
                        {c.contribution.toFixed(2)}
                      </span>
                    </div>
                    <div className="mt-1 h-1 overflow-hidden rounded-full bg-sunken">
                      <div
                        className={cx('h-full rounded-full', up ? 'bg-danger' : 'bg-success')}
                        style={{ width: `${width}%` }}
                      />
                    </div>
                    <div className="mt-0.5 text-c3">
                      value {c.value.toFixed(2)} · weight {c.weight.toFixed(2)}
                    </div>
                  </li>
                )
              })}
            </ul>
            <p className="text-xs mt-2 leading-relaxed text-c3">
              A positive contribution pushes the score toward malicious; a negative one pulls it toward benign.
            </p>
          </div>
        )}
      </details>
    </Panel>
  )
}

/* -----------------------------------------------------------------------------
   7 — IOCs
   -------------------------------------------------------------------------- */

function IocsPanel({ entries }: { entries: { cat: string; values: string[] }[] }) {
  return (
    <Panel title="Indicators of compromise" subtitle="Defanged observations — not live links">
      {entries.length === 0 ? (
        <Empty>No indicators were extracted.</Empty>
      ) : (
        <div className="space-y-4">
          {entries.map((e) => (
            <div key={e.cat}>
              <GroupLabel right={<span className="text-xs text-c3">{e.values.length}</span>}>{humanKey(e.cat)}</GroupLabel>
              <ul className="space-y-1">
                {e.values.map((v) => (
                  <li key={v} className="tech rounded-chip bg-sunken px-2 py-1 text-c2">
                    {v}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </Panel>
  )
}

/* -----------------------------------------------------------------------------
   8 — Per-analyzer detail
   -------------------------------------------------------------------------- */

function AnalyzersPanel({ analyzers }: { analyzers: AnalyzerResultView[] }) {
  return (
    <Panel title="Analyzer detail" subtitle="What each analyzer looked at, and found">
      {analyzers.length === 0 ? (
        <Empty>No analyzers have reported yet.</Empty>
      ) : (
        <div className="space-y-3">
          {analyzers.map((a) => (
            <AnalyzerCard key={a.analyzer} a={a} />
          ))}
        </div>
      )}
    </Panel>
  )
}

function AnalyzerCard({ a }: { a: AnalyzerResultView }) {
  const factEntries = Object.entries(a.facts ?? {})
  return (
    <details className="group rounded-control border border-hair bg-raised">
      <summary className="text-sm flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5">
        <ChevronRight size={14} className="shrink-0 text-c3 transition-transform group-open:rotate-90" aria-hidden />
        <span className="font-medium">{humanKey(a.analyzer)}</span>
        <Status value={a.ran ? 'completed' : 'awaiting_approval'} label={a.ran ? 'Ran' : 'Unavailable'} />
        {a.signals?.length > 0 && <Chip>{a.signals.length} signals</Chip>}
        <span className="text-xs ml-auto text-c3">{a.duration_ms} ms</span>
      </summary>
      <div className="border-t border-hair px-3 py-3">
        {!a.ran ? (
          <p className="text-sm text-c3">{a.unavailable_reason || 'This analyzer did not run.'}</p>
        ) : factEntries.length === 0 ? (
          <p className="text-sm text-c3">No structured facts reported.</p>
        ) : (
          <FactList entries={factEntries} />
        )}
      </div>
    </details>
  )
}

/* --- generic fact renderer ------------------------------------------------- */

function FactList({ entries }: { entries: [string, unknown][] }) {
  return (
    <dl className="space-y-2">
      {entries.map(([key, value]) => (
        <div key={key} className="grid grid-cols-[minmax(6rem,9rem)_1fr] gap-3">
          <dt className="label pt-0.5 text-c3">{humanKey(key)}</dt>
          <dd className="m-0 min-w-0">
            <FactNode value={value} depth={0} />
          </dd>
        </div>
      ))}
    </dl>
  )
}

function FactNode({ value, depth }: { value: unknown; depth: number }) {
  if (value === null || value === undefined || value === '') return <span className="text-sm text-c3">—</span>

  if (typeof value === 'boolean') return <span className="text-sm text-c1">{value ? 'yes' : 'no'}</span>

  if (typeof value === 'number') return <span className="text-sm tabular-nums text-c1">{value}</span>

  if (typeof value === 'string') {
    const techy = value.length > 24 && !/\s/.test(value)
    return <span className={cx(techy ? 'tech text-c2' : 'text-sm text-c1')}>{value}</span>
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-sm text-c3">none</span>
    // Array of records → a compact table.
    if (depth < 3 && value.every((v) => isRecord(v))) {
      const rows = value as Record<string, unknown>[]
      const cols = Array.from(new Set(rows.flatMap((r) => Object.keys(r))))
      return (
        <Table minWidth={Math.max(320, cols.length * 120)}>
          <thead>
            <tr>
              {cols.map((c) => (
                <TH key={c}>{humanKey(c)}</TH>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                {cols.map((c) => (
                  <TD key={c}>
                    <FactNode value={r[c]} depth={depth + 1} />
                  </TD>
                ))}
              </tr>
            ))}
          </tbody>
        </Table>
      )
    }
    // Array of primitives → a list.
    return (
      <ul className="space-y-1">
        {value.map((v, i) => (
          <li key={i}>
            <FactNode value={v} depth={depth + 1} />
          </li>
        ))}
      </ul>
    )
  }

  if (isRecord(value)) {
    if (depth >= 3) return <span className="text-sm tech text-c2">{JSON.stringify(value)}</span>
    return (
      <dl className="space-y-1.5 border-l border-hair pl-3">
        {Object.entries(value).map(([k, v]) => (
          <div key={k} className="grid grid-cols-[minmax(5rem,8rem)_1fr] gap-2">
            <dt className="text-xs pt-0.5 text-c3">{humanKey(k)}</dt>
            <dd className="m-0 min-w-0">
              <FactNode value={v} depth={depth + 1} />
            </dd>
          </div>
        ))}
      </dl>
    )
  }

  return <span className="text-sm tech text-c2">{String(value)}</span>
}

/* -----------------------------------------------------------------------------
   9 — Archive children
   -------------------------------------------------------------------------- */

function ChildrenPanel({ members }: { members: SandboxJobSummary[] }) {
  return (
    <Panel
      title="Extracted members"
      subtitle="Files unpacked from this archive, each analysed on its own"
      actions={<span className="text-sm text-c3">{members.length}</span>}
    >
      <ul className="divide-hair">
        {members.map((c) => (
          <li key={c.public_id}>
            <Link
              to={`/sandbox/${c.public_id}`}
              className="-mx-2 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-control px-2 py-2.5 transition-colors hover:bg-raised"
            >
              <span className="text-body min-w-40 flex-1 truncate font-medium">{c.original_name}</span>
              <Status value={c.risk_level} label={`${humanKey(c.risk_level)} risk`} />
              <span className={cx('w-10 text-right font-mono font-semibold tabular-nums', riskText(c.risk_level))}>
                {Math.round(c.final_score)}
              </span>
              <ChevronRight size={14} className="text-c3" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </Panel>
  )
}

/* -----------------------------------------------------------------------------
   10 — Exports + feedback
   -------------------------------------------------------------------------- */

function ExportsPanel({
  jobId,
  currentFeedback,
  onDone,
}: {
  jobId: string
  currentFeedback: string | null
  onDone: () => Promise<void>
}) {
  const [busyExport, setBusyExport] = useState<string | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)

  const base = `/api/sandbox/jobs/${jobId}/export`
  const doExport = async (fmt: 'json' | 'stix' | 'pdf') => {
    setBusyExport(fmt)
    setExportError(null)
    try {
      await downloadExport(`${base}.${fmt}`, `zorbox-${jobId}.${fmt === 'pdf' ? 'pdf' : fmt === 'stix' ? 'stix.json' : 'json'}`)
    } catch (e) {
      setExportError(e instanceof Error ? e.message : `Could not export ${fmt.toUpperCase()}`)
    } finally {
      setBusyExport(null)
    }
  }

  return (
    <Panel title="Export and feedback">
      <GroupLabel>Download report</GroupLabel>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" busy={busyExport === 'json'} onClick={() => void doExport('json')}>
          <Download size={13} aria-hidden /> JSON
        </Button>
        <Button size="sm" variant="secondary" busy={busyExport === 'stix'} onClick={() => void doExport('stix')}>
          <Download size={13} aria-hidden /> STIX
        </Button>
        <Button size="sm" variant="secondary" busy={busyExport === 'pdf'} onClick={() => void doExport('pdf')}>
          <Download size={13} aria-hidden /> PDF
        </Button>
      </div>
      {exportError && (
        <div className="mt-2" role="alert">
          <Callout tone="danger">{exportError}</Callout>
        </div>
      )}

      <div className="mt-5 border-t border-hair pt-4">
        <FeedbackControl jobId={jobId} currentFeedback={currentFeedback} onDone={onDone} />
      </div>
    </Panel>
  )
}

function FeedbackControl({
  jobId,
  currentFeedback,
  onDone,
}: {
  jobId: string
  currentFeedback: string | null
  onDone: () => Promise<void>
}) {
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  const send = async (verdict: 'false_positive' | 'true_positive') => {
    setBusy(verdict)
    setError(null)
    setDone(null)
    try {
      await api.post(`/api/sandbox/jobs/${jobId}/feedback`, { verdict, note })
      setDone(verdict === 'false_positive' ? 'Marked as a false positive.' : 'Marked as a true positive.')
      setNote('')
      await onDone()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not record feedback')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div>
      <GroupLabel>Analyst verdict</GroupLabel>
      {currentFeedback && (
        <p className="text-sm mb-2 text-c2">
          Recorded feedback: <Chip>{humanKey(currentFeedback)}</Chip>
        </p>
      )}
      <Textarea
        label="Note"
        rows={2}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        hint="Optional — why you disagree with the verdict. Feeds the dispute loop."
      />
      <div className="mt-2 flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" busy={busy === 'false_positive'} onClick={() => void send('false_positive')}>
          <ThumbsDown size={13} aria-hidden /> Mark false positive
        </Button>
        <Button size="sm" variant="secondary" busy={busy === 'true_positive'} onClick={() => void send('true_positive')}>
          <ThumbsUp size={13} aria-hidden /> Mark true positive
        </Button>
      </div>
      <div aria-live="polite">
        {done && <p className="text-sm mt-2 text-success">{done}</p>}
      </div>
      {error && (
        <div className="mt-2" role="alert">
          <Callout tone="danger">{error}</Callout>
        </div>
      )}
    </div>
  )
}
