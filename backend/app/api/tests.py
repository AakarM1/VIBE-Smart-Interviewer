"""Tests (JDT/SJT) availability and attempt endpoints"""
from fastapi import APIRouter, Depends, HTTPException, status, Path, Query
from sqlalchemy.orm import Session
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
import uuid
import os
from datetime import datetime, timedelta

from app.database import get_db
import logging
logger = logging.getLogger(__name__)
from app.auth import get_current_active_user
from app.models import (
    User, Configuration, TestAssignment, TestAttempt,
    TestAvailabilityResponse, StartAttemptRequest, StartAttemptResponse, TestAttemptResponse
)

router = APIRouter(prefix="/tests", tags=["tests"])

MAX_ATTEMPTS_DEFAULT = 1  # Fallback if assignment not found

# Simple in-memory config cache (tenant_id, test_type) -> (config_obj, expires_at)
_CONFIG_CACHE: Dict[str, Dict[str, Any]] = {}
_CONFIG_TTL_SECONDS = 30

# Helper to get active config JSON for a test type

def _cache_key(tenant_id: Optional[str], test_type: str) -> str:
    return f"{tenant_id or 'system'}:{test_type.upper()}"

def _get_config(db: Session, tenant_id: Optional[str], test_type: str) -> Optional[Configuration]:
    key = _cache_key(tenant_id, test_type)
    now = datetime.utcnow()
    cached = _CONFIG_CACHE.get(key)
    if cached and cached['expires_at'] > now:
        return cached['config']

    config_type = test_type.lower()
    q = db.query(Configuration).filter(
        Configuration.config_type == config_type,
        Configuration.is_active == True
    )
    cfg = None
    if tenant_id:
        cfg = q.filter(Configuration.tenant_id == tenant_id).order_by(Configuration.created_at.desc()).first()
    if not cfg:
        cfg = q.filter(Configuration.scope == 'system').order_by(Configuration.created_at.desc()).first()
    if cfg:
        _CONFIG_CACHE[key] = {
            'config': cfg,
            'expires_at': now + timedelta(seconds=_CONFIG_TTL_SECONDS)
        }
    return cfg

