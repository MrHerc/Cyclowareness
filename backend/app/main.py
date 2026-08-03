"""Cyclowareness API — learn, detect, neutralize, repeat."""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .database import run_migrations, session_scope
from .routers import (
    admin,
    approvals,
    audit,
    auth,
    dashboard,
    employees,
    feed,
    incident_risks,
    integrations,
    intel,
    loop_runs,
    policy,
    remediation,
    reports,
    sandbox,
    sandbox_dynamic,
    simulations,
    threats,
    training,
    ws,
)
from .seed import seed_if_empty

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")
settings = get_settings()


def _recover_orphaned_runs() -> None:
    """In-process tasks die with the process; surface interrupted runs as
    failed instead of leaving them wedged at RUNNING forever (spec §6.1:
    a stalled stage is surfaced, not silently dropped)."""
    from sqlalchemy import select

    from .models import LoopRun, LoopStatus

    db = session_scope()
    try:
        stuck = db.execute(
            select(LoopRun).where(LoopRun.status == LoopStatus.RUNNING)
        ).scalars().all()
        for run in stuck:
            history = [dict(e) for e in (run.stage_history or [])]
            for entry in history:
                if entry["status"] == "in_progress":
                    entry["status"] = "failed"
                    entry["error"] = "Interrupted by a server restart — resubmit the artifact"
            run.stage_history = history
            run.status = LoopStatus.FAILED
            db.add(run)
        if stuck:
            db.commit()
    finally:
        db.close()


def _check_quarantine_is_writable() -> None:
    """Refuse to start if samples cannot be stored, and say why.

    Without this the portal boots, reports healthy, serves the whole UI, and
    answers every file upload and every URL submission with a bare
    `500 Internal Server Error`. `routers/sandbox.py` catches `SampleTooLarge`
    and `EmptySample`; a `PermissionError` from `storage.store_stream` is
    uncaught, no job row is created, nothing reaches the queue, and the real
    cause is visible only in the container log. The analyst sees a sandbox that
    silently swallows submissions.

    In the shipped configuration this cannot happen — the image runs as root
    against container-local `/tmp`. The live route in is DEPLOY.md, which tells
    an operator to attach a Render disk and point `SANDBOX_QUARANTINE` at its
    mount path: a mistyped, unattached or read-only mount lands here.

    A deployment fault should be fatal at startup and legible, not a mystery on
    every request.

    Adapted from the standalone's check, minus its `chown -R 10001:10001` hint —
    that image declares a `USER`, this one does not, so the advice would send an
    operator chasing a uid this image never runs as.
    """
    import os
    import tempfile

    from .sandbox.engine.storage import quarantine_root

    try:
        root = quarantine_root()
        with tempfile.NamedTemporaryFile(dir=root, prefix=".writecheck-"):
            pass
    except OSError as exc:
        configured = os.environ.get("SANDBOX_QUARANTINE", "(unset — a temp directory is used)")
        raise RuntimeError(
            f"Quarantine directory is not usable: {exc}\n"
            f"  SANDBOX_QUARANTINE: {configured}\n"
            "Every sandbox submission would fail with a 500 and no job would be "
            "created. If this is a mounted disk, check that it is attached and "
            "that the path matches the mount point."
        ) from exc


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ALEMBIC OWNS THE SCHEMA, not `create_all()`. See app/database.py for the
    # upgrade this replaced: `create_all()` reported success and left nine
    # columns missing, because it cannot alter a table it has already seen.
    #
    # A database built by the old path has the tables but no `alembic_version`,
    # so it is stamped at the revision its columns actually match and upgraded
    # from there — the two steps an operator would otherwise run by hand.
    run_migrations()
    # Before anything can be submitted, not on the first submission. See the
    # function: without it the service is healthy and every upload is a 500.
    _check_quarantine_is_writable()
    # Seeding is a demo affordance, never automatic in production: an empty
    # customer database must stay empty, not fill itself with a fictional
    # Azerbaijani energy company. Run `python -m app.seed` for the demo world.
    if settings.is_demo:
        db = session_scope()
        try:
            seed_if_empty(db)
        finally:
            db.close()
    _recover_orphaned_runs()
    # Let the task runner accept submissions from threadpool workers
    import asyncio

    from .core.task_runner import get_task_runner

    loop = asyncio.get_running_loop()
    runner = get_task_runner()
    if hasattr(runner, "attach_loop"):
        runner.attach_loop(loop)
    # Let the real-time event manager post broadcasts from background tasks.
    from .core.events import manager

    manager.attach_loop(loop)
    yield


