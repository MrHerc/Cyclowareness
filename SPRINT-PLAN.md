# Cyclowareness — 3-Week Execution Plan

**Companion to [`ROADMAP.md`](ROADMAP.md).** The roadmap says *where* we are going over 6–8 months.
This document says *what we do in the next 15 working days*, day by day, with the exact services to sign up for.

**Written against commit `42504f1`.** Baseline verified in code, not assumed:

| Claim | Verified |
|---|---|
| No write path for employees — roster cannot be loaded | `routers/employees.py` has **zero** POST/PATCH/PUT/DELETE |
| No email capability of any kind | grep for `smtplib\|resend\|postmark\|sendgrid\|aiosmtplib` across `backend/` → **no matches** |
| Simulations send nothing | `simulations.py:96-105` `launch()` sets `status = ACTIVE` and commits. That is all it does |
| No tenancy | 13 models, **no** `tenant_id`/`org_id` column |

**Goal of these 3 weeks:** stop the demo from lying, put it on real infrastructure, and get real
people into the loop — so that a design-partner pilot can start in week 4.

**Explicit non-goals:** multi-tenancy, SSO, compliance exports, i18n, Celery. All deferred to
`ROADMAP.md` Phase 1+. We are building **one honest single-tenant instance**, not a SaaS.

---

## The one-paragraph summary

Week 1 makes the product **honest and deployable** — kill the three fabrications, add Alembic,
move to PostgreSQL, ship to a real server. Week 2 makes data **flow in** — roster import, invite
flow, transactional email, and an abuse mailbox that turns forwarded phish into loop runs. Week 3
makes the loop **close for real** — actual simulated-phish delivery with click tracking, and a risk
score that reconciles to its own audit trail. At the end you can run a live pilot with a real
company on a real domain.

---

## Service stack — sign up for these

> **Pricing note:** figures below reflect the tiers as of writing; verify at signup, they move.
> All picks have EU regions (relevant for NIS2/GDPR customers) and work with a normal card.

| # | Need | Pick | Why | Free tier | Paid from | When |
|---|---|---|---|---|---|---|
| 1 | **PostgreSQL** | **Neon** (EU-central) | Serverless, branching (a DB branch per PR is genuinely useful), painless Alembic target | ~0.5 GB storage, autosuspend | ~$19/mo | **Day 3** |
| 2 | **Hosting** | **Hetzner CX22 VPS** (Nuremberg/Helsinki) + Docker Compose | €4–5/mo for 2 vCPU/4 GB — more machine than any PaaS free tier, EU-resident, full control of a *long-running worker* (PaaS free tiers sleep). A security product benefits from "we control the box" | — | ~€4.5/mo | **Day 5** |
| 3 | **Redis** | **On the same VPS** (Docker) | We need Redis for rate limiting and later Celery. At this scale a managed Redis is needless spend and latency | — | €0 | Day 5 |
| 4 | **Transactional email** (notifications) | **Resend** | Best DX, clean API, EU region, generous free tier | 3 000/mo, 100/day | $20/mo | **Day 8** |
| 5 | **Simulated-phish delivery** | ⚠️ **See "The phishing-delivery problem" below — do NOT just use Resend** | | | | **Day 11** |
| 6 | **Inbound abuse mailbox** | **Cloudflare Email Routing** → worker → our webhook | Free, no mailbox to run; `abuse@yourdomain` forwards straight into an HTTP POST | Free | Free | **Day 10** |
| 7 | **Error tracking** | **Sentry** | Backend + frontend in one project, source maps, release tracking | 5 k errors/mo | $26/mo | Day 5 |
| 8 | **Uptime** | **BetterStack** (or UptimeRobot) | Pings `/api/ready`, alerts to Telegram/email | 10 monitors | $29/mo | Day 5 |
| 9 | **Sandbox / intel** | **VirusTotal free** + **urlscan.io free** | Already integrated (`analyzers/real_analyzer.py`) | VT: 4 req/min, 500/day | VT Premium is enterprise-priced | Day 4 |
| 10 | **AI** | **Anthropic API** | `AnthropicProvider` is already written and tested | — | pay per token | **Day 4** |
| 11 | **Domain** | **A second, separate domain** for lures | Never send simulations from your product domain — it burns your reputation and your product's deliverability | ~$10/yr | | Day 11 |

