/** Reading the locale. Separate from the provider so fast refresh keeps working. */

import { useContext } from 'react'
import { LocaleContext, type LocaleContextValue, type MessageValues } from './context'
import type { MessageKey } from './messages'

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext)
  if (!ctx) {
    throw new Error('useLocale must be used inside <LocaleProvider>')
  }
  return ctx
}

/** Just the translator, for the common case. */
export function useT(): (key: MessageKey, values?: MessageValues) => string {
  return useLocale().t
}
