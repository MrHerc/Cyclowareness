/**
 * What went wrong at sign-in, in words.
 *
 * `components/states/ErrorState` already does this for a page that failed to
 * load, but a sign-in failure is not a failed page: it sits inside a form the
 * user is still filling in, and the two failures that matter most here — a wrong
 * password and an API that is not answering — must never share a sentence. One
 * is the user's to fix and the other is not, and telling them apart is the whole
 * value of this table.
 */

import { ApiError } from '../../lib/api/client'
import type { TFunction } from '../../lib/i18n'

export interface SignInFailure {
  headline: string
  detail: string
}

/**
 * The translator is a PARAMETER, not a `useT()` call in the body.
 *
 * This is a plain function, so calling the hook here breaks the rules of hooks —
 * it compiled, and only `oxlint` said so. The caller is a component that already
 * holds a translator; passing it down keeps this table testable without a React
 * tree around it.
 */
export function signInFailure(error: unknown, t: TFunction): SignInFailure {
  if (!(error instanceof ApiError)) {
    return {
      headline: 'Sign-in could not be completed',
      detail:
        t('u.something-unexpected-stopped-the-request-before-it'),
    }
  }

  // Throttling answers 429, which the transport classifies as a generic 4xx.
  // The server's own sentence is the useful one here, so it is kept.
  if (error.status === 429) {
    return {
      headline: 'Too many failed attempts',
      detail: `${error.message} Repeated failures are rate limited per account and per address.`,
    }
  }

  switch (error.kind) {
    case 'unauthorized':
      return {
        headline: 'Incorrect email or password',
        detail:
          t('u.the-platform-did-not-recognise-that-combination'),
      }
    case 'unreachable':
      return {
        headline: 'Cannot reach the Cyclowareness API',
        detail:
          t('u.the-service-may-still-be-starting-or'),
      }
    case 'timeout':
      return {
        headline: 'The sign-in request timed out',
        detail:
          'The platform took the request but did not answer in time. It is more likely busy than broken.',
      }
    case 'server':
      return {
        headline: 'The platform failed on the sign-in request',
        detail:
          'This is a fault on the server side, not something you did. If it persists, the deployment needs attention.',
      }
    case 'validation':
      return { headline: 'The platform rejected these values', detail: error.message }
    default:
      return {
        headline: 'Sign-in was refused',
        detail: error.message,
      }
  }
}
