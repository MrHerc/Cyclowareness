/**
 * The verdict, and the identity of the thing it is a verdict about.
 *
 * The score is stated as "out of 100" in words rather than as a bare number
 * beside a coloured word: a reader who has never seen this product has no way to
 * know whether 62 is high or low, and a forensic report that needs a legend has
 * failed at its first job.
 *
 * The extension mismatch is spelled out rather than badged. "Extension
 * mismatch" is jargon; "the contents are a Windows executable, but it was
 * submitted as invoice.pdf" is the finding.
 */

import { FileWarning } from 'lucide-react'
import type { ReactNode } from 'react'
import type { SandboxJobDetail } from '../../domain/types'
import { CopyButton, Panel, StatusDot, TONE_TEXT, statusTone } from '../../components/ui'
import { bytes, cn, defang, duration, formatDateTime, humanise, num } from '../../lib/format'
import { isScored } from './shared'

export interface VerdictHeaderProps {
  job: SandboxJobDetail
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-0.5 py-2 sm:grid-cols-[9rem_1fr] sm:gap-4">
      <dt className="text-sm text-fg-subtle">{label}</dt>
      <dd className="min-w-0 text-sm text-fg">{children}</dd>
    </div>
  )
}

function Hash({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex min-w-0 items-center gap-1">
      <span className="tech truncate">{value || '—'}</span>
      {value ? <CopyButton value={value} label={`Copy the ${label}`} /> : null}
    </span>
  )
}

export function VerdictHeader({ job }: VerdictHeaderProps) {
  const scored = isScored(job)
  const tone = statusTone(job.risk_level)
  const name = job.original_name || 'Unnamed sample'

  return (
    <Panel tone={job.extension_mismatch ? 'danger' : 'default'}>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,16rem)_minmax(0,1fr)]">
        <div className="min-w-0">
          <p className="label text-fg-subtle">Verdict</p>
          {scored ? (
            <>
              <p className={cn('mt-2 text-hero', TONE_TEXT[tone])}>{humanise(job.risk_level)}</p>
              <p className="mt-1 text-lead text-fg-muted">
                <span className="text-fg">{num(job.final_score, 0)}</span> out of 100
              </p>
            </>
          ) : (
            <>
              <p className="mt-2 text-title text-fg">No verdict yet</p>
              <div className="mt-2">
                <StatusDot status={job.status} />
              </div>
              <p className="mt-2 text-sm text-fg-subtle">
                Nothing is scored until the analysis finishes. This job has no risk level to report.
              </p>
            </>
          )}

          <p className="mt-4 text-xs text-fg-faint">
            Bands are fixed: 0–29 low, 30–59 medium, 60–79 high, 80–100 critical.
          </p>
        </div>

        <div className="min-w-0">
          {/* h1: this IS the page. The route rendered no h1 at all, so the
              report opened with no title in the document outline. */}
          <h1 className="truncate text-title text-fg" title={name}>
            {name}
          </h1>

          <dl className="divide-line mt-3">
            {job.submitted_url ? (
              <Fact label="Submitted URL">
                {/* Defanged and never a link. This is an address the engine
                    downloaded on purpose; the report must not offer to open it
                    again, and a stray click on a live malicious URL from inside
                    an analyst tool is a real incident. */}
                <span className="tech break-all">{defang(job.submitted_url)}</span>
                <CopyButton value={job.submitted_url} label="Copy the original URL" />
              </Fact>
            ) : null}
            <Fact label="SHA-256">
              <Hash label="SHA-256 hash" value={job.sha256} />
            </Fact>
            <Fact label="MD5">
              <Hash label="MD5 hash" value={job.md5} />
            </Fact>
            <Fact label="Size">{bytes(job.size_bytes)}</Fact>
            <Fact label="Content type">
              <span className="tech break-words">{job.mime || 'unknown'}</span>
              {job.magic ? (
                <span className="mt-0.5 block text-xs text-fg-subtle">{job.magic}</span>
              ) : null}
            </Fact>
            <Fact label="Family">{humanise(job.family)}</Fact>
            {job.archive_path ? (
              <Fact label="Inside archive">
                <span className="tech break-all">{job.archive_path}</span>
              </Fact>
            ) : null}
            <Fact label="Submitted">
              {formatDateTime(job.created_at)}
              <span className="ml-2 text-fg-subtle">via {humanise(job.source)}</span>
            </Fact>
            <Fact label="Analysis time">
              {job.duration_ms === null ? (
                <span className="text-fg-faint">Not recorded</span>
              ) : (
                duration(job.duration_ms)
              )}
            </Fact>
          </dl>
        </div>
      </div>

      {job.extension_mismatch ? (
        <div className="mt-5 flex items-start gap-3 rounded-panel border border-critical/40 bg-critical/8 p-4">
          <FileWarning
            className="mt-0.5 size-5 shrink-0 text-critical"
            aria-hidden="true"
            strokeWidth={1.75}
          />
          <div className="min-w-0">
            <h3 className="text-h text-fg">The content contradicts the name it was given</h3>
            <p className="mt-1 text-body text-fg-muted">
              What is actually inside this file{' '}
              {job.magic ? (
                <>
                  (<span className="tech">{job.magic}</span>)
                </>
              ) : null}{' '}
              does not match the extension the submitter claimed. Disguising a file type is a
              decision someone made, not an accident of packaging, and the score weights it as one.
            </p>
          </div>
        </div>
      ) : null}
    </Panel>
  )
}
