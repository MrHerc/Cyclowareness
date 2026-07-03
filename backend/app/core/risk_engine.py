"""Risk Scoring Engine (spec §6.5).

Transparent, weighted, explainable — NOT a black box. Every score movement
is a persisted ``RiskEvent`` (the audit trail), and the current score is the
input to the loop's TARGET stage.

Score range: 0 (safest) … 100 (highest risk).

Signals and their weights (documented; keep this table in sync with README):

    simulated_phish_click     +12.0   clicked a simulated phishing lure
    simulated_phish_report     -5.0   reported a simulated phish (good!)
    real_threat_report         -4.0   reported a real suspicious artifact
    real_threat_exposure       +8.0   was a target of a real analyzed threat
    training_completed         -4.0   base credit for completing a module
    training_comprehension     -6.0   × (quiz score / 100), on top of base
    training_failed            +3.0   completed but failed the quiz (<60%)
    training_ignored           +4.0   assignment expired uncompleted
    manual_adjustment           ±x    analyst override (reason required)

Role sensitivity sets the baseline: base = 20 + role_sensitivity * 20.
Scores are clamped to [0, 100].
"""
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..models import Department, Employee, RiskEvent

WEIGHTS: dict[str, float] = {
    "simulated_phish_click": 12.0,
    "simulated_phish_report": -5.0,
    "real_threat_report": -4.0,
    "real_threat_exposure": 8.0,
    "training_completed": -4.0,
    "training_comprehension": -6.0,   # scaled by quiz score
    "training_failed": 3.0,
    "training_ignored": 4.0,
}

HIGH_RISK_THRESHOLD = 60.0


def clamp(score: float) -> float:
    return max(0.0, min(100.0, round(score, 1)))


def baseline_for(employee: Employee) -> float:
    return 20.0 + employee.role_sensitivity * 20.0


def apply_event(
    db: Session,
    employee: Employee,
    event_type: str,
    reason: str,
    loop_run_id: int | None = None,
    delta_override: float | None = None,
    scale: float = 1.0,
) -> RiskEvent:
    """Apply a scoring signal: persist the RiskEvent and move the score.

    ``scale`` lets callers scale a weighted signal (e.g. comprehension by
    quiz score); ``delta_override`` is for analyst manual adjustments.
    """
    if delta_override is not None:
        delta = delta_override
    else:
        delta = WEIGHTS.get(event_type, 0.0) * scale

    delta = round(delta, 2)
    event = RiskEvent(
        employee_id=employee.id,
        type=event_type,
        delta=delta,
        reason=reason,
        loop_run_id=loop_run_id,
    )
    db.add(event)
    employee.current_risk_score = clamp(employee.current_risk_score + delta)
    db.add(employee)
    return event


def risk_breakdown(db: Session, employee: Employee, limit_events: int = 200) -> list[dict]:
    """Explainable factor breakdown: baseline + net contribution per signal type."""
    rows = db.execute(
        select(RiskEvent.type, func.sum(RiskEvent.delta), func.count(RiskEvent.id))
        .where(RiskEvent.employee_id == employee.id)
        .group_by(RiskEvent.type)
    ).all()
    breakdown = [
        {
            "factor": "baseline_role_sensitivity",
            "label": "Role sensitivity baseline",
            "contribution": round(baseline_for(employee), 1),
            "events": 0,
        }
    ]
    for type_, total, count in rows:
        breakdown.append(
            {
                "factor": type_,
                "label": type_.replace("_", " ").capitalize(),
                "contribution": round(total or 0.0, 1),
                "events": count,
            }
        )
    breakdown.sort(key=lambda item: -abs(item["contribution"]))
    return breakdown


def department_rollups(db: Session) -> list[dict]:
    """Department-level risk roll-ups for the dashboard heatmap."""
    departments = db.execute(select(Department)).scalars().all()
    rollups = []
    for dept in departments:
        employees = db.execute(
            select(Employee).where(Employee.department_id == dept.id)
        ).scalars().all()
        if not employees:
            continue
        scores = [e.current_risk_score for e in employees]
        rollups.append(
            {
                "id": dept.id,
                "name": dept.name,
                "avg_risk": round(sum(scores) / len(scores), 1),
                "employee_count": len(employees),
                "high_risk_count": sum(1 for s in scores if s >= HIGH_RISK_THRESHOLD),
            }
        )
    rollups.sort(key=lambda r: -r["avg_risk"])
    return rollups


