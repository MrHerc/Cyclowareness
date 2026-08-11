/**
 * The landing's layout vocabulary, in one file.
 *
 * The rhythm is taken from the reference site, measured rather than guessed:
 * a 1128 px content column, section headings at 42px in a weight between
 * regular and medium, list items at 16px/24px, and pill controls. What is NOT
 * taken from it is the palette — this page hands the reader straight to an
 * application that is already dark with a lime accent, and a landing in
 * somebody else's blue would announce a different product one click before
 * they meet the real one. So: their structure, our colour.
 *
 * Everything here is layout. No component in this file knows what the product
 * does; the sections supply that.
 */

import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '../../lib/format'
import { Reveal } from './Section'

/** The measured content width of the reference layout. */
export const CONTAINER = 'mx-auto w-full max-w-[70.5rem] px-6'

export function Container({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn(CONTAINER, className)}>{children}</div>
}

/**
 * A full-width horizontal band.
 *
 * `tone` alternates the ground so consecutive sections do not read as one
 * continuous scroll. The two darks are close together on purpose: the
 * reference alternates near-black against cream, which at this palette would
 * mean dropping a white section into the middle of a security console's colour
 * scheme. A hairline at the seam does the separating instead.
 */
export function Band({
  children,
  tone = 'base',
  seam = true,
  className,
  id,
}: {
  children: ReactNode
  tone?: 'base' | 'surface'
  /** A hairline at the top edge. Off for the first band after the hero. */
  seam?: boolean
  className?: string
  id?: string
}) {
  return (
    <section
      id={id}
      className={cn(
        'w-full py-24 sm:py-32',
        tone === 'surface' ? 'bg-surface' : 'bg-base',
        seam && 'border-t border-hair',
        className,
      )}
    >
      {children}
    </section>
  )
}

/**
 * A section's opening: a small label, the heading, and one paragraph.
 *
 * The heading is deliberately modest — 2.6rem, not a display size. The
 * reference holds its section headings at 42px however large the viewport
 * gets, and the restraint is most of why the page reads as considered rather
 * than as a pitch.
 */
export function SectionHead({
  eyebrow,
  title,
  lead,
  align = 'left',
  className,
}: {
  eyebrow?: string
  title: string
  lead?: ReactNode
  align?: 'left' | 'center'
  className?: string
}) {
  return (
    <Reveal>
      <div
        className={cn(
          align === 'center' ? 'mx-auto max-w-[38rem] text-center' : 'max-w-[36rem]',
          className,
        )}
      >
        {eyebrow ? <p className="label text-fg-faint">{eyebrow}</p> : null}
        <h2
          className={cn(
            'text-[2rem] leading-[1.14] tracking-[-0.012em] text-fg',
            'sm:text-[2.6rem]',
          )}
          style={{ fontWeight: 480 }}
        >
          {title}
        </h2>
        {lead ? <p className="mt-5 text-lead text-fg-muted">{lead}</p> : null}
      </div>
    </Reveal>
  )
}

/**
 * The reference's signature list: rows divided by hairlines, the first one
 * marked with a dot and carrying its explanation, the rest as headings alone.
 *
 * Rendered as a definition list because that is what it is — a term and the
 * sentence that explains it. A stack of divs would give a screen reader eight
 * unrelated fragments.
 */
export function HairlineList({
  items,
  className,
}: {
  items: { term: string; detail?: ReactNode }[]
  className?: string
}) {
  return (
    <dl className={cn('mt-10', className)}>
      {items.map((item, index) => (
        <div
          key={item.term}
          className={cn(
            'border-t border-hair py-5',
            index === items.length - 1 && 'border-b',
          )}
        >
          <dt className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className={cn(
                'mt-2 size-1.5 shrink-0 rounded-full',
                item.detail ? 'bg-brand' : 'bg-transparent',
              )}
            />
            <span className="text-h font-normal text-fg">{item.term}</span>
          </dt>
          {item.detail ? (
            <dd className="mt-2 pl-[1.375rem] text-sm leading-relaxed text-fg-muted">
              {item.detail}
            </dd>
          ) : null}
        </div>
      ))}
    </dl>
  )
}

/**
 * A product screenshot, framed.
 *
 * `loading="lazy"` and explicit dimensions on every one of these: they are the
 * heaviest thing below the hero, and a landing that reflows as each screenshot
 * arrives is a landing that moves the paragraph somebody is reading.
 */
export function Shot({
  src,
  alt,
  className,
  priority = false,
}: {
  src: string
  alt: string
  className?: string
  priority?: boolean
}) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-panel border border-hair bg-elevated',
        'shadow-[0_24px_70px_-30px_rgba(0,0,0,0.75)]',
        className,
      )}
    >
      <img
        src={src}
        alt={alt}
        width={1600}
        height={1000}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        className="block size-full object-cover"
      />
    </div>
  )
}

/** Copy on one side, a screenshot on the other. The page's main figure. */
export function Split({
  children,
  visual,
  flip = false,
}: {
  children: ReactNode
  visual: ReactNode
  /** Put the visual on the left instead. */
  flip?: boolean
}) {
  return (
    <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
      <div className={cn(flip && 'lg:order-2')}>{children}</div>
      <Reveal className={cn(flip && 'lg:order-1')}>{visual}</Reveal>
    </div>
  )
}

const PILL =
  'inline-flex h-11 items-center justify-center rounded-full px-5 text-[0.9375rem] ' +
  'transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2'

/** The reference's controls are pills, and the shape is most of their manner. */
export function PillLink({
  to,
  href,
  variant = 'primary',
  children,
  className,
}: {
  to?: string
  href?: string
  variant?: 'primary' | 'ghost'
  children: ReactNode
  className?: string
}) {
  const style = cn(
    PILL,
    variant === 'primary'
      ? 'bg-cta text-on-cta font-medium hover:brightness-95 focus-visible:outline-fg'
      : 'border border-line text-fg hover:bg-raised focus-visible:outline-fg',
    className,
  )
  if (to) {
    return (
      <Link to={to} className={style}>
        {children}
      </Link>
    )
  }
  return (
    <a href={href} className={style}>
      {children}
    </a>
  )
}

/** A visual panel with a title and a sentence under it. Used in the grids. */
export function ShowcaseCard({
  title,
  body,
  visual,
}: {
  title: string
  body: ReactNode
  visual?: ReactNode
}) {
  return (
    <div className="flex h-full flex-col">
      {visual}
      <h3 className="mt-5 text-h font-normal text-fg">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-fg-muted">{body}</p>
    </div>
  )
}
