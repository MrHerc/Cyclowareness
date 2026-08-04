/**
 * The locale context and the rules for picking a starting one.
 *
 * Separate from the provider component so that file exports a component and
 * nothing else — a module that exports both a component and a hook breaks Vite's
 * fast refresh, and a dev server that full-reloads on every edit is how a
 * language switch stops getting tested during the work that changes it.
 */

import { createContext } from 'react'
import { LOCALES, type Locale, type MessageKey } from './messages'

export const STORAGE_KEY = 'cyclowareness.locale'

export interface LocaleContextValue {
  locale: Locale
  setLocale: (next: Locale) => void
  t: (key: MessageKey) => string
}

export const LocaleContext = createContext<LocaleContextValue | null>(null)

function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value)
}

/** The locale to start in: the stored choice, else the browser's, else English. */
export function initialLocale(): Locale {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (isLocale(stored)) return stored
  } catch {
    // Private mode or a blocked store — fall through to the browser's language.
  }
  const nav = typeof navigator === 'undefined' ? '' : navigator.language.toLowerCase()
  return nav.startsWith('az') ? 'az' : 'en'
}
