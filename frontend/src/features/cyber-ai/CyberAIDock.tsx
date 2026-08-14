/**
 * Cyber AI — the portal's assistant, docked on every authenticated page.
 *
 * A fixed, NON-modal panel rather than a Drawer: the whole point is asking
 * about the screen you are looking at, so the screen must stay interactive
 * behind it. Same layering rules as the toast viewport (`Toast.tsx`): fixed,
 * below the toasts, above the content.
 *
 * Every reply carries its provenance. `generated_by` renders as a chip — the
 * knowledge base and the live model are different claims, and the demo
 * inventory's answers carry their disclaimer line verbatim. An assistant that
 * blurred those would be inventing authority this product refuses everywhere
 * else.
 */

import { useEffect, useRef, useState } from 'react'
import { Bot, Send, X } from 'lucide-react'
import { Badge, Button, Textarea } from '../../components/ui'
import { useLocale } from '../../lib/i18n'
import { cn } from '../../lib/format'
import { useAssistantChat, type AssistantReply } from '../pipeline/api'

interface Turn {
  role: 'user' | 'assistant'
  text: string
  reply?: AssistantReply
}

/** Minimal renderer for the KB's **bold** runs — no markdown library. */
function Emphasis({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith('**') && part.endsWith('**') ? (
          <strong key={i} className="font-semibold text-fg">
            {part.slice(2, -2)}
          </strong>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  )
}

export function CyberAIDock() {
  const { locale, t } = useLocale()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [turns, setTurns] = useState<Turn[]>([])
  const chat = useAssistantChat()
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [turns, open])

  const send = () => {
    const message = draft.trim()
    if (!message || chat.isPending) return
    setDraft('')
    const history = turns.slice(-6).map(({ role, text }) => ({ role, text }))
    setTurns((prev) => [...prev, { role: 'user', text: message }])
    chat.mutate(
      { message, locale, history },
      {
        onSuccess: (reply) =>
          setTurns((prev) => [...prev, { role: 'assistant', text: reply.answer, reply }]),
        onError: (error) =>
          setTurns((prev) => [
            ...prev,
            { role: 'assistant', text: `${t('pl.assistant-error')}: ${error.message}` },
          ]),
      },
    )
  }

  return (
    <>
      {/* The launcher: present on every page, quiet until needed. */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={t('pl.cyber-ai')}
        className={cn(
          'fixed bottom-4 right-4 z-[90] flex size-12 items-center justify-center rounded-full',
          'bg-brand text-on-brand shadow-float transition-transform hover:scale-105',
          open && 'scale-0',
        )}
      >
        <Bot className="size-6" aria-hidden="true" />
      </button>

      {open ? (
        <section
          aria-label={t('pl.cyber-ai')}
          className={cn(
            'fixed bottom-4 left-4 right-4 z-[90] flex flex-col overflow-hidden rounded-panel',
            'border border-line bg-elevated shadow-float',
            'h-[min(34rem,calc(100dvh-6rem))] sm:left-auto sm:w-[24rem]',
          )}
        >
          <header className="flex items-center gap-2.5 border-b border-line-subtle px-4 py-3">
            <span className="flex size-8 items-center justify-center rounded-full bg-brand text-on-brand">
              <Bot className="size-4.5" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-fg">{t('pl.cyber-ai')}</p>
              <p className="truncate text-xs text-fg-subtle">{t('pl.cyber-ai-tagline')}</p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              icon={<X className="size-4" />}
              aria-label={t('pl.close-assistant')}
              onClick={() => setOpen(false)}
            >
              <span className="sr-only">{t('pl.close-assistant')}</span>
            </Button>
          </header>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {turns.length === 0 ? (
              <div className="space-y-2 text-sm text-fg-muted">
                <p>{t('pl.assistant-intro')}</p>
                <ul className="space-y-1.5">
                  {(
                    [
                      'pl.suggest-interface',
                      'pl.suggest-inventory',
                      'pl.suggest-preventive',
                    ] as const
                  ).map((key) => (
                    <li key={key}>
                      <button
                        type="button"
                        className="w-full rounded-control border border-line-subtle bg-base px-3 py-2 text-left text-sm text-fg-muted hover:border-brand/40 hover:text-fg"
                        onClick={() => setDraft(t(key))}
                      >
                        {t(key)}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              turns.map((turn, i) => (
                <div
                  key={i}
                  className={cn(
                    'max-w-[85%] rounded-panel px-3 py-2 text-sm leading-relaxed',
                    turn.role === 'user'
                      ? 'ml-auto bg-brand text-on-brand'
                      : 'bg-base text-fg-muted',
                  )}
                >
                  <p className="whitespace-pre-wrap">
                    <Emphasis text={turn.text} />
                  </p>
                  {turn.reply ? (
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <Badge tone={turn.reply.generated_by === 'anthropic' ? 'ai' : 'neutral'} size="sm">
                        {turn.reply.generated_by === 'anthropic'
                          ? 'AI'
                          : t('pl.knowledge-base')}
                      </Badge>
                      {turn.reply.sources.map((s) => (
                        <Badge key={`${s.kind}:${s.title}`} tone="neutral" size="sm">
                          {s.title}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                  {turn.reply?.disclaimer ? (
                    <p className="mt-1.5 text-xs text-fg-faint">{turn.reply.disclaimer}</p>
                  ) : null}
                </div>
              ))
            )}
            {chat.isPending ? (
              <p className="text-xs text-fg-faint">{t('pl.assistant-thinking')}</p>
            ) : null}
          </div>

          <form
            className="flex items-end gap-2 border-t border-line-subtle px-3 py-2.5"
            onSubmit={(event) => {
              event.preventDefault()
              send()
            }}
          >
            <Textarea
              label={t('pl.ask-cyber-ai')}
              labelHidden
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  send()
                }
              }}
              rows={1}
              placeholder={t('pl.ask-cyber-ai')}
              className="max-h-28 min-h-9 flex-1 resize-none"
            />
            <Button
              type="submit"
              variant="primary"
              size="sm"
              icon={<Send className="size-4" />}
              aria-label={t('pl.send')}
              disabled={!draft.trim() || chat.isPending}
            >
              <span className="sr-only">{t('pl.send')}</span>
            </Button>
          </form>
        </section>
      ) : null}
    </>
  )
}
