/**
 * The reference site's central interaction, rebuilt: a hairline list where the
 * open row explains itself and swaps the screenshot beside it.
 *
 * Three animations, and the numbers are the reference's own, measured off the
 * running page rather than guessed:
 *
 *   * the row opens over **300ms** by animating `grid-template-rows` from
 *     `0fr` to `1fr` — the one way to transition to a height nobody knows in
 *     advance without measuring it in JavaScript on every resize;
 *   * the outgoing screenshot leaves over **500ms** by fading AND blurring, so
 *     the swap reads as a rack focus rather than a cut;
 *   * the incoming one arrives over **300ms** with a short rise.
 *
 * IT IS A REAL TABLIST. `role="tab"`, `aria-selected`, arrow-key and Home/End
 * navigation, and one tab stop for the whole group — a keyboard reader moves
 * through seven stages with two keys instead of seven. Built by hand rather
 * than on the shared `Tabs` component because that one renders its panels in
 * the document flow; here every panel occupies the same grid cell so they can
 * cross-fade over each other.
 *
 * Under `prefers-reduced-motion` the blur and the rise are dropped and the
 * swap is immediate. The row still opens, because that is a disclosure, not
 * decoration — collapsing it instantly would hide content mid-read.
 */

import { motion } from 'framer-motion'
import { useCallback, useId, useRef, useState } from 'react'
import { cn } from '../../lib/format'
import { useReducedMotion } from '../settings/preferences'
import { PRESS } from './motion'

export interface FeatureTabItem {
  id: string
  /** The row's heading — always visible. */
  term: string
  /** Revealed when the row is open. */
  detail: string
  /** Screenshot shown beside the list while this row is open. */
  shot: string
  alt: string
}

export function FeatureTabs({
  items,
  className,
  flip = false,
}: {
  items: FeatureTabItem[]
  className?: string
  /** Put the screenshot on the left. */
  flip?: boolean
}) {
  const [active, setActive] = useState(0)
  const reduced = useReducedMotion()
  const baseId = useId()
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])

  /**
   * Moves by an OFFSET rather than to a computed index, and computes the target
   * inside the updater.
   *
   * Reading `active` from the closure meant two arrow presses in the same frame
   * both saw the pre-render value: holding Down walked 0 → 1 → 1 → 1 instead of
   * advancing. Measured, not theorised — two synthetic key presses landed on
   * tab 1.
   */
  const move = useCallback(
    (offset: number | 'first' | 'last') => {
      setActive((current) => {
        const next =
          offset === 'first'
            ? 0
            : offset === 'last'
              ? items.length - 1
              : (current + offset + items.length) % items.length
        // Focus follows selection, after React has committed the new tabIndex.
        queueMicrotask(() => tabRefs.current[next]?.focus())
        return next
      })
    },
    [items.length],
  )

  const onKeyDown = (event: React.KeyboardEvent) => {
    const moves: Record<string, number | 'first' | 'last'> = {
      ArrowDown: 1,
      ArrowRight: 1,
      ArrowUp: -1,
      ArrowLeft: -1,
      Home: 'first',
      End: 'last',
    }
    const offset = moves[event.key]
    if (offset === undefined) return
    event.preventDefault()
    move(offset)
  }

  return (
    <div className={cn('grid gap-12 lg:grid-cols-2 lg:gap-16', className)}>
      {/* --- the list ------------------------------------------------------ */}
      <div
        role="tablist"
        aria-orientation="vertical"
        onKeyDown={onKeyDown}
        className={cn('border-t border-hair', flip && 'lg:order-2')}
      >
        {items.map((item, index) => {
          const open = index === active
          return (
            <div key={item.id} className="border-b border-hair">
              <motion.button
                // A spring, and only 0.995: the row is a full-width target, so
                // even a small scale is a large absolute movement. It confirms
                // the press without the page appearing to breathe.
                whileTap={{ scale: 0.995 }}
                transition={PRESS}
                ref={(node) => {
                  tabRefs.current[index] = node
                }}
                type="button"
                role="tab"
                id={`${baseId}-tab-${item.id}`}
                aria-selected={open}
                aria-controls={`${baseId}-panel-${item.id}`}
                // One tab stop for the group; the arrows do the rest.
                tabIndex={open ? 0 : -1}
                onClick={() => setActive(index)}
                className="group flex w-full items-start gap-3 py-5 text-left"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'mt-2 size-1.5 shrink-0 rounded-full transition-colors duration-300',
                    open ? 'bg-brand' : 'bg-fg-faint/40 group-hover:bg-fg-subtle',
                  )}
                />
                <span
                  className={cn(
                    'text-h font-normal transition-colors duration-300',
                    open ? 'text-fg' : 'text-fg-muted group-hover:text-fg',
                  )}
                >
                  {item.term}
                </span>
              </motion.button>

              {/* `grid-template-rows: 0fr → 1fr` is the height animation. The
                  inner element must carry `overflow: hidden` or its content
                  spills out of the collapsed track. */}
              <div
                id={`${baseId}-panel-${item.id}`}
                role="tabpanel"
                aria-labelledby={`${baseId}-tab-${item.id}`}
                hidden={!open}
                className="grid transition-[grid-template-rows] duration-300 ease-out"
                style={{ gridTemplateRows: open ? '1fr' : '0fr' }}
              >
                <div className="overflow-hidden">
                  <p className="pb-5 pl-[1.375rem] text-sm leading-relaxed text-fg-muted">
                    {item.detail}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* --- the screenshot ------------------------------------------------ */}
      <div className={cn('lg:sticky lg:top-24 lg:self-start', flip && 'lg:order-1')}>
        <div
          className={cn(
            'relative grid overflow-hidden rounded-panel border border-hair bg-elevated',
            'shadow-[0_24px_70px_-30px_rgba(0,0,0,0.75)]',
          )}
        >
          {items.map((item, index) => {
            const open = index === active
            return (
              <img
                key={item.id}
                src={item.shot}
                alt={open ? item.alt : ''}
                aria-hidden={!open}
                width={1600}
                height={1000}
                loading="lazy"
                decoding="async"
                className={cn(
                  // Every panel in the same grid cell, so they overlap and the
                  // box keeps the height of the tallest rather than collapsing
                  // to nothing between swaps.
                  'col-start-1 row-start-1 block size-full object-cover',
                  open
                    ? 'z-10 opacity-100 blur-0 translate-y-0 duration-300'
                    : 'opacity-0 duration-500' + (reduced ? '' : ' blur-md'),
                  reduced
                    ? 'transition-opacity'
                    : 'transition-[opacity,filter,transform] ease-out',
                  !open && !reduced && 'translate-y-1',
                )}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}
