# Cyclowareness — From Exhibition Demo to Sellable MVP

**Document status:** Engineering roadmap, written against the codebase as of commit `8c9fd1c`.
**Audience:** the founder and a 1–2 person dev team.
**Bias:** brutally realistic. Where the demo already works well, it says so. Where the demo hides a failure, it says that too.

---

## 0. The honest starting position

Cyclowareness is a **genuinely well-architected demo with real engineering in it**. That is not flattery — it changes the roadmap. The following are real, not stubs:

| Actually built and working | Evidence |
|---|---|
| 7-stage loop state machine with persisted stage history and idempotency guards | `core/orchestrator.py` |
| VirusTotal analyzer (submit, poll, IOC enrichment, normalised verdicts) | `analyzers/real_analyzer.py` |
| AI service with versioned prompts, schema validation, defensive JSON parsing | `ai/ai_service.py`, `ai/prompts/*.md` |
| Transparent weighted risk engine with a full `RiskEvent` audit trail | `core/risk_engine.py` |
| Explainable targeting with human-readable per-employee rationale | `risk_engine.select_targets` |
| Human-sensor reporting with live AI triage and anti-farming caps | `routers/reports.py` |
| Human-in-the-loop approval gate | `routers/loop_runs.py` |
| Prompt-injection hardening — on **one** of three prompts | `ai/prompts/triage_assist.md:18` |
| 35 pytest tests, green CI | `.github/workflows/` |

The gap is not "the code is bad". The gap is that **every edge where the system should touch the real world is a stub or absent**: no roster in, no email out, no schema upgrades, no tenancy, no measurement integrity. The loop is real; nothing feeds it and nothing leaves it.

Three failures deserve naming up front because they are **worse than missing features — they are silent fabrications**:

1. `POST /simulations/{id}/auto-outcomes` generates click/report outcomes with `random.random()` weighted by the employee's own risk score, and those synthetic outcomes write **real `RiskEvent` rows**. Risk generates clicks; clicks update risk. The headline metric is circular.
2. `ai_service` falls back to `MockAIProvider` on any exception but still stores the module as `ai_generated=True`. During an Anthropic outage the customer receives canned demo content — hardcoded for the fictional `caspiandynamics.az` — presented as bespoke threat-derived training.
3. `metrics.py` does `pool = recent if recent else targets` — when the 30-day window is empty it silently returns the **all-time** figure under a label the UI renders as "last 30 days".

A technical evaluator who reads those three code paths does not file a feature request. They stop the evaluation. **Fixing them is Phase 0, week 1.**

---

## 1. Top 5 highest-risk items

| # | Item | Why it is top-5 | Phase |
|---|---|---|---|
| 1 | **No roster in, ever** — `employees.py` is read-only; the only creation path is `seed.py` hardcoding 26 fictional staff | A pilot cannot begin. Time-to-value is literally infinite. Not "hard to onboard" — *no code path exists* | 0 |
| 2 | **Simulations send nothing; outcomes are dice rolls** — `launch()` flips a status field | The primary proof metric is synthetic and feeds the real audit trail. Credibility-ending when discovered | 0 → 1 |
| 3 | **No Alembic** — `create_all()` only ever CREATEs, never ALTERs | Gates *every other item on this list*. The first schema change to a customer with data has no delivery mechanism | 0 |
| 4 | **Prompt injection into employee-facing training** — `training_generation.md` has no SECURITY block yet consumes 1200 chars of attacker-authored text | The input surface *is* attacker-controlled by design. An attacker can author the security guidance staff are graded on. Headline-grade failure for a security vendor | 0 |
| 5 | **Production-unsafe defaults** — dev `SECRET_KEY` boots silently, demo company auto-seeds into empty prod DBs, `reset-demo` wipes everything for any analyst | Three independent total-loss paths, each cheap to close. Published credentials in a public repo | 0 |

### The single riskiest assumption

> **That a security analyst will review and approve an AI-generated module for every threat, forever — and that employees complete threat-specific modules at a materially higher rate than the generic annual training they already ignore.**

Neither has been tested with a real analyst or a real employee. Everything else in this document is engineering you know how to do. This is the assumption that decides whether the engineering is worth doing.

The approval gate is marketed as responsible AI. It is also **the thing that makes the loop stop**. If approval costs more than ~5 minutes per module, the honest product is auto-approve with post-hoc sampling — a different product with a different sales story. If threat-specific completion is not meaningfully above generic, "built from your real attacks" is a marketing line, not an efficacy mechanism, and you are competing with KnowBe4 on content volume, which you lose.

**Test it before Phase 1. Two weeks, no new platform code.** See Phase 0, Workstream F.

---

