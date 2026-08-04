"""Risk Scoring Engine (spec §6.5).

Transparent, weighted, explainable — NOT a black box. Every score movement
is a persisted ``RiskEvent`` (the audit trail), and the current score is the
input to the loop's TARGET stage.

Score range: 0 (safest) … 100 (highest risk).

Signals and their weights (documented; keep this table in sync with README):

    simulated_phish_click     +12.0   clicked a simulated phishing lure
    simulated_phish_report     -5.0   reported a simulated phish (good!)
    real_threat_report         -4.0   reported a real suspicious artifact
    real_threat_exposure        0.0   was targeted by a real threat — recorded, not scored
    training_completed         -4.0   base credit for completing a module
    training_comprehension     -6.0   × (quiz score / 100), on top of base
    training_failed            +3.0   completed but failed the quiz (<60%)
    training_ignored           +4.0   assignment expired uncompleted
    manual_adjustment           ±x    analyst override (reason required)

Role sensitivity sets the baseline: base = 20 + role_sensitivity * 20.
Scores are clamped to [0, 100], and the score is defined as

    baseline + Σ(deltas of every NON-REVOKED event)

so a bad batch can be withdrawn (``revoke_events``) and the score recomputed
from the trail rather than being permanently baked in.
"""
from datetime import datetime, timedelta, timezone

from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from ..models import Department, Employee, EmployeeStatus, RiskEvent

WEIGHTS: dict[str, float] = {
    "simulated_phish_click": 12.0,
    "simulated_phish_report": -5.0,
    "real_threat_report": -4.0,
    # Being SENT a threat is not evidence of human risk — interacting with it is.
    # This weight used to be +8.0, which handed an outsider a write primitive on
    # the score: mail a chosen employee six times and they top the risk heatmap
    # having done nothing, and a single BEC mail to finance charged +8 to every
    # person in the department. The event is still written, because "this threat
    # reached you" is a fact worth showing in the audit trail and it is what
    # justifies TRAINING someone — it just no longer moves the number that claims
    # to measure their behaviour.
    "real_threat_exposure": 0.0,
    "training_completed": -4.0,
    "training_comprehension": -6.0,   # scaled by quiz score
    "training_failed": 3.0,
    "training_ignored": 4.0,
}

#: WHICH SIGNALS ARE EVIDENCE ABOUT THE PERSON, AND WHICH ARE EVIDENCE ABOUT THE
#: PROGRAMME. The split exists because conflating them made the product's central
#: claim circular.
#:
#: Completing assigned training subtracts 10 points between `training_completed`
#: and `training_comprehension`. That is the same number the dashboard charts as
#: proof the training worked. So assigning more training lowered the score,
#: the line went down, and the product reported improvement with no behaviour
#: change anywhere — a self-fulfilling metric, and the kind a buyer's analyst
#: finds in the first hour.
#:
#: `behaviour_risk` moves only on what the person DID when a threat reached them.
#: `training_credit` moves on engagement with the programme. The composite is
#: still shown, because "this person is behind on training" is worth seeing —
#: but efficacy is reported from `behaviour_risk` alone.
BEHAVIOUR_EVENTS = frozenset({
    "simulated_phish_click",
    "simulated_phish_report",
    "real_threat_report",
    "real_threat_exposure",
})

#: Engagement with the training programme. Real, worth tracking, and NOT evidence
#: that anyone is safer — `training_ignored` belongs here too: not doing your
#: e-learning is a fact about compliance, not about whether you click a lure.
ENGAGEMENT_EVENTS = frozenset({
    "training_completed",
    "training_comprehension",
    "training_failed",
    "training_ignored",
})


def component_of(event_type: str) -> str:
    """"behaviour" or "engagement" — which half of the score this signal moves.

    An unknown type counts as engagement, deliberately. A new signal nobody has
    classified must not be able to move the number the product stakes its
    efficacy claim on until someone decides it should.
    """
    return "behaviour" if event_type in BEHAVIOUR_EVENTS else "engagement"


HIGH_RISK_THRESHOLD = 60.0

# How far back a simulated-phish click still counts as "recent" behaviour when
# selecting targets.
RECENT_CLICK_DAYS = 90

# Selection reasons that mean the artifact actually reached this person, and so
# justify RECORDING a `real_threat_exposure` event against them. The event is
# deliberately zero-weighted (see WEIGHTS): it explains why they were selected
# for training, and it does not accuse them of anything.
EXPOSURE_REASONS = (
    "Directly targeted by this artifact",
    "Received this artifact",
    "Works in an exposed department",
)

