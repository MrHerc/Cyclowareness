/**
 * Which deployment am I looking at — demonstration or production?
 *
 * The single most damaging thing this shell could do is let a seeded world pass
 * for a live one, so the answer is always on screen and it is always the
 * server's answer, never a build-time guess. Three states, and the third is the
 * point: until `/api/capabilities` has replied, the indicator says it does not
 * know yet rather than defaulting to "Production" and being right most of the
 * time.
 *
 * No risk hue is used. "This is a demo" is a fact about the deployment, not a
 * finding about the organisation, and amber here would compete with every real
 * severity on the screen behind it.
 */

import { useT } from '../../lib/i18n'
import { FlaskConical, HelpCircle, ShieldCheck } from 'lucide-react'
import { Tooltip } from '../ui'
import { cn } from '../../lib/format'
import { useCapabilities } from '../../lib/api/queries'

export interface EnvironmentIndicatorProps {
  className?: string
}

const PILL =
  'inline-flex items-center gap-1.5 rounded-chip border px-2 py-0.5 text-xs whitespace-nowrap'

export function EnvironmentIndicator({ className }: EnvironmentIndicatorProps) {
  const t = useT()
  const { data, isPending, isError } = useCapabilities()

  if (isPending || isError) {
    return (
      <Tooltip
        content={
          isError
            ? t('p.the-platform-did-not-answer-the')
            : t('p.asking-the-api-which-environment-this')
        }
      >
        <span className={cn(PILL, 'border-dashed border-line text-fg-faint', className)}>
          <HelpCircle className="size-3.5 shrink-0" aria-hidden="true" strokeWidth={1.75} />
          {isError ? 'Environment unknown' : 'Checking environment'}
        </span>
      </Tooltip>
    )
  }

  const demo = data.demo_mode
  const modelConnected = data.ai_provider === 'anthropic'

  return (
    <Tooltip
      content={
        <span className="block space-y-1">
          <span className="block">
            {demo
              ? t('p.demonstration-deployment-the-organisation-is-see')
              : t('p.production-deployment-every-record-on-screen')}
          </span>
          <span className="block text-fg-subtle">
            {modelConnected
              ? t('p.a-language-model-is-connected-generated')
              : t('p.no-language-model-is-connected-generated')}
          </span>
          <span className="block text-fg-subtle">Analyzer: {data.analyzer}</span>
        </span>
      }
    >
      <span
        className={cn(
          PILL,
          demo ? 'border-dashed border-line-strong text-fg-subtle' : 'border-line text-fg-muted',
          className,
        )}
      >
        {demo ? (
          <FlaskConical className="size-3.5 shrink-0" aria-hidden="true" strokeWidth={1.75} />
        ) : (
          <ShieldCheck className="size-3.5 shrink-0" aria-hidden="true" strokeWidth={1.75} />
        )}
        {demo ? 'Demo' : 'Production'}
      </span>
    </Tooltip>
  )
}