def select_targets(
    db: Session,
    threat_type: str | None,
    artifact_meta: dict,
    reporter_id: int | None,
    max_targets: int = 8,
) -> list[dict]:
    """TARGET stage (spec §2.4): pick the employees most at risk from THIS
    threat — never a blast to everyone. Returns explainable rationale.

    Selection signals, in priority order:
      1. direct targets  — the artifact was addressed to / received by them
      2. exposed dept    — their department matches the threat's target profile
      3. repeat clickers — recent simulated-phish clicks (same behaviour class)
      4. high risk score — current score >= HIGH_RISK_THRESHOLD
    The reporter is included with a lighter 'reinforcement' rationale only if
    they clicked before reporting (they are the sensor, not the failure).
    """
    employees = db.execute(select(Employee)).scalars().all()
    by_id = {e.id: e for e in employees}
    candidates: dict[int, list[str]] = {}

    def add(emp_id: int, reason: str):
        if emp_id not in by_id:
            return
        candidates.setdefault(emp_id, [])
        if reason not in candidates[emp_id]:
            candidates[emp_id].append(reason)

    # 1. Direct targets named on the artifact
    for emp_id in artifact_meta.get("targeted_employee_ids", []) or []:
        add(emp_id, "Directly targeted by this artifact")
    targeted_emails = {
        e.lower() for e in (artifact_meta.get("recipients") or []) if isinstance(e, str)
    }
    if targeted_emails:
        for emp in employees:
            if emp.email.lower() in targeted_emails:
                add(emp.id, "Received this artifact")

    # 2. Exposed departments (threat metadata or threat-type heuristics)
    dept_names = {d.name.lower(): d.id for d in db.execute(select(Department)).scalars()}
    exposed_dept_ids: set[int] = set()
    for name in artifact_meta.get("targeted_departments", []) or []:
        dept_id = dept_names.get(str(name).lower())
        if dept_id:
            exposed_dept_ids.add(dept_id)
    # BEC / invoice fraud gravitates to Finance; credential phishing to everyone
    if threat_type == "bec" and "finance" in dept_names:
        exposed_dept_ids.add(dept_names["finance"])
    for emp in employees:
        if emp.department_id in exposed_dept_ids:
            add(emp.id, "Works in an exposed department")

    # 3. Recent simulated-phish clickers (behavioural precedent)
    click_rows = db.execute(
        select(RiskEvent.employee_id)
        .where(RiskEvent.type == "simulated_phish_click")
        .order_by(RiskEvent.created_at.desc())
        .limit(50)
    ).scalars().all()
    for emp_id in click_rows:
        add(emp_id, "Recently clicked a simulated phishing lure")

    # 4. High current risk score
    for emp in employees:
        if emp.current_risk_score >= HIGH_RISK_THRESHOLD:
            add(emp.id, f"High risk score ({emp.current_risk_score:.0f})")

    # Reporter handling: they detected it — drop unless multiply-flagged
    if reporter_id in candidates and len(candidates[reporter_id]) <= 1:
        del candidates[reporter_id]
    elif reporter_id in candidates:
        candidates[reporter_id].append("Reinforcement (reported it, but also flagged above)")

    # Rank: more reasons first, then higher risk score. Cap at max_targets.
    ranked = sorted(
        candidates.items(),
        key=lambda kv: (-len(kv[1]), -by_id[kv[0]].current_risk_score),
    )[:max_targets]

    return [
        {
            "employee_id": emp_id,
            "name": by_id[emp_id].name,
            "department_id": by_id[emp_id].department_id,
            "risk_score": by_id[emp_id].current_risk_score,
            "reasons": reasons,
        }
        for emp_id, reasons in ranked
    ]
