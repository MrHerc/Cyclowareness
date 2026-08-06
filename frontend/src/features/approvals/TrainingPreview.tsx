/**
 * The centre column: the generated training, as the employee will meet it.
 *
 * The answer key is visible here and nowhere else. `QuizQuestion.correct_index`
 * is stripped from the employee-facing payload by the server; a reviewer who
 * cannot see which option is marked correct cannot review the quiz, which is
 * the entire purpose of this gate. The preview says so on the panel rather than
 * leaving a reader to wonder whether the key leaks.
 *
 * The preview renders whatever is in the editor, saved or not, so "approve with
 * edits" shows the thing being approved rather than the thing on the server.
 */

import { useT } from '../../lib/i18n'
import { CheckCircle2, Monitor, Smartphone } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { AIProvenanceBadge } from '../../components/data'
import {
  Badge,
  Card,
  Separator,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Panel,
  Button,
} from '../../components/ui'
import type { Provenance, TrainingModule } from '../../domain/types'
import { channelLabel, cn } from '../../lib/format'
import type { ModuleEdits } from './draft'

type Device = 'desktop' | 'mobile'

/** The narrow frame is a real 390px viewport, not a decorative phone outline. */
const DEVICE_WIDTH: Record<Device, string> = {
  desktop: 'max-w-none',
  mobile: 'max-w-[24.5rem]',
}

function EmployeeSurface({ device, children }: { device: Device; children: ReactNode }) {
  return (
    <div className={cn('mx-auto w-full transition-[max-width] duration-200', DEVICE_WIDTH[device])}>
      <Card className="space-y-5 rounded-panel p-5">{children}</Card>
    </div>
  )
}

function ModuleBody({ edits }: { edits: ModuleEdits }) {
  const t = useT()
  return (
    <>
      <div className="space-y-2">
        <h3 className="text-title text-fg">{edits.title || 'Untitled module'}</h3>
        <p className="text-body text-fg-muted">{edits.description}</p>
      </div>

      {edits.content.length === 0 ? (
        <p className="text-sm text-medium">{t('p.this-module-has-no-lesson-sections-3')}</p>
      ) : (
        <div className="space-y-4">
          {edits.content.map((section, index) => (
            <section key={`${section.heading}-${index}`} className="space-y-1.5">
              <h4 className="text-h text-fg">{section.heading}</h4>
              <p className="whitespace-pre-wrap text-body text-fg-muted">{section.body}</p>
            </section>
          ))}
        </div>
      )}

      {edits.takeaway && (
        <>
          <Separator fade />
          <div className="rounded-control border border-brand/25 bg-brand/5 p-4">
            <div className="label text-brand">Take away</div>
            <p className="mt-1.5 text-body text-fg">{edits.takeaway}</p>
          </div>
        </>
      )}
    </>
  )
}

function QuizBody({ edits }: { edits: ModuleEdits }) {
  const t = useT()
  if (edits.quiz.length === 0) {
    return (
      <p className="text-sm text-critical" role="note">{t('p.this-module-has-no-quiz-an')}</p>
    )
  }

  return (
    <div className="space-y-5">
      {edits.quiz.map((question, index) => (
        <section key={index} className="space-y-2">
          <h4 className="text-h text-fg">
            {index + 1}. {question.question}
          </h4>
          <ul className="space-y-1.5">
            {question.options.map((option, optionIndex) => {
              const correct = question.correct_index === optionIndex
              return (
                <li
                  key={optionIndex}
                  className={cn(
                    'flex items-start gap-2 rounded-control border px-3 py-2 text-body',
                    correct
                      ? 'border-safe/40 bg-safe/8 text-fg'
                      : 'border-line-subtle text-fg-muted',
                  )}
                >
                  {correct ? (
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-safe" aria-hidden="true" />
                  ) : (
                    <span
                      aria-hidden="true"
                      className="mt-1.5 size-1.5 shrink-0 rounded-full bg-fg-faint"
                    />
                  )}
                  <span className="min-w-0">{option}</span>
                  {correct && <span className="sr-only">Correct answer</span>}
                </li>
              )
            })}
          </ul>
          {question.explanation && (
            <p className="text-sm text-fg-subtle">
              <span className="text-fg-faint">Why: </span>
              {question.explanation}
            </p>
          )}
          {question.correct_index === undefined && (
            <p className="text-sm text-critical" role="note">{t('p.no-answer-key-was-recorded-for')}</p>
          )}
        </section>
      ))}
    </div>
  )
}

