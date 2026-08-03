"""Every `ENV` in the Dockerfile must name something the application reads.

The image baked `ENV ZORBOX_QUARANTINE=/tmp/zorbox-quarantine`. Nothing reads
that name: `engine/storage.py::quarantine_root` reads `SANDBOX_QUARANTINE` and
nothing else. The live deployment escaped only because `render.yaml` supplies
the correct variable — but the comment above the line told an operator to mount
a Render disk and point `ZORBOX_QUARANTINE` at it, so anyone following the file
to persist samples kept a quarantine on ephemeral `/tmp` and lost every sample
on redeploy, with nothing reporting a fault.

That is the failure shape worth a test: a variable that does nothing fails
SILENTLY and looks configured. `render.yaml` masking it made the defect
invisible on the one deployment anybody was watching.

The rename this survived was supposed to reach everywhere; the Dockerfile was
the single place it did not, and no test could tell.
"""
from __future__ import annotations

import pathlib
import re

BACKEND = pathlib.Path(__file__).resolve().parents[1]
REPO = BACKEND.parent

#: Names the runtime legitimately sets without any of our code reading them —
#: they are consumed by the interpreter, the package manager or the platform.
_NOT_OURS = {
    "PYTHONDONTWRITEBYTECODE",
    "PYTHONUNBUFFERED",
    "PYTHONPATH",
    "PIP_NO_CACHE_DIR",
    "PIP_DISABLE_PIP_VERSION_CHECK",
    "PORT",
    "PATH",
    "NODE_ENV",
    "DEBIAN_FRONTEND",
    "TZ",
    "LANG",
    "LC_ALL",
}


def _declared_env(dockerfile: str) -> set[str]:
    """Every variable the image sets with `ENV NAME=value`."""
    names: set[str] = set()
    for line in dockerfile.splitlines():
        stripped = line.strip()
        if not stripped.upper().startswith("ENV "):
            continue
        # `ENV A=1 B=2` is legal, and so is `ENV A 1` (legacy). Both are read.
        body = stripped[4:].strip()
        for token in body.split():
            if "=" in token:
                names.add(token.split("=", 1)[0])
            elif not names or token.isidentifier():
                names.add(token)
                break
    return {n for n in names if n and n not in _NOT_OURS}


def test_every_env_the_image_bakes_is_read_by_the_application():
    dockerfile = (REPO / "Dockerfile").read_text(encoding="utf-8")
    declared = _declared_env(dockerfile)
    assert declared, "no ENV found — the parser is broken, not the Dockerfile"

    # Everything the application could read: pydantic Settings fields become
    # env names upper-cased, plus anything read straight from os.environ.
    from app.config import Settings

    readable = {name.upper() for name in Settings.model_fields}
    source = "\n".join(
        p.read_text(encoding="utf-8", errors="ignore")
        for p in (BACKEND / "app").rglob("*.py")
    )
    readable |= set(re.findall(r"environ(?:\.get)?\(\s*[\"']([A-Z_][A-Z0-9_]*)[\"']", source))
    readable |= set(re.findall(r"getenv\(\s*[\"']([A-Z_][A-Z0-9_]*)[\"']", source))

    dead = sorted(declared - readable)
    assert not dead, (
        f"the image sets {dead}, which no code reads. A variable that does "
        f"nothing fails silently and looks configured — and the comment beside "
        f"it tells an operator to configure the deployment with it."
    )


def test_the_quarantine_variable_is_the_one_the_engine_reads():
    """Named explicitly, because this is the one that already went wrong.

    Stated as an equality against the engine's own reader rather than against a
    literal, so renaming the variable in the engine fails here until the image
    follows.
    """
    dockerfile = (REPO / "Dockerfile").read_text(encoding="utf-8")
    storage = (BACKEND / "app" / "sandbox" / "engine" / "storage.py").read_text(encoding="utf-8")

    read_by_engine = set(
        re.findall(r"environ\.get\(\s*[\"']([A-Z_]*QUARANTINE)[\"']", storage)
    )
    assert read_by_engine, "storage.py no longer reads a *QUARANTINE variable"

    set_by_image = {n for n in _declared_env(dockerfile) if n.endswith("QUARANTINE")}
    assert set_by_image == read_by_engine, (
        f"the image sets {sorted(set_by_image)} while the engine reads "
        f"{sorted(read_by_engine)}"
    )


def test_no_zorbox_name_survives_in_anything_the_image_executes():
    """The rename was declared complete while the Dockerfile still carried it in
    three places, including a live `ENV`.

    COMMENTS ARE STRIPPED FIRST. The line that fixed this explains what the dead
    variable was called, and a blanket substring ban makes the explanation
    illegal — the same trap `test_migrations.py` hit, where the dialect traps are
    discussed in the very migrations that avoid them. What must be clean is what
    the image and the blueprint actually DO.
    """
    for name in ("Dockerfile", "render.yaml"):
        text = (REPO / name).read_text(encoding="utf-8")
        operative = "\n".join(
            line for line in text.splitlines() if not line.lstrip().startswith("#")
        )
        assert "zorbox" not in operative.lower(), (
            f"{name} still names ZORBOX in a line that executes, not merely in a "
            f"comment describing the rename"
        )
