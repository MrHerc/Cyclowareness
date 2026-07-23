# Cyclowareness

**Closed-loop cybersecurity awareness platform.** Real threats become personalized training — automatically. *Learn, detect, neutralize — and repeat.*

Cyclowareness analyzes real threats in a secure sandbox, uses AI to convert each threat into micro-training targeted at the specific employees most at risk, measures the resulting behavioral change through a quantified risk score, and feeds every result back into the system. It learns from real attacks, not templates.

> **Where this is going:** [`ROADMAP.md`](ROADMAP.md) is an honest gap analysis from
> this exhibition demo to a sellable MVP — what is genuinely built, what is a stub,
> and the sequenced phases to a first paying customer.
> [`SPRINT-PLAN.md`](SPRINT-PLAN.md) is the next 15 working days in detail: the
> service stack to wire up, and a day-by-day path to a live pilot.

## The loop (the invention)

```
        ┌───────────────────────────────────────────────────────────┐
        │                                                           │
        ▼                                                           │
 (1) INGEST ──► (2) ANALYZE ──► (3) CONVERT ──► (4) TARGET ──► (5) TRAIN ──► (6) MEASURE
  human sensor    sandbox         AI: threat      map to           adaptive     risk score
  + threat feed   verdict         → training      at-risk people   delivery     + behavior Δ
                  + IOCs          + IOCs                                             │
        ▲                                                                           │
        └──────────────────────── (7) FEEDBACK: results update the risk model ──────┘
```

Every full pass is a persisted, auditable **LoopRun**. The analyst dashboard renders the loop turning in real time; a stalled or failed stage is surfaced, never dropped. Between CONVERT and TARGET sits a **human-in-the-loop gate**: an analyst reviews (and can edit) every AI-generated module before anyone receives it.

## ZORBOX — the file & URL sandbox (`/sandbox`, `backend/app/sandbox/`)

The analyzer behind stage 2 is also a standalone malware sandbox, built to the
Azerbaijan Cybersecurity Centre's national-sandbox brief. Submit a file or a
URL; ZORBOX identifies it by content (not by its extension), analyses it, and
returns a **scored, explainable verdict** — every point traceable to a signal a
human can read.

- **Static analysis, never execution.** Six analyzers — PE (`pefile`), Office
  macros (`oletools`), scripts (PowerShell/JS/VBS/batch/Python, with base64
  layers decoded, not run), PDF, ELF, and a universal entropy/IOC extractor —
  plus a **22-rule YARA tier**. The sample is parsed, never run.
- **Content-based identification** catches the deception the extension hides: an
  `.exe` renamed `invoice.pdf` is flagged the moment its bytes disagree with its
  name.
- **Archives** (`.zip/.rar/.7z`, and OOXML) are unpacked with bounds against zip
  bombs, path traversal and nesting; each member becomes its own scored job, and
  an encrypted archive **pauses and asks for a password — it is never
  brute-forced**.
- **URL submission** downloads the target behind an **SSRF guard** that refuses
  private, loopback and cloud-metadata addresses and re-checks every redirect.
- **Scoring** is `0.6 × rule + 0.4 × model`, banded Low/Medium/High/Critical per
  the brief. The model is a transparent, expert-weighted logistic regression
  whose every feature contribution is shown — labelled as expert-weighted, not
  as a classifier trained on a corpus it never saw.
- **Exports:** JSON, **STIX 2.1**, and a PDF report — each stating which tiers
  ran. **Dynamic detonation** (Cuckoo/CAPEv2/Firejail/native syscall tracing)
  runs on an isolated worker off the web host, never on shared hosting; the seam
  is defined in `sandbox/native.py` and every report says plainly when the
  sample was not detonated.

## Quick start (demo build — zero external services)

**Windows, already set up?** Just double-click **`start-demo.bat`** — it launches
the API and the UI in their own windows and opens the browser. Close those two
windows to stop the demo.

First time (or on another machine), prerequisites: Python 3.12+, Node 20+.

```bash
# 1. Backend (SQLite + mock sandbox + mock AI — the full loop works offline)
cd backend
python -m venv .venv
.venv\Scripts\pip install -r requirements.txt        # Windows
.venv\Scripts\python -m uvicorn app.main:app --port 8000

# 2. Frontend (separate terminal)
cd frontend
npm install
npm run dev            # http://localhost:5173  (proxies /api → :8000)
```

