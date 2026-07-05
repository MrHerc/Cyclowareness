"""Real-time event fan-out for the live loop (spec §10: watch the loop turn).

A tiny in-process pub/sub over WebSockets. The orchestrator calls ``notify``
on every loop-stage transition; connected dashboards receive it instantly and
refresh, instead of waiting for the next poll. Polling remains the fallback,
so a dropped socket never loses updates.
"""
import asyncio
import logging

logging.getLogger("cyclowareness.events")


class ConnectionManager:
    def __init__(self) -> None:
        self.active: set = set()
        self._loop: asyncio.AbstractEventLoop | None = None

    def attach_loop(self, loop: asyncio.AbstractEventLoop) -> None:
        self._loop = loop

    async def connect(self, websocket) -> None:
        await websocket.accept()
        self.active.add(websocket)

    def disconnect(self, websocket) -> None:
        self.active.discard(websocket)

    async def broadcast(self, message: dict) -> None:
        dead = []
        for ws in list(self.active):
            try:
                await ws.send_json(message)
            except Exception:  # noqa: BLE001 — a dead socket, drop it
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)

    def notify(self, message: dict) -> None:
        """Fire-and-forget broadcast, safe to call from sync or async code.

        Schedules the coroutine on the API event loop captured at startup.
        Never blocks the caller and never raises into loop logic.
        """
        loop = self._loop
        if loop is None or not self.active:
            return
        try:
            asyncio.run_coroutine_threadsafe(self.broadcast(message), loop)
        except RuntimeError:
            pass


manager = ConnectionManager()


def notify_loop(run_id: int, stage: int, status: str) -> None:
    manager.notify({"type": "loop_update", "run_id": run_id, "stage": stage, "status": status})
