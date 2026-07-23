"""Loop Orchestrator — the heart of Cyclowareness (spec §6.1).

Drives an artifact through the seven stages and persists a ``LoopRun``
record at every transition, so the dashboard can render the loop turning
in real time. A stalled or failed stage is surfaced on the run, never
silently dropped.

Flow:
    start_loop()            → INGEST recorded, async pipeline submitted
    _run_pipeline()         → ANALYZE → CONVERT → (approval gate)
    continue_after_approval() → TARGET → TRAIN → awaiting_training
    on_assignment_completed() → when the last assignment lands…
    _measure_and_feedback() → MEASURE → FEEDBACK → run completed
"""
import asyncio
import logging
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..ai.ai_service import explain_threat, generate_training
from ..analyzers import get_analyzer
from ..config import get_settings
from ..database import session_scope
from ..models import (
    AssignmentStatus,
    Employee,
    LoopRun,
    LoopStage,
    LoopStatus,
    ModuleStatus,
    PhishingReport,
    ReportStatus,
    Threat,
    TrainingAssignment,
    TrainingModule,
)
from . import metrics, risk_engine
from .events import notify_loop
from .task_runner import get_task_runner

logger = logging.getLogger("cyclowareness.loop")
settings = get_settings()


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# --- stage_history bookkeeping ----------------------------------------------
# NOTE: entries are copied, never mutated in place — SQLAlchemy JSON change
# detection compares old/new by equality, so in-place dict mutation would be
# silently skipped at flush time.

def _copy_history(run: LoopRun) -> list[dict]:
    return [dict(entry) for entry in (run.stage_history or [])]


def _stage_start(run: LoopRun, stage: int, detail: str = "") -> None:
    history = _copy_history(run)
    history.append(
        {
            "stage": stage,
            "name": LoopStage.NAMES[stage],
            "status": "in_progress",
            "started_at": _now_iso(),
            "completed_at": None,
            "detail": detail,
            "error": None,
        }
    )
    run.stage_history = history
    run.current_stage = stage
    notify_loop(run.id, stage, "in_progress")


def _stage_done(run: LoopRun, stage: int, detail: str = "") -> None:
    history = _copy_history(run)
    for entry in reversed(history):
        if entry["stage"] == stage and entry["status"] == "in_progress":
            entry["status"] = "completed"
            entry["completed_at"] = _now_iso()
            if detail:
                entry["detail"] = detail
            break
    run.stage_history = history
    notify_loop(run.id, stage, "completed")


def _stage_failed(run: LoopRun, stage: int, error: str) -> None:
    history = _copy_history(run)
    for entry in reversed(history):
        if entry["stage"] == stage and entry["status"] == "in_progress":
            entry["status"] = "failed"
            entry["completed_at"] = _now_iso()
            entry["error"] = error
            break
    run.stage_history = history
    run.status = LoopStatus.FAILED
    notify_loop(run.id, stage, "failed")


# --- Stage 1: INGEST ---------------------------------------------------------

def start_loop(db: Session, threat: Threat, report: PhishingReport | None = None) -> LoopRun:
    """Create the LoopRun (stage 1) and submit the async pipeline."""
    run = LoopRun(trigger_threat_id=threat.id, status=LoopStatus.RUNNING)
    source_label = {
        "human_sensor": "reported by an employee (human sensor)",
        "feed": "pushed from the threat intel feed",
        "manual": "submitted manually by an analyst",
    }.get(threat.source, threat.source)
    _stage_start(run, LoopStage.INGEST, f"Artifact {source_label}")
    _stage_done(run, LoopStage.INGEST, f"Artifact {source_label}")
    db.add(run)
    db.flush()

    if report is not None:
        run.report_id = report.id
        report.linked_loop_run_id = run.id
        report.status = ReportStatus.IN_LOOP
        db.add(report)
    db.commit()

    get_task_runner().submit(_run_pipeline(run.id), name=f"loop-run-{run.id}")
    return run


# --- Stages 2–3 (async): ANALYZE → CONVERT → approval gate -------------------

