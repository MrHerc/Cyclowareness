# Deploying Cyclowareness to Render

One Docker service serves the API and the compiled frontend from a single
origin. There is no separate frontend host, no CORS, and the live-loop
WebSocket is same-origin. The blueprint deploys the **exhibition build**
(`APP_ENV=demo`): SQLite, the seeded Caspian Dynamics world, one-click demo
logins — the same shape the Azercell project runs in.

## One-time setup (about five minutes, in your Render account)

1. Push this repo to GitHub (see below). The blueprint reads from the repo.
2. Render dashboard → **New → Blueprint**.
3. Connect the **MrHerc/Cyclowareness** repository. Render finds `render.yaml`
   and shows one service, `cyclowareness`.
4. **Apply**. Render builds the Docker image (frontend compile + Python API)
   and boots it. `SECRET_KEY` is generated for you; nothing secret is in git.
5. When it goes live, open the service URL. The demo logins are on the sign-in
   screen.

That is the whole path. Everything below is optional tuning.

## The three things worth deciding

**Plan / memory.** The blueprint requests the **free** plan (512 MB), which is
enough for the demo. The static analyzers (YARA, oletools, pefile) load into
memory per worker; if the service restarts under load during a busy booth, move
it to **Starter ($7/mo)** — same click as the Azercell service. The free plan
also sleeps after ~15 min idle, so **warm the URL before a presentation** (first
hit takes ~50s).

**Live AI and real analysis.** By default the awareness loop uses the offline
generator and the sandbox uses its own static engine — both honest, both
labelled as such in the UI. To switch on live Claude and the real VirusTotal
adapter, set these on the service → **Environment** (they are `sync: false`, so
they never enter git):

| Variable | Effect |
|---|---|
| `ANTHROPIC_API_KEY` | Live Claude for training + briefings (you already have this key in the Azercell service) |
| `SANDBOX_ANALYZER=real` + `REAL_ANALYZER_API_KEY` | VirusTotal URL/hash lookups feed the awareness loop |

The sandbox's own engine (twelve static analyzers, YARA, the scoring model,
the verdict, the impact rating and the ATT&CK mapping) needs no keys and runs
regardless. `VT_API_KEY` is the only thing the VirusTotal enrichment reads, and
without it that one analyzer reports itself unavailable instead of silently
scoring nothing.

**Sample persistence.** Uploaded samples land in `/tmp` on the container's
ephemeral disk, so they vanish on every redeploy. For a malware quarantine that
is a feature, not a bug. If you ever need samples to survive a deploy, attach a
Render disk and point `SANDBOX_QUARANTINE` at its mount path.

## What the sandbox does and does not do on Render — read this

On Render the sandbox performs **static analysis only**. It parses files; it
never executes them. That is what makes it safe to run on managed hosting at
all, and the UI says so on every report rather than reporting a clean
behavioural result nobody observed.

- **This is correct and defensible.** A static file-type-and-structure analyzer
  is the same class of service as any online document checker.
- **Dynamic detonation** needs a disposable, network-isolated VM with
  kernel-level control. A PaaS does not and should not provide that. Attach one
  out-of-band instead — see the next section.
- **A note on uploaded content.** Because real users can upload real malware,
  and Render is shared infrastructure, keep the deployed instance to the demo
  seed for exhibitions, and do not solicit live malware submissions against the
  hosted URL.

## Attaching the detonation host

The analysis engine here is the **same engine, byte for byte, as the standalone
Cyclowareness Sandbox** (`backend/app/sandbox/engine/` is a verbatim copy; see
`backend/app/sandbox/db.py` for the four-module seam that lets it run unmodified).
That is also why the worker contract is identical: the detonation worker already
built for the standalone works against this deployment with no change but a base
URL.

The worker polls three endpoints, authenticating with a shared token:

```
GET  /api/dynamic/queue        the work list — completed jobs not yet detonated
GET  /api/dynamic/sample/{id}  the quarantined bytes
POST /api/dynamic/report/{id}  the behaviour, merged into the verdict and re-scored
```

To open the tier, set the SAME value on both sides:

- on this service: `DYNAMIC_WORKER_TOKEN` (Render dashboard, `sync: false`)
- on the worker host: `DYNAMIC_WORKER_TOKEN`, plus `SANDBOX_API` pointing at
  this deployment
- on this service, also set `SANDBOX_DYNAMIC_WORKER=true` to declare that
  isolated hardware exists. Both are required: the token lets the worker post,
  the flag is the operator's statement that a worker is really there. Set one
  without the other and `/api/sandbox/capabilities` says which is missing.

Unset, the seam is closed: `/api/dynamic/*` answers 503 and every report states
that detonation did not run. That is the honest default — accepting externally
supplied "behaviour" into a verdict is a trust decision an operator makes
deliberately.

**Treat this token as the widest credential in the system.** It buys every
sample's bytes and the ability to fabricate behaviour for any job.

The worker itself runs on hardware you control and is **never** deployed to
Render. It lives in the standalone Cyclowareness Sandbox repository under
`worker/`, and is deliberately not duplicated here: one worker, one contract,
either deployment.

## Optional: signed evidence and the regulatory record

- `SIGNING_KEY` — an Ed25519 seed. With it, `GET
  /api/sandbox/jobs/{id}/export.signed` returns canonical bytes plus a detached
  signature a recipient can verify offline, and
  `/api/sandbox/attestation/pubkey` publishes the public half. Without it the
  document is still produced in full and states plainly that it is unsigned.
- `ENTITY_NAME`, `ENTITY_COUNTRY`, `ENTITY_SECTOR`, `ENTITY_CONTACT` — copied
  verbatim into the incident export (`export.incident`), which lays the
  technical facts out in the fields a NIS2 Article 23 early warning asks for.
  Left empty, the record names them as operator input still required rather
  than inventing an entity. It is always a draft, never a filing.
- `SOVEREIGN_MODE` — the egress choke point. **Off by default here**, unlike the
  standalone appliance, and the difference is factual: this portal calls an LLM
  by design, so claiming "no analysis data leaves this deployment" on an
  incident record would be false. Set it to `true` and outbound enrichment —
  including the AI provider — is refused rather than quietly allowed.

## Local production-shape check (optional)

To see exactly what Render builds, before pushing:

```bash
docker build -t cyclowareness .
docker run -p 8000:8000 -e APP_ENV=demo -e SECRET_KEY=$(python -c "import secrets;print(secrets.token_urlsafe(48))") cyclowareness
# open http://localhost:8000
```

## Running it as a real product instead of a demo

The demo build runs on SQLite. A real deployment must not: set
`APP_ENV=production`, point `DATABASE_URL` at a Postgres instance (Render
Postgres, or Neon), and supply a real `SECRET_KEY`. The config validator refuses
to boot a production instance on SQLite, a placeholder key, localhost CORS, or
the mock sandbox analyzer — by design. Schema migrations (Alembic) are the one
prerequisite still outstanding for a real rollout; see `SPRINT-PLAN.md`.