## 2. Phase overview

| Phase | Goal | Duration (1–2 devs) | Ends when |
|---|---|---|---|
| **0 — Pilot-ready** | One friendly design partner runs one real loop on real people | **10–12 weeks** | A real employee receives a real simulated phish, clicks, gets trained, and the loop closes without an analyst forcing it |
| **1 — First paying customer** | Someone signs a contract and passes a security review | **14–18 weeks** | Contract signed; security questionnaire answered without lying |
| **2 — Multi-tenant SaaS** | Second and third customers share one deployment | **12–16 weeks** | Two tenants live on one instance with proven isolation |
| **3 — Scale & differentiate** | 10+ customers; the wedge is defensible | **ongoing** | — |

Total to first revenue: **roughly 6–8 months of focused 2-dev work.** Sequential, because the dependency chain is real: migrations → provisioning → notifications → delivery → measurement.

---

## Phase 0 — Pilot-ready

**Goal:** one friendly design-partner company (ideally 200–500 people, ideally someone who already likes you) can load their real roster, receive a real simulated phish, and watch one loop close end-to-end on real humans.

**Duration:** 10–12 weeks, 2 devs.

**Non-goal:** multi-tenancy, SSO, compliance exports, i18n. Single-tenant dedicated instance is a completely normal shape for an early security vendor. Say so out loud and stop apologising for it.

### Workstream A — Stop the bleeding (week 1, ~5 days)

The cheapest large risk reduction in the entire document. Do it first, in one PR each.

| Deliverable | Detail |
|---|---|
| `APP_ENV` setting, default `production` | Pydantic validator raises at import if `APP_ENV=production` and `secret_key` is the default or <32 bytes, or `database_url` is SQLite, or CORS contains localhost |
| Seeding becomes explicit | Remove `seed_if_empty()` from the lifespan. Replace with `python -m app.seed`, which refuses to run unless `APP_ENV=demo` |
| Admin router gated | Register `routers/admin.py` in `main.py` only when `APP_ENV=demo`. `reset-demo` ceases to exist in production builds |
| `auto-outcomes` gated | Same gate. Synthetic outcomes must never reach a customer's `RiskEvent` table |
| Bootstrap CLI | `python -m app.bootstrap --admin-email=…` creates exactly one admin with a generated one-time password, `must_change_password=true` |
| Rotate committed demo credentials | `analyst123` / `exec123` / `demo123` are in a public repo |
| Fix the metric window fallback | Delete `pool = recent if recent else targets`. Return `null` + `insufficient_data` + actual `n`. UI renders "not enough data yet (n=3)" |
| `/api/ready` | `SELECT 1` with timeout, per-dependency breakdown, 503 on failure, app version + git SHA. Add a healthcheck block to the `api` service in `docker-compose.yml` and `restart: unless-stopped` everywhere |
| `/login/form` deleted | It performs the identical password check with **no throttle call** — the brute-force protection is trivially bypassed. It exists only for the docs UI |
| Proxy headers | `--proxy-headers` with a trusted-proxy list, so `request.client.host` is not the load balancer for every user |

**Exit:** an empty production database boots clean, contains no fictional data, refuses to start misconfigured, and has no endpoint that can destroy it.

### Workstream B — Alembic (week 1–2, ~1 week)

Everything downstream needs schema changes. This gates the entire roadmap.

- Add `alembic` to `requirements.txt`; move `psycopg[binary]` out of the Dockerfile into real requirements (a non-Docker Postgres deploy currently fails on import).
- Autogenerate a baseline revision matching current `models.py`. Stamp existing demo DBs.
- Convert `sqlalchemy.JSON` columns to `postgresql.JSONB` explicitly in the baseline. The README claims JSONB; `JSON` maps to Postgres `json`, which has no equality operator — `DISTINCT`/`GROUP BY` on those columns will error.
- Remove `create_all()` from the lifespan. `alembic upgrade head` becomes a deploy step.
- CI job: run the chain against scratch Postgres, then `alembic check` — fail the build on any model change without a revision.

**Exit:** `alembic upgrade head` is the only way schema changes reach a database, enforced by CI.

### Workstream C — Identity: roster in, people who can log in (weeks 2–5, ~3.5 weeks)

The single hardest ship-blocker. Three lens reports independently identified it as #1.

**Schema** (one migration): `Employee.external_id` (unique, nullable — the upsert key, not email), `Employee.status` (active/inactive), `Employee.manager_id` (self-FK, needed later for escalation). `User.hashed_password` becomes nullable; add `User.is_active`, `created_at`, `last_login_at`, `password_changed_at`. Explicit `ondelete` rules on the FKs pointing at `Employee` — right now a manual delete fails on constraint violations, which makes GDPR erasure structurally impossible.

