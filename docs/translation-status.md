# Translation status — measured, 2026-08-09

## The frontend is done

`npm run check:i18n` reports **2015 keys, all rendered, all locales complete**,
and the scanner (`frontend/tools/find-untranslated.py`) reports **2 remaining
strings**, both deliberate:

* `MITRE ATT&CK` in `features/approvals/ThreatPanel.tsx` — the framework's own
  name, not prose. (The scanner flags it because `&amp;` contains a lowercase
  run.)
* `RANK[integration.status]` in `IntegrationHealthPanel.tsx` — the JSX regex
  matching across an arrow function; nothing is rendered.

Live sweep on 2026-08-09: 23 routes signed in as an analyst with the locale set
to `az`, **zero message keys rendered as visible text**, zero contrast failures
on the four public doors, `<html lang>` = `az`. The 2026-08-06 backlog measured
**463** user-visible English strings across 180 files; all were wired across
six batches (~520 new `u.*` keys), plus a FIELD layer the first scanner could
not see (`caveat:`, `sampleNoun:`, `sourceDetail:` … inside HonestMetric
definition objects and their kin).

## What English remains on screen, and why it is not a frontend defect

Walking the routes in Azerbaijani still shows English in one class of places:
**server-supplied data** — seeded threat titles ("Chat-based credential
phish…"), module names ("Why held-open doors are an attack."), intel
advisories, department names. Those live in the DATABASE (`backend/app/seed.py`
and demo content), not in the frontend catalogue. Translating them is a seeding
decision, not an i18n gap: the same deployment pointed at a real organisation's
data would show that organisation's own text.

## The tooling (kept in `frontend/tools/`)

* `find-untranslated.py <out.json>` — scans three shapes: JSX text runs,
  display PROPS, and object FIELDS, all via allow-lists. Skips key-shaped
  strings (`p.foo` stored in a constant the component resolves with `t()`).
* `wire-translations.py <batch.json>` — takes `{english: azerbaijani}`, mints
  `u.*` keys, appends both locales, rewrites every render site the scan found,
  injects `const t = useT()` structurally, and runs `tsc` after EVERY file —
  a failing file is restored, never left broken. Strings absent from the scan
  get no key, so a paraphrased batch entry cannot become an unrendered key.
* `prune-unrendered.py` — deletes `u.*` keys nothing renders.

Batch entries must be **verbatim** from the scan. Two hand cases the pipeline
cannot do: class components (no hooks — `ErrorBoundary`'s fallback was
extracted into a function component), and literals containing an apostrophe
(`…incident's assignments` truncates the scanner's capture — `RiskImpactPanel`
was wired by hand).

## Two checks, because neither alone is enough

`check:i18n` cannot catch a key that is defined and referenced in a constant
but never resolved at the render site — the reference satisfies it while the
reader sees `p.learning-platforms`. That happened on `/integrations` and was
caught only by the second check: drive the SPA, locale `az`, and look for
`prefix.slug` as visible text:

```js
const KEYISH = /^[a-z]{1,12}\.[a-z0-9-]{3,60}$/
const KNOWN  = /^(p|a|h|w|s|u|x|y|nav|t|f)\./
```

Filenames (`invoice.ps1`) and API event types (`remediation.disputed`) match
the first pattern and are not keys — hence the prefix allow-list.
