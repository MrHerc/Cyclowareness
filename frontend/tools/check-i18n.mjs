/**
 * Every message key must be used, and every locale must be complete.
 *
 * This exists because four page titles shipped translated and unreachable:
 * `page.employees.title` held "İşçilər" in the catalogue while the page passed
 * the literal `title="Employees"` to its header. The translation was correct,
 * present, and rendered nowhere. Nothing caught it — an unused object key
 * type-checks, lints and builds, and the page looks fine in English.
 *
 * Two checks, both cheap:
 *
 *   1. ORPHAN KEYS — a key defined in the catalogue and referenced nowhere else.
 *      Always a bug: either the string should be rendered somewhere, or it
 *      should not exist. A catalogue that quietly accumulates dead keys is one
 *      that cannot be trusted to tell you what is translated.
 *
 *   2. LOCALE PARITY — every locale carries every key. The type system already
 *      enforces this for the catalogue in `messages.ts`, so this is a belt for
 *      any locale added later or loaded from elsewhere.
 *
 * What it deliberately does NOT check: whether the Azerbaijani is any good. No
 * script can. Three real terminology defects in this catalogue were found by
 * reading it — "Aradan qaldırma" for Remediation reads as removing the PERSON
 * when it sits under a list of employees — and a passing run here says nothing
 * about that.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const SRC = 'src'
const CATALOGUE = join(SRC, 'lib', 'i18n', 'messages.ts')

function walk(dir) {
  const out = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) out.push(...walk(full))
    else if (/\.tsx?$/.test(full)) out.push(full)
  }
  return out
}

const catalogue = readFileSync(CATALOGUE, 'utf8')

// The English block is the source of truth for what keys exist.
const enBlock = catalogue.slice(
  catalogue.indexOf('const en = {'),
  catalogue.indexOf('} as const'),
)
const keys = [...enBlock.matchAll(/^\s*'([^']+)':/gm)].map((m) => m[1])

if (keys.length === 0) {
  console.error('check-i18n: read no keys from %s — refusing to pass.', CATALOGUE)
  process.exit(1)
}

// --- 1. locale parity ---------------------------------------------------------
const azBlock = catalogue.slice(catalogue.indexOf('const az: Record<MessageKey, string> = {'))
const azKeys = new Set([...azBlock.matchAll(/^\s*'([^']+)':/gm)].map((m) => m[1]))
const missing = keys.filter((k) => !azKeys.has(k))

// --- 2. orphan keys -----------------------------------------------------------
const used = new Set()
for (const file of walk(SRC)) {
  if (relative('.', file) === relative('.', CATALOGUE)) continue
  const src = readFileSync(file, 'utf8')
  for (const key of keys) {
    if (used.has(key)) continue
    if (src.includes(`'${key}'`) || src.includes(`"${key}"`)) {
      used.add(key)
      continue
    }
    // A key can be built at the call site: t(`severity.${row.severity}`). The
    // literal never appears, so match the construction instead — the prefix up
    // to the last dot, followed by an interpolation.
    const prefix = key.slice(0, key.lastIndexOf('.') + 1)
    if (prefix && src.includes('`' + prefix + '${')) used.add(key)
  }
}
const orphans = keys.filter((k) => !used.has(k))

// --- report -------------------------------------------------------------------
let failed = false

if (missing.length > 0) {
  failed = true
  console.error('\ncheck-i18n: %d key(s) missing from the az catalogue:\n', missing.length)
  for (const k of missing) console.error('  %s', k)
}

if (orphans.length > 0) {
  failed = true
  console.error('\ncheck-i18n: %d key(s) defined but rendered nowhere:\n', orphans.length)
  for (const k of orphans) console.error('  %s', k)
  console.error('\nEither render the key or delete it. A translated string that no')
  console.error('component reads is not a translation — it is a comment.\n')
}

if (failed) process.exit(1)

console.log('check-i18n: %d keys, all rendered, all locales complete.', keys.length)