**Endpoints:** Employee/Department CRUD. `POST /admin/employees/import` accepting CSV (`name, email, department, role_title, role_sensitivity, manager_email`) with **dry-run preview showing the diff** (adds / updates / deactivates) before a transactional commit. Soft-delete that removes someone from targeting while preserving their `RiskEvent` history for audit.

**Account lifecycle:** signed single-use invitation tokens with expiry; password set; forgot-password; password policy including a HaveIBeenPwned k-anonymity check. Auto-provision a pending-activation `User` on import.

**Session hygiene** (small, high-value, do it here): check `is_active` in `get_current_user`; add `jti` to tokens with a denylist; cut the access token from 720 minutes to 15–30 with a rotating refresh token in an httpOnly cookie; real logout. Exchange the JWT for a single-use ticket on the WebSocket handshake — right now the bearer token is a **URL query parameter** in `routers/ws.py:14`, so it lands in every proxy access log.

> **Why this matters more than it looks:** 23 of 26 seeded employees have no `User` row at all. The orchestrator's TARGET stage assigns them training they can never open, and the run hangs in `AWAITING_TRAINING` forever. That is precisely why `force-measure` exists. **The demo hides a structural failure behind a manual override.**

**Exit:** a real company's 500 people are in the system via CSV, each with a working login they obtained themselves.

### Workstream D — Notifications (weeks 4–7, ~3 weeks, overlaps C)

Without this the loop cannot close on its own, ever.

- Notification service behind a pluggable sender — reuse the seam pattern that `analyzers/` and `ai/providers.py` already use well. Console for dev, SMTP/SES or Microsoft Graph for production. Teams/Slack webhooks as a fast follow.
- `TrainingAssignment.due_at` + a `NotificationLog` table keyed on (assignment, channel, type) for idempotency.
- Send on assignment with a **deep link carrying a signed token** so the employee lands directly in the module rather than hunting for a login.
- Scheduled reminders at 3 and 7 days; auto-expire at 14 — which finally lets `_measure_and_feedback` fire without an analyst.
- Manager escalation on overdue (this is why `manager_id` landed in Workstream C).

**Depends on:** a scheduler. Use APScheduler gated to a single leader process for Phase 0 — Celery is Phase 1 work and this cannot wait for it.

**Exit:** an employee who never logs in voluntarily still completes training, and the loop closes with no human intervention.

### Workstream E — Real threats in, real lures out (weeks 5–11, ~5 weeks)

This is the wedge. If real attacks never reach the platform, the differentiator is unproven and you are selling AI-generated generic content — a much weaker position.

**Ingestion — cheapest viable path first:**

- **Abuse-mailbox poller** (Microsoft Graph subscription, or IMAP). One integration covers most of the mid-market, needs no client deployment, no add-in store review, and works with the native "Report Message" button customers already have. Parse full RFC822 → structured `artifact_meta`.
- **Multipart upload** for `.eml`/`.msg` + attachments. Raw bytes to object storage, not the DB. Parse headers, SPF/DKIM/DMARC results, Received chain, display-name-vs-envelope spoof signals, attachment hashes.
- Extend the analyzer contract to accept a **file handle** so the VT adapter can hash real samples. Today `ArtifactType.FILE` exists but `real_analyzer.py` falls back to hashing the *description text* — the malware half of the product's stated scope cannot be analyzed at all.
- Sanitize HTML body rendering in the analyst view. Do not make the console an attack surface.

**Delivery — the metric depends on it:**

- `SimulationTarget` gains `tracking_token` (unguessable), `sent_at`, `opened_at`, `clicked_at`, `reported_at`, `delivery_status`.
- One ESP/SMTP adapter behind an interface. Tokenized endpoints: `/s/{token}/c` records the click then renders the teachable moment, `/s/{token}/p` open pixel, `/s/{token}/r` in-client report.
- **Scanner-click filtering.** Defender Safe Links and Proofpoint URL Defense pre-fetch every URL. Without filtering, click rates approach 100% and the platform blames employees for machine traffic. Filter by known scanner user-agents and IP/ASN ranges; discard sub-second clicks and clicks preceding the open pixel. **Record filtered hits separately** so the analyst can see suppression happened.
- Dedicated sending domain with SPF/DKIM/DMARC, plus a **pre-flight canary** that sends to a customer-nominated mailbox and reports whether it survived the gateway. Ship allow-listing runbooks for M365 Advanced Delivery and Google Workspace — that is a task the customer's mail admin performs, so it needs documentation, not just code.

