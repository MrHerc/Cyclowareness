# Translation status — measured, 2026-08-06

## What the catalogue number does and does not mean

`npm run check:i18n` reports **1548 keys, all rendered, all locales complete**.
That measures the CATALOGUE: every key that exists is rendered somewhere, and
Azerbaijani has an entry for every key English has (the `Record<MessageKey,
string>` type makes a gap a compile error).

It does **not** measure UI coverage. A sentence that never became a key is
invisible to it. Reading "both locales complete" as "the portal is translated"
is the mistake this file exists to prevent.

## What is done

110 keys were added and wired on 2026-08-06, in two groups:

* **Module-scope constant maps** — `ARTIFACT_TYPES`, `STATUS_COPY`,
  `VERDICT_SENTENCE`, `SOURCE_LABELS`, `HOME_LABEL`, `GROUPS`, `RECORDABLE`,
  `ACTION`, `SOURCES`, `TIER_TITLES`, `PROVIDERS`, `GENERATION_OPTIONS`,
  `STATUS_OPTIONS`. Each now holds `MessageKey` values that the component
  resolves, because module scope cannot call a hook.
* **Sentences that splice a value in** — now `t(key, { …values })` rather than a
  template literal. `HeroStrip` carried a comment saying computed captions
  "cannot be keyed"; that stopped being true when interpolation was added.

The seven loop stages in `domain/types.ts` gained `labelKey` / `hintKey` /
`ownerKey` **beside** the English fields rather than replacing them. Replacing
would have left every consumer compiling — a `MessageKey` is a string — while
rendering `s.convert.label` to a reader.

## What is left: 465 strings across 180 files

`docs/untranslated-remaining.json` is the measured list. Two shapes:

* `JSX` — text between tags: `<p>Some sentence.</p>`
* `PROP` — a literal on a display prop: `label="Some sentence"`

It is **not** the same set as the work above and is barely reduced by it: that
work was almost entirely module-scope object literals, which this scan does not
look at. Both sets are real; neither is a subset of the other.

Regenerate with `tools/find-untranslated.py`. A sample of 19 was read by hand
and every one was a genuine user-visible string, so the count is close to
honest — expect a few percent noise, not an order of magnitude.

## Two checks, because neither alone is enough

`check:i18n` cannot catch a key that is defined and referenced in a constant but
never resolved at the render site — the reference satisfies it while the reader
sees `p.learning-platforms`. That is not hypothetical: it happened on
`/integrations` in this very pass and was caught only by the second check.

The second check drives the SPA and looks for `prefix.slug` as visible text:

```js
const KEYISH = /^[a-z]{1,12}\.[a-z0-9-]{3,60}$/
const KNOWN  = /^(p|a|h|w|s|nav|t|f)\./
```

Filenames (`invoice.ps1`) and API event types (`remediation.disputed`) match the
first pattern and are not keys — hence the prefix allow-list. Last run: 20
routes, zero leaks.

## The file this replaces

`docs/pending-translations.json` was a work-list of 54. It was wrong in three
ways, all found by checking rather than trusting it: 13 entries named sites that
a later pass had already wired under better names, one was an SVG `d` attribute
the extractor mistook for prose, and it caught single entries of maps whose
neighbours it never listed — wiring only those would have left panels rendering
half in each language.
