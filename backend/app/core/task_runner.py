"""Pluggable async task runner (spec §3: async by design).

Two implementations behind one interface, selected by ``TASK_RUNNER``:

* ``InProcessTaskRunner`` (default) — asyncio background tasks inside the
  API process. Zero external dependencies; perfect for dev/demo. Loop
  stages still run asynchronously and persist state, so the UI shows the
  loop turning live.

* ``CeleryTaskRunner`` — production adapter for Redis + Celery. The
  interface and config hooks are implemented; the Celery app wiring is
  left behind the config flag (see README "Production deployment").
"""
import asyncio
import logging
from collections.abc import Coroutine
from typing import Any

from ..config import get_settings

logger = logging.getLogger("cyclowareness.tasks")


class InProcessTaskRunner:
    """Runs coroutines as tracked asyncio tasks on the API's event loop.

    Sync endpoints execute in a threadpool, so ``submit`` must be safe to
    call from any thread: it targets the loop captured via ``attach_loop``
    at application startup.
    """

    def __init__(self) -> None:
        self._tasks: set[asyncio.Task] = set()
        self._loop: asyncio.AbstractEventLoop | None = None

    def attach_loop(self, loop: asyncio.AbstractEventLoop) -> None:
        self._loop = loop

    def submit(self, coro: Coroutine[Any, Any, Any], name: str = "task") -> None:
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            loop = None
        if loop is not None:
            # Called from the event-loop thread (async endpoint / lifespan)
            task = loop.create_task(coro, name=name)
            self._tasks.add(task)
            task.add_done_callback(self._on_done)
            return
        if self._loop is None:
            raise RuntimeError("InProcessTaskRunner has no event loop attached")
        # Called from a threadpool worker (sync endpoint)
        future = asyncio.run_coroutine_threadsafe(coro, self._loop)
        future.add_done_callback(lambda f: self._on_future_done(name, f))

    def _on_done(self, task: asyncio.Task) -> None:
        self._tasks.discard(task)
        if task.cancelled():
            return
        exc = task.exception()
        if exc is not None:
            # Stage failures are persisted on the LoopRun by the orchestrator;
            # this is the last-resort log for anything that escaped it.
            logger.exception("Background task %s failed", task.get_name(), exc_info=exc)

    def _on_future_done(self, name: str, future) -> None:
        if future.cancelled():
            return
        exc = future.exception()
        if exc is not None:
            logger.exception("Background task %s failed", name, exc_info=exc)


class CeleryTaskRunner:
    """Production adapter: dispatch loop stages to Celery workers over Redis.

    TODO(production): wire a Celery app::

        celery_app = Celery("cyclowareness", broker=settings.redis_url)

    and register ``run_loop_stages`` as a task that re-enters the
    orchestrator with the loop_run_id. Enable with TASK_RUNNER=celery and
    `celery -A app.worker worker` alongside Redis (see docker-compose.yml).
    """

    def submit(self, coro: Coroutine[Any, Any, Any], name: str = "task") -> None:
        raise NotImplementedError(
            "CeleryTaskRunner requires the production worker setup. "
            "Set TASK_RUNNER=inprocess for the demo build."
        )


_runner: InProcessTaskRunner | CeleryTaskRunner | None = None


def get_task_runner():
    global _runner
    if _runner is None:
        if get_settings().task_runner == "celery":
            _runner = CeleryTaskRunner()
        else:
            _runner = InProcessTaskRunner()
    return _runner
