"""The GRC watcher: continuous background matching of intel against policy.

The ask: real GRC documents live on the portal, and when something new lands
that touches them, the portal NOTICES on its own and reports the news.

What a scan does — and deliberately does not do:

* For every ACTIVE policy rule that names a technology, it looks through the
  intel feed for items touching that technology (the structured
  ``affected_products`` list first, the title/summary text second).
* A hit becomes an ``IntelMatch`` — the "this advisory matters to us" record
  the intel screen already renders and the analyst can already escalate into
  a real ``PolicyFinding`` with one click. The watcher NEVER raises a finding
  itself: a finding is an obligation against named people, and this product
  does not let a background job create obligations. It surfaces; a person
  decides.
* ``confidence`` on a watcher match is None, never a number — nothing here
  measured anything. The explanation names both sides so the analyst can
  disagree with it.

State is a module-level snapshot (`last_scan`) rather than a table: the scan
is cheap and idempotent, and "when did it last run, what did it find" is a
liveness question, not history. History is the matches themselves.
"""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import get_settings
from ..database import SessionLocal
from .models import (
    IntelItem,
    IntelMatch,
    MatchType,
    PolicyRule,
    RuleStatus,
)

logger = logging.getLogger(__name__)

#: The last completed scan, exposed by GET /api/policy/watch. ``None`` until
#: the first scan finishes — rendered as "has not run yet", never as zeroes.
last_scan: dict[str, Any] | None = None


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _item_mentions(item: IntelItem, technology: str) -> str:
    """Why this item touches this technology, or '' if it does not.

    Structured product entries are checked before prose so the explanation can
    cite the stronger evidence when both would match.
    """
    needle = technology.lower().strip()
    if not needle:
        return ""
    for product in item.affected_products or []:
        if not isinstance(product, dict):
            continue
        hay = f"{product.get('vendor', '')} {product.get('product', '')}".lower()
        if needle in hay:
            versions = product.get("versions") or ""
            return (
                f"The advisory lists an affected product matching '{technology}'"
                + (f" (versions {versions})" if versions else "")
                + "."
            )
    if needle in f"{item.title} {item.summary}".lower():
        return f"The advisory text mentions '{technology}'."
    return ""


def scan_once(db: Session) -> dict[str, Any]:
    """One pass: active technology rules x undismissed intel. Returns the tally."""
    rules = db.scalars(
        select(PolicyRule).where(
            PolicyRule.status == RuleStatus.ACTIVE,
            PolicyRule.technology != "",
        )
    ).all()
    items = db.scalars(
        select(IntelItem)
        .where(IntelItem.dismissed_by.is_(None))
        .order_by(IntelItem.published_at.desc())
        .limit(500)
    ).all()

    existing_pairs = {
        (m.intel_item_id, m.matched_rule_id)
        for m in db.scalars(select(IntelMatch).where(IntelMatch.matched_rule_id.is_not(None)))
    }

    created: list[dict[str, Any]] = []
    for rule in rules:
        for item in items:
            if (item.id, rule.id) in existing_pairs:
                continue
            why = _item_mentions(item, rule.technology)
            if not why:
                continue
            match = IntelMatch(
                intel_item_id=item.id,
                match_type=MatchType.TECHNOLOGY_IN_USE,
                matched_policy_id=rule.policy_id,
                matched_rule_id=rule.id,
                matched_technology=rule.technology,
                matched_version=rule.version_spec,
                confidence=None,
                explanation=(
                    f"GRC watch: {why} The active rule '{rule.rule_key}' governs "
                    f"{rule.technology}"
                    + (f" ({rule.version_spec})" if rule.version_spec else "")
                    + ". Review and escalate to a finding if it applies."
                ),
            )
            db.add(match)
            db.flush()
            existing_pairs.add((item.id, rule.id))
            created.append(
                {
                    "match_id": match.id,
                    "intel_item_id": item.id,
                    "intel_title": item.title,
                    "rule_key": rule.rule_key,
                    "technology": rule.technology,
                }
            )
    db.commit()

    global last_scan
    last_scan = {
        "ran_at": _now().isoformat(),
        "rules_watched": len(rules),
        "items_scanned": len(items),
        "new_matches": created,
    }
    if created:
        logger.info("GRC watch: %d new match(es)", len(created))
        _broadcast(len(created))
    return last_scan


def _broadcast(count: int) -> None:
    """Tell connected clients news arrived. Best-effort — a scan must not die
    because nobody is listening."""
    try:
        from ..core.events import manager

        manager.notify({"type": "grc_watch", "new_matches": count})
    except Exception:  # noqa: BLE001 — notification is optional, the match is not
        logger.debug("GRC watch broadcast skipped", exc_info=True)


async def watch_loop() -> None:
    """The background loop `main.py` submits at startup. Interval from config;
    zero disables the loop entirely (the manual run endpoint still works)."""
    interval = get_settings().grc_watch_interval_seconds
    if interval <= 0:
        logger.info("GRC watch disabled (interval <= 0)")
        return
    logger.info("GRC watch running every %ss", interval)
    while True:
        await asyncio.sleep(interval)
        try:
            db = SessionLocal()
            try:
                scan_once(db)
            finally:
                db.close()
        except Exception:  # noqa: BLE001 — the loop must survive a bad scan
            logger.exception("GRC watch scan failed; will retry next interval")