**Monthly total: roughly €5 hosting + $0–20 email + AI usage.** Under $50/mo until real volume.

### ⚠️ The phishing-delivery problem — read this before Day 11

**Almost every transactional email provider forbids sending phishing simulations in their ToS**
(Resend, Postmark, SendGrid, Mailgun all prohibit deceptive/phishing content). Getting caught means
account termination — including your notification sending. This is the single most
underestimated obstacle in this product category. Three legitimate routes:

| Route | How it works | Effort | Best for |
|---|---|---|---|
| **A. Direct injection into the customer's tenant** *(industry standard)* | The customer creates a Microsoft 365 connector + allow-list rules for our sending IP/domain, and we deliver via **Microsoft Graph API** as an authorised app in *their* tenant. Mail never crosses the public internet, never hits spam filters, and the customer explicitly consented | 2–3 days | **Our pilot — pick this** |
| **B. Own SMTP on a dedicated domain** | Postfix on a separate VPS + separate domain + SPF/DKIM/DMARC. Full control, no ToS risk, but you own deliverability and IP warming | 3–5 days | Later, when self-serve |
| **C. A provider that explicitly permits it** | A few ESPs allow it under a security-testing agreement — requires a sales conversation | Days–weeks of paperwork | Not now |

**Decision: Route A for the pilot.** It is what the design partner will expect anyway, it removes
deliverability from the equation entirely, and the allow-listing conversation is a normal part of
onboarding any awareness vendor. Fall back to B only if the partner is on Google Workspace.

---

## Week 1 — Make it honest, make it deployable

*Nothing in this week degrades the exhibition demo: every demo behaviour stays available under
`APP_ENV=demo`. It only stops those behaviours from reaching a customer.*

### Day 1 — Kill the three fabrications

These are not missing features; they are code paths that **produce false data**. A technical
evaluator who finds them stops the evaluation.

| Fix | File | What changes |
|---|---|---|
| **`auto-outcomes` writes fake `RiskEvent`s** — `random.random()` weighted by the employee's own risk score, i.e. risk generates clicks and clicks update risk (circular) | `routers/simulations.py:128-155` | Route registered **only** when `APP_ENV=demo`. In production the endpoint does not exist |
| **AI mock fallback is labelled as real** — `ai_service` silently falls back to `MockAIProvider`, `orchestrator.py:208` hardcodes `ai_generated=True`, so a customer gets canned `caspiandynamics.az` content presented as bespoke | `ai/ai_service.py`, `core/orchestrator.py`, `models.py` | Add `TrainingModule.generation_source` (`anthropic` \| `mock`); thread the real source through; show it in the analyst review UI. In production, a mock fallback **fails the stage** instead of substituting content |
| **Metrics silently return all-time under a "last 30 days" label** | `core/metrics.py:35,43` | Delete `pool = recent if recent else targets`. Return `null` + `insufficient_data` + real `n`; frontend renders "not enough data yet (n=3)" |

### Day 2 — Production safety rails

- **`APP_ENV`** setting (`demo` \| `production`, default `production`). A Pydantic validator **refuses to boot** in production if: `SECRET_KEY` is the default or <32 bytes, `DATABASE_URL` is SQLite, or CORS contains localhost.
- **Seeding becomes explicit** — remove `seed_if_empty()` from the `main.py` lifespan; it becomes `python -m app.seed`, which refuses to run unless `APP_ENV=demo`. *(Today a fresh production DB auto-fills with a fictional Azerbaijani company.)*
- **`routers/admin.py` registered only in demo** — `reset-demo` wipes all 13 tables and is reachable by any analyst. It must not exist in production.
- **Bootstrap CLI** — `python -m app.bootstrap --admin-email=…` creates exactly one admin with a one-time password and `must_change_password`.
- **Rotate the committed demo credentials** (`analyst123` / `demo123` / `exec123` are in a public repo).
- **`/api/ready`** — real dependency checks (DB `SELECT 1`, Redis ping), version + git SHA, 503 on failure.