async def _run_pipeline(run_id: int) -> None:
    db = session_scope()
    try:
        run = db.get(LoopRun, run_id)
        if run is None:
            return
        threat = db.get(Threat, run.trigger_threat_id)

        # ----- Stage 2: ANALYZE (sandbox) -----
        _stage_start(run, LoopStage.ANALYZE, "Detonating artifact in sandbox…")
        db.commit()
        try:
            await asyncio.sleep(settings.delay_analyze)
            analyzer = get_analyzer()
            result = await analyzer.analyze(
                artifact_type=threat.artifact_type,
                artifact_ref=threat.artifact_ref,
                artifact_meta=threat.artifact_meta or {},
            )
            threat.verdict = result["verdict"]
            threat.confidence = result["confidence"]
            threat.threat_type = result["threat_type"]
            threat.iocs = result["iocs"]
            threat.behavior_summary = result["behavior_summary"]
            threat.analysis_result = result["raw_report"]
            db.add(threat)
            ioc_count = sum(len(v) for v in result["iocs"].values())
            _stage_done(
                run,
                LoopStage.ANALYZE,
                f"Verdict: {result['verdict']} ({result['threat_type']}), "
                f"confidence {result['confidence']:.0%}, {ioc_count} IOCs extracted",
            )
            db.commit()
        except Exception as exc:  # noqa: BLE001 — surface, never drop
            logger.exception("ANALYZE failed for run %s", run_id)
            _stage_failed(run, LoopStage.ANALYZE, str(exc))
            db.commit()
            return

        # Benign artifacts close the loop early — nothing to train on.
        if threat.verdict == "benign":
            _stage_start(run, LoopStage.CONVERT, "")
            _stage_done(run, LoopStage.CONVERT, "Verdict benign — no training needed; loop closed")
            run.status = LoopStatus.COMPLETED
            run.completed_at = datetime.now(timezone.utc)
            db.commit()
            return

        # ----- Stage 3: CONVERT (AI: threat → training) -----
        _stage_start(run, LoopStage.CONVERT, "AI is converting the threat into micro-training…")
        db.commit()
        try:
            await asyncio.sleep(settings.delay_convert)
            analysis = {
                "verdict": threat.verdict,
                "confidence": threat.confidence,
                "threat_type": threat.threat_type,
                "iocs": threat.iocs,
                "behavior_summary": threat.behavior_summary,
                "artifact_type": threat.artifact_type,
                "artifact_excerpt": (threat.artifact_ref or "")[:1200],
                "title": threat.title,
            }
            training, generation_source = await generate_training(analysis)
            explanation = await explain_threat(analysis)

            module = TrainingModule(
                threat_id=threat.id,
                title=training["title"],
                description=training["description"],
                content=training["content"],
                quiz=training["quiz"],
                takeaway=training["takeaway"],
                channel=training.get("channel", threat.artifact_type),
                est_minutes=training.get("est_minutes", 3),
                ai_generated=True,
                generation_source=generation_source,
                status=ModuleStatus.PENDING_REVIEW,
            )
            db.add(module)
            threat.explanation = explanation
            db.add(threat)
            db.flush()
            run.training_module_id = module.id
            engine_label = "Claude" if generation_source == "anthropic" else "offline generator"
            _stage_done(
                run,
                LoopStage.CONVERT,
                f'{engine_label} generated module "{module.title}" '
                f"({len(module.quiz)} quiz questions)",
            )
            db.commit()
        except Exception as exc:  # noqa: BLE001
            logger.exception("CONVERT failed for run %s", run_id)
            _stage_failed(run, LoopStage.CONVERT, str(exc))
            db.commit()
            return

        # ----- Human-in-the-loop approval gate -----
        if settings.auto_approve_training:
            module.status = ModuleStatus.APPROVED
            module.approved_by = "auto-approval (demo mode)"
            db.commit()
            await _target_and_train(db, run)
        else:
            run.status = LoopStatus.AWAITING_APPROVAL
            db.commit()
    finally:
        db.close()


# --- Stages 4–5: TARGET → TRAIN ---------------------------------------------

def continue_after_approval(db: Session, run: LoopRun) -> None:
    """Called when the analyst approves the AI-generated module."""
    run.status = LoopStatus.RUNNING
    db.commit()
    get_task_runner().submit(_resume_target_train(run.id), name=f"loop-run-{run.id}-target")


async def _resume_target_train(run_id: int) -> None:
    db = session_scope()
    try:
        run = db.get(LoopRun, run_id)
        if run is not None:
            await _target_and_train(db, run)
    finally:
        db.close()


def _stage_already_ran(run: LoopRun, stage: int) -> bool:
    return any(e["stage"] == stage for e in (run.stage_history or []))


