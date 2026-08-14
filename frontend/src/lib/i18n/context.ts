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

/** Values spliced into a message's `{placeholders}`. Numbers are formatted by
 *  the caller, because only the caller knows whether a figure is a count, a
 *  rate or a score — this layer must not decide that silently. */
export type MessageValues = Record<string, string | number>

/** The translator itself. Module-scope helpers cannot call `useT`, so they
 *  take one of these as an argument instead. */
export type TFunction = (key: MessageKey, values?: MessageValues) => string

export interface LocaleContextValue {
  locale: Locale
  setLocale: (next: Locale) => void
  t: (key: MessageKey, values?: MessageValues) => string
}

export const LocaleContext = createContext<LocaleContextValue | null>(null)

function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value)
}

/**
 * The locale to start in: the stored choice, else English.
 *
 * EN IS THE DEFAULT, NOT A DETECTION RESULT, and the reason is consistency
 * rather than preference. The content this deployment carries — threat
 * titles, module names, advisories, department names — is seeded in English,
 * and no interface translation reaches it. Opening in Azerbaijani therefore
 * produced a screen that was half translated chrome and half English data,
 * which reads worse than either language does alone.
 *
 * Azerbaijani is complete (both locales are enforced by the type system) and
 * one click away — on the sign-in screen and in the user menu — and the
 * choice persists. It stops being the default only until the demo world
 * itself is written in it.
 */
export function initialLocale(): Locale {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (isLocale(stored)) return stored
  } catch {
    // Private mode or a blocked store — fall through to the default.
  }
  return 'en'
}