**Machine auth** (~2 weeks, prerequisite for all of the above): `ApiKey` model (hashed secret, scopes, `last_used_at`, `revoked_at`) and a dependency resolving either a user JWT or an API key to a common principal. HMAC verification with timestamp checks for inbound ESP webhooks. **This is small work that quietly blocks most of the roadmap — land it early in the phase.**

**Exit:** an employee forwards a real phish to the abuse mailbox and it enters the loop automatically; a simulated lure lands in a real inbox, survives the gateway, and a real click is recorded and correctly attributed.

### Workstream F — AI trust (weeks 3–9, ~3 weeks, interleaved)

Small individually, disproportionate in consequence.

| Fix | Why |
|---|---|
| **SECURITY block on `training_generation.md` and `threat_explanation.md`** | `triage_assist.md:18` already has it. The other two consume attacker-authored text and produce employee-facing content. Wrap untrusted fields in `<untrusted_artifact>` tags |
| **Grounding validator** | Reject any module citing a domain/URL/email absent from `threat.iocs`. Escalate rejections to the analyst as *suspicious*, not as a silent retry |
| **Stop the silent mock fallback** | Add `generation_source` (`live`\|`fallback`) + `model` + `prompt_version` to `TrainingModule`. **Fail the CONVERT stage** rather than substituting canned content. Reserve `MockAIProvider` strictly for no-API-key demo mode |
| **`max_tokens` 2000 → ~8000, streaming, check `stop_reason`** | 4 sections + 5 questions × 4 options + explanations routinely exceeds 2000 tokens. Truncated JSON → parse failure → mock fallback → demo content shipped as bespoke. **This path has never been executed by a single test** — `conftest.py:16` forces the API key empty |
| **Quiz answer verification** | Second-pass call answers each question independently; disagreement with `correct_index` flags mandatory analyst sign-off. A mis-keyed answer marks correct employees wrong and inflates their risk score |
| **Rate limits + token ledger** | Any employee can loop `POST /api/reports` and bill you for unbounded Claude usage with arbitrary input size. Cap `artifact_ref` length; record tokens/cost per call |
| **Cache the executive briefing** | It regenerates on *every dashboard load* while inputs change once daily. Store it on the `MetricSnapshot` at FEEDBACK |
| **Default `stage_delay_*` to 0.0** | 14 seconds of deliberate demo pacing ships in the production default config. Set them in the demo launcher instead |
| **Threat dedup** | Add `campaign_key` + `content_sha256` to `Threat`. Reuse an approved module for the cluster. One real campaign against 1000 people produces hundreds of near-identical artifacts → N Claude calls, **N analyst approvals**, N duplicate assignments. The approval queue becomes unworkable in week one of a pilot |

### Workstream F2 — The concierge test (2 weeks, can run in parallel, no platform code)

Do this **during** Phase 0, not after. It may change what Phase 1 is.

1. Find 3 friendly security teams. Ask each for 5 real phishing emails they already caught.
2. Generate modules with the existing `ai_service` (set `ANTHROPIC_API_KEY`, run it).
3. Sit with each analyst during review. Measure: **minutes per module, edit rate, rejection rate.**
4. Send two variants to ~100 employees per company — threat-specific vs generic equivalent. Measure **completion rate and time-to-complete**.

**Decision rules, written down in advance:**
- Approval >5 min/module → redesign toward batch review or auto-approve with sampling.
- Threat-specific completion <15pp above generic → the wedge is not personalisation. Re-aim at the ingestion-and-measurement story.

### Workstream G — Measurement integrity (weeks 8–11, ~2.5 weeks)

You are selling evidence. Evidence with a broken denominator is worse than no evidence.

**The risk score does not reconcile to its own audit trail.** `risk_breakdown()` reports `baseline_for(employee)` + summed deltas, but `current_risk_score` initialises to a seeded default (30.0) and only accumulates deltas. **The transparent breakdown does not sum to the displayed score.** "Transparent by design" is your stated differentiator; the moment a customer's analyst adds the factors and gets a different number, it becomes a liability.

**The score is confounded by product usage.** `real_threat_exposure` is +12 applied to every TARGET-selected employee, while perfect completion is −4 + −6 = −10. An employee targeted twice per cycle who completes both nets roughly zero; one who ignores nets +12. **Running more loops mechanically raises org average risk — the product argues against itself.**