### Day 3 — Alembic

This gates everything else: `Base.metadata.create_all()` only ever **creates**, never alters — so
the first schema change to a customer with data has no delivery path.

- `alembic init`, autogenerate the initial revision to match `models.py` exactly, stamp it.
- Remove `create_all` from the lifespan; `alembic upgrade head` becomes the only schema path.
- CI check: fail the build if models and migrations have drifted.

### Day 4 — PostgreSQL + real API keys

- Provision **Neon** (EU), point `DATABASE_URL` at it, run `alembic upgrade head`.
- Fix every SQLite assumption: `database.py` `connect_args`, `tests/conftest.py`, JSON column behaviour, and the naive-datetime handling in `metrics.py` (`_aware()` exists because SQLite returns naive datetimes — Postgres does not).
- Wire the real **Anthropic** key and run a full loop against live Claude; compare output quality against the mock.
- Wire the real **VirusTotal** key. Add a token bucket + verdict cache — the free tier is 4 req/min and **one artifact can cost up to 12 requests**, so a single submission exceeds the per-minute quota by itself.

### Day 5 — Deploy for real

- Hetzner VPS, Docker Compose (api + worker placeholder + redis + caddy for TLS), deploy from a git tag.
- Sentry (backend + frontend), BetterStack pinging `/api/ready`.
- Automated `pg_dump` to object storage — and **restore it once, timed**. A backup you have never restored is not a backup.
- **Harden the two unprotected prompts**: `training_generation.md` and `threat_explanation.md` ingest 1200 chars of attacker-authored text with no anti-injection block, while `triage_assist.md` has one. Copy the pattern. *(An attacker being able to author the security guidance your staff are graded on is a headline-grade failure for a security vendor.)*

**✅ Week 1 exit:** an empty production DB boots clean with no fictional data, refuses to start
misconfigured, has no endpoint that can wipe it, upgrades via `alembic upgrade head`, runs on a real
EU server with TLS, monitoring, and a *restored* backup.

---

## Week 2 — Get real data in

*Right now the loop is a closed circle with nothing entering it. This week opens both ends.*

### Days 6–7 — Employee provisioning

**Today there is no way to create an employee.** Not "hard" — no code path exists.

- `POST /api/employees/import` — CSV upload (`name,email,department,role_title,role_sensitivity,manager_email`), with a **dry-run mode** that reports what would be created/updated/skipped before committing.
- Idempotent upsert by email; departments auto-created; a `manager_email` column now (we need the hierarchy in Phase 1 for the manager role — capture it from day one rather than re-importing later).
- Admin UI page: upload → validation preview → confirm → result summary.
- Deactivation (soft, preserving history) for leavers — never hard-delete an employee with risk history.

### Days 8–9 — Email notifications

**Nothing in the codebase sends email.** Today an employee only discovers assigned training by
happening to open the portal — which is why the loop currently needs `force-measure` to complete.

- `app/services/email.py` — provider-agnostic (`ResendProvider`, `SMTPProvider`, `ConsoleProvider` for dev), templates in `app/templates/email/`.
- Templates: **welcome/invite** (set password), **training assigned**, **reminder** (T+3 days), **final notice** (T+7), **manager digest** (Phase 1 stub).
- Triggered from the orchestrator's TRAIN stage; reminders via a scheduled job.
- **Suppression list + unsubscribe handling** for non-mandatory mail — required by law in most markets, and cheap now, painful to retrofit.
- Invite flow: employee receives a signed one-time link, sets a password, lands in the portal.

### Day 10 — Abuse mailbox ingestion

The "human sensor" story currently requires the employee to copy-paste an email into a web form.
Real people forward suspicious mail to a mailbox — that is the behaviour to support.

