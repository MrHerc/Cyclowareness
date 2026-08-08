/**
 * What was checked before this content could be put in front of people — and
 * what was not.
 *
 * A check the deployment cannot perform is drawn in its own state, with its own
 * word, and it is counted separately in the header. It is never folded into the
 * passes. "We did not look" and "we looked and found nothing" are different
 * facts, and this is the one screen where the difference is somebody's
 * signature.
 */

import { useT } from '../../lib/i18n'
import { CircleSlash, ShieldAlert, ShieldCheck, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { AIProvenanceBadge } from '../../components/data'
import { Badge, Panel, Separator } from '../../components/ui'
import type { Provenance } from '../../domain/types'
import { cn, humanise } from '../../lib/format'
import type { SafetyCheckState, SafetyView, SecondApprovalView } from './contract'

const CHECK_STATE: Record<SafetyCheckState, { icon: LucideIcon; tone: string; word: string }> = {
  passed: { icon: ShieldCheck, tone: 'text-safe', word: 'Passed' },
  failed: { icon: X, tone: 'text-critical', word: 'Failed' },
  not_run: { icon: CircleSlash, tone: 'text-fg-faint', word: 'Not checked' },
}

export interface SafetyPanelProps {
  safety: SafetyView
  provenance: Provenance
  generationSource: string | null
  generationLabel: string | null
  modelConnected?: boolean
  secondApproval: SecondApprovalView
}

export function SafetyPanel({
  safety,
  provenance,
  generationSource,
  generationLabel,
  modelConnected,
  secondApproval,
}: SafetyPanelProps) {
  const t = useT()
  const clean = safety.failed === 0 && safety.notRun === 0 && safety.passed > 0

  return (
    <Panel
      title={t('x.safety-and-provenance')}
      headingLevel={2}
      tone={safety.failed > 0 ? 'danger' : 'default'}
      subtitle={
        safety.checks.length === 0
          ? t('p.no-checks-were-reported-for-this')
          : `${safety.passed} passed · ${safety.failed} failed · ${safety.notRun} not run`
      }
      bodyClassName="space-y-4"
    >
      {safety.summary && (
        <p
          className={cn('text-sm', safety.failed > 0 ? 'text-critical' : clean ? 'text-fg-muted' : 'text-medium')}
          role={safety.failed > 0 ? 'alert' : undefined}
        >
          {safety.summary}
        </p>
      )}

      {safety.checks.length > 0 && (
        <ul className="space-y-3">
          {safety.checks.map((check) => {
            const spec = CHECK_STATE[check.state]
            const Icon = spec.icon
            return (
              <li key={check.name} className="flex gap-2.5">
                <Icon className={cn('mt-0.5 size-4 shrink-0', spec.tone)} aria-hidden="true" />
                <div className="min-w-0 space-y-0.5">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="text-sm text-fg">{humanise(check.name)}</span>
                    <span className={cn('text-xs', spec.tone)}>{spec.word}</span>
                  </div>
                  <p className="text-xs text-fg-subtle">{check.detail}</p>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {safety.notRun > 0 && (
        <p className="flex items-start gap-2 rounded-control border border-medium/30 bg-medium/8 px-3 py-2 text-xs text-fg-muted">
          <ShieldAlert className="mt-0.5 size-3.5 shrink-0 text-medium" aria-hidden="true" />
          {safety.notRun} of these checks could not run here. Approving is not a clean bill of
          health for what they cover.
        </p>
      )}

      <Separator fade />

      <div className="space-y-2">
        <h3 className="label text-fg-faint">{t('y.content-provenance')}</h3>
        <AIProvenanceBadge
          provenance={provenance}
          generationSource={generationSource}
          modelConnected={modelConnected}
        />
        {generationLabel && <p className="text-xs text-fg-subtle">{generationLabel}.</p>}
      </div>

      <Separator fade />

      <div className="space-y-2">
        <h3 className="label text-fg-faint">{t('y.required-approvals')}</h3>
        {secondApproval.held ? (
          <div className="space-y-1.5">
            <Badge status="awaiting_review" dot>
              {t('u.held-for-a-second-approver')}
            </Badge>
            <p className="text-xs text-fg-subtle">
              Endorsed by {secondApproval.endorsedBy.join(', ') || 'another analyst'}. The loop has
              not advanced, and the person who endorsed it cannot be the one who releases it.
            </p>
          </div>
        ) : (
          <p className="text-xs text-fg-subtle">
            {secondApproval.note ??
              t('p.one-approval-releases-this-run-use')}
          </p>
        )}
      </div>
    </Panel>
  )
}
