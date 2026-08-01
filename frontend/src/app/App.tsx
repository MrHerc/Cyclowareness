/**
 * The application: every provider, then the router.
 *
 * The router is built here rather than at module scope in `routes.tsx` for two
 * reasons. `createBrowserRouter` reads `window.history` the moment it is
 * called, so building it inside a component keeps the route table itself
 * importable without a DOM; and `useState` with a lazy initialiser guarantees
 * exactly one router instance for the life of the application — a router
 * rebuilt on a re-render loses its history and remounts every page.
 *
 * Otherwise this stays small on purpose. Anything that grows here belongs
 * either in `providers.tsx`, where it can be reasoned about as context, or in
 * the shell, where it can be seen.
 */

import { useState } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { Providers } from './providers'
import { routes } from './routes'

export function App() {
  const [router] = useState(() => createBrowserRouter(routes))

  return (
    <Providers>
      <RouterProvider router={router} />
    </Providers>
  )
}
