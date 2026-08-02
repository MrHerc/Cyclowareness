"""Alembic environment.

The URL comes from the application's own settings, never from `alembic.ini`.
Two configurations that disagree about which database they point at is a way to
run a migration against the wrong one, and the failure mode is silent until
somebody reads the rows.

The imports below register every table on `Base.metadata`. That list IS the
autogenerate scope: a model module missing from it produces revisions that
neither add nor drop anything for those tables, and `alembic check` then reports
a schema in sync that it never looked at.
"""
from __future__ import annotations

from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

from app.config import get_settings
from app.database import Base

# Imported for the side effect of registering tables, not for a name.
import app.models  # noqa: F401
import app.platform.models  # noqa: F401
import app.sandbox.links  # noqa: F401
from app.sandbox.engine import models as _sandbox_engine_models  # noqa: F401

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def _url() -> str:
    return get_settings().database_url


def _configure(**kwargs) -> None:
    """Options every run shares, whichever way the connection arrives.

    `render_as_batch` is what makes SQLite work at all: it has no general ALTER,
    so Alembic rebuilds the table instead. Without it every column drop, and most
    type changes, fail on the dev/demo database while passing on PostgreSQL.

    `compare_type` is what makes `alembic check` mean something. Off (the
    default), a column whose type changed in `models.py` produces no diff, so CI
    reports the schema is in sync when it is not.
    """
    context.configure(
        target_metadata=target_metadata,
        render_as_batch=True,
        compare_type=True,
        **kwargs,
    )


def run_migrations_offline() -> None:
    """Emit SQL without a live database (`alembic upgrade --sql`)."""
    _configure(url=_url(), literal_binds=True, dialect_opts={"paramstyle": "named"})
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run against a live database.

    When the application drives migrations at boot it hands its OWN connection
    in through `config.attributes`. Opening a second one here would contend with
    it for the same SQLite write lock, and the boot would hang rather than fail
    loudly.
    """
    connection = config.attributes.get("connection", None)

    if connection is not None:
        _configure(connection=connection)
        with context.begin_transaction():
            context.run_migrations()
        return

    section = config.get_section(config.config_ini_section, {})
    section["sqlalchemy.url"] = _url()
    engine = engine_from_config(section, prefix="sqlalchemy.", poolclass=pool.NullPool)
    with engine.connect() as conn:
        _configure(connection=conn)
        with context.begin_transaction():
            context.run_migrations()
    engine.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
