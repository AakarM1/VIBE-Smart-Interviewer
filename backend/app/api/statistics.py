"""
Platform statistics endpoints for dashboards
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from app.database import get_db
from app.auth import require_superadmin, UserContext
from app.models import User, Tenant, Submission

router = APIRouter(prefix="/statistics", tags=["statistics"])


@router.get("/overview")
async def get_overview_statistics(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_superadmin)
):
    """Return high-level overview metrics for superadmin dashboard"""
    with UserContext(db, current_user):
        total_companies = db.query(Tenant).filter(Tenant.is_active == True).count()
        total_users = db.query(User).filter(User.is_active == True).count()
        total_submissions = db.query(Submission).count()

        # Recent deltas (last 7 days and 24 hours)
        last_7_days = datetime.utcnow() - timedelta(days=7)
        last_24h = datetime.utcnow() - timedelta(hours=24)

        companies_last_7 = db.query(Tenant).filter(Tenant.created_at >= last_7_days).count()
        users_last_7 = db.query(User).filter(User.created_at >= last_7_days).count()
        submissions_last_24h = db.query(Submission).filter(Submission.created_at >= last_24h).count()


    return {
        "companies": {
            "total": total_companies,
            "added_last_7_days": companies_last_7,
        },
        "users": {
            "active_total": total_users,
            "added_last_7_days": users_last_7,
        },
        "submissions": {
            "total": total_submissions,
            "last_24_hours": submissions_last_24h,
        },
    # System health removed until a meaningful signal is implemented
        "generated_at": datetime.utcnow().isoformat() + "Z",
    }
