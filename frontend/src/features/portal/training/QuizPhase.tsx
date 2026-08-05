/**
 * One question at a time, and never submitted by accident.
 *
 * Two rules this component exists to hold.
 *
 * 1. **Nothing is submitted without an explicit act.** An earlier version graded
 *    the quiz when the last option was chosen, so one misclick applied an
 *    irreversible score change to a real person. Grading now takes a deliberate
 *    button and then a confirmation, and the confirmation says plainly that it
 *    cannot be undone.
 *
 * 2. **Answers live in the parent.** Moving between questions, or back to the
 *    lesson, must not lose work. This component holds no answer state at all —
 *    it only reports choices upward.
 *
 * The progress dots are real buttons with real names, because they are the only
 * way to reach question four directly and "button" is not a name.
 */

import { useT } from '../../../lib/i18n'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { ConfirmationDialog, ErrorState } from '../../../components/states'
import { Button, Panel, Progress, RadioGroup } from '../../../components/ui'
import type { QuizQuestion } from '../../../domain/types'
import { cn } from '../../../lib/format'

export interface QuizPhaseProps {
  questions: QuizQuestion[]
  /** One entry per question. `null` means unanswered — never 0. */
  answers: (number | null)[]
  index: number
  onIndex: (index: number) => void
  onAnswer: (questionIndex: number, optionIndex: number) => void
  onBackToLesson: () => void
  onSubmit: () => void
  submitting: boolean
  /** Set when grading failed. The answers are still held. */
  error?: unknown
  confirmOpen: boolean
  onConfirmOpenChange: (open: boolean) => void
}

export function QuizPhase({
  questions,
  answers,
  index,
  onIndex,
  onAnswer,
  onBackToLesson,
  onSubmit,
  submitting,
  error,
  confirmOpen,
  onConfirmOpenChange,
}: QuizPhaseProps) {
  const t = useT()
  const question = questions[index]
  const answered = answers.filter((answer) => answer !== null).length
  const unanswered = answers
    .map((answer, position) => (answer === null ? position + 1 : null))
    .filter((position): position is number => position !== null)
  const complete = unanswered.length === 0
  const isLast = index === questions.length - 1

  if (!question) {
    return (
      <Panel title={t('x.this-module-has-no-questions')}>
        <p className="text-body text-fg-muted">
          No quiz was recorded against this module, so there is nothing to answer. Your security
          team can tell you whether that is intended.
        </p>
      </Panel>
    )
  }

  return (
    <div className="space-y-6">
      <Panel
        title={`Question ${index + 1} of ${questions.length}`}
        subtitle={t('x.answer-every-question-then-submit')}
        headingLevel={2}
      >
        <div className="space-y-6">
          <Progress
            value={(answered / questions.length) * 100}
            label={`${answered} of ${questions.length} questions answered`}
            showLabel
            showValue
            tone="brand"
          />

          <nav aria-label="Questions" className="flex flex-wrap gap-2">
            {questions.map((_, position) => {
              const isAnswered = answers[position] !== null
              const isCurrent = position === index
              return (
                <button
                  key={position}
                  type="button"
                  onClick={() => onIndex(position)}
                  aria-current={isCurrent ? 'step' : undefined}
                  aria-label={`Question ${position + 1}, ${isAnswered ? 'answered' : 'not answered'}`}
                  className={cn(
                    'h-8 w-8 rounded-control border text-sm tabular-nums transition-colors duration-150',
                    isCurrent
                      ? 'border-brand text-brand'
                      : isAnswered
                        ? 'border-line-strong bg-raised text-fg'
                        : 'border-line text-fg-faint hover:border-line-strong hover:text-fg-muted',
                  )}
                >
                  {position + 1}
                </button>
              )
            })}
          </nav>

          <RadioGroup
            key={index}
            label={question.question}
            name={`question-${index}`}
            options={question.options.map((option, position) => ({
              value: String(position),
              label: option,
            }))}
            value={answers[index] === null ? '' : String(answers[index])}
            onValueChange={(value) => onAnswer(index, Number(value))}
          />
        </div>
      </Panel>

      {error ? (
        <ErrorState
          compact
          error={error}
          title={t('x.your-answers-were-not-graded')}
          onRetry={onSubmit}
        />
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          variant="ghost"
          onClick={index === 0 ? onBackToLesson : () => onIndex(index - 1)}
          icon={<ChevronLeft className="size-4" aria-hidden="true" />}
        >
          {index === 0 ? 'Back to the lesson' : 'Previous'}
        </Button>

        <div className="flex items-center gap-3">
          {isLast ? (
            <Button
              variant="primary"
              size="lg"
              disabled={!complete}
              onClick={() => onConfirmOpenChange(true)}
            >
              Submit answers
            </Button>
          ) : (
            <Button
              variant="secondary"
              onClick={() => onIndex(index + 1)}
              icon={<ChevronRight className="size-4" aria-hidden="true" />}
            >
              Next
            </Button>
          )}
        </div>
      </div>

      <p aria-live="polite" className="text-sm text-fg-subtle">
        {complete
          ? 'Every question is answered. Submitting grades them and cannot be undone.'
          : `Still to answer: ${unanswered.map((position) => `question ${position}`).join(', ')}.`}
      </p>

      <ConfirmationDialog
        open={confirmOpen}
        onOpenChange={onConfirmOpenChange}
        title={t('x.submit-your-answers')}
        description={t('x.your-answers-are-graded-now')}
        confirmLabel="Submit and grade"
        cancelLabel="Keep checking"
        onConfirm={onSubmit}
        busy={submitting}
      />
    </div>
  )
}