# Keys in a Threat's artifact_meta that steer who gets selected, and therefore
# who receives a forced assignment. Anything that accepts metadata from an
# unprivileged source must strip these first — see
# routers/reports.py::push_to_loop.
TARGETING_META_KEYS = frozenset(
    {"targeted_employee_ids", "recipients", "targeted_departments"}
)


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

    # Record the delta that was actually APPLIED, not the one that was
    # requested. At the 0/100 rails the two differ, and the difference is
    # silently permanent: an employee already at 100 who clicks again used to
    # get a +12 event that moved nothing, after which
    # baseline + sum(deltas) no longer equalled the score the same screen
    # displayed. The audit trail is the product's claim to being explainable,
    # so it has to reconcile exactly.
    before = employee.current_risk_score
    after = clamp(before + round(delta, 2))
    applied = round(after - before, 2)

    event = RiskEvent(
        employee_id=employee.id,
        type=event_type,
        delta=applied,
        reason=reason,
        loop_run_id=loop_run_id,
    )
    db.add(event)
    employee.current_risk_score = after

    # The same delta, also booked to whichever half of the score it is evidence
    # for. Each half is clamped on its own: the composite rails at 0 and 100, and
    # a component allowed past them would make `behaviour + engagement` stop
    # reconciling with the number beside it.
    if component_of(event_type) == "behaviour":
        employee.behaviour_risk = clamp(employee.behaviour_risk + applied)
    else:
        employee.training_credit = round(employee.training_credit + applied, 2)

    db.add(employee)
    return event


def recompute_score(db: Session, employee: Employee) -> float:
    """Rebuild the score from the trail: baseline + Σ(non-revoked deltas).

    The score is maintained incrementally by ``apply_event`` because that is what
    makes it cheap on a hot path. This is the other half of that bargain: a way
    to derive it from scratch. Without it, one misconfigured connector or one
    poisoned batch is permanent — there is no sequence of API calls that undoes
    it — and a number nobody can withdraw is a number nobody should trust.
    """
    rows = db.execute(
        select(RiskEvent.type, func.sum(RiskEvent.delta)).where(
            RiskEvent.employee_id == employee.id,
            RiskEvent.revoked_at.is_(None),
        ).group_by(RiskEvent.type)
    ).all()

    behaviour = sum(float(total or 0.0) for kind, total in rows if component_of(kind) == "behaviour")
    engagement = sum(float(total or 0.0) for kind, total in rows if component_of(kind) != "behaviour")

    baseline = baseline_for(employee)
    employee.current_risk_score = clamp(baseline + behaviour + engagement)
    # The baseline is a statement about the ROLE — how much damage this person is
    # positioned to do — so it belongs to behaviour, not to engagement. Putting
    # it in engagement would mean a new hire with no training on record started
    # with a negative training credit, which reads as a penalty for having just
    # arrived.
    employee.behaviour_risk = clamp(baseline + behaviour)
    employee.training_credit = round(engagement, 2)
    db.add(employee)
    return employee.current_risk_score


def revoke_events(db: Session, *, source_id: str, reason: str) -> list[Employee]:
    """Withdraw every event a given source wrote, then recompute those scores.

    ``source_id`` identifies the batch or connector that produced them — the
    unit an operator actually wants to undo ("everything that Defender webhook
    wrote last Tuesday"). Events are marked revoked rather than deleted: the
    audit trail must still show that a claim was made and later withdrawn, which
    is a different fact from the claim never having existed.
    """
    events = db.execute(
        select(RiskEvent).where(
            RiskEvent.source_id == source_id, RiskEvent.revoked_at.is_(None)
        )
    ).scalars().all()
    if not events:
        return []

    now = datetime.now(timezone.utc)
    employee_ids = set()
    for event in events:
        event.revoked_at = now
        event.revoked_reason = reason[:500]
        db.add(event)
        employee_ids.add(event.employee_id)

    # The session runs with autoflush=False, so these marks must be pushed before
    # recompute_score's aggregate query — otherwise it sums the very events we
    # just revoked and the score does not move.
    db.flush()

    affected = db.execute(
        select(Employee).where(Employee.id.in_(employee_ids))
    ).scalars().all()
    for employee in affected:
        recompute_score(db, employee)
    return affected


#: Factors that describe where a score STARTED, not what the person did.
#:
#: `baseline_role_sensitivity` is the role's opening position. `baseline_assessment`
#: is the figure an organisation arrives with — the seed writes one so a demo
#: employee's score reconciles with their own audit trail, and no production path
#: creates it (it is absent from `WEIGHTS`, so `apply_event` would move nothing).
#:
#: BOTH WERE BEING RENDERED AS BEHAVIOUR. The employee portal shows a column
#: headed "What is raising it" whose empty state reads "No BEHAVIOUR has pushed
#: your score up", and `baseline_assessment` sat inside it — on the one screen
#: where a named person is told why they are considered a risk. Measured on the
#: demo roster it was not a rounding artefact either: it is present for all 26
#: employees, reaches 43.0 of a 0-100 score, and is the single largest entry for
#: several of them, so most of the roster's leading "reason" for their standing
#: was a starting position mislabelled as something they had done.
#:
#: Classified here rather than in the client so a future non-behavioural factor
#: is grouped correctly by every consumer, not by whichever one remembers.
STARTING_POINT_FACTORS = frozenset({"baseline_role_sensitivity", "baseline_assessment"})

