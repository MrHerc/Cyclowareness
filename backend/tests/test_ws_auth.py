"""The live-loop WebSocket authenticates in-band, not through the URL."""
import jwt
import pytest
from fastapi.testclient import TestClient
from starlette.websockets import WebSocketDisconnect

from app.security import ALGORITHM


@pytest.fixture
def token(client: TestClient) -> str:
    r = client.post(
        "/api/auth/login",
        json={"email": "analyst@caspiandynamics.az", "password": "analyst123"},
    )
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


def test_a_valid_token_in_the_first_frame_connects(client: TestClient, token: str):
    with client.websocket_connect("/api/ws") as ws:
        ws.send_json({"token": token})
        assert ws.receive_json() == {"type": "connected"}


def test_a_token_supplied_only_in_the_url_is_refused(client: TestClient, token: str):
    """Regression: the token rode in the query string, so uvicorn's access log —
    and every proxy in front of it — recorded a live 12-hour analyst credential
    on every dashboard load. The URL is no longer a credential channel."""
    with pytest.raises(WebSocketDisconnect):
        with client.websocket_connect(f"/api/ws?token={token}") as ws:
            ws.send_json({})
            ws.receive_json()


def test_a_forged_token_is_rejected(client: TestClient):
    forged = jwt.encode({"sub": "1", "role": "analyst"}, "not-the-secret", algorithm=ALGORITHM)
    with pytest.raises(WebSocketDisconnect):
        with client.websocket_connect("/api/ws") as ws:
            ws.send_json({"token": forged})
            ws.receive_json()


def test_a_malformed_first_frame_is_rejected(client: TestClient):
    with pytest.raises(WebSocketDisconnect):
        with client.websocket_connect("/api/ws") as ws:
            ws.send_text("not json")
            ws.receive_json()
