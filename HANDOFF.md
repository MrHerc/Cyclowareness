# Handoff — Cyclowareness, 2026-08-04

Written to continue in a fresh session. Everything below is measured or read
from the repositories, not recalled.

---

## 1. Where things stand right now

| | Repo | Head | CI | Notes |
|---|---|---|---|---|
| Portal | `MrHerc/Cyclowareness` | `187b750` on `master` | green; backend commits pass, the recent ones are design-only | 350 backend tests |
| Sandbox | `MrHerc/cyclowareness-sandbox` | `a853849` (another session's, now **GREEN**) | green | I re-vendored its engine into the portal at `616c67b` |

**Engine drift is CLOSED as of `616c67b`** — the four files were re-vendored once
the standalone went green, and `quarantine_is_noexec()` (which arrived with them)
is now published on `/api/sandbox/capabilities` and shown in the deployment
panel. All 37 engine files byte-identical again. If `test_engine_seam_holds` ever
fails again, follow §2 — but right now it passes.

**Live:** <https://cyclowareness.onrender.com> — auto-deploys from `master`.
`/api/health` reports `analyzer: real`, `ai_provider: anthropic`. Both keys are
set and both were exercised end to end, not just read off the health endpoint.

**Working branch:** `claude/cyclowareness-audit-redesign-ecd5b1`, kept in sync
with `master`. Both are pushed on every commit.

### Demo credentials (APP_ENV=demo — the login page also has one-click buttons)

| Role | Email | Password |
|---|---|---|
| Security analyst | `analyst@caspiandynamics.az` | `analyst123` |
| Employee — high risk (Rashad) | `rashad.mammadov@caspiandynamics.az` | `demo123` |
| Employee — Finance (Leyla) | `leyla.aliyeva@caspiandynamics.az` | `demo123` |
| Executive | `exec@caspiandynamics.az` | `exec123` |

---

## 2. THE ONE THING THAT NEEDS A DECISION FIRST

**The vendored engine has drifted again.** Four files differ from the standalone:

```
mitre.py   report.py   storage.py   verdict.py
```

`backend/tests/test_engine_seam_holds.py::test_the_vendored_engine_is_byte_identical_to_the_standalone`
reports this. **It is the only failing test, and it is failing correctly.**

**Do NOT copy them yet.** The standalone's own CI is RED on the commit that
changed them (`a853849`, "wip: day1 1A.1 1A.2" — another session's work in
progress). Copying a red commit's engine imports somebody else's unfinished
work into the portal.

Their change *looks* right (`_worst` was forwarding only one of two guards, so a
sample the engine had already decided may not accuse still published a raw CAPE
severity). And `storage.py` gained `quarantine_is_noexec()` — a real finding on
their side: the docs claimed `noexec` and the live host did not have it.

**When their CI is green:** copy the standalone's BYTES verbatim, then re-check
what the portal *does* with what arrived. Last re-vendor needed four separate
rewirings after the files landed — the files are half the job.

---

## 3. What this session did — 24 commits

Grouped by what they were about, most consequential first.

### Evidence that was false

* **`sample_retained` was a claim about policy, not the disk.** It read
  `sample_deleted_at is None`; the portal has no retention sweeper, so the
  column is NULL for ever and every export asserted `true` unconditionally —
  while the quarantine sits on `/tmp` and the DB rows outlive a redeploy. Every
  JSON/incident/PDF/STIX/signed export of every pre-redeploy job claimed this
  deployment still held bytes it had lost, and invited a regulator to re-hash a
  file nobody had. Three states now: here / deleted by policy with a date /
  simply gone.
* **The executive page called arithmetic over demo data "an improvement."**
  `Average behaviour risk` read `30.0, −23.7 — an improvement`: a live value
  differenced against a snapshot whose `source` is `"seeded"` (all 26 were).
  `TrendPoint.source` existed *precisely* for this — the chart had been taught
  to read it, `previousPeriod` never had.
* **The model's discarded draft reached the board.** The live briefing opened
  with a draft it abandoned mid-sentence, asserting click rates "roughly halved"
  when 0.20 → 0.294 is a 47% *rise*. `briefing_guard` keeps the model's own
  final version and records what it removed. A second rule grounds every figure
  against the metrics payload — validated on real output, zero false positives.

### Rights the product promised and did not have

* **Dispute.** `learner_disclosure` told every employee "use Dispute — that goes
  to a person, not to a system". There was no Dispute. Now there is, with a test
  that reads the promise text and asserts the route exists.
* **Contest a risk event.** An analyst could withdraw a bad batch; the person
  the events are *about* could not even ask. These are the events that put HIGH
  RISK beside their name.
* Both follow the same rules: **404 not 403** for someone else's record (403
  confirms the row exists, which discloses that a named colleague has one),
  filing does not decide, and the outcome — including withdrawal — reaches them.