Fixes:
- Recompute `current_risk_score = clamp(baseline + Σ decayed deltas)` from `RiskEvent`s rather than mutating incrementally. Breakdown and score then agree **by construction**. Add a unit test asserting `sum(breakdown) == current_risk_score` for every employee.
- Exponential time decay (~90-day half-life). A click 18 months ago should not weigh the same as yesterday's — both a fairness problem and a correctness problem, since the score claims to measure *current* posture.
- **Split exposure from behaviour.** Keep `real_threat_exposure` as a separate dimension that drives targeting priority but does **not** enter the behaviour score.
- Fix `select_targets`: `max_targets=8` is a demo constant never overridden by any caller. A BEC campaign hitting 60 people in Finance trains 8 and **silently drops 52 while reporting the run closed**. Always include every direct recipient, then fill by rank to `max(25, 2% of org)`. Surface "matched 60, assigned 25, deferred 35" in the TARGET detail. Add a per-employee cooldown so chronic high-scorers are not assigned every module.
- Backfill script + migration.

### Phase 0 exit criteria

- [ ] Empty prod DB boots clean, no fictional data, refuses to start misconfigured
- [ ] No endpoint can destroy the database
- [ ] `alembic upgrade head` is the only schema path, CI-enforced
- [ ] 500 real employees imported via CSV dry-run; each has a working self-service login
- [ ] A real phish forwarded to the abuse mailbox enters the loop automatically
- [ ] A simulated lure reaches a real inbox, survives the gateway, and a real click is recorded
- [ ] Scanner clicks are filtered and visibly reported as suppressed
- [ ] Employees are notified, reminded, escalated — **the loop closes with zero `force-measure` calls**
- [ ] AI never silently substitutes mock content; `generation_source` is honest
- [ ] `sum(risk_breakdown) == current_risk_score`, verified by test
- [ ] Concierge test complete; approval-minutes and completion-lift numbers written down
- [ ] Automated Postgres backups with a **restored-and-timed** recovery, not just configured

---

## Phase 1 — First paying customer

**Goal:** someone signs a contract. That means surviving a security questionnaire, producing audit evidence, and running a *program* rather than a one-off.

**Duration:** 14–18 weeks, 2 devs.

### Workstream H — Survive the security review (~6 weeks)

| Deliverable | Notes |
|---|---|
| **OIDC SSO** (Entra ID + Google, Auth Code + PKCE) | Covers most of this market. JIT-provision `User` on first login, link by verified email or `external_id`, map IdP group claims to roles. Org-level `enforce_sso` flag. SAML 2.0 deferred until a deal requires it |
| **TOTP MFA** for analyst/executive | Mandatory for privileged roles on password tenants. `pyotp` + recovery codes |
| **AuditLog** — append-only | `actor, action, target_type, target_id, before/after, ip, user_agent, ts`. Emit from a **dependency applied to every privileged router** so coverage is structural, not per-endpoint. Explicitly log *reads* of employee detail — an analyst browsing colleagues' click history is the single most likely abuse of this system, and today it leaves no trace. Revoke UPDATE/DELETE from the app role |
| **Brute-force throttle → Redis** | Currently a module-global dict: `--workers 4` multiplies the allowance 4×, every restart resets it to zero. Per-account *and* per-IP dimensions with backoff |
| **Secrets & headers** | Key list with `kid` for graceful rotation (today rotating `SECRET_KEY` logs out every user simultaneously). Secret-manager integration. HSTS/CSP/X-Content-Type-Options. Global rate limit |

### Workstream I — Data protection (~4 weeks)

Non-optional for any EU customer, and NIS2 is a stated target market.

- **Erasure is currently structurally impossible** — `RiskEvent`, `TrainingAssignment`, `SimulationTarget`, `PhishingReport` FKs have no cascade or anonymisation path. Ship soft-delete/anonymise that scrubs name and email while preserving aggregate rows so historical metrics stay correct.
- Configurable retention per data class + scheduled purge. Unbounded permanent behavioural records are a straightforward Art. 5(1)(e) problem.
- DSAR export (Art. 15) — everything held about one employee.
- **Redaction before egress.** Real phishing emails contain recipient names, internal project names, invoice numbers, counterparty details — that is what makes them convincing. Add a redaction pass before anything reaches Anthropic or VirusTotal, with the map kept tenant-side so IOCs survive. Per-tenant `ai_mode ∈ off | redacted | full`, defaulting to `redacted`.
- **Works-council mode.** Publishing individual security rankings to peers is a co-determination trigger in Germany and the Nordics, and works councils have blocked awareness rollouts over exactly this. Today `dashboard.py` shows every employee a company-wide named leaderboard **with no setting to turn it off** — a customer whose legal team objects cannot deploy at all. Add `gamification_visibility ∈ off | anonymized | full`, default `anonymized`, minimum group size 5 for any breakdown.
- Write the DPIA and the sub-processor list. **The engineering is a fraction of the work; the paperwork is the actual gate.**

### Workstream J — Program operations (~5 weeks)

