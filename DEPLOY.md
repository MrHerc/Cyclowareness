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

## Linking the standalone Cyclowareness Sandbox (single sign-on)

The portal ships a **Tam Sandbox / Full Sandbox** button in the top bar. It
opens the *standalone* Cyclowareness Sandbox in a new tab with the analyst
already signed in — no second password — so they reach the screens this portal
does not re-implement: the engine matrix, score tuning, the retention policy and
that product's own hash-chained chain of custody.

It is **off by default**. Unconfigured, `/api/capabilities` reports
`sandbox_app: false`, the button does not render, and the panel on the Portal
Sandbox page renders nothing. Nothing to remove, nothing that dead-ends.

### What must already be true

The standalone is deployed as its **own service** (its own repo, its own
`render.yaml`, its own database) and is reachable **from the analyst's browser**.
Not from this container — the portal never calls the standalone. It signs a
token, hands it to the browser, and the browser goes. A standalone on a private
network is therefore only usable by analysts who are on that network.

### Three variables, on this service

| Variable | Value |
|---|---|
| `SANDBOX_APP_URL` | The standalone's public base URL, e.g. `https://sandbox.example.az`. No trailing slash needed. |
| `SANDBOX_APP_SECRET` | **Exactly** the standalone's `SECRET_KEY`. |
| `SANDBOX_APP_TENANT` | Must match the standalone's `ANALYST_TENANT` (empty there means `default`). |

`SANDBOX_APP_TTL_MINUTES` defaults to 30 and rarely needs changing — it is the
life of a hand-off, not of a session.

### One variable on the standalone, and it is the one people miss

**`SECRET_KEY` must be set explicitly over there.** Left unset, the standalone
generates a fresh random signing key *on every boot* (`ensure_secret_key` in its
`app/config.py`) — deliberate for a demo, fatal for this link. A token signed
against a key that was regenerated two seconds ago verifies against nothing, and
the symptom is an analyst landing on the standalone's login screen with no
explanation.

Generate it once and set the same value on both hosts:

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

### Verify it, in three commands

```bash
# 1. the portal admits the standalone exists
curl -s https://<portal>/api/capabilities | grep sandbox_app     # -> "sandbox_app":true

# 2. an analyst's session mints a hand-off
curl -s -X POST https://<portal>/api/sandbox/app-session \
     -H "authorization: Bearer <portal-token>" -H 'content-type: application/json' -d '{}'

# 3. the standalone accepts the token from step 2
curl -s -o /dev/null -w '%{http_code}\n' https://<standalone>/api/jobs \
     -H "authorization: Bearer <handoff-token>"                  # -> 200
```

A `503` from step 2 means the URL is set and the secret is not. A `401` at step
3 means the two keys differ — check for a trailing newline in the dashboard
value before checking anything else.

### Half-configured is treated as off, on purpose

`sandbox_app` is true only when **both** the URL and the secret are present. With
only the URL, minting raises and the endpoint answers 503 — so the button is
withheld rather than shown leading to an error. There is no fallback to a shared
service account, at any point, by design: the token carries the real person's
address so the standalone's chain of custody records who acted.

### Treat `SANDBOX_APP_SECRET` as a signing key, not a password

Anyone holding it can mint a valid standalone session **for any subject**. It is
`sync: false` in the blueprint and must never enter git. Both services should be
on HTTPS: the hand-off token travels in the URL fragment, which no server ever
receives and no access log records, but which TLS is still what protects in
transit.

### A known rough edge: signing out *inside* the standalone

The standalone's log-out bumps a per-subject session epoch, and the portal mints
at epoch 0. So if an analyst clicks log out **in the standalone tab**, their
hand-off stops working — the next click on the button lands them on the
standalone's login screen, which they have no password for. Verified:

```
hand-off               -> 200
log out in standalone  -> 204
a brand-new hand-off   -> 401
```

The epoch lives in process memory, so **restarting the standalone clears it**,
and everyone can hand off again. Tell analysts to close the tab rather than log
out of it; if that proves unrealistic, the fix is on the standalone's side —
hide log-out for a session that arrived by hand-off.

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
the mock sandbox analyzer — by design.

## Schema changes

**Alembic owns the schema.** `create_all()` is gone from the boot path, because
it CREATES a table it has never seen and does nothing at all to one it has — so
a release that adds a column reports success and leaves the column missing.
That is not hypothetical: swapping in the vendored sandbox engine added nine
columns to `sandbox_jobs`, and on an existing database every sandbox query then
raised `no such column: sandbox_jobs.tenant_id` while `/api/health` answered 200
throughout.

The service runs `alembic upgrade head` itself at boot, so an ordinary deploy
needs no extra step. A database built by the old `create_all()` path has the
tables but no `alembic_version`; it is stamped at the revision its columns
actually match and upgraded from there. A database holding tables that match no
revision is **refused** rather than guessed at — stamping the wrong one would
make the next upgrade alter columns that are not there, which corrupts instead
of failing.

To run migrations by hand instead (`alembic upgrade head` from `backend/`), the
URL comes from `DATABASE_URL`; `alembic.ini` deliberately carries none, so there
is only ever one answer to which database is being migrated.

**One caveat, stated plainly:** migrating at boot assumes one instance starts at
a time. Two replicas booting together would both try to migrate. Render runs a
single instance, so this is safe today — but a deployment that scales out must
move `alembic upgrade head` into a release command that runs once.