### Things that were never wired

* **The Remediation Engine had no caller.** Three tables, seven endpoints, a
  full screen, a firewall with 32 tests attacking it — and `plan_for` was
  invoked from nowhere. Now called from `_apply_outcome`.
* **The portal never published where samples go.** A deployment with
  `CAPEV2_URL` set uploads every detonatable sample to a third party and no
  screen named it. Now published, with a canary test proving no credential
  leaks, and `configuration_caveat` rendered because `configured` reads *this*
  process's env while the engine runs on the worker.

### Presentation that misled

* A starting position (`baseline_assessment`, an arithmetic remainder) was shown
  in the column headed "What is raising it" whose empty state says "No
  **behaviour** has pushed your score up". Present for 26 of 26 employees,
  reaching 43 points of 100. Deriving scores from events was measured and
  rejected — it reorders the roster and destroys the demo storylines. The
  defect was that it was presented as conduct.
* Counts saturating at their page size; a tab and a tile that could never be
  non-zero; a rate computed from 3 outcomes below the platform's own floor of 5;
  an expired assignment saying "You have already completed this".

### Design (last two commits, in progress — see §5)

---

## 4. Rules that will bite you — learned the hard way this session

1. **Never purge `sys.modules` in a test.** A test of mine did, to force a
   re-import under a different env. It passed in isolation and **reddened the
   sandbox's CI**: every later test holding a reference to a class from a
   replaced module fails on identity. 51 failures with it, 1 without. It also
   fooled the diagnosis twice — I blamed the repo, then my Windows environment.
   `monkeypatch.setenv` + `get_settings.cache_clear()` is enough, plus an
   autouse fixture clearing it again on teardown.
2. **The `db` fixture does not reset between tests.** Clean up only the rows
   *your* test created — by id. A cleanup keyed on `(employee_id, type)` deleted
   the seed's row too and failed a test two files later by forty points.
3. **Never write a backslash through a bash heredoc.** `\n` arrives as a real
   newline and splits string literals. Hit again this session despite the
   written rule. Use the Write/Edit tools.
4. **`alembic revision --autogenerate` emits `NOT NULL` with no default**, which
   SQLite accepts and PostgreSQL refuses on a populated table. Add with
   `server_default`, then drop the default so `alembic check` stays clean.
   `test_no_migration_adds_a_not_null_column_without_a_default` catches it now.
5. **Every model change needs a rung in `_ADOPTION_LADDER`.** There is a test.
6. **CI does not run on feature branches** — only `master`/`main` push and PRs.
   `gh` is not installed here; there is no Docker and no local PostgreSQL, so
   the Migrations-PostgreSQL job cannot be reproduced locally at all.
7. **Another session edits these same working trees.** Check `git status` before
   `git add -A`; stage explicit paths in the sandbox repo.
8. **The browser pane reports `visibilityState: hidden`** — `requestAnimationFrame`
   fires zero frames, and `computer{action:"screenshot"}` times out. Verify with
   `get_page_text` / `javascript_tool`. Animation cannot be verified here.