- **Celery, properly.** The current `CeleryTaskRunner.submit(coro, name)` interface **cannot be finished as designed** — a coroutine object cannot be serialised onto a broker. Worse, setting `TASK_RUNNER=celery` today does not fail cleanly: the `LoopRun` is committed *before* `submit()` raises, leaving a permanently RUNNING orphan plus a "coroutine was never awaited" warning. Change to `submit(task_name, **kwargs)` — all three call sites take only `run_id`, so it is a 4-line refactor. Add `app/worker.py`, `acks_late`, `task_reject_on_worker_lost`. Until then, **fail fast at startup** rather than at first submit.
- **Worker ownership.** `_recover_orphaned_runs()` unconditionally marks every RUNNING loop FAILED on boot. Run `--workers 4` and worker #2's startup kills worker #1's live runs. Add `owner_id` + `heartbeat_at`; only fail runs whose heartbeat is stale. Wrap migrate/seed/recovery in a Postgres advisory lock.
- **Retry & dead-letter.** Classify retryable (timeout, 429, 5xx) vs permanent. `POST /loop-runs/{id}/retry` re-entering at the first incomplete stage via the existing idempotency helpers. Today one transient VirusTotal 503 permanently burns a run — and the report is already flipped to IN_LOOP, so the analyst must resubmit and the original report stays linked to a dead run.
- **VirusTotal quota handling.** One artifact costs up to 12 requests; the public tier allows 4/minute. A single artifact exceeds the per-minute quota *by itself*. Token bucket, `Retry-After`, verdict cache by URL-id/sha256, configurable poll ceiling (~5 min, not 30 s — real VT analyses routinely exceed 30 s). Surface remaining quota in the UI.
- **Campaign scheduling.** `scheduled_at`, send windows, **stagger** (simultaneous delivery to a whole department means the first person warns everyone and the click rate becomes meaningless), RRULE recurrence, cooldown. Segments and exclusion lists as reusable objects — exclusions are frequently a legal requirement.
- **Scheduled jobs:** daily metric snapshot **regardless of loop activity** (today the executive trend only gets a datapoint on days a loop happened to complete — a sparse, misleading line), assignment expiry, stalled-run sweep.
- **Connection pooling.** The orchestrator holds one DB session for an entire run — 5 s + analyzer + 6 s + two AI calls. With the default pool of 5, the 6th concurrent run blocks 30 s then raises. Open a short session per stage; close before every external await. `pool_pre_ping`, WAL + `busy_timeout` for SQLite.

### Workstream K — Evidence out (~4 weeks)

For a large share of buyers the actual purchase driver is passing an audit. The auditor asks "show me every employee, the training they completed, and when." Today the answer is a screenshot.

- CSV/XLSX export on every list endpoint, streamed.
- Per-employee training transcript + PDF certificate.
- Date-ranged reporting API with period-over-period comparison (`WINDOW_DAYS = 30` is currently hardcoded).
- Board-ready PDF.
- Control mapping: ISO 27001:2022 A.6.3, SOC 2 CC1.4/CC2.2, NIS2 Art. 20, PCI DSS 12.6.
- Outbound webhooks with HMAC + retries + delivery log. SIEM push as CEF — prefer well-structured CEF over bespoke per-vendor connectors.

### Workstream L — Content and roles (~5 weeks)

- **Baseline curriculum.** Threat-derived training is the differentiator but not sufficient: it only fires when a threat happens, and a new hire on day one has zero assigned training — while every compliance framework requires periodic training for all staff regardless. Author 12–15 evergreen modules. Add `source ∈ threat_derived | library | custom`, `version`, `language`, `tags`. Direct assignment (module + segment + due date) bypassing the loop. Buyers want to see the library before signing; an empty library is a hard objection in the sales call.
- **Manager role.** Completion is driven by managers, not the security team — the analyst has no organisational authority to chase 4000 people. Subtree-scoped dashboard + nudge action. This is the standard mechanism for turning 40% completion into 85%.
- **Split ORG_ADMIN from ANALYST.** Today one role can browse any colleague's click history *and* wipe the database. Add department-scoped analyst and read-only auditor. Optional two-person approval on the training gate — the same analyst currently generates, edits, and approves, which is not a control an auditor accepts, and it undermines the human-in-the-loop trust claim.
- **`OrgSettings` table.** Risk weights, `HIGH_RISK_THRESHOLD`, `PASS_THRESHOLD`, target cap, notification cadence, branding, retention. A quiz pass mark that requires a redeploy is not a product.

### Workstream M — Eval harness (~3 weeks)

A prompt edit currently ships with green CI **because CI does not touch prompts at all**. Output is always structurally valid, so degradation is silent until a customer's employees receive worse training.