The database is created and seeded automatically on first start (fictional company *Caspian Dynamics*: 26 employees, 6 months of metric history, past loop runs, an active simulation, a triage queue and a run already waiting for approval).

### Demo accounts

| Role | Email | Password |
|---|---|---|
| Security Analyst | `analyst@caspiandynamics.az` | `analyst123` |
| Employee (Finance) | `leyla.aliyeva@caspiandynamics.az` | `demo123` |
| Employee (high-risk) | `rashad.mammadov@caspiandynamics.az` | `demo123` |
| Employee (champion) | `aysel.huseynova@caspiandynamics.az` | `demo123` |
| Executive (read-only) | `exec@caspiandynamics.az` | `exec123` |

### 3-minute exhibition script

1. **Analyst** → Intel Feed → *Push into the loop* on any item. Watch the run travel INGEST → ANALYZE → CONVERT live on the run page.
2. The run pauses at the **approval gate** — review the AI-generated micro-training (edit if you like) → *Approve & continue*.
3. TARGET selects the at-risk employees **with visible rationale** (targeted, not blasted); TRAIN assigns.
4. **Sign in as Rashad** (high risk) → his portal shows the new assignment and *why he* received it → complete the 3-minute module → his risk score visibly drops.
5. **Back as analyst** → the run's MEASURE/FEEDBACK stages close the loop; the dashboard's click-rate/report-rate charts and department heatmap are the before/after proof.
6. Optional: Employee portal → *Report suspicious* (one-click human sensor) → the report lands in the analyst triage queue with AI assist → push it into the loop: the cycle restarts.

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────────┐
│  Frontend   │────►│   API layer  │────►│   Task runner       │
│ React + TS  │◄────│   FastAPI    │◄────│  (pluggable)        │
└─────────────┘     └──────┬───────┘     └──────────┬──────────┘
                           │                        │
                    ┌──────▼───────┐        ┌───────▼─────────┐
                    │  SQL DB      │        │ Sandbox service │
                    │ (SQLite/PG)  │        │  (PLUGGABLE)    │
                    └──────────────┘        └───────┬─────────┘
                           ▲                        │
                    ┌──────┴───────┐        ┌───────▼─────────┐
                    │  ai_service  │        │  MockAnalyzer   │
                    │ Anthropic /  │        │  (default) OR   │
                    │ Mock provider│        │  VT / CAPEv2    │
                    └──────────────┘        └─────────────────┘
```

Three deliberately pluggable seams, all selected by config — the loop code never changes:

| Seam | Config | Demo default | Production option |
|---|---|---|---|
| Sandbox | `SANDBOX_ANALYZER` | `mock` (realistic deterministic verdicts) | `real` → **VirusTotal adapter fully implemented** (submit URL → poll analysis → normalise verdict + IOCs) in `analyzers/real_analyzer.py`; CAPEv2 self-hosted flow documented as a deployment TODO |
| Task queue | `TASK_RUNNER` | `inprocess` (asyncio background tasks) | `celery` → Redis + Celery workers (adapter in `core/task_runner.py`) |
| AI | `ANTHROPIC_API_KEY` | empty → deterministic `MockAIProvider` | set key → live Claude calls (`AI_MODEL`, default `claude-sonnet-5`) |
| Database | `DATABASE_URL` | SQLite file | PostgreSQL (`postgresql+psycopg://…`), JSON columns are JSONB-compatible |

### Turning on the real integrations

Both are pure configuration — the loop code never changes:

```bash
# Live AI (real Claude-generated training per threat)
ANTHROPIC_API_KEY=sk-ant-...        # in backend/.env
AI_MODEL=claude-sonnet-5

# Real sandbox (VirusTotal URL/hash reputation)
SANDBOX_ANALYZER=real
REAL_ANALYZER_BACKEND=virustotal
REAL_ANALYZER_API_KEY=<your-vt-api-key>
```

