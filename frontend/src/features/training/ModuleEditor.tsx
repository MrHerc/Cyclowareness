/**
 * The analyst's edit surface for a module.
 *
 * One thing this form is explicit about: editing changes what the content *is*.
 * A module drafted by a model and rewritten by a person is analyst-edited, and
 * saying so is the whole point of the provenance vocabulary. The API does not
 * carry an "edited" flag, so the form says that plainly instead of quietly
 * showing a badge that would revert on the next page load.
 *
 * Only the five fields the API accepts are editable. Status, approver, channel
 * and duration are set by the loop and by the approval gate, and a form that
 * offered them would be inventing a capability the backend does not have.
 */

import { useT } from '../../lib/i18n'
import { useState } from 'react'
import { Plus, TriangleAlert, Trash2 } from 'lucide-react'
import { AIProvenanceBadge } from '../../components/data'
import { Button, IconButton, Input, Panel, Textarea, useToast } from '../../components/ui'
import type { TrainingModule } from '../../domain/types'
import { useUpdateModule } from '../../lib/api/mutations'
import { QuizEditor } from './QuizEditor'
import {
  draftFrom,
  isDirty,
  validateDraft,
  type DraftSection,
  type ModuleDraft,
} from './moduleDraft'

export interface ModuleEditorProps {
  module: TrainingModule
  /** Called after the server has confirmed the save. */
  onSaved: () => void
  onCancel: () => void
}

export function ModuleEditor({ module, onSaved, onCancel }: ModuleEditorProps) {
  const t = useT()
  const toast = useToast()
  const original = draftFrom(module)
  const [draft, setDraft] = useState<ModuleDraft>(original)
  const [showProblems, setShowProblems] = useState(false)

  const update = useUpdateModule({
    onSuccess: () => {
      toast.show({
        title: 'Module saved',
        description: t('p.this-content-is-now-analystedited'),
        tone: 'success',
      })
      onSaved()
    },
    onError: (error) =>
      toast.show({ title: 'Module not saved', description: error.message, tone: 'error' }),
  })

  const problems = validateDraft(draft)
  const dirty = isDirty(draft, original)

  function setSection(index: number, patch: Partial<DraftSection>) {
    setDraft({
      ...draft,
      content: draft.content.map((section, i) => (i === index ? { ...section, ...patch } : section)),
    })
  }

  function handleSave() {
    setShowProblems(true)
    if (problems.length > 0) return
    update.mutate({ id: module.id, body: draft })
  }

  return (
    <div className="space-y-6">
      <Panel
        title={t('x.editing-this-module')}
        tone="feature"
        headingLevel={2}
        subtitle={t('x.title-description-sections-quiz-and')}
      >
        <div className="flex flex-wrap items-center gap-3">
          <AIProvenanceBadge provenance="analyst_edited" />
          <p className="text-sm text-fg-muted">{t('p.saving-makes-this-content-analystedited-the')}</p>
        </div>
      </Panel>

      <Panel title={t('x.module')} headingLevel={2}>
        <div className="space-y-4">
          <Input
            label="Title"
            required
            value={draft.title}
            onChange={(event) => setDraft({ ...draft, title: event.target.value })}
          />
          <Textarea
            label="Description"
            required
            rows={3}
            hint={t('p.the-oneparagraph-summary-an-employee-sees')}
            value={draft.description}
            onChange={(event) => setDraft({ ...draft, description: event.target.value })}
          />
          <Textarea
            label="Takeaway"
            required
            rows={2}
            hint={t('p.the-single-behaviour-this-module-is')}
            value={draft.takeaway}
            onChange={(event) => setDraft({ ...draft, takeaway: event.target.value })}
          />
        </div>
      </Panel>

      <Panel
        title={t('x.sections')}
        headingLevel={2}
        subtitle={t('x.what-the-employee-reads-in')}
        actions={
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setDraft({ ...draft, content: [...draft.content, { heading: '', body: '' }] })}
            icon={<Plus className="size-3.5" aria-hidden="true" />}
          >
            {t('u.add-section')}
          </Button>
        }
      >
        {draft.content.length === 0 ? (
          <p className="text-sm text-fg-faint">{t('p.this-module-has-no-sections-add')}</p>
        ) : (
          <ol className="space-y-5">
            {draft.content.map((section, index) => (
              <li key={index} className="rounded-control border border-line-subtle bg-base/40 p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="label text-fg-subtle">Section {index + 1}</p>
                  <IconButton
                    label={`Remove section ${index + 1}`}
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      setDraft({ ...draft, content: draft.content.filter((_, i) => i !== index) })
                    }
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </IconButton>
                </div>
                <Input
                  className="mt-3"
                  label={`Section ${index + 1} heading`}
                  value={section.heading}
                  onChange={(event) => setSection(index, { heading: event.target.value })}
                />
                <Textarea
                  className="mt-3"
                  label={`Section ${index + 1} body`}
                  rows={5}
                  value={section.body}
                  onChange={(event) => setSection(index, { body: event.target.value })}
                />
              </li>
            ))}
          </ol>
        )}
      </Panel>

      <QuizEditor quiz={draft.quiz} onChange={(quiz) => setDraft({ ...draft, quiz })} />

      {showProblems && problems.length > 0 ? (
        <div
          role="alert"
          className="rounded-panel border border-critical/35 bg-critical/10 px-5 py-4"
        >
          <p className="flex items-center gap-2 text-body text-critical">
            <TriangleAlert className="size-4 shrink-0" aria-hidden="true" />
            {t('u.the-server-would-reject-this-module')}
          </p>
          <ul className="mt-2 space-y-1">
            {problems.map((problem) => (
              <li key={problem} className="text-sm text-fg-muted">
                {problem}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="sticky bottom-4 flex flex-wrap items-center justify-end gap-3 rounded-panel border border-line bg-elevated px-5 py-3 shadow-float">
        <p className="mr-auto text-sm text-fg-subtle" aria-live="polite">
          {dirty ? 'Unsaved changes' : 'No changes yet'}
        </p>
        <Button variant="ghost" onClick={onCancel} disabled={update.isPending}>
          Discard
        </Button>
        <Button
          variant="primary"
          loading={update.isPending}
          disabled={!dirty}
          onClick={handleSave}
        >
          {t('u.save-changes')}
        </Button>
      </div>
    </div>
  )
}
