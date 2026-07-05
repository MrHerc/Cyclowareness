"""Risk Scoring Engine — the transparent, explainable core (spec §6.5)."""
from app.core import risk_engine
from app.models import Employee


def test_clamp_bounds():
    assert risk_engine.clamp(-10) == 0.0
    assert risk_engine.clamp(150) == 100.0
    assert risk_engine.clamp(42.345) == 42.3


def test_apply_event_moves_score_and_records_audit(db):
    emp = db.query(Employee).first()
    before = emp.current_risk_score

    ev = risk_engine.apply_event(db, emp, "simulated_phish_click", reason="unit test click")
    assert ev.delta == risk_engine.WEIGHTS["simulated_phish_click"]
    assert emp.current_risk_score == risk_engine.clamp(before + ev.delta)
    # RiskEvent is the audit trail
    assert ev.type == "simulated_phish_click"
    assert ev.reason == "unit test click"
    db.rollback()


def test_comprehension_scales_with_quiz_score(db):
    emp = db.query(Employee).first()
    ev = risk_engine.apply_event(db, emp, "training_comprehension", reason="80%", scale=0.8)
    assert ev.delta == round(risk_engine.WEIGHTS["training_comprehension"] * 0.8, 2)
    db.rollback()


def test_training_lowers_click_raises(db):
    emp = db.query(Employee).first()
    start = emp.current_risk_score
    risk_engine.apply_event(db, emp, "training_completed", reason="done")
    assert emp.current_risk_score < start
    mid = emp.current_risk_score
    risk_engine.apply_event(db, emp, "simulated_phish_click", reason="oops")
    assert emp.current_risk_score > mid
    db.rollback()


def test_breakdown_includes_baseline_and_factors(db):
    emp = db.query(Employee).order_by(Employee.current_risk_score.desc()).first()
    breakdown = risk_engine.risk_breakdown(db, emp)
    factors = {b["factor"] for b in breakdown}
    assert "baseline_role_sensitivity" in factors
    # a high-risk seeded employee has at least one contributing signal
    assert len(breakdown) >= 2


def test_department_rollups_present(db):
    rollups = risk_engine.department_rollups(db)
    assert len(rollups) == 6
    for r in rollups:
        assert 0 <= r["avg_risk"] <= 100
        assert r["employee_count"] > 0
    # sorted by descending risk
    assert rollups == sorted(rollups, key=lambda r: -r["avg_risk"])


def test_select_targets_is_selective_with_rationale(db):
    # BEC threat targeting Finance should pick finance-exposed / high-risk staff
    targets = risk_engine.select_targets(
        db,
        threat_type="bec",
        artifact_meta={"targeted_departments": ["Finance"]},
        reporter_id=None,
        max_targets=8,
    )
    assert 0 < len(targets) <= 8, "targeted, not blasted"
    for t in targets:
        assert t["reasons"], "every target has an explainable rationale"


def test_select_targets_drops_sole_reporter(db):
    emp = db.query(Employee).filter(Employee.role_sensitivity < 0.5).first()
    targets = risk_engine.select_targets(
        db,
        threat_type="phishing",
        artifact_meta={},  # reporter only flagged by being reporter
        reporter_id=emp.id,
        max_targets=8,
    )
    assert all(t["employee_id"] != emp.id for t in targets), "reporter is the sensor, not the failure"
