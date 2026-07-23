# Deploying Cyclowareness + ZORBOX to Render

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
generator and ZORBOX uses its own static heuristics — both honest, both
labelled as such in the UI. To switch on live Claude and the real VirusTotal
adapter, set these on the service → **Environment** (they are `sync: false`, so
they never enter git):

| Variable | Effect |
|---|---|
| `ANTHROPIC_API_KEY` | Live Claude for training + briefings (you already have this key in the Azercell service) |
| `SANDBOX_ANALYZER=real` + `REAL_ANALYZER_API_KEY` | VirusTotal URL/hash lookups feed the awareness loop |

ZORBOX's own static engine (PE, Office macros, scripts, PDF, ELF, YARA, the
scoring model) needs no keys and runs regardless.

**Sample persistence.** Uploaded samples land in `/tmp` on the container's
ephemeral disk, so they vanish on every redeploy. For a malware quarantine that
is a feature, not a bug. If you ever need samples to survive a deploy, attach a
Render disk and point `ZORBOX_QUARANTINE` at its mount path.

## What ZORBOX does and does not do on Render — read this

ZORBOX performs **static analysis only**. It parses files; it never executes
them. That is what makes it safe to run on managed hosting at all, and the UI
says so on every report ("dynamic detonation not available on this host").

- **This is correct and defensible.** A static file-type-and-structure analyzer
  is the same class of service as any online document checker.
- **Dynamic detonation** — Cuckoo, CAPEv2, Firejail, the native syscall engine
  from the hackathon brief — needs a disposable, network-isolated VM with
  kernel-level control. A PaaS does not and should not provide that. The
  architecture already accounts for this: the "dynamic" tier is a separate
  worker that attaches out-of-band (see `app/sandbox/native.py` notes and the
  `dynamic_worker` capability flag). Run that worker on a lab machine you
  control, never on Render.
- **A note on uploaded content.** Because real users can upload real malware,
  and Render is shared infrastructure, keep the deployed instance to the demo
  seed for exhibitions, and do not solicit live malware submissions against the
  hosted URL. For the hackathon's real analysis runs, run the stack locally
  (`docker compose up`) or on the lab worker where the dynamic tier also lives.

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
