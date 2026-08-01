/**
 * A URL that matches no route.
 *
 * It names the path it could not resolve, which turns the most common cause —
 * a link copied between two deployments, or an id that has since been deleted —
 * into something the reader can diagnose without opening the console. It also
 * offers a way out that respects the signed-in role rather than dumping
 * everyone on the analyst dashboard.
 */

import { Compass } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { EmptyState } from '../components/states'
import { Button } from '../components/ui'
import { useAuth } from '../lib/auth/AuthProvider'
import { homeFor } from '../lib/auth/permissions'

export default function NotFound() {
  const { pathname } = useLocation()
  const { role } = useAuth()

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <EmptyState
        icon={Compass}
        headline="This page does not exist"
        description={`Nothing in Cyclowareness is served at ${pathname}. The link may point at a different deployment, or the record it referred to may have been deleted.`}
        action={
          <Button asChild variant="primary">
            <Link to={homeFor(role)}>Go to your home screen</Link>
          </Button>
        }
      />
    </div>
  )
}
