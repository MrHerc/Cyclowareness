"""The Cyclowareness Sandbox, as embedded in the portal.

`engine/` is a verbatim copy of the standalone product's analysis engine; the
modules beside it are the seam that lets it run here unmodified. See `db.py` for
the rule that governs what may be added to that seam.

`__version__` is the engine's, not the portal's: it is stamped into the engine
manifest of every signed report, and it answers "which analyser produced this
verdict" — a question about the engine.
"""

__version__ = "1.0.0"
