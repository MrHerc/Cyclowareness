/**
 * Locale state: one context, one persisted choice.
 *
 * The chosen language is written to `localStorage` and read back before first
 * paint, so a reader who picked Azerbaijani does not get a flash of English on
 * every reload. It is also written to `<html lang>`, which is not decoration:
 * a screen reader picks its voice from that attribute, and Azerbaijani read
 * aloud by an English synthesiser is unusable.
 *
 * `t(key, values)` splices `{placeholders}`. The values come from the caller
 * already formatted, because only the caller knows whether a number is a count,
 * a rate or a score, and this layer must not decide that quietly.
 *
 * `t()` falls back to the English string when a key is missing from the active
 * locale. That cannot currently happen — `MessageKey` is derived from the
 * English catalogue and the Azerbaijani one is typed as a complete `Record` of
 * it, so the compiler refuses a gap. The fallback exists for a locale loaded
 * from somewhere other than that file.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { LocaleContext, STORAGE_KEY, initialLocale, type MessageValues } from './context'
import { resetDateFormatCache } from '../format'
import { MESSAGES, type Locale, type MessageKey } from './messages'

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale)

  useEffect(() => {
    document.documentElement.lang = locale
    // `formatDate` reads the language off this attribute and caches whether the
    // locale has usable month names. Setting the attribute is what invalidates
    // that answer, so the reset belongs here and nowhere else.
    resetDateFormatCache()
  }, [locale])

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next)
    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // A blocked store costs persistence, not the switch itself.
    }
  }, [])

  // Placeholders are `{name}`. A message that mentions a placeholder the caller
  // did not supply keeps the literal `{name}` rather than printing "undefined"
  // — a visible gap is debuggable and an invented value is not.
  const t = useCallback(
    (key: MessageKey, values?: MessageValues) => {
      const template = MESSAGES[locale][key] ?? MESSAGES.en[key] ?? key
      if (!values) return template
      return template.replace(/\{(\w+)\}/g, (whole, name: string) =>
        name in values ? String(values[name]) : whole,
      )
    },
    [locale],
  )

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t])

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}
