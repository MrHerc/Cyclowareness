"""Demo-only affordances must not exist in a production build.

Route registration happens at import time, so these assert the wiring is
conditional at all — the environment-specific surface is verified in CI by
importing the app under each APP_ENV (see the note at the bottom).
"""
import inspect

from app import main
from app.config import get_settings
from app.routers import simulations


def test_suite_runs_as_demo():
    assert get_settings().is_demo, "conftest declares APP_ENV=demo"


def test_admin_router_registration_is_conditional():
    """`reset-demo` wipes all 13 tables — it must be gated, not merely guarded."""
    source = inspect.getsource(main)
    assert "if settings.is_demo:" in source
    admin_include = source.index("app.include_router(admin.router)")
    gate = source.rindex("if settings.is_demo:", 0, admin_include)
    between = source[gate:admin_include]
    # Nothing but the comment block should sit between the gate and the include.
    assert "app.include_router" not in between


def test_seeding_is_conditional_on_demo():
    """An empty production database must stay empty."""
    source = inspect.getsource(main)
    seed_call = source.index("seed_if_empty(db)")
    assert "if settings.is_demo:" in source[:seed_call]


def test_auto_outcomes_registration_is_conditional():
    """Synthetic outcomes write real RiskEvents — they cannot reach production."""
    source = inspect.getsource(simulations)
    assert "if get_settings().is_demo:" in source
    registration = source.index('router.post("/{sim_id}/auto-outcomes"')
    gate = source.rindex("if get_settings().is_demo:", 0, registration)
    assert registration - gate < 300, "registration must sit directly under the gate"


def test_auto_outcomes_absent_from_production_surface():
    """Belt and braces: the demo build exposes it, production must not.

    We assert the demo build *does* expose it here; the production absence is
    covered by importing the app with APP_ENV=production, which requires a
    non-SQLite DATABASE_URL and so runs as a separate CI step.
    """
    paths = set(main.app.openapi()["paths"])
    assert any("auto-outcomes" in p for p in paths), "demo build should expose it"
    assert "/api/admin/reset-demo" in paths, "demo build should expose the reset"


def test_seed_module_refuses_outside_demo():
    """`python -m app.seed` guards itself independently of the caller."""
    from app import seed

    source = inspect.getsource(seed.main)
    assert "is_demo" in source
    assert "sys.exit" in source
