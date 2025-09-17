"""Tests (JDT/SJT) availability and attempt endpoints"""
from fastapi import APIRouter, Depends, HTTPException, status, Path, Query
from sqlalchemy.orm import Session
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
import uuid
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

    # Is there an assignment? (Candidates only need assignment; admins/superadmins considered always assigned for preview purposes)
    assignment = None
    assigned = False
    assignment_status = None
    max_attempts = MAX_ATTEMPTS_DEFAULT
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
        assigned = True
        assignment_status = 'admin_preview'

    # Config presence
    cfg = _get_config(db, current_user.tenant_id, tt)
    configured = bool(cfg)

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
        assignment_status=assignment_status
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
        num = settings.get('numberOfQuestions') or len(scenarios)
        # Shallow copy to avoid mutation
        pool = list(scenarios)
        if num < len(pool):
            # simple deterministic shuffle by sorting on id string
            pool.sort(key=lambda x: str(x.get('id')))  # could add randomization if needed
        questions = pool[:num]
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
