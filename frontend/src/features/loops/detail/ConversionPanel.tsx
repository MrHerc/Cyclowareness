/**
 * Stage 3 — the threat rewritten as something safe to hand a person.
 *
 * The provenance badge is computed by `provenanceOf` from the module's own
 * `generation_source`, never from whether the deployment happens to have a model
 * configured. When no model is connected the backend answers `mock` and a fixed
 * template writes the module; calling that "AI generated" is the single claim
 * this product must never make.
 */

import { useT } from '../../../lib/i18n'
import { Link } from 'react-router-dom'
import type { StageEntry, TrainingModule } from '../../../domain/types'
import { STAGES, provenanceOf } from '../../../domain/types'
import { channelLabel } from '../../../lib/format'
import { AIProvenanceBadge } from '../../../components/data'
import { Badge, Button } from '../../../components/ui'
import { StageSection } from './StageSection'
import { Facts, type Fact } from './Facts'

const STAGE = STAGES[2]

export interface ConversionPanelProps {
  entry: StageEntry | undefined
  module: TrainingModule | null
  /** `Capabilities.ai_provider === 'anthropic'`, or undefined while unknown. */
  modelConnected: boolean | undefined
}

export function ConversionPanel({ entry, module, modelConnected }: ConversionPanelProps) {
  const t = useT()
  if (!module) {
    return (
      <StageSection stage={STAGE} entry={entry} source="live" sourceDetail={t('u.training-module-record')}>
        <p className="text-body text-fg-muted">{t('p.no-training-module-exists-on-this')}</p>
      </StageSection>
    )
  }

  const provenance = provenanceOf(module.generation_source, {
    approved: module.status === 'approved',
  })

  const facts: Fact[] = [
    { label: t('u.status-2'), value: <Badge status={module.status} size="sm" /> },
    { label: t('u.channel-2'), value: channelLabel(module.channel) },
    { label: t('u.estimated-time-2'), value: `${module.est_minutes} min` },
    { label: t('u.sections-2'), value: String(module.content?.length ?? 0) },
    { label: t('u.quiz-questions-2'), value: String(module.quiz?.length ?? 0) },
    {
      label: t('u.approved-by-2'),
      value: module.approved_by ?? 'Not approved',
    },
  ]

  return (
    <StageSection
      stage={STAGE}
      entry={entry}
      source="live"
      sourceDetail={t('u.training-module-record')}
      actions={
        <Button asChild variant="secondary" size="sm">
          <Link to={`/training/${module.id}`}>{t('u.open-in-the-training-studio')}</Link>
        </Button>
      }
    >
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="text-h text-fg">{module.title}</h3>
        <AIProvenanceBadge
          provenance={provenance}
          generationSource={module.generation_source}
          modelConnected={modelConnected}
        />
      </div>
      {module.description ? (
        <p className="mt-1.5 text-body text-fg-muted">{module.description}</p>
      ) : null}

      <Facts items={facts} className="mt-5" />

      <div className="mt-5 space-y-4 border-t border-line-subtle pt-4">
        {(module.content ?? []).map((section, index) => (
          <section key={`${section.heading}-${index}`}>
            <h4 className="text-h text-fg">{section.heading}</h4>
            <p className="mt-1 whitespace-pre-line text-body text-fg-muted">{section.body}</p>
          </section>
        ))}

        {module.takeaway ? (
          <p className="rounded-control border border-line-subtle bg-base px-3 py-2 text-body text-fg">
            <span className="label text-fg-faint">Takeaway </span>
            {module.takeaway}
          </p>
        ) : null}

        {(module.quiz?.length ?? 0) > 0 ? (
          <details className="rounded-control border border-line-subtle bg-base px-3 py-2">
            <summary className="cursor-pointer text-body text-fg-muted">
              Quiz preview — {module.quiz.length} question
              {module.quiz.length === 1 ? '' : 's'}
            </summary>
            <ol className="mt-3 space-y-4">
              {module.quiz.map((question, index) => (
                <li key={`${question.question}-${index}`}>
                  <p className="text-body text-fg">
                    {index + 1}. {question.question}
                  </p>
                  <ul className="mt-1.5 space-y-1">
                    {question.options.map((option, optionIndex) => {
                      const correct = question.correct_index === optionIndex
                      return (
                        <li
                          key={option}
                          className={correct ? 'text-sm text-fg' : 'text-sm text-fg-muted'}
                        >
                          {option}
                          {correct ? (
                            <span className="ml-2 text-xs text-fg-faint">marked correct</span>
                          ) : null}
                        </li>
                      )
                    })}
                  </ul>
                  {question.explanation ? (
                    <p className="mt-1.5 text-xs text-fg-subtle">{question.explanation}</p>
                  ) : null}
                </li>
              ))}
            </ol>
            {module.quiz.every((question) => question.correct_index === undefined) ? (
              <p className="mt-3 text-xs text-fg-subtle">{t('p.the-answer-key-was-not-included')}</p>
            ) : null}
          </details>
        ) : (
          <p className="text-sm text-fg-faint">{t('p.this-module-carries-no-quiz')}</p>
        )}
      </div>
    </StageSection>
  )
}