**The method that actually worked:** every serious defect this session was found
by *exercising the live system*, not by reading code — six of them. Static
review found none, because each was syntactically perfect: `sample_retained:
true` is valid Python, `"an improvement"` is valid TypeScript. What was wrong
was the **claim**.

---

## 5. Design work — IN PROGRESS, this is where to continue

The user supplied a reference: dark near-black dashboard, lime accent, one
filled KPI card, timeline strip, petal severity chart, narrow icon rail. And:
*"login — an interactive design like mercury.com, internals like this image."*

### Done — six commits, all verified in the browser by reading structure (the
pane does not composite frames, so no screenshots and no rAF — see §4.8)

* **Incident timeline** (`1c2e6c7`) — the reference's centrepiece. Horizontal
  dotted rail, a node per real audit event, time chip below, action phrase above.
  Adverse actions (reject/block/revoke/dispute/contest/fail) tint red; the rest
  stay neutral. `IncidentTimeline.tsx`, on the command centre under the hero.
* **Severity radial** (`38ca21d`) — the reference's petal figure, as an honest
  donut. One segment per severity that has findings, total in the hole, exact
  legend beside. `info` stays grey; ordered critical-first. `SeverityRadial.tsx`,
  replaced the bar chart in `PolicyExposurePanel`.
* **Login floating card** (`791eec4`) — the sign-in form floats as one elevated
  blurred card on the lit background, matching the internals' panel language.
  The pointer light reads through it.

### Done earlier this session

* **Palette repainted** (`5a6438b`). Navy+cyan → neutral near-black + lime.
  Measured, not eyeballed: worst body ratio **4.88** (AA floor 4.5), text on the
  lime fill **14.94** — white on this lime measures **1.4**, which is why
  `--color-on-brand` exists as a token.
  Two severity hues moved and the measurement chose the direction, in **OKLCH**
  degrees because HSL degrees are not perceptually even:
  `safe` 37° → 62° (a green "safe" chip beside a lime accent reads as one
  signal); `medium` stayed at **54°** as a documented compromise — pushing it
  further drags it to 9.5° from `high`, and two *adjacent* severities that look
  identical is worse.
  Page glow is now ONE light source in the accent hue, top-left.
* **The reference's signature move** — one filled card in the attention row. It
  marks the most *pressing* count, not the first tile, and nothing pressing
  means nothing filled.
* **Login pointer light** (`a5a38c8`). A soft lime light chasing the cursor,
  `pointer-events-none`, behind everything, carrying no information. Refuses to
  run under `prefers-reduced-motion` or on a coarse pointer.
  **The motion itself is UNVERIFIED** — rAF does not run in this browser pane.
  The easing maths was checked separately (converges, no overshoot). Ask the
  user to confirm it visually.

### Not done — pick up here

* The **narrow icon rail** sidebar was DELIBERATELY not copied. The reference has
  ~4 destinations; this product has ~20 across four nav groups. Twenty unlabelled
  icons is the same cargo-cult mistake as copying the palette blind. If you do
  touch the sidebar, keep labels — an "ideal design for THIS product" is not the
  reference's nav pattern. There was a "frozen foundation" rebuild noted in
  memory; read it before touching the shell.
* The **KPI trend pills** from the reference (`+15%`, `−5%` chips on each card).
  The hero tiles have the filled-card move but not per-card deltas. These would
  need a real prior-period number per count, which the dashboard payload does not
  currently carry — do NOT fake them, that is the seeded-baseline defect again.
* `LoopSignature` on the login was deliberately left untouched — it is the
  considered figure there and refuses to carry invented quantities.
* The **login pointer-light MOTION is still unverified** — rAF does not run in
  this pane. Ask the user to confirm it visually.

## 12. Full-system audit, 2026-08-06 — everything measured, nothing assumed

Run against the local stack at `187b750`, locale `az`.

