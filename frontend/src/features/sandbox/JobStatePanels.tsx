/**
 * The three states a job can be in that are not "here is your report".
 *
 * Each one says what the engine is doing or waiting for, and what the reader can
 * do about it. None of them shows a partial verdict: a job that has not finished
 * scoring has no risk level, and rendering the row's default `low / 0` while it
 * works would be the most flattering possible lie about a sample nobody has
 * finished looking at.
 */

import { useT } from '../../lib/i18n'
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
  const t = useT()
  return (
    <Panel title={t('x.analysis-in-progress')} tone="feature">
      <p className="text-body text-fg-muted">
        {job.status === 'queued'
          ? t('p.the-sample-is-quarantined-and-waiting')
          : `The engine is working through this sample. Current stage: ${humanise(job.stage) || 'starting'}.`}
      </p>
      <div
        aria-hidden="true"
        className="scan relative mt-4 h-1 overflow-hidden rounded-chip bg-raised"
      />
      {/* The live region is NOT here. This panel unmounts the instant the job
          settles, which is the exact moment there is something worth announcing
          — so a screen reader heard every intermediate stage and never the
          verdict. It lives in SandboxDetail, which persists across the
          transition. */}
      <p className="mt-3 text-sm text-fg-subtle">
        {`Stage: ${humanise(job.stage) || 'queued'}. This page refreshes itself until the job settles.`}
      </p>
    </Panel>
  )
}

/* ============================================================================
   Awaiting a password
   ========================================================================== */

export function PasswordPrompt({ job }: { job: SandboxJobDetail }) {
  const t = useT()
  const [password, setPassword] = useState('')
  const supply = useSandboxPassword()

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!password) return
    supply.mutate({ publicId: job.public_id, password })
  }

  return (
    <Panel title={t('x.this-archive-is-encrypted')} tone="feature">
      <div className="flex items-start gap-3">
        <KeyRound className="mt-0.5 size-5 shrink-0 text-medium" aria-hidden="true" strokeWidth={1.75} />
        <div className="min-w-0 flex-1 space-y-4">
          <div className="space-y-2">
            <p className="text-body text-fg-muted">{t('p.analysis-stopped-rather-than-continuing-on')}</p>
            <p className="text-body text-fg-muted">{t('p.the-password-is-used-once-for')}</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-3">
            <Input
              label={t('p.archive-password')}
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
  const t = useT()
  const reanalyze = useSandboxReanalyze()

  return (
    <Panel title={t('x.analysis-failed')} tone="danger">
      <div className="flex items-start gap-3">
        <TriangleAlert
          className="mt-0.5 size-5 shrink-0 text-critical"
          aria-hidden="true"
          strokeWidth={1.75}
        />
        <div className="min-w-0 flex-1 space-y-4">
          <p className="text-body text-fg-muted">{t('p.the-engine-stopped-partway-through-and')}</p>

          <CodeBlock
            value={job.error ?? t('p.the-job-failed-without-recording-a')}
            label={t('p.what-the-engine-reported')}
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
