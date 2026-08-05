# Handoff — Cyclowareness, 2026-08-04

Written to continue in a fresh session. Everything below is measured or read
from the repositories, not recalled.

---

## 1. Where things stand right now

| | Repo | Head | CI | Notes |
|---|---|---|---|---|
| Portal | `MrHerc/Cyclowareness` | `031af63` on `master` | green; backend commits pass, the recent ones are design-only | 350 backend tests |
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

## 7. The six-lens audit (2026-08-05) — 13 of 17 closed

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

**Still open (4)** — all confirmed, none started:
1. `features/approvals/DecisionPanel.tsx:191` — the only explanation for the
   disabled Reject / Request-revision buttons is in a Radix tooltip on a
   non-focusable span wrapping a disabled button. No keyboard path to it at all.
   `components/data/Tip.tsx:39` already solves this with a `tabIndex` escape
   hatch, and `GuardedAction` exists for exactly this case — use one of them.
2. `components/ui/Panel.tsx:69` — the header cannot wrap and pins `actions` at
   `shrink-0`, so a wide action clips the title on a narrow viewport.
3. `pages/Departments.tsx:135` — two side-by-side panels sit at different
   heading levels, so one reads as a child of the other.
4. `features/remediation/PlanQueue.tsx:139` — hardcodes the AI vendor string
   that the provenance badge derives, so the two can disagree.

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

**Where to continue**: page standfirsts and panel bodies, locale-aware
date/number formatting (`Intl` is already used but always with the default
locale), and the employee portal, which was not swept this session.

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
