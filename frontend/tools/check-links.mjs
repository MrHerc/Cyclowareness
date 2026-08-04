/**
 * Every internal link must land on a route the router actually registers.
 *
 * This exists because it already happened: a panel shipped pointing at `/audit`
 * when the route is `/audit-log`, so its "Full audit log" link took the reader
 * to the 404 page. Nothing caught it — it type-checks, it lints, it builds, and
 * a `<Link to>` string is just a string. The only thing that finds it is
 * comparing every link in the tree against the route table.
 *
 * Run by CI. A broken internal link fails the build rather than the demo.
 *
 * Scope, stated plainly so nobody mistakes a pass for more than it is: this
 * reads STATIC link targets — `to="/threats"` and `to: '/threats'`. A target
 * computed at runtime (`to={`/threats/${id}`}`) is not checked, because the
 * value does not exist until it runs.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const SRC = 'src'
const ROUTES_FILE = join(SRC, 'app', 'routes.tsx')

function walk(dir) {
  const out = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) out.push(...walk(full))
    else if (/\.tsx?$/.test(full)) out.push(full)
  }
  return out
}

// --- the routes the router registers -------------------------------------
const routesSrc = readFileSync(ROUTES_FILE, 'utf8')
const registered = new Set()
for (const m of routesSrc.matchAll(/path:\s*'([^']+)'/g)) {
  const p = m[1]
  registered.add(p.startsWith('/') ? p : '/' + p)
}
if (registered.size === 0) {
  console.error('check-links: read no routes from %s — refusing to pass.', ROUTES_FILE)
  process.exit(1)
}

// A registered `/threats/:id` matches a link to `/threats/anything`.
const patterns = [...registered].map((r) => {
  const clean = r.replace(/\/+$/, '') || '/'
  if (!clean.includes(':')) return { exact: clean }
  const rx = clean
    .split('/')
    .map((seg) => (seg.startsWith(':') ? '[^/]+' : seg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
    .join('/')
  return { rx: new RegExp('^' + rx + '$') }
})

function isRegistered(target) {
  const t = (target.split('?')[0].split('#')[0].replace(/\/+$/, '') || '/')
  return patterns.some((p) => (p.exact ? p.exact === t : p.rx.test(t)))
}

// --- every static internal link ------------------------------------------
const broken = []
for (const file of walk(SRC)) {
  const src = readFileSync(file, 'utf8')
  const targets = [
    ...src.matchAll(/\bto=["']([^"'{}]+)["']/g), // <Link to="/x">
    ...src.matchAll(/\bto:\s*'([^']+)'/g), // { to: '/x' } in the nav table
  ]
  for (const m of targets) {
    const target = m[1]
    if (!target.startsWith('/')) continue // relative or external — not ours to check
    if (isRegistered(target)) continue
    const line = src.slice(0, m.index).split('\n').length
    broken.push({ file: relative('.', file).replace(/\\/g, '/'), line, target })
  }
}

if (broken.length > 0) {
  console.error('\ncheck-links: %d internal link(s) point at no registered route:\n', broken.length)
  for (const b of broken) console.error('  %s:%d  ->  %s', b.file, b.line, b.target)
  console.error('\nEither register the route or fix the link.\n')
  process.exit(1)
}

console.log('check-links: every static internal link resolves (%d routes).', registered.size)
