/**
 * Ctrl/Cmd+K — the whole product, from the keyboard.
 *
 * Every entry is filtered through the same permission table the router uses, so
 * the palette can never offer a destination that would bounce off a guard, and
 * a role switch changes the palette on the next render without any cache to
 * clear.
 *
 * It is built on Radix Dialog directly rather than on `ui/Dialog` or on cmdk's
 * `Command.Dialog`. `ui/Dialog` is the wrong geometry — the palette's own input
 * is its header, and a titled panel with a close button would put two focus
 * targets above the search field. cmdk's dialog ships no `DialogTitle`, which
 * leaves the surface unnamed for a screen reader; here the name is present and
 * visually hidden.
 *
 * Destructive actions do not run from the palette. "Reset the demonstration
 * world" closes the palette and opens a typed confirmation, because a fuzzy
 * search that can destroy the demo one Enter after a mistyped query is a
 * hazard, not a feature.
 */

import { Command } from 'cmdk'
import * as RadixDialog from '@radix-ui/react-dialog'
import {
  BadgeCheck,
  History,
  RotateCcw,
  Search,
  Send,
  Upload,
  type LucideIcon,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ConfirmationDialog } from '../states'
import { Kbd, useToast } from '../ui'
import { useT } from '../../lib/i18n'
import { cn } from '../../lib/format'
import { allNavItems, type NavItem } from '../../app/navigation'
import { useCapabilities } from '../../lib/api/queries'
import { useResetDemo } from '../../lib/api/mutations'
import { useAuth } from '../../lib/auth/useAuth'
import { useRouteMemory } from './recentRoutes'

export interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface PaletteAction {
  id: string
  label: string
  hint: string
  icon: LucideIcon
  run: () => void
}