async def _target_and_train(db: Session, run: LoopRun) -> None:
    # Two concurrent approvals both submit this task. Each task opens its own
    # session and may have read `run` before the other committed TARGET, so the
    # in-memory object is not a safe basis for the guard — refresh it first.
    # Without this, both tasks pass, and every selected employee is charged
    # exposure twice and assigned the module twice.
    db.refresh(run)
    if _stage_already_ran(run, LoopStage.TARGET) or run.status == LoopStatus.FAILED:
        return

    # Re-read the human gate at the moment of use. Approve and reject race on
    # the same run, and this task can have been queued before the rejection
    # landed; a module an analyst rejected must never reach an employee, which
    # is the entire purpose of the gate.
    module = db.get(TrainingModule, run.training_module_id) if run.training_module_id else None
    if module is None or module.status != ModuleStatus.APPROVED:
        logger.warning(
            "TARGET refused for run %s: module %s is not approved (status=%s)",
            run.id,
            run.training_module_id,
            getattr(module, "status", None),
        )
        return

    threat = db.get(Threat, run.trigger_threat_id)

    # ----- Stage 4: TARGET -----
    _stage_start(run, LoopStage.TARGET, "Mapping threat to at-risk employees…")
    db.commit()
    try:
        await asyncio.sleep(settings.delay_target)
        targets = risk_engine.select_targets(
            db,
            threat_type=threat.threat_type,
            artifact_meta=threat.artifact_meta or {},
            reporter_id=threat.reported_by_employee_id,
        )
        run.targeting = targets
        # Exposure is charged only to the people the artifact actually reached
        # (`exposed`, set by select_targets). Employees pulled in by a prior —
        # a high score, or a click on an unrelated simulation — were never
        # exposed to THIS threat, so writing them a "+8 exposed to real threat"
        # event states something that did not happen, and feeds the score that
        # selected them straight back into itself.
        for target in targets:
            if not target.get("exposed"):
                continue
            employee = db.get(Employee, target["employee_id"])
            if employee is not None:
                risk_engine.apply_event(
                    db,
                    employee,
                    "real_threat_exposure",
                    reason=f'Exposed to real threat "{threat.title or threat.threat_type}"',
                    loop_run_id=run.id,
                )
        _stage_done(
            run,
            LoopStage.TARGET,
            f"{len(targets)} at-risk employees selected (targeted, not blasted)",
        )
        db.commit()
    except Exception as exc:  # noqa: BLE001
        logger.exception("TARGET failed for run %s", run.id)
        _stage_failed(run, LoopStage.TARGET, str(exc))
        db.commit()
        return

    # ----- Stage 5: TRAIN (assign; completion is measured later) -----
    _stage_start(run, LoopStage.TRAIN, "Delivering adaptive micro-training…")
    db.commit()
    try:
        if not run.targeting:
            _stage_done(run, LoopStage.TRAIN, "No at-risk employees matched — nothing to assign")
            await _measure_and_feedback(db, run)
            return
        for target in run.targeting:
            db.add(
                TrainingAssignment(
                    module_id=run.training_module_id,
                    employee_id=target["employee_id"],
                    loop_run_id=run.id,
                    status=AssignmentStatus.ASSIGNED,
                    targeting_reasons=target["reasons"],
                )
            )
        _stage_done(
            run,
            LoopStage.TRAIN,
            f"Micro-training assigned to {len(run.targeting)} employees; awaiting completion",
        )
        run.status = LoopStatus.AWAITING_TRAINING
        db.commit()
    except Exception as exc:  # noqa: BLE001
        logger.exception("TRAIN failed for run %s", run.id)
        _stage_failed(run, LoopStage.TRAIN, str(exc))
        db.commit()


# --- Stages 6–7: MEASURE → FEEDBACK ------------------------------------------

def on_assignment_completed(db: Session, assignment: TrainingAssignment) -> None:
    """Called by the training router whenever an assignment completes.

    When the last assignment of a run lands, the run advances to MEASURE.
    """
    if assignment.loop_run_id is None:
        return
    run = db.get(LoopRun, assignment.loop_run_id)
    if run is None or run.status != LoopStatus.AWAITING_TRAINING:
        return
    open_assignments = db.execute(
        select(TrainingAssignment).where(
            TrainingAssignment.loop_run_id == run.id,
            TrainingAssignment.status.in_(
                [AssignmentStatus.ASSIGNED, AssignmentStatus.IN_PROGRESS]
            ),
        )
    ).scalars().all()
    if not open_assignments:
        get_task_runner().submit(_measure_feedback_async(run.id), name=f"loop-run-{run.id}-measure")