function FeedbackBody({ edits }: { edits: ModuleEdits }) {
  const t = useT()
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-title text-fg">{t('y.module-complete')}</h3>
        <p className="text-body text-fg-muted">{t('p.the-employee-sees-their-score-which')}</p>
      </div>

      <div className="rounded-control border border-line-subtle bg-base p-4">
        <div className="label text-fg-faint">Score</div>
        <p className="mt-1 text-body text-fg-subtle">{t('p.computed-when-the-employee-completes-the')}</p>
      </div>

      {edits.takeaway && (
        <div>
          <div className="label text-fg-faint">What they are left with</div>
          <p className="mt-1 text-body text-fg">{edits.takeaway}</p>
        </div>
      )}

      <p className="text-xs text-fg-faint">{t('p.completing-this-module-moves-the-employeeaposs')}</p>
    </div>
  )
}

export interface TrainingPreviewProps {
  module: TrainingModule | null
  /** What the preview renders — the editor's current values, saved or not. */
  edits: ModuleEdits | null
  provenance: Provenance
  modelConnected?: boolean
  generationLabel: string | null
  /** Null when the analyst has no authority to change content. */
  onEdit: (() => void) | null
  dirty: boolean
}

export function TrainingPreview({
  module,
  edits,
  provenance,
  modelConnected,
  generationLabel,
  onEdit,
  dirty,
}: TrainingPreviewProps) {
  const t = useT()
  const [device, setDevice] = useState<Device>('desktop')
  const [tab, setTab] = useState('module')

  if (!module || !edits) {
    return (
      <Panel title={t('x.the-generated-training')} headingLevel={2}>
        <p className="text-body text-medium" role="note">{t('p.no-training-module-was-generated-for')}</p>
      </Panel>
    )
  }

  return (
    <Panel
      title={t('x.the-generated-training')}
      subtitle={generationLabel ?? t('p.rendered-exactly-as-the-employee-will')}
      headingLevel={2}
      actions={
        <div className="flex items-center gap-2">
          <div
            role="group"
            aria-label={t('p.preview-width')}
            className="flex rounded-control border border-line p-0.5"
          >
            {(['desktop', 'mobile'] as const).map((option) => {
              const Icon = option === 'desktop' ? Monitor : Smartphone
              return (
                <button
                  key={option}
                  type="button"
                  aria-pressed={device === option}
                  onClick={() => setDevice(option)}
                  className={cn(
                    'inline-flex h-7 items-center gap-1.5 rounded-chip px-2.5 text-xs transition-colors',
                    device === option ? 'bg-raised text-fg' : 'text-fg-subtle hover:text-fg',
                  )}
                >
                  <Icon className="size-3.5" aria-hidden="true" />
                  {option === 'desktop' ? 'Desktop' : 'Mobile'}
                </button>
              )
            })}
          </div>
          {onEdit && (
            <Button size="sm" variant="outline" onClick={onEdit}>
              Edit content
            </Button>
          )}
        </div>
      }
      bodyClassName="space-y-4"
    >
      <div className="flex flex-wrap items-center gap-2">
        <AIProvenanceBadge
          provenance={provenance}
          generationSource={module.generation_source}
          modelConnected={modelConnected}
        />
        <Badge status={module.status} size="sm" />
        <span className="text-xs text-fg-subtle">
          {channelLabel(module.channel)} · {module.est_minutes} min · {edits.quiz.length} questions
        </span>
        {dirty && (
          <Badge tone="ai" size="sm">
            Unsaved edits shown
          </Badge>
        )}
      </div>

      <p className="text-xs text-fg-faint" role="note">{t('p.this-run-produces-a-training-module')}</p>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="module">Module</TabsTrigger>
          <TabsTrigger value="quiz">Quiz and answer key</TabsTrigger>
          <TabsTrigger value="feedback">Completion screen</TabsTrigger>
        </TabsList>

        <TabsContent value="module">
          <EmployeeSurface device={device}>
            <ModuleBody edits={edits} />
          </EmployeeSurface>
        </TabsContent>

        <TabsContent value="quiz">
          <div className="mb-3 rounded-control border border-ai/30 bg-ai/5 px-3 py-2 text-sm text-fg-muted">
            The correct answers are marked because you are reviewing. The employee&apos;s copy of
            this quiz is served without the answer key.
          </div>
          <EmployeeSurface device={device}>
            <QuizBody edits={edits} />
          </EmployeeSurface>
        </TabsContent>

        <TabsContent value="feedback">
          <EmployeeSurface device={device}>
            <FeedbackBody edits={edits} />
          </EmployeeSurface>
        </TabsContent>
      </Tabs>
    </Panel>
  )
}
