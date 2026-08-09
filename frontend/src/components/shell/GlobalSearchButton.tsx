/**
 * The search affordance in the top bar.
 *
 * It looks like a text field but it is a real `<button>`, because that is what
 * it does — there is no inline search, it opens the command palette. A styled
 * `<input>` here would be a lie a keyboard user discovers by typing into
 * nothing, and would also mean two focus targets for one action.
 */

import { Search } from 'lucide-react'
import { useT } from '../../lib/i18n'
import { cn } from '../../lib/format'

export interface GlobalSearchButtonProps {
  onClick: () => void
  className?: string
}

export function GlobalSearchButton({ onClick, className }: GlobalSearchButtonProps) {
  const t = useT()
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group flex h-9 items-center gap-2 rounded-control border border-line bg-base px-3',
        'text-sm text-fg-subtle transition-colors hover:border-line-strong hover:text-fg-muted',
        className,
      )}
    >
      <Search className="size-4 shrink-0" aria-hidden="true" strokeWidth={1.75} />
      <span className="hidden flex-1 text-left md:block">{t('shell.search')}</span>
      <span className="md:hidden">{t('shell.search')}</span>
    </button>
  )
}