| Surface | Result |
|---|---|
| Backend suite | **346 passed**, 1 skipped (engine byte-identity, skipped in CI) |
| Frontend gates | build, lint, typecheck, check:links (38 routes), check:i18n (1438 keys) — all pass |
| All 19 analyst routes | render, **zero errors**, all h1 in Azerbaijani |
| API surface (10 endpoints) | 200 on every one |
| Admin door | phone → OTP → **analyst** token |
| Employee door | phone → **employee** token, no OTP (as specified) |
| Unknown number | flat **404**, no enumeration hint |
| Resource catalogue | 9 topics, **37 verified**, zero empty topics |
| Module resource panel | 6 verified links, each with its check date |
| Employee portal | renders, "Təhlükəsizliyim", no error branch |

One 404 during the sweep was **my own wrong path guess** — `/api/intel/advisories`
does not exist; the route is `/api/intel/items`, which answers 200. Not a defect.

## 11. NEXT SESSION STARTS HERE (2026-08-09, `b5d5596`)

Everything below is measured on this branch's tip, live in the browser.

### What the overnight run finished (all pushed)

* **The auth doors are single-column Mercury** (`84bfa91`, `b5d5596`): white
  ground, four pastel blooms full-bleed, black 46px CTA (17.92:1), 40px title,
  one centred 26rem column, no aside. Login shows ONE method at a time —
  email <-> phone behind a switch link — the three SSO buttons are one compact
  row, and the demo-accounts panel is a closed `<details>`. All four doors
  sweep to zero contrast failures.
* **The translation backlog is done** (`b5d5596`): 463 measured strings ->
  2 deliberate leftovers ("MITRE ATT&CK" is a proper noun;
  `RANK[integration.status]` is a scanner artefact). check-i18n: **2015 keys,
  all rendered, both locales complete**. 23 routes swept signed-in in `az`
  with zero message keys as visible text.
* **The pipeline is committed** in `frontend/tools/`:
  `find-untranslated.py` (JSX + PROP + FIELD shapes),
  `wire-translations.py` (verbatim `{en: az}` batches, tsc after every file,
  restore on failure), `prune-unrendered.py`. Read
  `docs/translation-status.md` before touching any of it.

### What is deliberately NOT done

* **English in server data** — seeded threat titles, module names, intel
  advisories. That is `backend/app/seed.py` content, a seeding decision, not
  an i18n gap. If Safar wants the demo world itself in Azerbaijani, that is a
  seed-file translation pass plus re-seed, and nothing in the frontend changes.
* **The live deployment still runs the old bundle** — this branch has not been
  merged or deployed. `master` is behind; the deploy step is Safar's call.

## 10. Where the Azerbaijani stands (2026-08-06, `e2c479c`)

**1438 keys, both locales complete, `check:i18n` green.** Navigation, page
titles and standfirsts, panel titles/subtitles/captions, inline headings, the
report catalogue, the auth screens, and 880 of the 947 explanatory prose
strings.

**Three things are still English ON PURPOSE, and each for a different reason:**

1. **Interpolated sentences.** "Rates cover a trailing 30 days and are withheld
   below 5 resolved events" splices numbers into prose. A flat key catalogue
   cannot express that; it needs parameterised messages (`t(key, {days, min})`).
   That is a design change to `messages.ts` + `LocaleProvider`, not a sweep.
   **This is the largest remaining class.**
2. **Seeded data** — threat titles, campaign names, integration names. Records,
   not interface. Translating them would be wrong.
3. **54 parked keys**, listed with their Azerbaijani in
   `frontend/docs/pending-translations.json`. They live in module-scope
   constants whose render site could not be wrapped mechanically. The
   translation is already paid for; only the plumbing is left.

**The applier lesson, twice learned.** Rewrite one file, run tsc, keep it only
if clean — never a whole batch then a check. The batch approach hit 44 syntax
errors on the first attempt and 27 type errors on the third, and both times the
entire batch had to be reverted, good work included.

