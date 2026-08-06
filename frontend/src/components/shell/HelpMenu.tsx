/**
 * Help, and the honest read-out of what this build can do.
 *
 * "About this deployment" is not an about box. It is the answer to the question
 * a technical buyer asks in the first five minutes — is a model connected, is
 * anything being detonated, is this data real — printed from
 * `/api/capabilities` and `/api/sandbox/capabilities` rather than from anything
 * baked in at build time. Every line in it can be checked against the server.
 */

import { type MessageKey, useT } from '../../lib/i18n'
import { Command, Keyboard, LifeBuoy, ScrollText } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import {
  Dialog,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  IconButton,
  Kbd,
} from '../ui'
import { API_BASE_URL } from '../../lib/api/client'
import { useCapabilities, useSandboxCapabilities } from '../../lib/api/queries'
import { PRODUCT_NAME } from '../../lib/demo/registry'

export interface HelpMenuProps {
  /** Opens the command palette — the menu never owns palette state itself. */
  onOpenPalette: () => void
  className?: string
}

const SHORTCUTS: { keys: string[]; action: MessageKey }[] = [
  { keys: ['Ctrl', 'K'], action: 'p.open-the-command-palette' },
  { keys: ['Esc'], action: 'p.close-the-palette-a-dialog-or' },
  { keys: ['↑', '↓'], action: 'p.move-through-palette-results' },
  { keys: ['Enter'], action: 'p.run-the-selected-palette-result' },
  { keys: ['Tab'], action: 'p.move-to-the-next-control-the' },
]

export function HelpMenu({ onOpenPalette, className }: HelpMenuProps) {
  const t = useT()
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <IconButton label="Help" variant="ghost" size="sm" className={className}>
            <LifeBuoy className="size-4" aria-hidden="true" strokeWidth={1.75} />
          </IconButton>
        </DropdownMenuTrigger>

        <DropdownMenuContent className="w-64">
          <DropdownMenuLabel>Help</DropdownMenuLabel>

          <DropdownMenuItem onSelect={onOpenPalette}>
            <Command className="size-4 shrink-0" aria-hidden="true" strokeWidth={1.75} />
            <span className="flex-1">Command palette</span>
            <Kbd>Ctrl K</Kbd>
          </DropdownMenuItem>

          <DropdownMenuItem onSelect={() => setShortcutsOpen(true)}>
            <Keyboard className="size-4 shrink-0" aria-hidden="true" strokeWidth={1.75} />
            Keyboard shortcuts
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem onSelect={() => setAboutOpen(true)}>
            <ScrollText className="size-4 shrink-0" aria-hidden="true" strokeWidth={1.75} />
            About this deployment
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog
        open={shortcutsOpen}
        onOpenChange={setShortcutsOpen}
        title="Keyboard shortcuts"
        description="Everything in the shell is reachable without a pointer."
        size="sm"
      >
        <dl className="divide-line">
          {SHORTCUTS.map((shortcut) => (
            <div key={t(shortcut.action)} className="flex items-center justify-between gap-4 py-2">
              <dt className="text-body text-fg-muted">{t(shortcut.action)}</dt>
              <dd className="flex shrink-0 items-center gap-1">
                {shortcut.keys.map((key) => (
                  <Kbd key={key}>{key}</Kbd>
                ))}
              </dd>
            </div>
          ))}
        </dl>
      </Dialog>

      <DeploymentDialog open={aboutOpen} onOpenChange={setAboutOpen} />
    </>
  )
}

function DeploymentDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const t = useT()
  // Both queries are already in cache from the shell; asking again costs nothing
  // and keeps this dialog readable in isolation.
  const capabilities = useCapabilities()
  const sandbox = useSandboxCapabilities()

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="About this deployment"
      description="Read from the running server, not from the build."
      size="sm"
    >
      <dl className="divide-line">
        <Row label="Product">{PRODUCT_NAME}</Row>

        <Row label="API origin">
          <span className="tech">{API_BASE_URL || 'same origin as this page'}</span>
        </Row>

        <Row label="Environment">
          {capabilities.isPending
            ? 'Not answered yet'
            : capabilities.isError
              ? t('p.the-capability-endpoint-did-not-answer')
              : capabilities.data.demo_mode
                ? t('p.demonstration-the-organisation-is-seeded')
                : 'Production'}
        </Row>

        <Row label={t('p.language-model')}>
          {capabilities.isPending
            ? 'Not answered yet'
            : capabilities.isError
              ? 'Unknown'
              : capabilities.data.ai_provider === 'anthropic'
                ? t('p.connected-generated-content-is-labelled-ai')
                : t('p.not-connected-content-is-template-output')}
        </Row>

        <Row label="Analyzer">
          {capabilities.isPending || capabilities.isError ? '—' : capabilities.data.analyzer}
        </Row>

        <Row label={t('p.sandbox-detonation')}>
          {sandbox.isPending
            ? 'Not answered yet'
            : sandbox.isError
              ? 'Unknown'
              : sandbox.data.dynamic_worker
                ? t('p.a-detonation-host-is-attached')
                : t('p.no-detonation-host-files-are-analysed')}
        </Row>

        <Row label="YARA rules">
          {sandbox.isPending || sandbox.isError ? '—' : sandbox.data.yara.loaded}
        </Row>
      </dl>
    </Dialog>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[9rem_1fr] gap-4 py-2">
      <dt className="text-sm text-fg-subtle">{label}</dt>
      <dd className="text-body text-fg">{children}</dd>
    </div>
  )
}