#: Labels that say what a factor IS. `type.replace("_", " ").capitalize()` turned
#: `baseline_assessment` into "Baseline assessment", which reads like a test the
#: person sat.
FACTOR_LABELS = {
    "baseline_assessment": "Carried over from before this platform",
}


def risk_breakdown(db: Session, employee: Employee, limit_events: int = 200) -> list[dict]:
    """Explainable factor breakdown: baseline + net contribution per signal type.

    Each entry carries a `kind`: `starting_point` for where the score began,
    `behaviour` for what moved it. See `STARTING_POINT_FACTORS`.
    """
    rows = db.execute(
        select(RiskEvent.type, func.sum(RiskEvent.delta), func.count(RiskEvent.id))
        .where(RiskEvent.employee_id == employee.id, RiskEvent.revoked_at.is_(None))
        .group_by(RiskEvent.type)
    ).all()
    breakdown = [
        {
            "factor": "baseline_role_sensitivity",
            "label": "Role sensitivity baseline",
            "contribution": round(baseline_for(employee), 1),
            "events": 0,
            "kind": "starting_point",
        }
    ]
    for type_, total, count in rows:
        breakdown.append(
            {
                "factor": type_,
                "label": FACTOR_LABELS.get(type_, type_.replace("_", " ").capitalize()),
                "contribution": round(total or 0.0, 1),
                "events": count,
                "kind": (
                    "starting_point" if type_ in STARTING_POINT_FACTORS else "behaviour"
                ),
            }
        )
    breakdown.sort(key=lambda item: -abs(item["contribution"]))
    return breakdown


def department_rollups(db: Session) -> list[dict]:
    """Department-level risk roll-ups for the dashboard heatmap.

    Aggregated in SQL. This runs on every analyst dashboard poll (one per open
    tab, every few seconds), so the previous shape — one query per department,
    then every employee row pulled into Python — was N+1 plus a full roster
    load on a hot path.
    """
    high_risk = func.sum(
        case((Employee.current_risk_score >= HIGH_RISK_THRESHOLD, 1), else_=0)
    )
    rows = db.execute(
        select(
            Department.id,
            Department.name,
            func.avg(Employee.current_risk_score),
            func.count(Employee.id),
            high_risk,
        )
        # Departed staff must not average into their old department's risk.
        .join(
            Employee,
            (Employee.department_id == Department.id)
            & (Employee.status != EmployeeStatus.LEFT),
        )
        .group_by(Department.id, Department.name)
        .order_by(func.avg(Employee.current_risk_score).desc())
    ).all()

    return [
        {
            "id": dept_id,
            "name": name,
            "avg_risk": round(float(avg or 0.0), 1),
            "employee_count": count,
            "high_risk_count": int(high or 0),
        }
        for dept_id, name, avg, count, high in rows
    ]


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

    Each target carries ``exposed``: True only when signal 1 or 2 selected them,
    i.e. when the artifact actually reached them. Signals 3 and 4 are *priors* —
    reasons to train someone, not evidence that anything happened to them — and
    the caller must not charge them an exposure penalty on that basis. Doing so
    made the score self-amplifying: a high score selected you, the selection
    raised your score, which selected you again on the next unrelated threat.

    The reporter is dropped unless some other signal also flagged them; when it
    did, they are kept with an explicit reinforcement rationale. They are the
    sensor, not the failure.
    """
    # Only people who can actually receive and act on training. Assigning to a
    # departed employee is noise in every metric it touches; assigning to someone
    # on leave produces an expiry that reads as "ignored the training" and
    # charges them for it.
    employees = db.execute(
        select(Employee).where(Employee.status == EmployeeStatus.ACTIVE)
    ).scalars().all()
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

    # 3. Recent simulated-phish clickers (behavioural precedent).
    # Bounded by time, not by row count: "the last 50 click events ever" is not
    # recency, and on a quiet roster it reaches back years — so someone who
    # clicked once in 2024 kept being described to their face as having
    # "recently clicked".
    since = datetime.now(timezone.utc) - timedelta(days=RECENT_CLICK_DAYS)
    click_rows = db.execute(
        select(RiskEvent.employee_id)
        .where(RiskEvent.type == "simulated_phish_click", RiskEvent.created_at >= since)
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
            "exposed": any(r in EXPOSURE_REASONS for r in reasons),
        }
        for emp_id, reasons in ranked
    ]