**Module-scope constants cannot call hooks.** Two honest shapes: the constant
becomes a function of `t` (`reportTypes(t)`), or it holds `MessageKey` values
that the component resolves (`ErrorState`, `AIProvenanceBadge`, `HeroStrip`).
Prefer the second — smaller diff, and a missing key becomes a compile error.
Where a value interpolates, the field is `MessageKey | string` with an `isKey`
guard, so a computed sentence passes through rather than being looked up and
coming back blank.

## 9. The sign-in screen, the maker's name, and the last prose (2026-08-06)

**Login in the Mercury idiom.** The card and pointer light were already there;
what was missing was entrance and life. `settle` (tokens.css) staggers the
screen in reading order — mark 0.04s, form 0.12s, figure 0.2s, footer 0.3s.
`AuroraField` drifts two brand-hued blooms at 34s and 47s; the periods are
**coprime on purpose** so the pair never visibly returns to a starting pose.
Transform-only, because this runs behind a password field and a repaint costs a
keystroke. Both carry NO information — same rule as the pointer light.

**`vendor_name` is NOT `entity_name`.** The first is who BUILT the platform
("Safarov Industries Inc.", surfaced by `MadeBy` from `/api/capabilities`); the
second is the organisation RUNNING it, copied verbatim onto NIS2 and DORA
incident records. Putting the vendor in `entity_name` would file a regulatory
notification in the wrong company's name. Never merge these two settings.

**Auth screens are fully translated** (20 strings, keys `a.*`). The wordmark
stays "Cyclowareness" — a name. The tagline is a phrase and carries
`lang={locale}` so uppercase follows Azerbaijani casing.

**Gate note worth keeping:** two strings sitting before a `{' '}` separator were
invisible to the bare-text regex and were caught by `check:i18n` as orphan keys.
When a translation "does not apply", check for a JSX expression splitting the
text node.

**In flight at write time:** the 947-string prose pass (`p.*` keys), 12 batches
with a reviewer lens, applied by `scratchpad/apply_prose.py`. That script
DEFERS any literal that sits outside a component body — a module-level helper
cannot call a hook, and forcing one there is what broke the tree on the first
panel attempt.

## 8. The overnight run (2026-08-05 → 06): four owner asks

1. **Resource catalogue — DONE.** 37 verified external resources across all nine
   attack topics (YouTube + 4 Coursera courses). Every URL dereferenced before
   storage; YouTube via oEmbed (the watch-page check passes fabricated ids —
   measured), Coursera via page fetch (200 real / 404 fake — measured). Udemy is
   deliberately absent: udemy.com answers 403 to every automated fetch, real and
   fake alike, so it cannot be verified and unverifiable links do not ship. Four
   API endpoints under /api/training/resources*, panel on the module detail with
   "link checked <date>" per row. `revalidate()` demotes dead links.
2. **Training creation — DONE.** POST /api/training/modules (analyst, provenance
   pinned server-side: ai_generated=False, source empty, PENDING_REVIEW, audit
   row). NewModuleDialog on Training → lands in the editor. ResourceImportPanel
   pastes URLs, shows every refusal with its reason.
3. **Portal split — DONE.** /admin (phone 0102210831 + stub OTP: server returns
   `demo_otp` in demo mode only, five-minute single-use codes, constant-time
   compare) and phone entry on /login (0557711253, no OTP by request). Numbers
   are settings ADMIN_PHONE/USER_PHONE, committed defaults at the owner's
   explicit request. Both resolve to SEEDED users — no second identity system.
   Portal lead shows "Name · ID n · Role · Department".