With the AI key set, `ai_service` routes every generation through Claude and
falls back to the deterministic mock only if a call fails or returns malformed
output. With the VirusTotal backend, the ANALYZE stage extracts the artifact's
URL, submits it, polls the analysis to completion and maps VT's engine stats to
the same analyzer contract the mock produces — so the dashboard, targeting and
training are identical whether the verdict came from the mock or the real world.

**No live malware is ever executed inside the web application.** Real detonation belongs to an external sandbox behind the `RealAnalyzer` adapter; the analyzer contract is:

```json
{
  "verdict": "malicious | suspicious | benign",
  "confidence": 0.0,
  "threat_type": "phishing | malware | smishing | quishing | bec | other",
  "iocs": {"urls": [], "domains": [], "hashes": [], "sender_patterns": []},
  "behavior_summary": "short text",
  "raw_report": { }
}
```

## The risk model (transparent by design)

Score 0–100 per employee; baseline `20 + role_sensitivity × 20`; every movement is a persisted `RiskEvent` (the audit trail shown in the UI). Weights (`backend/app/core/risk_engine.py`):

| Signal | Δ |
|---|---|
| Clicked a simulated phishing lure | **+12** |
| Exposed (targeted) by a real threat | **+8** |
| Ignored assigned training (expired) | **+4** |
| Completed training but failed quiz | **+3** |
| Reported a real suspicious artifact | **−4** |
| Completed a training module | **−4** |
| Quiz comprehension (scaled by score) | **−6 × score** |
| Reported a simulated phish | **−5** |

The current score is the direct input to the TARGET stage — riskier people are trained first, and their improvement changes who gets targeted next time. That is the feedback that closes the loop.

## AI engine (`backend/app/ai/`)

All Claude calls live behind `ai_service` with strict output schemas, defensive JSON parsing, and graceful fallback to the deterministic mock. Prompts are versioned files in `ai/prompts/`:

- `training_generation` — sandbox analysis → personalized micro-module (lesson, 3–5 question quiz, takeaway)
- `threat_explanation` — technical verdict → plain language for employees
- `triage_assist` — reported artifact → indicators + IOCs for the analyst
- `executive_briefing` — metrics → natural-language posture summary

## Tests

```bash
cd backend
.venv\Scripts\pip install -r requirements-dev.txt
.venv\Scripts\python -m pytest -q          # 35 tests: risk engine, loop
                                           # orchestrator (all 7 stages +
                                           # idempotency), analyzer contract,
                                           # AI schemas, auth/RBAC
```

GitHub Actions (`.github/workflows/ci.yml`) runs the backend suite and the
frontend type-check + build on every push and pull request.

## Production deployment

`docker-compose.yml` ships the full production topology (PostgreSQL + Redis + API). Steps to harden:

1. Set a real `SECRET_KEY`, `DATABASE_URL` (Postgres) and `ANTHROPIC_API_KEY` in the environment — never in code.
2. Enable Celery: `TASK_RUNNER=celery`, run workers (`celery -A app.worker worker`), wire the task in `core/task_runner.py` (documented TODO).
3. Enable a real sandbox: `SANDBOX_ANALYZER=real` + backend credentials (see `analyzers/real_analyzer.py`).
4. Replace the seeded demo users with your identity provider.

## Repository layout

```
backend/app/
  core/orchestrator.py    ← THE LOOP (7 stages, persisted LoopRun state machine)
  core/risk_engine.py     ← transparent scoring + TARGET selection
  core/task_runner.py     ← pluggable queue (inprocess | celery)
  core/metrics.py         ← outcome metrics + daily snapshots
  analyzers/              ← pluggable sandbox (mock | real)
  ai/                     ← ai_service, providers, versioned prompts/
  routers/                ← REST API (auth, loop, threats, training, …)
  models.py / schemas.py  ← entities incl. LoopRun, RiskEvent, PhishingReport
  seed.py                 ← Caspian Dynamics demo world
frontend/src/
  components/LoopViz.tsx  ← the signature live loop visualization
  pages/analyst/          ← dashboard, run detail, triage, review, sims, feed
  pages/employee/         ← portal, training player
  pages/executive/        ← read-only posture view
```

## Non-goals (by design)

No public news portal (the feed is input-only and minimal), no from-scratch detonation engine, no live malware in the web app, no long generic courses, no all-in-one enterprise suite. If a feature doesn't feed the cycle, it was cut.
