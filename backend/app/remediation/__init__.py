"""The Remediation Engine — Tier 1.

A service the loop CALLS, not an eighth stage. It answers one question: given a
signal that a specific person did a specific thing, what — if anything — should
be attached to them, and from where.

The pieces, in the order they run:

    triggers.py    one RiskSignal schema, one adapter per source
    catalogue.py   deterministic, code-owned retrieval — the model never searches
    service.py     the decision, and the three outcomes it may reach
    firewall.py    the output firewall; nothing reaches a learner around it
    models.py      RemediationPlan, CoverageGap, ControlGapFinding

What Tier 1 deliberately does NOT do: embeddings, LMS write-back, SCORM, a
connector fleet, automated external ingestion. See docs/REMEDIATION-ENGINE.md §15.
"""
