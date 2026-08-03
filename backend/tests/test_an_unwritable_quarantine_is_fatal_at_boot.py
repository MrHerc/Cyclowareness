"""A deployment fault should be fatal at startup, not a mystery on every request.

Without the check, an unwritable quarantine produces the worst possible shape of
failure: the service boots, `/api/health` answers 200, the whole UI loads, and
every file upload and every URL submission returns a bare
`500 Internal Server Error`. `routers/sandbox.py` catches `SampleTooLarge` and
`EmptySample`; the `PermissionError` raised inside `storage.store_stream` is
uncaught. No job row is created, nothing reaches the queue, and the cause sits
in the container log where the analyst using the product cannot see it.

The shipped configuration cannot reach this — the image runs as root against
container-local `/tmp`. The live route in is DEPLOY.md, which tells the operator
to attach a Render disk and point `SANDBOX_QUARANTINE` at its mount path. A
mistyped path, an unattached disk or a read-only mount lands exactly here.
"""
from __future__ import annotations

import os
import stat
import sys

import pytest

from app.main import _check_quarantine_is_writable


def test_a_writable_quarantine_passes(tmp_path, monkeypatch):
    """The check must be inert in the normal case, or it becomes the fault."""
    monkeypatch.setenv("SANDBOX_QUARANTINE", str(tmp_path / "q"))
    _check_quarantine_is_writable()


@pytest.mark.skipif(
    sys.platform == "win32",
    reason=(
        "POSIX mode bits do not govern writability on Windows: chmod 0o500 on a "
        "directory still permits creating files in it, so the unwritable state "
        "this test needs cannot be produced here. The condition is real on the "
        "Linux container the product actually runs on, and CI is Linux."
    ),
)
def test_an_unwritable_quarantine_refuses_the_boot(tmp_path, monkeypatch):
    root = tmp_path / "readonly"
    root.mkdir()
    os.chmod(root, stat.S_IRUSR | stat.S_IXUSR)  # r-x, no write
    monkeypatch.setenv("SANDBOX_QUARANTINE", str(root))
    try:
        with pytest.raises(RuntimeError) as caught:
            _check_quarantine_is_writable()
    finally:
        os.chmod(root, stat.S_IRWXU)

    message = str(caught.value)
    assert str(root) in message, "the error must name the path an operator has to fix"
    assert "500" in message, (
        "the error must state the consequence — an operator reading it at boot "
        "needs to know this is not cosmetic"
    )


def test_a_quarantine_path_that_cannot_be_a_directory_refuses_the_boot(tmp_path, monkeypatch):
    """The same failure, reachable on every platform.

    The permission test above can only run on POSIX, so on Windows the error
    path would otherwise be exercised nowhere at all and the message could rot
    unnoticed between CI runs. Pointing the variable at an existing FILE makes
    `mkdir` raise an OSError on any platform.
    """
    occupied = tmp_path / "not-a-directory"
    occupied.write_bytes(b"")
    monkeypatch.setenv("SANDBOX_QUARANTINE", str(occupied))

    with pytest.raises(RuntimeError) as caught:
        _check_quarantine_is_writable()

    message = str(caught.value)
    assert str(occupied) in message
    assert "500" in message


def test_the_check_runs_before_anything_can_be_submitted():
    """Ordering is the point. Called after the first upload it would be useless,
    and called before `run_migrations()` it would fail on a database that has
    not been built yet."""
    import ast
    import inspect

    from app import main

    source = inspect.getsource(main)
    tree = ast.parse(source)
    lifespan = next(
        n for n in ast.walk(tree)
        if isinstance(n, ast.AsyncFunctionDef) and n.name == "lifespan"
    )
    called: list[str] = []
    for node in ast.walk(lifespan):
        if isinstance(node, ast.Call) and isinstance(node.func, ast.Name):
            called.append(node.func.id)

    assert "_check_quarantine_is_writable" in called, "the check is never called"
    assert called.index("run_migrations") < called.index("_check_quarantine_is_writable")
