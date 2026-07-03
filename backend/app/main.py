"""Cyclowareness API — learn, detect, neutralize, repeat."""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .database import Base, engine, session_scope
from .routers import (
    auth,
    dashboard,
    employees,
    feed,
    loop_runs,
    reports,
    simulations,
    threats,
    training,
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
    db = session_scope()
    try:
        seed_if_empty(db)
    finally:
        db.close()
    _recover_orphaned_runs()
    # Let the task runner accept submissions from threadpool workers
    import asyncio

    from .core.task_runner import get_task_runner

    runner = get_task_runner()
    if hasattr(runner, "attach_loop"):
        runner.attach_loop(asyncio.get_running_loop())
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
