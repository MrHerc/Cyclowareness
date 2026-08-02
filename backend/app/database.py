"""Database session management, and the one path by which schema reaches a database.

SQLAlchemy 2.0, driven entirely by ``DATABASE_URL``: SQLite for zero-setup
dev/demo, PostgreSQL (psycopg) in production.

**The schema is owned by Alembic, not by ``create_all()``.** That is not a
preference. ``create_all()`` CREATES a table it has never seen and does nothing
at all to one it has, so a release that adds a column to an existing table
reports success and leaves the column missing. Reproduced on this codebase, on a
copy of the pre-integration schema, when the sandbox engine was swapped in::

    create_all() completed without error
    QUERY FAILED -> OperationalError
       (sqlite3.OperationalError) no such column: sandbox_jobs.tenant_id

``/api/health`` answered 200 throughout. The deployed instance escaped only
because it runs SQLite on an ephemeral disk and gets a fresh database on every
redeploy — luck, and luck that ends the day it moves to the PostgreSQL its own
production config requires.
"""
from __future__ import annotations

from collections.abc import Generator
from pathlib import Path

from sqlalchemy import Connection, create_engine, inspect
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from .config import get_settings

settings = get_settings()

#: The backend root — holds alembic.ini and migrations/. Resolved from this file
#: rather than from the working directory, because the container starts uvicorn
#: from /app while an operator may run a command from anywhere.
BACKEND_DIR = Path(__file__).resolve().parent.parent

connect_args = {}
if settings.database_url.startswith("sqlite"):
    # Background loop tasks and request handlers share the SQLite file.
    connect_args = {"check_same_thread": False}

engine = create_engine(settings.database_url, connect_args=connect_args)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency: one session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def session_scope() -> Session:
    """A fresh session for background tasks (caller must close)."""
    return SessionLocal()


# --- migrations ---------------------------------------------------------------

#: The first revision. A database created before Alembic existed matches it
#: exactly, which is what makes adopting one by stamping it safe.
BASELINE_REVISION = "0001_baseline"

#: The revision that swapped in the vendored sandbox engine.
SANDBOX_ENGINE_REVISION = "0002_sandbox_engine"

#: The revision that split behaviour_risk out of the composite score.
BEHAVIOUR_SPLIT_REVISION = "0003_behaviour_split"

#: Newest revision first. A pre-Alembic database is stamped at the first entry
#: whose marker columns are ALL present, then upgraded from there.
#:
#: A ladder rather than a chain of ifs because it has to be EXTENDED, not
#: rewritten, and forgetting to extend it is not a cosmetic miss: the database
#: gets stamped too low, the next migration re-adds a column that already
#: exists, and the service fails to boot. That is not hypothetical — it happened
#: the moment 0003 landed, because this ladder was keyed on `sandbox_jobs`
#: alone and 0003 touches `employees`:
#:
#:     sqlite3.OperationalError: duplicate column name: behaviour_risk
#:     [SQL: ALTER TABLE employees ADD COLUMN behaviour_risk FLOAT]
#:
#: So a rung names TABLES, not one table. **Every revision that adds a column to
#: any table adds a rung here, naming that table and the columns it added.**
_ADOPTION_LADDER: tuple[tuple[str, dict[str, set[str]]], ...] = (
    (BEHAVIOUR_SPLIT_REVISION, {"employees": {"behaviour_risk", "training_credit"}}),
    (
        SANDBOX_ENGINE_REVISION,
        {"sandbox_jobs": {"tenant_id", "impact", "verdict", "mitre", "dynamic"}},
    ),
)


class UnadoptableDatabase(RuntimeError):
    """The database holds tables, but not a shape any revision describes.

    Refusing is the only safe answer. Stamping a revision that does not match
    tells Alembic a migration has run when it has not, and the next upgrade then
    alters columns that are not there — which corrupts rather than fails.
    """


def alembic_config():
    """The Alembic configuration the service and the CLI share."""
    from alembic.config import Config

    return Config(str(BACKEND_DIR / "alembic.ini"))


def _legacy_stamp_target(connection: Connection) -> str | None:
    """Which revision an un-versioned database already satisfies, if any.

    Installs made before Alembic have the tables but no ``alembic_version``, so
    ``upgrade head`` would try to CREATE a table that exists and abort the boot.
    Reading the columns tells us which release built them, so the database can be
    stamped at that point and then upgraded — the same two steps an operator
    would run by hand, minus the outage while they work out which one.

    Returns ``None`` when there is nothing to adopt: an empty database (the
    migrations build it) or one Alembic already manages.
    """
    tables = set(inspect(connection).get_table_names())
    if "alembic_version" in tables:
        return None
    if not tables:
        return None
    if "sandbox_jobs" not in tables:
        # Tables, but not the one every revision in the ladder is dated by. This
        # is a database older than anything modelled here, or not ours at all.
        raise UnadoptableDatabase(
            "This database holds tables but no `alembic_version`, and no "
            "`sandbox_jobs` table to date it by, so there is no revision it can "
            "honestly be stamped at. Refusing rather than guessing: stamping the "
            "wrong revision would make the next upgrade alter columns that are "
            "not there. Inspect it and run `alembic stamp <revision>` by hand. "
            f"Tables found: {', '.join(sorted(tables))}"
        )

    inspector = inspect(connection)
    for revision, markers in _ADOPTION_LADDER:
        if all(
            table in tables and columns <= {c["name"] for c in inspector.get_columns(table)}
            for table, columns in markers.items()
        ):
            return revision
    return BASELINE_REVISION


def run_migrations() -> None:
    """Bring the database to the current schema, creating it if it is empty.

    Migrations run on the engine this process already owns rather than on a
    connection Alembic opens for itself: on SQLite the two would contend for the
    same write lock and the boot would hang instead of failing loudly.
    """
    from alembic import command

    config = alembic_config()
    with engine.begin() as connection:
        config.attributes["connection"] = connection
        stamp_target = _legacy_stamp_target(connection)
        if stamp_target is not None:
            command.stamp(config, stamp_target)
        command.upgrade(config, "head")
