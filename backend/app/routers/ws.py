"""WebSocket endpoint streaming live loop-stage updates to the dashboard."""
import jwt
from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect

from ..config import get_settings
from ..core.events import manager
from ..security import ALGORITHM

router = APIRouter(tags=["realtime"])
settings = get_settings()


@router.websocket("/api/ws")
async def loop_stream(websocket: WebSocket, token: str = Query(default="")):
    """Authenticated stream of loop-update events.

    The JWT is passed as a query param (browsers can't set WebSocket headers).
    Any valid token may listen — updates carry no sensitive payload, only the
    run id / stage / status that drive a dashboard refresh.
    """
    try:
        jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])
    except jwt.PyJWTError:
        await websocket.close(code=1008)  # policy violation
        return

    await manager.connect(websocket)
    try:
        await websocket.send_json({"type": "connected"})
        while True:
            # We don't expect client messages; this keeps the socket open and
            # detects disconnects.
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:  # noqa: BLE001
        manager.disconnect(websocket)
