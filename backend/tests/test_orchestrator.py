"""Loop Orchestrator — the 7-stage engine (spec §6.1).

We drive the pipeline by awaiting the async stage coroutines directly (stage
delays are zeroed in conftest), rather than going through the background task
runner, so the whole loop runs deterministically inside the test.
"""
import pytest

from app.core import orchestrator
from app.database import SessionLocal
from app.models import (
    AssignmentStatus,
    LoopRun,
    LoopStatus,
    LoopStage,
    ModuleStatus,
    Threat,
    ThreatSource,
    TrainingModule,
)


def _make_run(db) -> LoopRun:
    threat = Threat(
        source=ThreatSource.MANUAL,
        artifact_type="email",
        artifact_ref="URGENT verify your password now: https://evil-login.xyz/go or account suspended",
        artifact_meta={"sender": "security@evil-login.xyz", "subject": "Verify now"},
        title="Test phish",
    )
    db.add(threat)
    db.flush()
    run = LoopRun(trigger_threat_id=threat.id, status=LoopStatus.RUNNING)
    orchestrator._stage_start(run, LoopStage.INGEST, "manual")
    orchestrator._stage_done(run, LoopStage.INGEST, "manual")
    db.add(run)
    db.commit()
    return run


async def test_full_loop_runs_through_all_seven_stages():
    db = SessionLocal()
    try:
        run = _make_run(db)
        run_id = run.id

        # Stages 2–3: ANALYZE + CONVERT (stops at the approval gate)
        await orchestrator._run_pipeline(run_id)
        db.expire_all()
        run = db.get(LoopRun, run_id)
        assert run.status == LoopStatus.AWAITING_APPROVAL
        threat = db.get(Threat, run.trigger_threat_id)
        assert threat.verdict in ("malicious", "suspicious")
        assert threat.iocs["domains"], "IOCs extracted"
        assert threat.explanation, "AI plain-language explanation present"
        module = db.get(TrainingModule, run.training_module_id)
        assert module is not None and module.ai_generated
        assert module.status == ModuleStatus.PENDING_REVIEW

        # Approve → Stages 4–5: TARGET + TRAIN
        module.status = ModuleStatus.APPROVED
        db.commit()
        await orchestrator._resume_target_train(run_id)
        db.expire_all()
        run = db.get(LoopRun, run_id)
        assert run.status == LoopStatus.AWAITING_TRAINING
        assert 0 < len(run.targeting) <= 8, "targeted, not blasted"
        assert all(t["reasons"] for t in run.targeting)

        # Stages 6–7: MEASURE + FEEDBACK (force-measure with assignments open)
        run2 = db.get(LoopRun, run_id)
        await orchestrator._measure_and_feedback(db, run2)
        db.expire_all()
        run = db.get(LoopRun, run_id)
        assert run.status == LoopStatus.COMPLETED
        stages_completed = {h["stage"] for h in run.stage_history if h["status"] == "completed"}
        assert {1, 2, 3, 4, 5, 6, 7} <= stages_completed
        assert run.measure_summary is not None
    finally:
        db.close()


async def test_measure_feedback_is_idempotent():
    """A second MEASURE submission (concurrent last-quiz race) must be a no-op."""
    db = SessionLocal()
    try:
        run = _make_run(db)
        run_id = run.id
        await orchestrator._run_pipeline(run_id)
        db.expire_all()
        run = db.get(LoopRun, run_id)
        module = db.get(TrainingModule, run.training_module_id)
        module.status = ModuleStatus.APPROVED
        db.commit()
        await orchestrator._resume_target_train(run_id)

        run = db.get(LoopRun, run_id)
        await orchestrator._measure_and_feedback(db, run)
        db.expire_all()
        run = db.get(LoopRun, run_id)
        history_len = len(run.stage_history)
        assert run.status == LoopStatus.COMPLETED

        # Second call must not duplicate MEASURE/FEEDBACK or flip status.
        await orchestrator._measure_and_feedback(db, run)
        db.expire_all()
        run = db.get(LoopRun, run_id)
        assert run.status == LoopStatus.COMPLETED
        assert len(run.stage_history) == history_len, "no duplicated stages"
    finally:
        db.close()


async def test_benign_artifact_closes_loop_early():
    db = SessionLocal()
    try:
        threat = Threat(
            source=ThreatSource.MANUAL,
            artifact_type="email",
            artifact_ref="Team lunch newsletter, weekly digest and meeting notes",
            artifact_meta={},
            title="Newsletter",
        )
        db.add(threat)
        db.flush()
        run = LoopRun(trigger_threat_id=threat.id, status=LoopStatus.RUNNING)
        orchestrator._stage_start(run, LoopStage.INGEST, "manual")
        orchestrator._stage_done(run, LoopStage.INGEST, "manual")
        db.add(run)
        db.commit()
        run_id = run.id

        await orchestrator._run_pipeline(run_id)
        db.expire_all()
        run = db.get(LoopRun, run_id)
        assert run.status == LoopStatus.COMPLETED
        assert run.training_module_id is None, "benign → no training generated"
    finally:
        db.close()