4. **Panel translation — DONE. 517 keys, both locales complete.** Three sweeps:
   366 prop sites (title/subtitle/caption), 42 inline headings and labels, then
   4 literals hiding in helpers and ternaries. Plus the report catalogue.
   `Panel` and `ChartFrame` stamp `lang={locale}` centrally.

   **Two applier failures worth not repeating.** (a) Inserting `const t =
   useT()` reactively from tsc error lines walks into DESTRUCTURED PARAMETER
   LISTS — 44 syntax errors, whole tree reverted. The working version walks
   structurally: find each top-level `function`, balance the parameter parens to
   find the real body brace, insert only where the body calls `t(`. (b) Module-
   level constants and helpers cannot call hooks: `REPORT_TYPES` became
   `reportTypes(t)`, `selectionLabel` took `t` as a parameter.

   **DATA stays English** — seeded threat titles, campaign names, module titles
   are records, not interface. Long prose paragraphs were excluded on purpose;
   a screen speaking two languages mid-argument is worse than one speaking
   English. That prose is the only layer left.

## 7. The six-lens audit (2026-08-05) — ALL 17 CLOSED

Six finder agents (employee portal + detail pages, accessibility, responsive,
data honesty, i18n correctness, IA of the other 18 pages); every finding then
handed to a skeptic told to default to refuted. **23 raw, 17 confirmed, 6
refuted** — the refuted six were style opinions, which is the verify stage
working.

**Closed (13):** three wrong Azerbaijani renderings (`nav.remediation` said
"Aradan qaldırma" — removal with no object, next to a list of employees, which
reads as removing the PERSON); eleven keys translated and rendered nowhere; the
command palette matching English only; `revoked_at` ignored so withdrawn
accusations rendered live to analysts; `scoreTrail` unwinding revoked deltas; a
failed `/employees/me` rendering as exoneration; a failed
`/remediation/plans/mine` taking the appeal route with it; `/settings`
reachable only by URL; a heading-level skip; a 32px mobile nav target; an empty
`Map` making three card branches dead; the seeded-data caveat living on one page
instead of on the series; a roster-wide sum sitting between two per-person
means; both appeal controls dropping focus to `<body>`; toast live regions
created at announcement time.

**Nothing from this audit is left open.** The last four closed were: the
`DecisionPanel` tooltip (no keyboard path to the reason two buttons were
disabled — now said in text), `Panel`'s non-wrapping header (a wide action
clipped the title), Departments' mismatched sibling heading levels, and
`PlanQueue`'s hardcoded AI vendor (now read from `/api/capabilities`).

**Two new CI gates**, both of which found real defects the moment they ran:
`npm run check:links` (a `<Link to>` is just a string — `/audit` shipped against
a router registering `/audit-log`) and `npm run check:i18n` (found 19 orphan
keys immediately; it must understand template-built keys like
``t(`severity.${x}`)`` or it passes them silently).

**Method note.** Static sweeps found ~1 real defect. Live measurement plus
adversarially-verified lenses found the rest. Two measurement traps cost real
time: `textContent` hides `text-transform` (use `innerText`, on a VISIBLE
element), and reading page width mid-render reports zero overflow when the real
figure is 503px.

## 6. Structure and the Azerbaijani locale (2026-08-04)

**The complaint** was that the portal holds a great deal and none of it says
what it is. Measured, that was exactly right: the command centre carried 8,066
characters over 12 sections and 26 panels while the pages meant to hold that
depth were nearly empty (Closed loops 1,169; Approval gate 1,320). Eight panels
sat in one flat grid, each a miniature of a page that already exists — a second
copy of the sidebar with the labels removed.

**The fix was naming, not deleting.** Those eight are now five bands carrying
the sidebar's OWN section names in its own order (Operate, Programme, People &
risk, Governance, System), each naming where its depth lives. The dashboard
teaches the navigation instead of competing with it. Heading levels were
inverted underneath — `Panel` and `ChartFrame` both accept `headingLevel` and
nobody passed it — so the outline is now h1>h2>h3>h4 with zero skips.

**The audit found one real defect and it was mine**: `IncidentTimeline` linked
to `/audit` against a router registering `/audit-log`, so its own "Full audit
log" opened the 404 page. `frontend/tools/check-links.mjs` now fails CI on any
static internal link that cannot land — proven by reintroducing the exact typo.
Everything else came back clean: 19 pages, zero runtime errors, zero colour
literals outside tokens, zero unnamed controls.

