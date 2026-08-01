/**
 * The toast context and its hook.
 *
 * Split from the provider component so a file exports either components or
 * hooks, never both — which keeps fast refresh sound and the lint quiet.
 *
 * A toast is for the RESULT of something the user did: "Run 41 approved",
 * "Could not reach the sandbox". It is not a notification channel and not a
 * place for anything the user must read — it disappears, and anything important
 * enough to require action belongs on the page.
 */

import { createContext, useContext } from 'react'

export type ToastTone = 'info' | 'success' | 'warning' | 'error'

export interface ToastOptions {
  title: string
  /** One extra sentence. Keep the failure reason here, not in the title. */
  description?: string
  tone?: ToastTone
  /** Milliseconds. Errors default to longer because they are read, not glanced. */
  duration?: number
}

export interface ToastRecord extends Required<Pick<ToastOptions, 'title' | 'tone'>> {
  id: string
  description?: string
  duration: number
}

export interface ToastApi {
  /** Shows a toast and returns its id, so a caller can dismiss it early. */
  show: (options: ToastOptions) => string
  dismiss: (id: string) => void
}

export const ToastContext = createContext<ToastApi | null>(null)

export function useToast(): ToastApi {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used inside <ToastProvider>')
  return context
}