const ITEM_CLASS =
  'flex cursor-pointer items-center gap-3 rounded-control px-2.5 py-2 text-body text-fg-muted ' +
  'data-[selected=true]:bg-raised data-[selected=true]:text-fg'

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const t = useT()
  const navigate = useNavigate()
  const toast = useToast()
  const { can } = useAuth()
  const { data: capabilities } = useCapabilities()
  const recent = useRouteMemory()
  const [confirmReset, setConfirmReset] = useState(false)

  const resetDemo = useResetDemo({
    onSuccess: () => {
      setConfirmReset(false)
      toast.show({
        tone: 'success',
        title: 'Demonstration world reset',
        description: 'Every cached view has been invalidated and is reloading.',
      })
    },
    onError: (error) => {
      toast.show({ tone: 'error', title: 'The reset did not complete', description: error.message })
    },
  })

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 'k' || !(event.metaKey || event.ctrlKey)) return
      event.preventDefault()
      onOpenChange(!open)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onOpenChange])

  const go = useCallback(
    (to: string) => {
      onOpenChange(false)
      navigate(to)
    },
    [navigate, onOpenChange],
  )

  const permitted: NavItem[] = allNavItems().filter((item) => can(item.permission))
  const byId = new Map(permitted.map((item) => [item.id, item]))
  const recentItems = recent
    .map((entry) => byId.get(entry.id))
    .filter((item): item is NavItem => item !== undefined)

  const actions: PaletteAction[] = []
  if (can('sandbox.submit')) {
    actions.push({
      id: 'submit-artifact',
      label: 'Submit an artifact to the sandbox',
      hint: 'Analyse a file or a URL',
      icon: Upload,
      run: () => go('/sandbox'),
    })
  }
  if (can('threats.submit')) {
    actions.push({
      id: 'submit-threat',
      label: 'Submit a threat into the loop',
      hint: 'Start a run at stage one',
      icon: Send,
      run: () => go('/threats'),
    })
  }
  if (can('approvals.view')) {
    actions.push({
      id: 'open-approvals',
      label: 'Open the approval gate',
      hint: 'Decide what reaches an employee',
      icon: BadgeCheck,
      run: () => go('/approvals'),
    })
  }
  if (can('demo.reset') && capabilities?.demo_mode === true) {
    actions.push({
      id: 'reset-demo',
      label: 'Reset the demonstration world',
      hint: 'Destroys every run, decision and result',
      icon: RotateCcw,
      run: () => {
        onOpenChange(false)
        setConfirmReset(true)
      },
    })
  }

  return (
    <>
      <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
        <RadixDialog.Portal>
          <RadixDialog.Overlay className="fixed inset-0 z-50 bg-void/70 backdrop-blur-sm" />
          <RadixDialog.Content
            aria-describedby={undefined}
            className={cn(
              'rise fixed left-1/2 top-[12vh] z-50 w-[calc(100vw-2rem)] max-w-xl -translate-x-1/2',
              'overflow-hidden rounded-panel border border-line bg-surface shadow-float',
            )}
          >
            <RadixDialog.Title className="sr-only">Command palette</RadixDialog.Title>

            {/* No `onKeyDown` of our own on <Command>: cmdk calls the caller's
                handler first and then skips its own arrow/Enter handling if the
                event was defaulted, so intercepting here silently disables
                keyboard selection. */}
            <Command label="Command palette" loop className="flex flex-col">
              <div className="flex items-center gap-3 border-b border-line-subtle px-4">
                <Search
                  className="size-4 shrink-0 text-fg-subtle"
                  aria-hidden="true"
                  strokeWidth={1.75}
                />
                <Command.Input
                  placeholder="Search screens and actions"
                  className="h-12 flex-1 bg-transparent text-body text-fg outline-none placeholder:text-fg-faint"
                />
              </div>

              <Command.List className="max-h-[min(60vh,26rem)] overflow-y-auto p-2">
                <Command.Empty className="px-2.5 py-6 text-center text-body text-fg-subtle">
                  Nothing matches. The palette only lists screens your role can open.
                </Command.Empty>

                <Command.Group heading={<GroupHeading>Navigation</GroupHeading>}>
                  {permitted.map((item) => (
                    <Command.Item
                      key={item.id}
                      // Matched on BOTH spellings: a reader in Azerbaijani types
                      // "təhdid", a reader who knows the product types "threat",
                      // and the same row has to answer either.
                      value={`nav ${t(item.labelKey)} ${item.label} ${
                        item.hintKey ? t(item.hintKey) : ''
                      } ${item.to}`}
                      onSelect={() => go(item.to)}
                      className={ITEM_CLASS}
                    >
                      <item.icon
                        className="size-4 shrink-0 text-fg-subtle"
                        aria-hidden="true"
                        strokeWidth={1.75}
                      />
                      <span className="min-w-0 flex-1 truncate">{t(item.labelKey)}</span>
                      {item.hintKey && (
                        <span className="hidden shrink-0 text-xs text-fg-faint sm:block">
                          {t(item.hintKey)}
                        </span>
                      )}
                    </Command.Item>
                  ))}
                </Command.Group>

                {actions.length > 0 && (
                  <Command.Group heading={<GroupHeading>Actions</GroupHeading>}>
                    {actions.map((action) => (
                      <Command.Item
                        key={action.id}
                        value={`action ${action.label} ${action.hint}`}
                        onSelect={action.run}
                        className={ITEM_CLASS}
                      >
                        <action.icon
                          className={cn(
                            'size-4 shrink-0',
                            action.id === 'reset-demo' ? 'text-critical' : 'text-fg-subtle',
                          )}
                          aria-hidden="true"
                          strokeWidth={1.75}
                        />
                        <span className="min-w-0 flex-1 truncate">{action.label}</span>
                        <span className="hidden shrink-0 text-xs text-fg-faint sm:block">
                          {action.hint}
                        </span>
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}

                {recentItems.length > 0 && (
                  <Command.Group heading={<GroupHeading>Recent</GroupHeading>}>
                    {recentItems.map((item) => (
                      <Command.Item
                        key={`recent-${item.id}`}
                        value={`recent ${item.label}`}
                        onSelect={() => go(item.to)}
                        className={ITEM_CLASS}
                      >
                        <History
                          className="size-4 shrink-0 text-fg-subtle"
                          aria-hidden="true"
                          strokeWidth={1.75}
                        />
                        <span className="min-w-0 flex-1 truncate">{t(item.labelKey)}</span>
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}
              </Command.List>

              <div className="flex items-center gap-3 border-t border-line-subtle px-4 py-2 text-xs text-fg-faint">
                <span className="flex items-center gap-1.5">
                  <Kbd>↑</Kbd>
                  <Kbd>↓</Kbd>
                  move
                </span>
                <span className="flex items-center gap-1.5">
                  <Kbd>Enter</Kbd>
                  open
                </span>
                <span className="flex items-center gap-1.5">
                  <Kbd>Esc</Kbd>
                  close
                </span>
              </div>
            </Command>
          </RadixDialog.Content>
        </RadixDialog.Portal>
      </RadixDialog.Root>

      <ConfirmationDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title="Reset the demonstration world"
        description="Every loop run, approval decision, simulation outcome and training result is deleted and the seeded organisation is rebuilt. This cannot be undone, and anything demonstrated so far will be gone."
        confirmLabel="Reset the world"
        tone="danger"
        requireTyped="RESET"
        busy={resetDemo.isPending}
        onConfirm={() => resetDemo.mutate()}
      />
    </>
  )
}

function GroupHeading({ children }: { children: string }) {
  return <span className="label px-2.5 text-fg-faint">{children}</span>
}
