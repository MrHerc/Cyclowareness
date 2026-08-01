/**
 * The entry point.
 *
 * `tokens.css` is imported here and nowhere else. It carries the Tailwind
 * import and every colour literal in the product, so it must be the first
 * stylesheet the bundler sees — a component importing it a second time would
 * duplicate the whole theme layer.
 *
 * `StrictMode` stays on. It double-invokes effects in development, which is
 * exactly how the polling and subscription code in this codebase (the loop
 * stream, the disconnection probe) gets caught leaking a listener before it is
 * demonstrated on a stage.
 */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import './design/tokens.css'

const container = document.getElementById('root')
if (!container) {
  // index.html is ours; if this ever fires, the served document is not the one
  // this bundle was built for, and a blank page with no explanation is the
  // worst possible way to find that out.
  throw new Error('Cyclowareness could not start: no #root element in the document.')
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
