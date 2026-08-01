/**
 * A route that is registered but not yet built.
 *
 * The router, the navigation table and the permission matrix were written
 * before the screens they point at. Rather than leave those routes missing —
 * which produces a 404 nobody can distinguish from a real bug — each one
 * renders this, and this says plainly that the screen does not exist yet.
 *
 * It shows no numbers, no charts and no sample data. A placeholder that invents
 * a plausible dashboard is worse than a blank one: it survives review, ships,
 * and is eventually presented as a measurement.
 *
 * Delete this file once every page in `src/pages/` is real.
 */

import { Construction } from 'lucide-react'
import { EmptyState } from '../components/states'

export interface PagePlaceholderProps {
  /** The screen's name, as it appears in the navigation. */
  title: string
  /** One sentence: what this screen will show once it is built. */
  note: string
}

export function PagePlaceholder({ title, note }: PagePlaceholderProps) {
  return (
    // Public routes render outside the shell and get no padding from it, so the
    // placeholder carries its own.
    <div className="mx-auto max-w-3xl px-4 py-10">
      <EmptyState
        icon={Construction}
        headline={`${title} has not been built yet`}
        description={`${note} Nothing is displayed here because nothing has been measured — this route exists so the navigation and the permission model can be exercised before the screen lands.`}
      />
    </div>
  )
}
