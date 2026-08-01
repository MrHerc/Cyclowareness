/**
 * The shell every text-like control shares.
 *
 * Kept out of `Field.tsx` so that file exports a component and nothing else —
 * mixing constants and components in one module breaks fast refresh.
 */

/** Everything an input, textarea or select trigger has in common. */
export const CONTROL_CLASSES =
  'w-full rounded-control border bg-base px-3 text-body text-fg placeholder:text-fg-faint ' +
  'transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50'

/** The border tone. Invalid wins over hover, so an error never looks resolved. */
export function controlBorder(hasError: boolean): string {
  return hasError ? 'border-critical/60' : 'border-line hover:border-line-strong'
}
