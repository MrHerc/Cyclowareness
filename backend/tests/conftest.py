"""Shared test fixtures.

A dedicated in-memory-ish SQLite file DB is created per test session, seeded
with the demo world, and torn down after. Stage delays are zeroed so the async
loop completes instantly in tests.
"""
import os

# Must be set before app modules import settings / build the engine.
# The suite runs against SQLite with a throwaway key, which the production
# config validator rightly refuses — so tests declare themselves as the demo
# environment. (test_config.py covers the production guard explicitly.)
os.environ["APP_ENV"] = "demo"
os.environ["DATABASE_URL"] = "sqlite:///./test_cyclowareness.db"
os.environ["STAGE_DELAY_ANALYZE"] = "0"
os.environ["STAGE_DELAY_CONVERT"] = "0"
os.environ["STAGE_DELAY_TARGET"] = "0"
os.environ["SECRET_KEY"] = "test-secret"
os.environ["SANDBOX_ANALYZER"] = "mock"
os.environ["ANTHROPIC_API_KEY"] = ""  # force deterministic mock AI

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.database import Base, SessionLocal, engine  # noqa: E402
from app.main import app  # noqa: E402
from app.seed import seed_if_empty  # noqa: E402


@pytest.fixture(scope="session", autouse=True)
def _database():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_if_empty(db)
    finally:
        db.close()
    yield
    Base.metadata.drop_all(bind=engine)
    try:
        os.remove("./test_cyclowareness.db")
    except OSError:
        pass


@pytest.fixture
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


def _token(client: TestClient, email: str, password: str) -> str:
    r = client.post("/api/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.fixture
def analyst_headers(client):
    return {"Authorization": f"Bearer {_token(client, 'analyst@caspiandynamics.az', 'analyst123')}"}


@pytest.fixture
def employee_headers(client):
    return {"Authorization": f"Bearer {_token(client, 'rashad.mammadov@caspiandynamics.az', 'demo123')}"}
