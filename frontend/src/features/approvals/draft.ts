/**
 * "Save draft", implemented as what it actually is.
 *
 * There is no draft endpoint. Rather than a button that appears to save and
 * does not, a draft is written to this browser's `localStorage` and every
 * surface that shows one says so in those words: it is on this device, it is
 * not on the server, and nobody else reviewing this run will see it.
 *
 * It holds the two things an interrupted review loses — the comment being
 * written and any unsaved module edits. Module edits that have been sent with
 * `useUpdateModule` are on the server already and are not duplicated here.
 */

import type { QuizQuestion, TrainingModule } from '../../domain/types'

const KEY_PREFIX = 'cyclo.approval-draft.'

export interface ModuleEdits {
  title: string
  description: string
  takeaway: string
  content: { heading: string; body: string }[]
  quiz: QuizQuestion[]
}

export interface ApprovalDraft {
  comment: string
  edits: ModuleEdits | null
  savedAt: string
}

function keyFor(runId: string | number): string {
  return `${KEY_PREFIX}${runId}`
}

export function readDraft(runId: string | number): ApprovalDraft | null {
  try {
    const raw = localStorage.getItem(keyFor(runId))
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (parsed === null || typeof parsed !== 'object') return null
    const draft = parsed as Partial<ApprovalDraft>
    if (typeof draft.savedAt !== 'string') return null
    return {
      comment: typeof draft.comment === 'string' ? draft.comment : '',
      edits: (draft.edits as ModuleEdits | undefined) ?? null,
      savedAt: draft.savedAt,
    }
  } catch {
    // A draft that cannot be read is a draft that does not exist. It is never
    // worth failing a review screen over.
    return null
  }
}

export function writeDraft(runId: string | number, draft: Omit<ApprovalDraft, 'savedAt'>): string | null {
  const savedAt = new Date().toISOString()
  try {
    localStorage.setItem(keyFor(runId), JSON.stringify({ ...draft, savedAt }))
    return savedAt
  } catch {
    return null
  }
}

export function clearDraft(runId: string | number): void {
  try {
    localStorage.removeItem(keyFor(runId))
  } catch {
    /* nothing to clear is the same outcome as a successful clear */
  }
}

/** The module's own values, as the editor's starting point. */
export function editsFrom(module: TrainingModule): ModuleEdits {
  return {
    title: module.title,
    description: module.description,
    takeaway: module.takeaway,
    content: (module.content ?? []).map((section) => ({
      heading: section.heading,
      body: section.body,
    })),
    quiz: (module.quiz ?? []).map((question) => ({
      question: question.question,
      options: [...(question.options ?? [])],
      correct_index: question.correct_index,
      explanation: question.explanation,
    })),
  }
}

/** Whether an analyst has actually changed anything — drives the provenance flip. */
export function editsDiffer(a: ModuleEdits, b: ModuleEdits): boolean {
  return JSON.stringify(a) !== JSON.stringify(b)
}
