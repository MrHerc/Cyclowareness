/**
 * The module exactly as an employee meets it — plus the answer key.
 *
 * The employee payload has `correct_index` and `explanation` stripped by the
 * API before it ever leaves the server, so this is the only place either is
 * visible. That asymmetry is worth showing rather than hiding: the analyst
 * approving the content is approving the key too, and a wrong key is a training
 * module that punishes the right answer.
 */

import { useT } from '../../lib/i18n'
import { Check } from 'lucide-react'
import { Badge, Panel } from '../../components/ui'
import type { TrainingModule } from '../../domain/types'
import { cn, num } from '../../lib/format'
import { PLATFORM_PASS_MARK } from './moduleDraft'

export interface ModuleReaderProps {
  module: TrainingModule
}

export function ModuleReader({ module }: ModuleReaderProps) {
  const t = useT()
  const sections = module.content ?? []
  const quiz = module.quiz ?? []

  return (
    <div className="space-y-6">
      <Panel title={t('x.what-the-employee-reads')} headingLevel={2}>
        <p className="text-lead text-fg">{module.description}</p>

        {sections.length === 0 ? (
          <p className="mt-4 text-sm text-fg-faint">{t('p.this-module-has-no-sections-an')}</p>
        ) : (
          <div className="mt-5 space-y-6">
            {sections.map((section, index) => (
              <section key={`${section.heading}-${index}`}>
                <h3 className="text-h text-fg">{section.heading}</h3>
                <p className="mt-2 whitespace-pre-wrap text-body text-fg-muted">{section.body}</p>
              </section>
            ))}
          </div>
        )}

        {module.takeaway ? (
          <div className="mt-6 rounded-control border border-brand/25 bg-brand/8 px-4 py-3">
            <p className="label text-brand">Takeaway</p>
            <p className="mt-1 text-body text-fg">{module.takeaway}</p>
          </div>
        ) : null}
      </Panel>

      <Panel
        title={t('x.quiz-and-answer-key')}
        subtitle={`${num(quiz.length)} ${quiz.length === 1 ? 'question' : 'questions'} · graded against a fixed platform pass mark of ${PLATFORM_PASS_MARK}%`}
        headingLevel={2}
      >
        {quiz.length === 0 ? (
          <p className="text-sm text-fg-faint">{t('p.no-questions-are-attached-so-nothing')}</p>
        ) : (
          <ol className="space-y-6">
            {quiz.map((question, index) => (
              <li key={`${question.question}-${index}`}>
                <p className="text-body text-fg">
                  <span className="text-fg-faint">{index + 1}. </span>
                  {question.question}
                </p>
                <ul className="mt-2 space-y-1.5">
                  {(question.options ?? []).map((option, optionIndex) => {
                    const correct = question.correct_index === optionIndex
                    return (
                      <li
                        key={`${option}-${optionIndex}`}
                        className={cn(
                          'flex items-start gap-2 rounded-chip px-2 py-1 text-sm',
                          correct ? 'bg-safe/10 text-fg' : 'text-fg-muted',
                        )}
                      >
                        <span className="mt-0.5 w-4 shrink-0 text-center text-xs text-fg-faint">
                          {correct ? (
                            <Check className="size-3.5 text-safe" aria-hidden="true" />
                          ) : (
                            String.fromCharCode(65 + optionIndex)
                          )}
                        </span>
                        <span>{option}</span>
                        {correct ? (
                          <Badge tone="safe" size="sm" className="ml-auto shrink-0">
                            Correct
                          </Badge>
                        ) : null}
                      </li>
                    )
                  })}
                </ul>
                {question.correct_index === undefined ? (
                  <p className="mt-2 text-xs text-critical" role="alert">{t('p.no-correct-answer-is-recorded-for')}</p>
                ) : null}
                {question.explanation ? (
                  <p className="mt-2 text-sm text-fg-subtle">
                    <span className="text-fg-faint">Shown after grading: </span>
                    {question.explanation}
                  </p>
                ) : (
                  <p className="mt-2 text-sm text-fg-faint">{t('p.no-explanation-is-recorded-the-employee')}</p>
                )}
              </li>
            ))}
          </ol>
        )}
      </Panel>
    </div>
  )
}
