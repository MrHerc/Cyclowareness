/**
 * The three states a job can be in that are not "here is your report".
 *
 * Each one says what the engine is doing or waiting for, and what the reader can
 * do about it. None of them shows a partial verdict: a job that has not finished
 * scoring has no risk level, and rendering the row's default `low / 0` while it
 * works would be the most flattering possible lie about a sample nobody has
 * finished looking at.
 */

import { useState, type FormEvent } from 'react'
import { KeyRound, RotateCw, TriangleAlert } from 'lucide-react'
import type { SandboxJobDetail } from '../../domain/types'
import { useSandboxPassword, useSandboxReanalyze } from '../../lib/api/mutations'
import { Button, CodeBlock, Input, Panel } from '../../components/ui'
import { humanise } from '../../lib/format'

/* ============================================================================
   Queued and running
   ========================================================================== */

export function ProgressPanel({ job }: { job: SandboxJobDetail }) {
  return (
    <Panel title="Analysis in progress" tone="feature">
      <p className="text-body text-fg-muted">
        {job.status === 'queued'
          ? 'The sample is quarantined and waiting for a worker.'
          : `The engine is working through this sample. Current stage: ${humanise(job.stage) || 'starting'}.`}
      </p>
      <div
        aria-hidden="true"
        className="scan relative mt-4 h-1 overflow-hidden rounded-chip bg-raised"
      />
      <p aria-live="polite" className="mt-3 text-sm text-fg-subtle">
        {`Stage: ${humanise(job.stage) || 'queued'}. This page refreshes itself until the job settles.`}
      </p>
    </Panel>
  )
}

/* ============================================================================
   Awaiting a password
   ========================================================================== */

export function PasswordPrompt({ job }: { job: SandboxJobDetail }) {
  const [password, setPassword] = useState('')
  const supply = useSandboxPassword()

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!password) return
    supply.mutate({ publicId: job.public_id, password })
  }

  return (
    <Panel title="This archive is encrypted" tone="feature">
      <div className="flex items-start gap-3">
        <KeyRound className="mt-0.5 size-5 shrink-0 text-medium" aria-hidden="true" strokeWidth={1.75} />
        <div className="min-w-0 flex-1 space-y-4">
          <div className="space-y-2">
            <p className="text-body text-fg-muted">
              Analysis stopped rather than continuing on a container it cannot open. The engine does
              not guess passwords and does not brute-force them — supplying one is a deliberate
              analyst action, and it is recorded as such.
            </p>
            <p className="text-body text-fg-muted">
              The password is used once, for this run, and is never stored.
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-3">
            <Input
              label="Archive password"
              type="password"
              autoComplete="off"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="max-w-sm"
              required
            />

            {supply.error ? (
              <p role="alert" className="text-sm text-critical">
                {supply.error.message}
              </p>
            ) : null}

            <Button
              type="submit"
              variant="primary"
              loading={supply.isPending}
              disabled={!password}
            >
              Unlock and continue
            </Button>
          </form>
        </div>
      </div>
    </Panel>
  )
}

/* ============================================================================
   Failed
   ========================================================================== */

export function FailurePanel({ job }: { job: SandboxJobDetail }) {
  const reanalyze = useSandboxReanalyze()

  return (
    <Panel title="Analysis failed" tone="danger">
      <div className="flex items-start gap-3">
        <TriangleAlert
          className="mt-0.5 size-5 shrink-0 text-critical"
          aria-hidden="true"
          strokeWidth={1.75}
        />
        <div className="min-w-0 flex-1 space-y-4">
          <p className="text-body text-fg-muted">
            The engine stopped part-way through and produced no verdict. The sample is still
            quarantined, so the run can be repeated on exactly the same bytes.
          </p>

          <CodeBlock
            value={job.error ?? 'The job failed without recording a reason.'}
            label="What the engine reported"
            copyable
            wrap
          />

          {reanalyze.error ? (
            <p role="alert" className="text-sm text-critical">
              {reanalyze.error.message}
            </p>
          ) : null}

          <Button
            variant="secondary"
            icon={<RotateCw className="size-4" aria-hidden="true" strokeWidth={1.75} />}
            loading={reanalyze.isPending}
            onClick={() => reanalyze.mutate(job.public_id)}
          >
            Run the analysis again
          </Button>
        </div>
      </div>
    </Panel>
  )
}
