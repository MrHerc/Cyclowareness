/**
 * Editing the quiz, answer key included.
 *
 * The correct answer is a labelled select rather than a bare radio beside each
 * option, because the thing being chosen is a *key*, and a mis-click on a radio
 * in a column of four text boxes is silent. Choosing "Option C — <the text of
 * option C>" from a named control is not.
 *
 * The option count is fixed at four. That is not a design preference: the API
 * rejects anything else, and offering an "add option" button that always fails
 * would be a dead end.
 */

import { useT } from '../../lib/i18n'
import { Plus, Trash2 } from 'lucide-react'
import { Button, IconButton, Input, Panel, Select, Textarea } from '../../components/ui'
import { truncate } from '../../lib/format'
import {
  emptyQuestion,
  MAX_QUESTIONS,
  MIN_QUESTIONS,
  OPTIONS_PER_QUESTION,
  type DraftQuestion,
} from './moduleDraft'

export interface QuizEditorProps {
  quiz: DraftQuestion[]
  onChange: (next: DraftQuestion[]) => void
}

const LETTERS = ['A', 'B', 'C', 'D']

export function QuizEditor({ quiz, onChange }: QuizEditorProps) {
  const t = useT()
  function update(index: number, patch: Partial<DraftQuestion>) {
    onChange(quiz.map((question, i) => (i === index ? { ...question, ...patch } : question)))
  }

  function updateOption(index: number, optionIndex: number, value: string) {
    const options = quiz[index].options.map((option, i) => (i === optionIndex ? value : option))
    update(index, { options })
  }

  return (
    <Panel
      title={t('x.quiz')}
      subtitle={`${MIN_QUESTIONS} to ${MAX_QUESTIONS} questions, ${OPTIONS_PER_QUESTION} options each. The server enforces both.`}
      headingLevel={2}
      actions={
        <Button
          size="sm"
          variant="secondary"
          disabled={quiz.length >= MAX_QUESTIONS}
          onClick={() => onChange([...quiz, emptyQuestion()])}
          icon={<Plus className="size-3.5" aria-hidden="true" />}
        >
          {t('u.add-question')}
        </Button>
      }
    >
      <ol className="space-y-6">
        {quiz.map((question, index) => (
          <li
            key={index}
            className="rounded-control border border-line-subtle bg-base/40 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="label text-fg-subtle">Question {index + 1}</p>
              <IconButton
                label={`Remove question ${index + 1}`}
                size="sm"
                variant="ghost"
                disabled={quiz.length <= MIN_QUESTIONS}
                onClick={() => onChange(quiz.filter((_, i) => i !== index))}
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </IconButton>
            </div>

            <Textarea
              className="mt-3"
              label={`Question ${index + 1} text`}
              rows={2}
              value={question.question}
              onChange={(event) => update(index, { question: event.target.value })}
            />

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {question.options.map((option, optionIndex) => (
                <Input
                  key={optionIndex}
                  label={`Question ${index + 1}, option ${LETTERS[optionIndex]}`}
                  value={option}
                  onChange={(event) => updateOption(index, optionIndex, event.target.value)}
                />
              ))}
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
              <Select
                label={`Correct answer for question ${index + 1}`}
                value={String(question.correct_index)}
                onValueChange={(value) => update(index, { correct_index: Number(value) })}
                options={question.options.map((option, optionIndex) => ({
                  value: String(optionIndex),
                  label: `${LETTERS[optionIndex]} — ${truncate(option, 48) || 'empty'}`,
                }))}
              />
              <Textarea
                label={`Explanation for question ${index + 1}`}
                hint={t('p.shown-to-the-employee-after-grading')}
                rows={3}
                value={question.explanation}
                onChange={(event) => update(index, { explanation: event.target.value })}
              />
            </div>
          </li>
        ))}
      </ol>

      {quiz.length < MIN_QUESTIONS ? (
        <p role="alert" className="mt-4 text-sm text-critical">
          A quiz needs at least {MIN_QUESTIONS} questions before it can be saved.
        </p>
      ) : null}
    </Panel>
  )
}
