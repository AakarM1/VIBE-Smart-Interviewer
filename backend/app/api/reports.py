"""
Reports & Analytics API
Returns AI-generated reports for submissions. We treat analyzed submissions as generated reports.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.database import get_db
from app.auth import require_superadmin, get_current_active_user, UserContext
from app.models import Submission, User, Tenant

router = APIRouter(prefix="/reports", tags=["reports"]) 

@router.get("/generated")
async def list_generated_reports(
    tenant_id: Optional[str] = None,
    user_id: Optional[str] = None,
    test_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_superadmin)
):
    """List AI-generated reports (submissions with analysis_result or analysis_completed).
    Superadmin can filter by tenant/user/test_type.
    """
    with UserContext(db, current_user):
        q = db.query(Submission)
        if tenant_id:
            q = q.filter(Submission.tenant_id == tenant_id)
        if user_id:
            q = q.filter(Submission.user_id == user_id)
        if test_type:
            q = q.filter(Submission.test_type == test_type)
        # Consider any analyzed submission as a generated report
        q = q.filter((Submission.analysis_result != None) | (Submission.analysis_completed == True))
        items = q.order_by(Submission.created_at.desc()).limit(500).all()

    # Map to a friendly response with generator inference (admin email if available)
    result = []
    for s in items:
        result.append({
            "report_id": str(s.id),
            "tenant_id": str(s.tenant_id) if s.tenant_id else None,
            "user_id": str(s.user_id) if s.user_id else None,
            "test_type": s.test_type,
            "created_at": s.created_at.isoformat() if isinstance(s.created_at, datetime) else s.created_at,
            "analysis_completed": bool(s.analysis_completed),
            "status": s.status,
        })
    return {"reports": result, "total": len(result)}
