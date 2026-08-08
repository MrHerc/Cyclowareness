/**
 * The lesson: what this threat looked like, and what to do about it.
 *
 * Sections come from the module exactly as approved — this component adds no
 * headings, no framing and no encouragement of its own, because an analyst
 * signed off on those words at the gate and anything wrapped around them was
 * never reviewed.
 *
 * The "report a concern" action is here on purpose. Someone reading a lesson
 * about invoice fraud is the person most likely to remember the invoice they
 * were sent last week, and making them leave the page to say so loses it.
 */

import { useT } from '../../../lib/i18n'
import { Flag, MessageSquareWarning } from 'lucide-react'
import { Button, Panel } from '../../../components/ui'
import type { TrainingModule } from '../../../domain/types'

export interface LessonPhaseProps {
  module: TrainingModule
  onReportConcern: () => void
  onContinue: () => void
  /** How many questions are waiting, so the button is not a surprise. */
  questionCount: number
}

export function LessonPhase({
  module,
  onReportConcern,
  onContinue,
  questionCount,
}: LessonPhaseProps) {
  const t = useT()
  return (
    <div className="space-y-6">
      <Panel title={module.title} subtitle={module.description} headingLevel={2}>
        {module.content.length === 0 ? (
          <p className="text-body text-fg-subtle">
            This module has no lesson sections recorded. Go straight to the questions, or ask your
            security team what was intended here.
          </p>
        ) : (
          <div className="space-y-6">
            {module.content.map((section) => (
              <section key={section.heading}>
                <h3 className="text-h text-fg">{section.heading}</h3>
                <p className="mt-2 whitespace-pre-line text-body text-fg-muted">{section.body}</p>
              </section>
            ))}
          </div>
        )}
      </Panel>

      {module.takeaway ? (
        <Panel tone="quiet" headingLevel={2} title={t('x.the-one-thing-to-remember')}>
          <p className="text-lead text-fg">{module.takeaway}</p>
        </Panel>
      ) : null}

      <Panel tone="quiet" headingLevel={2}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-2.5">
            <MessageSquareWarning
              className="mt-0.5 size-4 shrink-0 text-fg-subtle"
              aria-hidden="true"
            />
            <div className="min-w-0">
              <p className="text-body text-fg">{t('p.has-this-happened-to-you')}</p>
              <p className="mt-1 text-sm text-fg-subtle">{t('p.if-anything-here-reminds-you-of')}</p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={onReportConcern}
            icon={<Flag className="size-4" aria-hidden="true" />}
          >
            {t('u.report-a-concern')}
          </Button>
        </div>

        <p className="mt-4 border-t border-line-subtle pt-3 text-xs text-fg-faint">{t('p.this-module-is-not-linked-to')}</p>
      </Panel>

      <div className="flex justify-end">
        <Button variant="primary" size="lg" onClick={onContinue}>
          {questionCount > 0
            ? `Go to the questions (${questionCount})`
            : 'Continue'}
        </Button>
      </div>
    </div>
  )
}