- Golden set: 30–50 threats across all types and channels, with human-reviewed reference modules.
- Score on grounding, quiz correctness, reading level, tone + LLM-judge vs reference.
- CI gate on any diff to `app/ai/prompts/` or the model default, with a score-drop threshold.
- **You are already generating the ideal eval dataset and throwing it away** — every analyst edit is a labelled correction of exactly what the model got wrong, and `PATCH /training/modules/{id}` discards the before-state. Keep the pre-edit snapshot and a structured rejection reason.

### Phase 1 exit criteria

- [ ] A completed enterprise security questionnaire with no dishonest answers
- [ ] SSO working against the customer's Entra ID; MFA enforced for analysts
- [ ] Audit log answers "who viewed this employee's risk score"
- [ ] DSAR export and erasure both demonstrated end-to-end
- [ ] Multi-worker deploy with zero-downtime rolling restart, no runs killed
- [ ] Auditor-acceptable evidence export produced for a named period
- [ ] Quarterly recurring program scheduled, staggered, running unattended
- [ ] Eval harness gating prompt changes in CI
- [ ] **Contract signed**

---

## Phase 2 — Multi-tenant SaaS

**Goal:** customers 2 and 3 share one deployment.

**Duration:** 12–16 weeks.

> **Make this decision explicitly rather than by default.** Single-tenant-per-deployment is defensible for a security product entering regulated markets, and it lets you invest the saved weeks in ingestion and measurement instead. If you choose it, **write it down, price per deployment plus seats, and stop treating multi-tenancy as inevitable.** But decide now — retrofitting `tenant_id` across 13 models with live customer data is genuinely painful.

If you go multi-tenant:

- `Tenant` model + `tenant_id` on all 13 models. Composite uniqueness `(tenant_id, email)` — currently `Department.name`, `Employee.email`, and `User.email` are all **globally** unique, so two customers with the same person collide.
- **Scoping as a framework guarantee, not developer discipline.** `with_loader_criteria` on a wrapped session so an unscoped query is impossible to write. Every current query is unscoped: `select(Employee)` with no filter in the router, the risk engine, and the leaderboard.
- Postgres RLS keyed on a session GUC as a second layer.
- Test asserting cross-tenant reads return 404; a CI lint failing any model without `tenant_id`.
- Per-tenant config: branding, sending domain, risk weights, IdP, AI region.
- **Redis pub/sub for WebSockets.** In-memory `ConnectionManager` means a dashboard on process A sees nothing for a loop running on process B — the signature live-loop visualisation appears frozen for (N−1)/N of users. Ranked below the rest only because the frontend polls as a fallback.
- Usage metering at the `ai_service` and analyzer choke points. `Plan` model with limits. **Instrument first, price after two or three pilots** — you will have real cost-per-loop numbers instead of guesses.

**Exit:** two tenants live on one instance; a deliberate cross-tenant probe fails closed; per-tenant cost is measurable.

---

## Phase 3 — Scale & differentiate

- **Query performance.** Every dashboard function loads whole tables into Python: `compute_current_metrics` selects *every* `SimulationTarget` and `TrainingAssignment` ever created and filters in a comprehension; `department_rollups` is N+1 and runs on every 4-second poll from every open analyst tab. Invisible at 26 employees; fatal at 5000 with a year of history. Rewrite as SQL aggregates, add the seven missing indexes, paginate, cache 30–60 s, load-test against a synthetic 5000-employee 12-month fixture with a p95 budget.
- **i18n.** Zero infrastructure today — every string is a hardcoded English literal, `TrainingModule` has no `language` column, prompts have no locale instruction. Both target markets (Azerbaijani/Russian, Simplified Chinese) cannot deploy English-only training to rank-and-file staff. **This is a genuine differentiator**: AI-generated training localises far more cheaply than a fixed video library, and incumbent localisation in these markets is thin. Start with the employee portal (highest reader volume, smallest surface). Machine-translated *lures* read as fake and skew click rates — those need native-speaker review.
- **Cohorts and holdouts.** `MetricSnapshot` has four floats and a date — no cohort, no arm, no denominator, no sample size. `ExecutivePage.tsx` computes the headline claim as `trend[0] - trend[last]`, rendered as "↓ Xpp since start". A CISO asked by their board "how do you know the training caused this?" cannot answer with first-minus-last on a single org-wide line. Add treatment/control arms, a baseline period with training suppressed, two-proportion z-tests on matched campaign difficulty, and **render the confidence interval — never a bare percentage**. Publish the metric definition (denominator = delivered not targeted; 72 h click window) in-product so the number is auditable.
- Outlook add-in for true one-click reporting; Gmail add-on.
- Directory sync (Entra ID Graph → Google → SCIM). Do not build SCIM before a customer asks for it.
- Real intel feed fetchers (CISA, MISP, OTX) — `FeedItem` rows currently exist only in `seed.py`.
- SAML 2.0 when a deal requires it.

