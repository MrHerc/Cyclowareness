# Cyclowareness

**Closed-loop cybersecurity awareness platform.** Real threats become personalized training — automatically. *Learn, detect, neutralize — and repeat.*

Cyclowareness analyzes real threats in a secure sandbox, uses AI to convert each threat into micro-training targeted at the specific employees most at risk, measures the resulting behavioral change through a quantified risk score, and feeds every result back into the system. It learns from real attacks, not templates.

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

## Quick start (demo build — zero external services)

Prerequisites: Python 3.12+, Node 20+.

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
| Sandbox | `SANDBOX_ANALYZER` | `mock` (realistic deterministic verdicts) | `real` → VirusTotal / CAPEv2 adapter (`analyzers/real_analyzer.py`, stubbed with documented TODOs) |
| Task queue | `TASK_RUNNER` | `inprocess` (asyncio background tasks) | `celery` → Redis + Celery workers (adapter in `core/task_runner.py`) |
| AI | `ANTHROPIC_API_KEY` | empty → deterministic `MockAIProvider` | set key → live Claude calls (`AI_MODEL`, default `claude-sonnet-5`) |
| Database | `DATABASE_URL` | SQLite file | PostgreSQL (`postgresql+psycopg://…`), JSON columns are JSONB-compatible |

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