@router.get("/availability", response_model=TestAvailabilityResponse)
async def get_test_availability(
    test_type: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    tt = test_type.upper()
    if tt not in ("JDT", "SJT"):
        raise HTTPException(status_code=400, detail="Invalid test_type")

    # Config presence (look up early so it's available for auto-assignment logic)
    cfg = _get_config(db, current_user.tenant_id, tt)
    configured = bool(cfg)

    # Is there an assignment? (Candidates only need assignment; admins/superadmins considered always assigned for preview purposes)
    assignment = None
    assigned = False
    assignment_status = None
    max_attempts = MAX_ATTEMPTS_DEFAULT
    assigned_question_count: Optional[int] = None
    if current_user.role == 'candidate':
        assignment = db.query(TestAssignment).filter(
            TestAssignment.user_id == current_user.id,
            TestAssignment.test_type == tt
        ).first()
        if assignment:
            assigned = True
            assignment_status = assignment.status
            max_attempts = assignment.max_attempts or MAX_ATTEMPTS_DEFAULT
        else:
            # Optional auto-assignment: if enabled and a config exists, create assignment on-the-fly
            if configured and os.getenv('AUTO_ASSIGN_ON_AVAILABILITY', '0') in ('1','true','True'):
                try:
                    new_assignment = TestAssignment(
                        id=str(uuid.uuid4()),
                        user_id=current_user.id,
                        admin_id=current_user.id,  # placeholder admin linkage
                        tenant_id=current_user.tenant_id,
                        test_type=tt,
                        status='assigned',
                        max_attempts=MAX_ATTEMPTS_DEFAULT
                    )
                    db.add(new_assignment)
                    db.commit()
                    db.refresh(new_assignment)
                    assignment = new_assignment
                    assigned = True
                    assignment_status = 'assigned'
                    logger.info('[auto-assignment] Created assignment user=%s test=%s', current_user.id, tt)
                except Exception as e:
                    logger.error('Failed auto-assignment user=%s test=%s error=%s', current_user.id, tt, e)
    else:
        assigned = True
        assignment_status = 'admin_preview'


    # Attempts used (completed attempts only)
    # Count completed attempts
    attempts_used = db.query(TestAttempt).filter(
        TestAttempt.user_id == current_user.id,
        TestAttempt.test_type == tt,
        TestAttempt.status == 'completed'
    ).count()
    # Check for existing in-progress attempt (block starting new one)
    has_in_progress = db.query(TestAttempt).filter(
        TestAttempt.user_id == current_user.id,
        TestAttempt.test_type == tt,
        TestAttempt.status == 'in_progress'
    ).first() is not None

    # If SJT and assignment has scenario restriction, compute count from that; else from cfg
    if tt == 'SJT' and assignment and assignment.custom_config:
        try:
            ids = (assignment.custom_config or {}).get('sjt_scenario_ids') or []
            if isinstance(ids, list):
                assigned_question_count = len(ids)
        except Exception:
            assigned_question_count = None
    if assigned_question_count is None and configured:
        try:
            cfg_data = cfg.config_data or {}
            scenarios = cfg_data.get('scenarios') or []
            settings = cfg_data.get('settings') or {}
            num = settings.get('numberOfQuestions') or len(scenarios)
            assigned_question_count = int(num)
        except Exception:
            assigned_question_count = None

    can_start = assigned and configured and attempts_used < max_attempts and not has_in_progress

    logger.info(
        "[availability] user=%s test=%s assigned=%s configured=%s attempts_used=%s max_attempts=%s in_progress=%s can_start=%s",
        current_user.id, tt, assigned, configured, attempts_used, max_attempts, has_in_progress, can_start
    )

    return TestAvailabilityResponse(
        test_type=tt,
        assigned=assigned,
        configured=configured,
        attempts_used=attempts_used,
        max_attempts=max_attempts,
        can_start=can_start,
        assignment_status=assignment_status,
        assigned_question_count=assigned_question_count
    )

@router.post("/attempts/start", response_model=StartAttemptResponse)
async def start_test_attempt(
    payload: StartAttemptRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    tt = payload.test_type.upper()
    if tt not in ("JDT", "SJT"):
        raise HTTPException(status_code=400, detail="Invalid test_type")

    # Availability check
    availability = await get_test_availability(tt, db, current_user)  # type: ignore
    if not availability.can_start:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot start this test")

    cfg = _get_config(db, current_user.tenant_id, tt)
    if not cfg:
        raise HTTPException(status_code=500, detail="Configuration missing")

    config_data = cfg.config_data or {}
    questions: List[Dict[str, Any]] = []

    if tt == 'SJT':
        scenarios = (config_data.get('scenarios') or [])
        settings = config_data.get('settings') or {}
        # If assignment specifies scenario IDs, honor that list
        selected_ids: Optional[List[str]] = None
        # Acquire assignment for candidates to honor scenario restrictions
        assignment = None
        if current_user.role == 'candidate':
            assignment = db.query(TestAssignment).filter(
                TestAssignment.user_id == current_user.id,
                TestAssignment.test_type == tt
            ).first()
        if assignment and assignment.custom_config:
            try:
                selected_ids = (assignment.custom_config or {}).get('sjt_scenario_ids')
                if selected_ids is not None and not isinstance(selected_ids, list):
                    selected_ids = None
            except Exception:
                selected_ids = None
        selected: List[Dict[str, Any]] = []
        if selected_ids:
            id_set = set(str(x) for x in selected_ids)
            # Keep original order of config scenarios; include only selected
            for sc in scenarios:
                sid = str(sc.get('id'))
                if sid in id_set:
                    selected.append(sc)
        else:
            num = settings.get('numberOfQuestions') or len(scenarios)
            pool = list(scenarios)
            if num < len(pool):
                pool.sort(key=lambda x: str(x.get('id')))
            selected = pool[:num]
        questions = selected
    else:  # JDT
        roles = (config_data.get('roles') or [])
        settings = config_data.get('settings') or {}
        selected_role = None
        if payload.role_category:
            selected_role = next((r for r in roles if r.get('roleName') == payload.role_category), None)
        if not selected_role and roles:
            selected_role = roles[0]
        manual_qs = (selected_role.get('questions') if selected_role else []) or []
        num_manual = settings.get('numberOfQuestions') or len(manual_qs)
        manual_subset = manual_qs[:num_manual]
        ai_num = settings.get('aiGeneratedQuestions') or settings.get('aiQuestions') or 0
        # We do not generate AI questions here yet; placeholder
        questions = [
            {
                'question': q.get('text'),
                'preferredAnswer': q.get('preferredAnswer'),
                'competency': q.get('competency')
            } for q in manual_subset
        ]
        # Optionally append placeholders for AI
        for _ in range(ai_num):
            questions.append({
                'question': 'AI generated question placeholder',
                'preferredAnswer': 'Evaluate for clarity/relevance',
                'competency': 'AI-Assessed'
            })

    # Determine attempt number
    previous_attempts = db.query(TestAttempt).filter(
        TestAttempt.user_id == current_user.id,
        TestAttempt.test_type == tt
    ).count()
    attempt_number = previous_attempts + 1

    # Acquire assignment again for max attempts and relationship (if candidate)
    assignment = None
    if current_user.role == 'candidate':
        assignment = db.query(TestAssignment).filter(
            TestAssignment.user_id == current_user.id,
            TestAssignment.test_type == tt
        ).first()

    attempt = TestAttempt(
        user_id=current_user.id,
        test_type=tt,
        assignment_id=assignment.id if assignment else None,
        attempt_number=attempt_number,
        status='in_progress',
        max_questions=len(questions),
        questions_snapshot=questions,
        attempt_metadata={
            'config_id': str(cfg.id),
            'role_category': payload.role_category,
            'config_version': cfg.version
        }
    )
    db.add(attempt)
    db.commit()
    db.refresh(attempt)

    attempt_response = TestAttemptResponse.from_orm(attempt)

    remaining_allowed = availability.max_attempts - attempt_number
    return StartAttemptResponse(
        attempt=attempt_response,
        questions=questions,
        can_start=True,
        remaining_attempts=max(0, remaining_allowed)
    )


# =======================
# Attempt retrieval & completion
# =======================

class CompleteAttemptRequest(BaseModel):
    status: Optional[str] = None
    answers: Optional[List[Dict[str, Any]]] = None
    score: Optional[Dict[str, Any]] = None

class CompleteAttemptResponse(BaseModel):
    attempt: TestAttemptResponse
    message: str

class TestAvailabilitySummaryItem(BaseModel):
    test_type: str
    assigned: bool
    configured: bool
    attempts_used: int
    max_attempts: int
    can_start: bool
    assignment_status: Optional[str] = None
    assigned_question_count: Optional[int] = None

class TestAvailabilitySummaryResponse(BaseModel):
    tests: List[TestAvailabilitySummaryItem]

@router.get("/availability/summary", response_model=TestAvailabilitySummaryResponse)
async def get_availability_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Return availability info for all supported test types (currently SJT & JDT).

    This consolidates multiple calls so the frontend can reliably decide which
    cards to show even if one configuration is missing.
    """
    summary_items: List[TestAvailabilitySummaryItem] = []
    for tt in ("SJT", "JDT"):
        try:
            avail = await get_test_availability(tt, db, current_user)  # type: ignore
            summary_items.append(TestAvailabilitySummaryItem(**avail.dict()))
        except HTTPException as e:
            # If invalid or inaccessible, still include placeholder so UI can debug
            if e.status_code == 400:
                continue
            summary_items.append(TestAvailabilitySummaryItem(
                test_type=tt,
                assigned=False,
                configured=False,
                attempts_used=0,
                max_attempts=1,
                can_start=False,
                assignment_status=None
            ))
    return TestAvailabilitySummaryResponse(tests=summary_items)

# =======================
# Incremental answer submission (minimal additive endpoint)
# =======================

class SubmitAnswerRequest(BaseModel):
    """Incoming answer payload.
    base_question_index: index of the original/base question this answer belongs to (for follow-ups)
    follow_up_sequence: 0 for base question answer, 1..N for follow-ups relative order
    is_follow_up: distinguishes base question answers vs generated follow-ups
    """
    question_index: int
    answer_text: str
    is_follow_up: bool = False
    base_question_index: Optional[int] = None
    follow_up_sequence: Optional[int] = None
    duration_seconds: Optional[int] = None
    metadata: Optional[Dict[str, Any]] = None

class SubmitAnswerResponse(BaseModel):
    stored: bool
    can_generate_follow_up: bool
    remaining_follow_ups: int
    total_follow_ups_for_base: int
    max_follow_ups: int
    answer: Dict[str, Any]

def _derive_max_follow_ups(config_data: Dict[str, Any]) -> int:
    """Replicates frontend precedence: followUpCount -> aiGeneratedQuestions -> default 1; cap at 5."""
    settings = (config_data or {}).get('settings') or {}
    val = settings.get('followUpCount')
    if val is None:
        val = settings.get('aiGeneratedQuestions') or settings.get('aiQuestions')
    if val is None:
        val = 1
    try:
        val = int(val)
    except Exception:
        val = 1
    if val < 0:
        val = 0
    return min(val, 5)

@router.post("/attempts/{attempt_id}/answers", response_model=SubmitAnswerResponse)
async def submit_attempt_answer(
    attempt_id: str,
    payload: SubmitAnswerRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Store a single answer incrementally and report remaining follow-up allowance.

    This is intentionally minimal and additive – it does not replace existing
    front-end follow up generation logic. It simply persists answers inside
    attempt_metadata.answers and tracks per-base-question follow_up_counts.
    """
    attempt = db.query(TestAttempt).filter(TestAttempt.id == attempt_id).first()
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
    if current_user.role == 'candidate' and attempt.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    if attempt.status != 'in_progress':
        raise HTTPException(status_code=400, detail="Attempt not active")

    # Load config to determine follow-up limit (only relevant for SJT right now)
    cfg = _get_config(db, current_user.tenant_id, attempt.test_type)
    config_data = cfg.config_data if cfg else {}
    max_follow = _derive_max_follow_ups(config_data) if attempt.test_type == 'SJT' else 0

    meta = attempt.attempt_metadata or {}
    answers: List[Dict[str, Any]] = meta.get('answers') or []
    follow_counts: Dict[str, int] = meta.get('follow_up_counts') or {}

    # Normalize indices
    base_index = payload.base_question_index if payload.base_question_index is not None else payload.question_index
    is_follow_up = payload.is_follow_up
    if not is_follow_up:
        # Base question answer resets / initializes counting bucket
        follow_counts.setdefault(str(base_index), 0)
        sequence = 0
    else:
        # Enforce cap
        existing = follow_counts.get(str(base_index), 0)
        if existing >= max_follow:
            # Still store answer but cannot allocate further follow-ups
            sequence = existing + 1  # informational only (beyond cap)
        else:
            existing += 1
            follow_counts[str(base_index)] = existing
            sequence = existing

    answer_id = str(uuid.uuid4())
    stored_answer = {
        'id': answer_id,
        'base_question_index': base_index,
        'is_follow_up': is_follow_up,
        'follow_up_sequence': payload.follow_up_sequence if payload.follow_up_sequence is not None else sequence,
        'answer_text': payload.answer_text,
        'duration_seconds': payload.duration_seconds,
        'metadata': payload.metadata,
        'created_at': datetime.utcnow().isoformat() + 'Z'
    }
    answers.append(stored_answer)

    # Compute remaining capacity for this base question
    used = follow_counts.get(str(base_index), 0)
    remaining = 0
    if attempt.test_type == 'SJT':
        remaining = max(0, max_follow - used)

    can_generate_follow_up = is_follow_up is False and max_follow > 0 or (is_follow_up and remaining > 0)
    # A slightly safer rule: if we've just submitted a base answer and max_follow > 0, allow generation decision.
    if is_follow_up and remaining == 0:
        can_generate_follow_up = False

    # Persist
    meta['answers'] = answers
    meta['follow_up_counts'] = follow_counts
    attempt.attempt_metadata = meta
    db.commit()
    db.refresh(attempt)

    return SubmitAnswerResponse(
        stored=True,
        can_generate_follow_up=can_generate_follow_up,
        remaining_follow_ups=remaining,
        total_follow_ups_for_base=follow_counts.get(str(base_index), 0),
        max_follow_ups=max_follow,
        answer=stored_answer
    )

@router.get("/attempts/{attempt_id}", response_model=TestAttemptResponse)
async def get_attempt(
    attempt_id: str = Path(..., description="Attempt ID"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    attempt = db.query(TestAttempt).filter(TestAttempt.id == attempt_id).first()
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
    if current_user.role == 'candidate' and attempt.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    return TestAttemptResponse.from_orm(attempt)

@router.get("/attempts", response_model=List[TestAttemptResponse])
async def list_attempts(
    test_type: Optional[str] = Query(None, description="Filter by test type"),
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    q = db.query(TestAttempt).filter(TestAttempt.user_id == current_user.id)
    if test_type:
        q = q.filter(TestAttempt.test_type == test_type.upper())
    if status_filter:
        q = q.filter(TestAttempt.status == status_filter)
    attempts = q.order_by(TestAttempt.started_at.desc()).limit(100).all()
    return [TestAttemptResponse.from_orm(a) for a in attempts]

@router.post("/attempts/{attempt_id}/complete", response_model=CompleteAttemptResponse)
async def complete_attempt(
    attempt_id: str,
    payload: CompleteAttemptRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    attempt = db.query(TestAttempt).filter(TestAttempt.id == attempt_id).first()
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
    if current_user.role == 'candidate' and attempt.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    if attempt.status != 'in_progress':
        raise HTTPException(status_code=400, detail="Attempt already finalized")
    attempt.status = 'completed'
    attempt.completed_at = datetime.utcnow()
    if payload.score or payload.answers:
        meta = attempt.attempt_metadata or {}
        if payload.score:
            meta['score'] = payload.score
        if payload.answers:
            meta['answers_count'] = len(payload.answers)
        attempt.attempt_metadata = meta
    db.commit()
    db.refresh(attempt)
    return CompleteAttemptResponse(attempt=TestAttemptResponse.from_orm(attempt), message="Attempt completed")
