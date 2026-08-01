/**
 * One of the five questions an advisory has to answer here.
 *
 * They are numbered and always present, in the same order, even when the answer
 * is "nothing matched". A section that disappears when it has nothing to say
 * leaves the reader unable to tell an unanswered question from an unasked one.
 */

import type { ReactNode } from 'react'

export interface QuestionProps {
  /** 1-based. Rendered as 01, 02 … so the five read as a fixed sequence. */
  index: number
  heading: string
  children: ReactNode
}

export function Question({ index, heading, children }: QuestionProps) {
  return (
    <section className="border-t border-line-subtle pt-5">
      <div className="flex items-baseline gap-2.5">
        <span className="label text-brand" aria-hidden="true">
          {String(index).padStart(2, '0')}
        </span>
        <h3 className="text-h text-fg">{heading}</h3>
      </div>
      <div className="mt-3">{children}</div>
    </section>
  )
}

/** The honest answer shape for "we compared, and found nothing". */
export function NothingFound({ headline, detail }: { headline: string; detail: string }) {
  return (
    <div className="rounded-control border border-line-subtle bg-base p-3">
      <p className="text-body text-fg">{headline}</p>
      <p className="mt-1 text-sm leading-relaxed text-fg-subtle">{detail}</p>
    </div>
  )
}