**The locale** is `src/lib/i18n/` — no dependency, a typed catalogue where
`MessageKey` derives from English so a gap is a compile error. Translated: the
whole shell, all sixteen static page titles, the five bands, the command
centre's six headings. NOT translated, and deliberately: the analytical prose
inside panels. Untranslated is not the same as missing, and machine-shaped
Azerbaijani in this product would be the worse failure. The switch is in the
account menu; the choice persists and sets `<html lang>`.

**Where to continue.** The standfirsts are done (16, with `lang={locale}` on
each because they sit inside `<main lang="en">`). What remains, in order of
value:

1. **Panel bodies** — the analytical prose. Tens of thousands of words. When
   this is done, `<main>` takes the locale and the `lang="en"` override plus the
   per-element `lang={locale}` stamps all come out together. Do NOT machine-
   translate it: read [[cyclowareness-structure-locale]] first.
2. **Locale-aware formatting** — `Intl` is used throughout but always with the
   default locale, so dates and numbers stay English-shaped under `az`.
3. **`check-i18n` cannot judge quality.** Three real terminology defects were
   found by READING the catalogue, not by any script. Have a native speaker read
   the 110 strings aloud once.

### The design rule that held through all six commits, and must keep holding

**No colour literal outside `frontend/src/design/tokens.css`.** Every new
component reads `var(--color-*)` or a Tailwind token. `frontend/tools/measure_palette.py`
is how a palette question gets settled — contrast + OKLCH hue separation — rather
than argued.

**Rule for any of it:** no colour literal may exist outside
`frontend/src/design/tokens.css`. That held through the repaint; keep it.

---

## 6. Still open, outside the design

* **`SECRET_KEY` length.** `render.yaml` uses `generateValue: true`; the
  validator wants ≥32 bytes and the generated length cannot be determined from
  the repo. Check it once in the Render dashboard. Under `APP_ENV=demo` the
  validator does not run, so a short key is accepted silently.
* **`DATABASE_URL` is absent from `render.yaml`** → SQLite on ephemeral disk,
  wiped on every redeploy. Fine for the exhibition, not for real data.
* **Do NOT set on the sandbox host:** `ANTHROPIC_API_KEY` (its `ai_provider` is
  hardcoded `"template"` — no LLM path exists in that codebase) or `VT_API_KEY`
  (sovereign mode is ON there and blocks every lookup; measured — the key is not
  set on that host at all, contrary to what I first reported).
* **Portal detonation worker**: deliberately not stood up. The portal's
  `/api/dynamic/sample/{id}` serves raw malware bytes behind one shared token,
  and Render's DB resets on redeploy. Recommended against; the portal says
  "static analysis only" honestly.
* **Remediation Engine Tier 2** (docs §15): `TrainingAsset` + CSV/URL import,
  the HRB taxonomy with real tagging and a retrieval ranker, suppression and the
  escalation ladder.

---

## 7. Commands

```bash
# backend suite (from backend/)
APP_ENV=demo python -m pytest -q

# migrations gate
APP_ENV=demo DATABASE_URL="sqlite:///<scratch>/chk.db" python -m alembic upgrade head
APP_ENV=demo DATABASE_URL="sqlite:///<scratch>/chk.db" python -m alembic check
```

```bash
cd frontend && npx tsc --noEmit -p tsconfig.app.json && npx oxlint src && npm run build
```

Interpreter: `C:/Users/Safar/Desktop/Cyclowareness/backend/.venv/Scripts/python.exe`
(no venv inside the worktree). `APP_ENV=demo` is mandatory — the production
validator refuses to boot otherwise, correctly.

Local dev: Vite on **5180**, API on **8130** (`VITE_API_TARGET`). Run uvicorn on
8130, not 8000.

The palette measuring script used for the repaint is worth keeping:
`scratchpad/measure_palette.py` — contrast + OKLCH hue separation for any
candidate token file.
