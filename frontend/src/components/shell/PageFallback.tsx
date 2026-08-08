/**
 * What sits in the content column while a lazy page module downloads.
 *
 * A skeleton rather than a spinner: the chrome is already on screen, so the
 * honest signal is "this region is filling in", not "the application is
 * starting". It carries an `aria-busy` live region so a screen-reader user is
 * told something is loading instead of hearing silence.
 */

import { SkeletonCard, SkeletonText } from '../states'
import { useT } from '../../lib/i18n'

export function PageFallback() {
  const t = useT()
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">{t('u.loading-this-screen')}</span>
      <div className="max-w-md">
        <SkeletonText lines={2} />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SkeletonCard metric />
        <SkeletonCard metric />
        <SkeletonCard metric />
        <SkeletonCard metric />
      </div>
      <SkeletonCard lines={6} />
    </div>
  )
}