- `abuse@yourdomain` on **Cloudflare Email Routing** → worker → `POST /api/reports/inbound` (HMAC-signed).
- Parse the `.eml` (headers, body, attachments), extract the *original* forwarded message (not the wrapper), create a `PhishingReport` attributed to the sender, run the existing AI triage.
- Reply automatically: "Thanks — we're looking at it", then a follow-up when the analyst dispositions it. **This closes the loop the employee can actually feel**, and it is the cheapest retention mechanic in the product.

**✅ Week 2 exit:** 200+ real employees imported from CSV, each with a working login; a forwarded
phishing email lands in the triage queue automatically; assigned training triggers a real email that
arrives in a real inbox.

---

## Week 3 — Close the loop for real

### Days 11–12 — Simulation delivery + click tracking

**This is the product's headline metric, and today it is dice.** `launch()` flips a status field;
`auto-outcomes` fabricates the results.

- **Microsoft Graph delivery** (Route A above): register an app in the partner's tenant, `Mail.Send` scope, send from a designated mailbox with their connector + allow-list rules in place.
- **Unique tracked link per target** — signed token, no PII in the URL.
- `GET /t/{token}` public landing endpoint: record the click (idempotent), then show a **teaching page** — "this was a simulation, here is what gave it away" — and enrol them in the matching module immediately. The teachable moment is worth more than the metric.
- **Scanner filtering** — mail gateways and link-rewriters (Defender Safe Links, Proofpoint URL Defense) click every link. Without filtering, click rate is garbage. Filter on user-agent, known scanner IP ranges, and sub-2-second click latency. **Report suppressed clicks visibly** rather than hiding them.
- **Stagger delivery** — sending to a whole department simultaneously means the first person warns everyone and the click rate becomes meaningless.
- Delete `auto-outcomes` from the production build entirely.

### Day 13 — Measurement integrity

The transparent risk score is the stated differentiator. Today **it does not reconcile to its own
audit trail**: `risk_breakdown()` reports baseline + summed deltas, but `current_risk_score` starts
from a seeded default and only accumulates. An analyst who adds up the factors gets a different
number than the one displayed — which turns the differentiator into a liability.

- Recompute `current_risk_score = clamp(baseline + Σ decayed deltas)` from `RiskEvent`s. Breakdown and score then agree **by construction**. Unit test asserting equality for every employee.
- **Exponential time decay** (~90-day half-life) — a click 18 months ago should not weigh like yesterday's, and the score claims to measure *current* posture.
- **Split exposure from behaviour**: `real_threat_exposure` (+8 for merely being targeted) drives targeting priority but must **not** enter the behaviour score. Today running more loops mechanically raises org-average risk — the product argues against itself.
- Fix `select_targets`: `max_targets=8` is a demo constant no caller overrides. A BEC campaign hitting 60 people in Finance trains 8 and **silently drops 52 while reporting the run closed**. Always include every direct recipient, then fill by rank; surface "matched 60, assigned 25, deferred 35".

### Day 14 — Loop reliability under real conditions

- **Short DB session per stage.** Today the orchestrator holds one session for an entire run (5 s + analyzer + 6 s + two AI calls); with the default pool of 5, the 6th concurrent run blocks and then raises.
- **Retry + dead-letter**: classify retryable (timeout, 429, 5xx) vs permanent; `POST /loop-runs/{id}/retry` re-entering at the first incomplete stage via the existing idempotency helpers. Today one transient VirusTotal 503 permanently burns a run.
- **Daily metric snapshot on a schedule**, not only when a loop happens to complete — otherwise the executive trend line is sparse and misleading.
- Remove the artificial `STAGE_DELAY_*` pacing in production (keep it in demo — it is good exhibition engineering).

### Day 15 — Pilot rehearsal

Run the entire pilot against yourself and 5–10 friendly people on the real deployment:

