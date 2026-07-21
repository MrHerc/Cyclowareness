"""Cyclowareness API — learn, detect, neutralize, repeat."""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .database import Base, engine, session_scope
from .routers import (
    admin,
    auth,
    dashboard,
    employees,
    feed,
    loop_runs,
    reports,
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


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
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