def force_measure(db: Session, run: LoopRun) -> None:
    """Analyst override for a stalled run: expire open assignments and measure.

    Ignoring assigned training is itself a signal (training_ignored, +4).
    """
    open_assignments = db.execute(
        select(TrainingAssignment).where(
            TrainingAssignment.loop_run_id == run.id,
            TrainingAssignment.status.in_(
                [AssignmentStatus.ASSIGNED, AssignmentStatus.IN_PROGRESS]
            ),
        )
    ).scalars().all()
    for assignment in open_assignments:
        assignment.status = AssignmentStatus.EXPIRED
        db.add(assignment)
        employee = db.get(Employee, assignment.employee_id)
        if employee is not None:
            risk_engine.apply_event(
                db,
                employee,
                "training_ignored",
                reason="Assigned micro-training expired uncompleted",
                loop_run_id=run.id,
            )
    db.commit()
    get_task_runner().submit(_measure_feedback_async(run.id), name=f"loop-run-{run.id}-measure")


async def _measure_feedback_async(run_id: int) -> None:
    db = session_scope()
    try:
        run = db.get(LoopRun, run_id)
        if run is not None:
            await _measure_and_feedback(db, run)
    finally:
        db.close()


async def _measure_and_feedback(db: Session, run: LoopRun) -> None:
    # Idempotency guard: two "last" quiz completions (or force-measure racing a
    # completion) can both submit this task; the second must be a no-op.
    if _stage_already_ran(run, LoopStage.MEASURE) or run.status in (
        LoopStatus.COMPLETED,
        LoopStatus.FAILED,
    ):
        return
    # ----- Stage 6: MEASURE -----
    run.status = LoopStatus.RUNNING
    _stage_start(run, LoopStage.MEASURE, "Measuring completion, comprehension and behaviour…")
    db.commit()
    try:
        assignments = db.execute(
            select(TrainingAssignment).where(TrainingAssignment.loop_run_id == run.id)
        ).scalars().all()
        completed = [a for a in assignments if a.status == AssignmentStatus.COMPLETED]
        scores = [a.score for a in completed if a.score is not None]
        times = [a.time_spent_seconds for a in completed if a.time_spent_seconds]

        per_employee = []
        risk_delta_total = 0.0
        for assignment in assignments:
            employee = db.get(Employee, assignment.employee_id)
            deltas = [
                e.delta
                for e in employee.risk_events
                if e.loop_run_id == run.id
            ] if employee else []
            employee_delta = round(sum(deltas), 1)
            risk_delta_total += employee_delta
            per_employee.append(
                {
                    "employee_id": assignment.employee_id,
                    "name": employee.name if employee else "?",
                    "status": assignment.status,
                    "score": assignment.score,
                    "risk_delta": employee_delta,
                    "risk_score_now": employee.current_risk_score if employee else None,
                }
            )

        run.measure_summary = {
            "assigned": len(assignments),
            "completed": len(completed),
            "completion_rate": round(len(completed) / len(assignments), 2) if assignments else 0,
            "avg_score": round(sum(scores) / len(scores), 1) if scores else None,
            "avg_time_seconds": round(sum(times) / len(times)) if times else None,
            "risk_delta_total": round(risk_delta_total, 1),
            "per_employee": per_employee,
        }
        detail = (
            f"{len(completed)}/{len(assignments)} completed"
            + (f", avg quiz score {run.measure_summary['avg_score']:.0f}%" if scores else "")
            + f", net risk change {risk_delta_total:+.1f}"
        )
        _stage_done(run, LoopStage.MEASURE, detail)
        db.commit()
    except Exception as exc:  # noqa: BLE001
        logger.exception("MEASURE failed for run %s", run.id)
        _stage_failed(run, LoopStage.MEASURE, str(exc))
        db.commit()
        return

    # ----- Stage 7: FEEDBACK -----
    _stage_start(run, LoopStage.FEEDBACK, "Updating the risk model with measured results…")
    db.commit()
    try:
        # Risk events were written as results arrived (the audit trail); the
        # feedback stage recomputes the model outputs that drive the NEXT
        # TARGET stage: department roll-ups and the daily metric snapshot.
        rollups = risk_engine.department_rollups(db)
        metrics.upsert_today_snapshot(db)
        _stage_done(
            run,
            LoopStage.FEEDBACK,
            "Risk model updated — "
            + ", ".join(f"{r['name']} {r['avg_risk']:.0f}" for r in rollups[:3])
            + " — next targeting will use the new scores",
        )
        run.status = LoopStatus.COMPLETED
        run.completed_at = datetime.now(timezone.utc)
        db.commit()
    except Exception as exc:  # noqa: BLE001
        logger.exception("FEEDBACK failed for run %s", run.id)
        _stage_failed(run, LoopStage.FEEDBACK, str(exc))
        db.commit()
