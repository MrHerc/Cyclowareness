/**
 * The editable shape of a module, and the rules the server will apply to it.
 *
 * These checks mirror `backend/app/routers/training.py::_validate_quiz_shape`
 * exactly — 3 to 5 questions, precisely 4 options each, a correct index inside
 * that range. They are duplicated here on purpose: the server is the authority
 * and still rejects a bad payload, but an analyst who has just rewritten six
 * questions deserves to be told which one is wrong before the save, not by a
 * 422 that names a field number.
 *
 * A malformed quiz is not a cosmetic problem. It makes every assignment
 * generated from the module impossible to complete.
 */

import type { TrainingModule } from '../../domain/types'

export interface DraftSection {
  heading: string
  body: string
}

/** The studio always holds an answer key; the employee payload never does. */
export interface DraftQuestion {
  question: string
  options: string[]
  correct_index: number
  explanation: string
}

export interface ModuleDraft {
  title: string
  description: string
  content: DraftSection[]
  quiz: DraftQuestion[]
  takeaway: string
}

export const MIN_QUESTIONS = 3
export const MAX_QUESTIONS = 5
export const OPTIONS_PER_QUESTION = 4

/**
 * The platform's pass mark.
 *
 * It lives as a constant in the grading endpoint and is not exposed by any
 * response, so it cannot be read per module. Stated here so the studio can show
 * an analyst what their quiz will be graded against — and labelled at the point
 * of use as a platform-wide value rather than a module setting.
 */
export const PLATFORM_PASS_MARK = 60

export function draftFrom(module: TrainingModule): ModuleDraft {
  return {
    title: module.title,
    description: module.description,
    content: (module.content ?? []).map((section) => ({
      heading: section.heading ?? '',
      body: section.body ?? '',
    })),
    quiz: (module.quiz ?? []).map((question) => ({
      question: question.question ?? '',
      options: padOptions(question.options ?? []),
      correct_index: question.correct_index ?? 0,
      explanation: question.explanation ?? '',
    })),
    takeaway: module.takeaway,
  }
}

/** A question that reached the studio with the wrong option count is still editable. */
function padOptions(options: string[]): string[] {
  const next = options.slice(0, OPTIONS_PER_QUESTION)
  while (next.length < OPTIONS_PER_QUESTION) next.push('')
  return next
}

export function emptyQuestion(): DraftQuestion {
  return {
    question: '',
    options: Array.from({ length: OPTIONS_PER_QUESTION }, () => ''),
    correct_index: 0,
    explanation: '',
  }
}

export function isDirty(draft: ModuleDraft, original: ModuleDraft): boolean {
  return JSON.stringify(draft) !== JSON.stringify(original)
}

/** Every problem, in reading order. Empty means the server will accept it. */
export function validateDraft(draft: ModuleDraft): string[] {
  const problems: string[] = []

  if (!draft.title.trim()) problems.push('The module needs a title.')
  if (!draft.description.trim()) problems.push('The module needs a description.')
  if (!draft.takeaway.trim()) problems.push('The module needs a takeaway.')

  if (draft.content.length === 0) {
    problems.push('Add at least one section — a module with no content teaches nothing.')
  }
  draft.content.forEach((section, index) => {
    if (!section.heading.trim()) problems.push(`Section ${index + 1} needs a heading.`)
    if (!section.body.trim()) problems.push(`Section ${index + 1} needs body text.`)
  })

  if (draft.quiz.length < MIN_QUESTIONS || draft.quiz.length > MAX_QUESTIONS) {
    problems.push(
      `The quiz must have between ${MIN_QUESTIONS} and ${MAX_QUESTIONS} questions — it currently has ${draft.quiz.length}.`,
    )
  }
  draft.quiz.forEach((question, index) => {
    const label = `Question ${index + 1}`
    if (!question.question.trim()) problems.push(`${label} has no text.`)
    if (question.options.some((option) => !option.trim())) {
      problems.push(`${label} has an empty answer option — all ${OPTIONS_PER_QUESTION} are required.`)
    }
    if (question.correct_index < 0 || question.correct_index >= OPTIONS_PER_QUESTION) {
      problems.push(`${label} has no correct answer selected.`)
    }
    if (!question.explanation.trim()) {
      problems.push(`${label} needs an explanation — it is what the employee reads after grading.`)
    }
  })

  return problems
}
