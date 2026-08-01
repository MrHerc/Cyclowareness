/**
 * What the sandbox can actually do in this deployment.
 *
 * This pill exists for one sentence: **"static only"**. Dynamic detonation runs
 * on a separate host that is not always attached, and a product that shows a
 * sandbox icon without qualifying it invites a viewer to assume files are being
 * executed when they are not. `dynamic_worker` is the server's own answer, and
 * the pill repeats it rather than inferring anything.
 */

import { Boxes } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Tooltip } from '../ui'
import { cn } from '../../lib/format'
import { useSandboxCapabilities } from '../../lib/api/queries'

export interface SandboxStatusPillProps {
  className?: string
}

const PILL =
  'inline-flex items-center gap-1.5 rounded-chip border border-line px-2 py-0.5 text-xs whitespace-nowrap transition-colors hover:border-line-strong hover:bg-raised'

export function SandboxStatusPill({ className }: SandboxStatusPillProps) {
  const { data, isPending, isError } = useSandboxCapabilities()

  if (isPending || isError) {
    return (
      <Tooltip
        content={
          isError
            ? 'The sandbox did not report its capabilities. Treat its availability as unknown rather than assuming either answer.'
            : 'Asking the sandbox what it can do.'
        }
      >
        <span
          className={cn(
            PILL,
            'border-dashed text-fg-faint hover:border-line hover:bg-transparent',
            className,
          )}
        >
          <Boxes className="size-3.5 shrink-0" aria-hidden="true" strokeWidth={1.75} />
          {isError ? 'Sandbox unknown' : 'Sandbox'}
        </span>
      </Tooltip>
    )
  }

  const dynamic = data.dynamic_worker
  const analyzers = data.static_analyzers.length
  const yara = data.yara.loaded

  return (
    <Tooltip
      content={
        <span className="block space-y-1">
          <span className="block">
            {dynamic
              ? 'Static analysis and dynamic detonation are both available.'
              : 'Static analysis only. No detonation host is attached, so nothing submitted here is executed — reports say "not run" rather than "clean".'}
          </span>
          <span className="block text-fg-subtle">
            {analyzers} static {analyzers === 1 ? 'analyzer' : 'analyzers'} · {yara} YARA{' '}
            {yara === 1 ? 'rule' : 'rules'} loaded
          </span>
        </span>
      }
    >
      <Link to="/sandbox" className={cn(PILL, 'text-fg-muted', className)}>
        <Boxes
          className={cn('size-3.5 shrink-0', dynamic ? 'text-brand' : 'text-fg-subtle')}
          aria-hidden="true"
          strokeWidth={1.75}
        />
        {dynamic ? 'Sandbox: full' : 'Sandbox: static only'}
      </Link>
    </Tooltip>
  )
}