---

## What we deliberately do NOT build

| Not building | Why |
|---|---|
| **Multi-tenancy before customer #2** | Pilots get dedicated instances. Normal for early security vendors. Postgres support makes it viable. Retrofitting is expensive but so is building it for one customer |
| **SCIM before a customer asks** | CSV import + OIDC JIT covers the first several customers. SCIM is what enterprises *say* they want and rarely need on day one |
| **SAML before OIDC pays for itself** | OIDC covers Entra ID and Google, i.e. most of the market, at a fraction of the complexity |
| **A video content library** | You lose the content-volume race to KnowBe4 by definition. 12–15 text modules answer the compliance objection; the wedge is threat-derived generation |
| **Gmail add-in in Phase 0** | The abuse-mailbox poller is ~⅓ the effort, needs no client deployment or store review, and works with the Report Message button customers already have |
| **OpenTelemetry tracing** | Structured JSON logs + request-id + Sentry answers every question you will actually have until there are multiple services |
| **A self-serve trial / signup funnel** | This is a security product with a mandatory mail-gateway allow-listing step. Every early deal is hand-held. Building signup is vanity work |
| **Risk-model ML** | The transparent weighted model is a *feature*. "Our algorithm decided" is the wrong answer for a product whose differentiator is explainability |
| **Data residency infrastructure** | Per-tenant `ai_region` routing to Bedrock/Vertex when a deal demands it. Not speculatively |
| **Fixing `auto-outcomes` to be "more realistic"** | Delete it from production entirely. Better dice are still dice |

---

## Exhibition timing — SVIIF 2026 / Guangzhou

The exhibition and the MVP want **different things**, and conflating them wastes months. The demo is *already excellent for its purpose*: the seeded world, the deterministic RNG, the staged delays that make the loop visibly turn, the pre-loaded pending approval. That is good exhibition engineering. **Do not rip it out — gate it.**

### Before the exhibition (~2 weeks of work, high ROI on both tracks)

| Do | Because |
|---|---|
| **Workstream A in full** (`APP_ENV` gating, seed as CLI, admin router gated, credentials rotated) | Nothing here degrades the demo — everything stays available under `APP_ENV=demo`. And it means the public repo a Guangzhou visitor browses is not full of live credentials and a one-click wipe endpoint |
| **Workstream B (Alembic)** | Zero demo impact, unblocks everything after |
| **Fix the metric-window fallback and the mock-fallback labelling** | A technical visitor who reads `metrics.py` or `ai_service.py` at the booth is exactly the visitor worth impressing. These two are read-the-code-and-wince moments |
| **The SECURITY block on the two unhardened prompts** | ~2 days. "We hardened our own prompts against injection" is a *strong* booth story for a security product. Currently only 1 of 3 prompts has it, which reads as an oversight rather than a design |
| **Run the concierge test (F2)** | Two weeks, no platform code, parallelisable. Walking into the exhibition able to say "we tested with 3 security teams; analysts spend N minutes per module; threat-specific completion is X points higher" is worth more than any feature. **And if the numbers are bad, you find out before spending 6 months building the wrong product** |

### Explicitly after the exhibition

Everything else. Identity, notifications, delivery, tenancy, compliance. None of it improves a booth demo — the seeded world demos *better* than a half-built real one, and a partially-migrated system is more likely to break on stage.

### One thing to do *at* the exhibition

Recruit the design partner. Phase 0 is defined as "what one friendly company needs," and you cannot start it without that company. **The most valuable artifact you can leave Guangzhou with is a signed design-partner LOI, not a feature.**

---

## Effort summary

| Phase | Weeks (2 devs) | Cumulative |
|---|---|---|
| 0 — Pilot-ready | 10–12 | ~3 months |
| 1 — First paying customer | 14–18 | ~7–8 months |
| 2 — Multi-tenant SaaS | 12–16 | ~11 months |
| 3 — Scale & differentiate | ongoing | — |

**Reality check on these numbers:** they assume 2 focused devs, no context-switching, and no customer-support load. A single dev, or a dev who is also the founder doing sales, should multiply by roughly 1.8. The Phase 0 estimate is the one most likely to hold, because its scope is unusually well understood. Phase 1 is the one most likely to slip, because "survive a security review" expands to fit whatever the first real customer's questionnaire contains.

**The dependency chain is not negotiable:** Alembic → provisioning → notifications → delivery → measurement. Every attempt to parallelise past it creates rework.