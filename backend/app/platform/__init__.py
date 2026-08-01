"""The organisational layer: policy, intel, incident risk, integrations, audit.

The loop (``app.models``) reasons about people and the threats that reach them.
This package reasons about the *organisation* around them — what it said it
allows, what the outside world has just published about that, what incident
response has charged a named employee with, which external LMS the training
actually lives in, and who changed any of it.

Nothing here writes to an existing table. Every domain is additive-by-table for
the same reason ZORBOX is: ``create_all()`` will CREATE a table it has never
seen and silently ignore a column added to a table it already has, and there is
no Alembic yet.
"""
