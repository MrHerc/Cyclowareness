"""WebSocket endpoint streaming live loop-stage updates to the dashboard."""
import asyncio
import json

import jwt
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from ..config import get_settings
from ..core.events import manager
from ..security import ALGORITHM

router = APIRouter(tags=["realtime"])
settings = get_settings()

AUTH_TIMEOUT_SECONDS = 5.0


@router.websocket("/api/ws")
async def loop_stream(websocket: WebSocket):
    """Authenticated stream of loop-update events.

    The token arrives in the FIRST FRAME, never in the query string.

    A browser cannot set headers on a WebSocket handshake, so the token used to
    ride in the URL — where uvicorn's access log wrote it verbatim on every
    connection, as does every proxy and load balancer in front of it. These
    tokens are valid for twelve hours, which made a log file a folder of live
    analyst credentials. The handshake URL now carries nothing secret: the
    socket is accepted, and the client must present its token within
    AUTH_TIMEOUT_SECONDS or the connection is closed unauthenticated.

    Any valid token may listen — updates carry no sensitive payload, only the
    run id / stage / status that drive a dashboard refresh.
    """
    await websocket.accept()

    try:
        raw = await asyncio.wait_for(websocket.receive_text(), timeout=AUTH_TIMEOUT_SECONDS)
        token = json.loads(raw).get("token") or ""
        jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])
    except (
        asyncio.TimeoutError,
        WebSocketDisconnect,
        json.JSONDecodeError,
        AttributeError,
        jwt.PyJWTError,
    ):
        await websocket.close(code=1008)  # policy violation
        return

    # Already accepted above, so register directly rather than via
    # manager.connect(), which would accept a second time.
    manager.active.add(websocket)
    try:
        await websocket.send_json({"type": "connected"})
        while True:
            # No further client messages are expected; this keeps the socket
            # open and detects disconnects.
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:  # noqa: BLE001
        manager.disconnect(websocket)
