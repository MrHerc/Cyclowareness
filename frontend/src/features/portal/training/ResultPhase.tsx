/**
 * The result, with the working shown.
 *
 * A score alone teaches nothing. Every question is replayed with the answer
 * given, the answer expected and the explanation — including the ones answered
 * correctly, because "right for the wrong reason" is the most common way a
 * quiz flatters a programme.
 *
 * The risk movement is stated as cause and effect, using the numbers the server
 * returned rather than anything computed here. It is announced, because the
 * result replaces the quiz in place and a screen-reader user would otherwise
 * hear nothing happen.
 */

import { useT } from '../../../lib/i18n'
import { Check, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge, Button, Panel } from '../../../components/ui'
import type { QuizQuestion, QuizResult, TrainingModule } from '../../../domain/types'
import { cn, num } from '../../../lib/format'
import { riskChangeSentence } from '../riskNarrative'

export interface ResultPhaseProps {
  result: QuizResult
  module: TrainingModule
  questions: QuizQuestion[]
  /** What was submitted, so each question can show the answer given. */
  answers: (number | null)[]
}

export function ResultPhase({ result, module, questions, answers }: ResultPhaseProps) {
  const t = useT()
  return (
    <div className="space-y-6">
      <Panel tone={result.passed ? 'feature' : 'danger'} headingLevel={2}>
        <div role="status" aria-live="polite" className="space-y-3">
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
            <span className={cn('text-hero', result.passed ? 'text-safe' : 'text-critical')}>
              {num(result.score, 0)}%
            </span>
            <Badge tone={result.passed ? 'safe' : 'critical'}>
              {result.passed ? 'Passed' : 'Not passed'}
            </Badge>
          </div>
          <p className="text-lead text-fg-muted">
            You answered {result.correct} of {result.total}{' '}
            {result.total === 1 ? 'question' : 'questions'} correctly.
          </p>
          <p className="text-lead text-fg">
            {riskChangeSentence(result.risk_delta, result.new_risk_score)}
          </p>
        </div>
      </Panel>

      {module.takeaway ? (
        <Panel tone="quiet" title={t('x.the-one-thing-to-remember')} headingLevel={2}>
          <p className="text-lead text-fg">{module.takeaway}</p>
        </Panel>
      ) : null}

      <Panel title={t('x.every-question-and-why')} headingLevel={2}>
        <ol className="space-y-6">
          {result.per_question.map((outcome) => {
            const question = questions[outcome.index]
            const given = answers[outcome.index]
            const givenLabel =
              given === null || given === undefined
                ? 'No answer recorded'
                : (question?.options[given] ?? `Option ${given + 1}`)
            const expectedLabel =
              question?.options[outcome.correct_index] ?? `Option ${outcome.correct_index + 1}`

            return (
              <li key={outcome.index} className="border-t border-line-subtle pt-5 first:border-0 first:pt-0">
                <div className="flex items-start gap-3">
                  {outcome.correct ? (
                    <Check className="mt-0.5 size-4 shrink-0 text-safe" aria-hidden="true" />
                  ) : (
                    <X className="mt-0.5 size-4 shrink-0 text-critical" aria-hidden="true" />
                  )}
                  <div className="min-w-0 space-y-2">
                    <p className="text-body text-fg">
                      <span className="sr-only">
                        {outcome.correct ? 'Correct. ' : 'Incorrect. '}
                      </span>
                      {question?.question ?? `Question ${outcome.index + 1}`}
                    </p>

                    <p className="text-sm text-fg-muted">
                      <span className="text-fg-subtle">You answered: </span>
                      <span className={outcome.correct ? 'text-safe' : 'text-critical'}>
                        {givenLabel}
                      </span>
                    </p>

                    {!outcome.correct ? (
                      <p className="text-sm text-fg-muted">
                        <span className="text-fg-subtle">The answer was: </span>
                        <span className="text-safe">{expectedLabel}</span>
                      </p>
                    ) : null}

                    {outcome.explanation ? (
                      <p className="text-body text-fg-muted">{outcome.explanation}</p>
                    ) : (
                      <p className="text-sm text-fg-faint">{t('p.no-explanation-was-recorded-for-this')}</p>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ol>
      </Panel>

      <div className="flex justify-end">
        <Button asChild variant="primary" size="lg">
          <Link to="/portal">Back to my security</Link>
        </Button>
      </div>
    </div>
  )
}
