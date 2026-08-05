/**
 * Editing generated content before it is approved.
 *
 * Structural changes are deliberately absent: sections and questions can be
 * rewritten, not added or removed. The server validates a quiz of three to five
 * questions with exactly four options each, and an editor that lets an analyst
 * build a shape the grader will refuse would fail at save time with nothing
 * useful to say about it.
 *
 * Every keystroke here changes what the approval means. The provenance flips
 * from whatever wrote the module to analyst-edited the moment the values differ
 * from the server's, and the banner at the top of the form says so — a person
 * putting their name to this content is also taking authorship of it.
 */

import { useT } from '../../lib/i18n'
import { PenLine } from 'lucide-react'
import { Button, Input, RadioGroup, Panel, Separator, Textarea } from '../../components/ui'
import type { ModuleEdits } from './draft'

export interface ModuleEditorProps {
  value: ModuleEdits
  onChange: (next: ModuleEdits) => void
  onSave: () => void
  onCancel: () => void
  saving: boolean
  /** The server's message when a save was refused. */
  error: string | null
  dirty: boolean
}

export function ModuleEditor({
  value,
  onChange,
  onSave,
  onCancel,
  saving,
  error,
  dirty,
}: ModuleEditorProps) {
  const t = useT()
  const setField = <K extends keyof ModuleEdits>(key: K, next: ModuleEdits[K]) =>
    onChange({ ...value, [key]: next })

  const setSection = (index: number, patch: Partial<{ heading: string; body: string }>) =>
    setField(
      'content',
      value.content.map((section, i) => (i === index ? { ...section, ...patch } : section)),
    )

  const setQuestion = (
    index: number,
    patch: Partial<{ question: string; explanation: string; correct_index: number }>,
  ) => setField('quiz', value.quiz.map((q, i) => (i === index ? { ...q, ...patch } : q)))

  const setOption = (questionIndex: number, optionIndex: number, next: string) =>
    setField(
      'quiz',
      value.quiz.map((q, i) =>
        i === questionIndex
          ? { ...q, options: q.options.map((option, o) => (o === optionIndex ? next : option)) }
          : q,
      ),
    )

  return (
    <Panel
      title={t('x.edit-the-generated-content')}
      subtitle={t('x.saved-to-the-module-before')}
      headingLevel={2}
      bodyClassName="space-y-6"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-fg-faint">
            {dirty
              ? 'Changed. Saving rewrites the module and marks it analyst-edited.'
              : 'No changes yet.'}
          </span>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onCancel} disabled={saving}>
              Discard changes
            </Button>
            <Button variant="primary" onClick={onSave} loading={saving} disabled={!dirty}>
              Save content
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex items-start gap-2 rounded-control border border-ai/30 bg-ai/5 px-3 py-2">
        <PenLine className="mt-0.5 size-4 shrink-0 text-ai" aria-hidden="true" />
        <p className="text-sm text-fg-muted">
          Saving marks this module as analyst-edited for this review, so it is no longer presented
          as machine output. The module record stores which engine generated it and not whether a
          person rewrote it — put what you changed in the decision comment, because that is what
          the audit trail keeps.
        </p>
      </div>

      {error && (
        <p role="alert" className="rounded-control border border-critical/40 bg-critical/10 px-3 py-2 text-sm text-critical">
          {error}
        </p>
      )}

      <div className="space-y-4">
        <Input
          label="Title"
          value={value.title}
          onChange={(event) => setField('title', event.target.value)}
        />
        <Textarea
          label="Description"
          rows={3}
          value={value.description}
          onChange={(event) => setField('description', event.target.value)}
        />
      </div>

      <Separator fade />

      <div className="space-y-5">
        <h3 className="label text-fg-faint">{t('y.lesson-sections')}</h3>
        {value.content.length === 0 ? (
          <p className="text-sm text-fg-subtle">This module has no sections to edit.</p>
        ) : (
          value.content.map((section, index) => (
            <div key={index} className="space-y-3 rounded-control border border-line-subtle p-4">
              <Input
                label={`Section ${index + 1} heading`}
                value={section.heading}
                onChange={(event) => setSection(index, { heading: event.target.value })}
              />
              <Textarea
                label={`Section ${index + 1} body`}
                rows={5}
                value={section.body}
                onChange={(event) => setSection(index, { body: event.target.value })}
              />
            </div>
          ))
        )}
      </div>

      <Separator fade />

      <div className="space-y-5">
        <h3 className="label text-fg-faint">{t('y.quiz')}</h3>
        {value.quiz.length === 0 ? (
          <p className="text-sm text-critical">
            This module has no quiz. It cannot be completed by an employee.
          </p>
        ) : (
          value.quiz.map((question, index) => (
            <div key={index} className="space-y-3 rounded-control border border-line-subtle p-4">
              <Textarea
                label={`Question ${index + 1}`}
                rows={2}
                value={question.question}
                onChange={(event) => setQuestion(index, { question: event.target.value })}
              />

              <div className="space-y-2">
                {question.options.map((option, optionIndex) => (
                  <Input
                    key={optionIndex}
                    label={`Option ${optionIndex + 1}`}
                    value={option}
                    onChange={(event) => setOption(index, optionIndex, event.target.value)}
                  />
                ))}
              </div>

              <RadioGroup
                label="Correct answer"
                orientation="horizontal"
                value={question.correct_index !== undefined ? String(question.correct_index) : undefined}
                onValueChange={(next) => setQuestion(index, { correct_index: Number(next) })}
                options={question.options.map((_, optionIndex) => ({
                  value: String(optionIndex),
                  label: `Option ${optionIndex + 1}`,
                }))}
                hint="Never sent to the employee. It is what the grader scores against."
              />

              <Textarea
                label="Explanation shown after answering"
                rows={2}
                value={question.explanation ?? ''}
                onChange={(event) => setQuestion(index, { explanation: event.target.value })}
              />
            </div>
          ))
        )}
      </div>

      <Separator fade />

      <Textarea
        label="Take away"
        rows={3}
        value={value.takeaway}
        onChange={(event) => setField('takeaway', event.target.value)}
        hint="The one sentence the employee is left with."
      />
    </Panel>
  )
}