1. Import the roster from CSV → everyone receives an invite → logs in.
2. Launch a simulation → lures arrive in real inboxes → someone clicks → the teaching page appears → training is assigned automatically.
3. Someone forwards a real phishing email to `abuse@` → it appears in triage with an AI verdict → analyst approves → targeted training goes out → **the loop closes with zero `force-measure` calls**.
4. Check every number on the dashboard against the database by hand.

Whatever breaks here is week 4's list. Something will.

**✅ Week 3 exit:** a real person received a real simulated phish, clicked it, was taught, was
trained, and the loop closed on its own — and every metric on the dashboard reconciles to the
underlying rows.

---

## What I need from you (and when)

| When | You do | Why it blocks me |
|---|---|---|
| Day 3 | Create the **Neon** account, send me the connection string | Cannot migrate off SQLite without it |
| Day 4 | **Anthropic API key** with a spend limit set; **VirusTotal** free API key | The AI and sandbox stages stay on mocks otherwise |
| Day 5 | **Hetzner** account + a **domain** for the app; point DNS at the VPS | Nowhere to deploy |
| Day 8 | **Resend** account + verify the sending domain (SPF/DKIM) | No email leaves the system |
| Day 10 | Enable **Cloudflare Email Routing** on the domain | No inbound abuse mailbox |
| **By Day 11** | **The design partner.** A real company willing to be pilot #1 | Simulation delivery via Graph API needs *their* tenant. Without a partner, week 3 is theoretical |
| Ongoing | Decide: does the partner run **Microsoft 365** or **Google Workspace**? | Determines the entire delivery route |

**The design partner is the critical path, not the code.** Everything else on this list I can build
whether or not they exist — but week 3 only becomes real with a live tenant to send into. Start that
conversation on day 1, not day 10.

---

## Honest risk register

| Risk | Likelihood | What we do |
|---|---|---|
| No design partner by day 11 | **High** | Week 3 falls back to route B (own SMTP + test domain) against your own inboxes. Still proves the mechanism; less convincing to a buyer |
| M365 allow-listing takes longer than a day | High | Start the request on day 8, not day 11. It routinely needs an IT change window |
| Live Claude output is noticeably worse than the tuned mock | Medium | Day 4 comparison exists precisely to find this early. Budget a day of prompt work in week 2 if so |
| VirusTotal free tier is too slow for a live demo | Medium | Cache aggressively; keep `MockAnalyzer` as the exhibition default. VT is for the pilot, not the booth |
| CSV import meets messy real HR data | **High** | The dry-run mode is not optional. Expect to spend half a day on the partner's specific export format |
| 3 weeks becomes 5 | Medium | Weeks 1 and 2 are well-understood and will hold. Week 3 depends on a third party — that is where slippage lands |

---

## What we deliberately do NOT do in these 3 weeks

| Not doing | Why |
|---|---|
| Multi-tenancy | Pilot #1 gets a dedicated instance. Normal for early security vendors. Retrofitting later is painful but building it for one customer is worse |
| SSO / SAML | CSV + invite links carry the first pilot. OIDC is Phase 1 |
| Celery | The in-process runner is fine for one tenant on one box. The current `CeleryTaskRunner` interface *cannot* work over a broker (a coroutine is not serialisable) — but that refactor buys nothing until we have concurrency pressure. **Make it fail fast at startup instead of at first submit**, and move on |
| Compliance exports (ISO/SOC 2) | Nobody has asked yet. Phase 1, driven by the first security questionnaire |
| i18n (AZ/RU/ZH) | A genuine differentiator, but it multiplies every UI change during the weeks the UI is changing most |
| Ripping out the demo world | It is *good exhibition engineering*. We gate it behind `APP_ENV=demo`, we do not delete it |
| Baseline content library | Phase 1. The wedge is threat-derived generation; the library answers a sales objection we have not yet heard |

---

## Tracking

Each day above becomes a GitHub issue with its exit criterion as the acceptance test. Definition of
done for the sprint is the **Day 15 rehearsal**, not the count of closed issues.

Weekly checkpoint (Fridays): demo the week's exit criterion on the real deployment — not on
localhost, not on the seeded demo world.