app = FastAPI(
    title="Cyclowareness",
    description="Closed-loop cybersecurity awareness platform: "
    "real threats become personalized training, measured results feed back into the risk model.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
# The admin router exists solely to wipe and re-seed the exhibition world.
# It must not exist in production: any analyst token could destroy a customer's
# entire dataset with a single request.
if settings.is_demo:
    app.include_router(admin.router)
app.include_router(ws.router)
app.include_router(dashboard.router)
app.include_router(loop_runs.router)
app.include_router(threats.router)
app.include_router(training.router)
app.include_router(employees.router)
app.include_router(reports.router)
app.include_router(simulations.router)
app.include_router(feed.router)
# The Cyclowareness Sandbox: file and URL analysis, on the same engine as the
# standalone product. `sandbox_dynamic` is the off-host detonation seam — the
# web application itself never runs a sample.
app.include_router(sandbox.router)
app.include_router(sandbox_dynamic.router)
# The organisational layer: the customer's own documents, the advisories that
# break them, and the external platforms training runs on.
app.include_router(policy.router)
app.include_router(intel.router)
app.include_router(integrations.router)
# Obligations charged to named people, the human approval gate as a queue, and
# the trail every one of them writes to.
# The Remediation Engine: a service the loop calls, not an eighth stage. Its
# output firewall is what stands between an attacker's instructions inside a
# lure and a learner's screen.
app.include_router(remediation.router)
app.include_router(incident_risks.router)
app.include_router(approvals.router)
app.include_router(audit.router)


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "analyzer": settings.sandbox_analyzer,
        "task_runner": settings.task_runner,
        "ai_provider": "anthropic" if settings.anthropic_api_key else "mock",
    }


@app.get("/api/capabilities")
def capabilities():
    """What this deployment can actually do — read by the UI at startup.

    Several affordances (the demo reset button, synthetic simulation outcomes,
    the one-click demo logins) only exist in the exhibition build. Without this
    endpoint the frontend renders them unconditionally and they dead-end with a
    404 in production, which reads as a broken product.
    """
    return {
        "demo_mode": settings.is_demo,
        "ai_provider": "anthropic" if settings.anthropic_api_key else "mock",
        "analyzer": settings.sandbox_analyzer,
    }


# --- serve the built frontend --------------------------------------------------
# When a compiled SPA is present (the Docker image builds it in), the API also
# serves it, so the whole product runs as ONE service on ONE origin: no CORS,
# and the /api/ws WebSocket is same-origin. In local dev this directory does not
# exist and Vite serves the frontend instead — so this block is a no-op there.
_FRONTEND_DIST = __import__("pathlib").Path(__file__).resolve().parent.parent / "frontend_dist"

if _FRONTEND_DIST.is_dir():
    from fastapi.responses import FileResponse
    from fastapi.staticfiles import StaticFiles

    # Hashed build assets, served with their own caching semantics.
    app.mount("/assets", StaticFiles(directory=_FRONTEND_DIST / "assets"), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    def spa(full_path: str):
        """Return a real file when one exists, else index.html.

        The SPA owns client-side routes like /sandbox/{id}, so any path that is
        not an API route and not a real asset must fall back to index.html for
        the router to resolve. /api/* never reaches here — those routes are
        registered above and match first.
        """
        candidate = (_FRONTEND_DIST / full_path).resolve()
        # Contain path traversal: the resolved path must stay inside the dist.
        if _FRONTEND_DIST in candidate.parents and candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(_FRONTEND_DIST / "index.html")
