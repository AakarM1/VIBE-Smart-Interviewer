"""
Tenants API endpoints for multi-tenant management
"""

from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from typing import List, Optional
import json
import uuid

from app.database import get_db
from app.auth import get_current_active_user, require_superadmin, UserContext
from app.models import (
    Tenant, TenantCreate, TenantResponse,
    User, UserCreate, UserResponse
)

router = APIRouter(prefix="/tenants", tags=["tenants"])

@router.post("", response_model=TenantResponse)
async def create_tenant(
    tenant_data: TenantCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_superadmin)
):
    """Create a new tenant (superadmin only)"""
    
    # Check if tenant already exists (by name only; domain removed)
    existing_tenant = db.query(Tenant).filter(
        (Tenant.name == tenant_data.name)
    ).first()
    
    if existing_tenant:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Tenant with this name already exists"
        )
    
    # Create new tenant
    # Serialize allowed_test_types list to JSON string for SQLite Text column
    allowed_types_json = json.dumps(tenant_data.allowed_test_types or [])
    new_tenant = Tenant(
        name=tenant_data.name,
        logo_url=tenant_data.logo_url,
        custom_branding=tenant_data.custom_branding,
        max_test_attempts=tenant_data.max_test_attempts,
        allowed_test_types=allowed_types_json
    )
    
    with UserContext(db, current_user):
        db.add(new_tenant)
        db.commit()
        db.refresh(new_tenant)

    # Prepare response: parse allowed_test_types from JSON string
    try:
        if isinstance(new_tenant.allowed_test_types, str):
            new_tenant.allowed_test_types = json.loads(new_tenant.allowed_test_types)
    except Exception:
        new_tenant.allowed_test_types = ["JDT", "SJT"]

    return new_tenant

@router.get("", response_model=List[TenantResponse])
async def list_tenants(
    skip: int = 0,
    limit: int = 100,
    active_only: bool = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_superadmin)
):
    """List all tenants (superadmin only)"""
    
    with UserContext(db, current_user):
        query = db.query(Tenant)
        
        if active_only:
            query = query.filter(Tenant.is_active == True)
        
        tenants = query.order_by(Tenant.created_at.desc()).offset(skip).limit(limit).all()
    
    # Parse allowed_test_types JSON string to list for response
    for t in tenants:
        try:
            if isinstance(t.allowed_test_types, str):
                parsed = json.loads(t.allowed_test_types)
                # store back for response_model
                t.allowed_test_types = parsed
        except Exception:
            # fallback to default both JDT and SJT
            t.allowed_test_types = ["JDT", "SJT"]
    return tenants

@router.get("/{tenant_id}", response_model=TenantResponse)
async def get_tenant(
    tenant_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get tenant by ID"""
    
    try:
        tenant_uuid = uuid.UUID(tenant_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid tenant ID format"
        )
    
    # Check permissions
    if (current_user.role != "superadmin" and 
        str(current_user.tenant_id) != tenant_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    with UserContext(db, current_user):
        tenant = db.query(Tenant).filter(Tenant.id == tenant_uuid).first()
    
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found"
        )
    
    # Parse allowed_test_types for response
    try:
        if isinstance(tenant.allowed_test_types, str):
            tenant.allowed_test_types = json.loads(tenant.allowed_test_types)
    except Exception:
        tenant.allowed_test_types = ["JDT", "SJT"]
    return tenant

@router.put("/{tenant_id}", response_model=TenantResponse)
async def update_tenant(
    tenant_id: str,
    tenant_update: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_superadmin)
):
    """Update tenant (superadmin only)"""
    
    try:
        tenant_uuid = uuid.UUID(tenant_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid tenant ID format"
        )
    
    with UserContext(db, current_user):
        tenant = db.query(Tenant).filter(Tenant.id == tenant_uuid).first()
    
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found"
        )
    
    # Update tenant fields; serialize allowed_test_types if provided
    for field, value in tenant_update.items():
        if field == "allowed_test_types" and value is not None:
            setattr(tenant, field, json.dumps(value))
        elif hasattr(tenant, field):
            setattr(tenant, field, value)
    
    with UserContext(db, current_user):
        db.commit()
        db.refresh(tenant)
    
    # Parse allowed_test_types for response
    try:
        if isinstance(tenant.allowed_test_types, str):
            tenant.allowed_test_types = json.loads(tenant.allowed_test_types)
    except Exception:
        tenant.allowed_test_types = ["JDT", "SJT"]
    return tenant

@router.delete("/{tenant_id}")
async def delete_tenant(
    tenant_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_superadmin)
):
    """Delete tenant (superadmin only)"""
    
    try:
        tenant_uuid = uuid.UUID(tenant_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid tenant ID format"
        )
    
    with UserContext(db, current_user):
        tenant = db.query(Tenant).filter(Tenant.id == tenant_uuid).first()
    
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found"
        )
    
    # Soft delete
    tenant.is_active = False
    
    with UserContext(db, current_user):
        db.commit()
    
    return {"message": "Tenant deactivated successfully"}

@router.get("/{tenant_id}/users", response_model=List[UserResponse])
async def list_tenant_users(
    tenant_id: str,
    skip: int = 0,
    limit: int = 100,
    role: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List users in a tenant"""
    
    try:
        tenant_uuid = uuid.UUID(tenant_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid tenant ID format"
        )
    
    # Check permissions
    if (current_user.role != "superadmin" and 
        str(current_user.tenant_id) != tenant_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    with UserContext(db, current_user):
        query = db.query(User).filter(User.tenant_id == tenant_uuid)
        
        if role:
            query = query.filter(User.role == role)
        
        users = query.order_by(User.created_at.desc()).offset(skip).limit(limit).all()
    
    return users

@router.post("/{tenant_id}/users", response_model=UserResponse)
async def create_tenant_user(
    tenant_id: str,
    user_data: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new user in a tenant"""
    
    try:
        tenant_uuid = uuid.UUID(tenant_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid tenant ID format"
        )
    
    # Check permissions
    if current_user.role == "superadmin":
        # Superadmin can create users in any tenant
        pass
    elif (current_user.role == "admin" and 
          str(current_user.tenant_id) == tenant_id):
        # Admin can create users in their own tenant
        pass
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Verify tenant exists
    with UserContext(db, current_user):
        tenant = db.query(Tenant).filter(Tenant.id == tenant_uuid).first()
    
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found"
        )
    
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User with this email already exists"
        )
    
    # Create new user
    from app.auth import get_password_hash
    new_user = User(
        email=user_data.email,
        password_hash=get_password_hash(user_data.password),
        candidate_name=user_data.candidate_name,
        candidate_id=user_data.candidate_id,
        client_name=user_data.client_name,
        role=user_data.role,
        preferred_language=user_data.preferred_language,
        language_code=user_data.language_code,
        tenant_id=tenant_uuid
    )
    
    with UserContext(db, current_user):
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
    
    return new_user

@router.get("/{tenant_id}/statistics")
async def get_tenant_statistics(
    tenant_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get tenant statistics"""
    
    try:
        tenant_uuid = uuid.UUID(tenant_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid tenant ID format"
        )
    
    # Check permissions
    if (current_user.role != "superadmin" and 
        str(current_user.tenant_id) != tenant_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    from app.models import Submission
    from datetime import datetime, timedelta
    
    with UserContext(db, current_user):
        # Get basic counts
        total_users = db.query(User).filter(User.tenant_id == tenant_uuid).count()
        admin_users = db.query(User).filter(
            User.tenant_id == tenant_uuid,
            User.role == "admin"
        ).count()
        candidate_users = db.query(User).filter(
            User.tenant_id == tenant_uuid,
            User.role == "candidate"
        ).count()
        
        # Get submission statistics
        total_submissions = db.query(Submission).filter(
            Submission.tenant_id == tenant_uuid
        ).count()
        
        jdt_submissions = db.query(Submission).filter(
            Submission.tenant_id == tenant_uuid,
            Submission.test_type == "JDT"
        ).count()
        
        sjt_submissions = db.query(Submission).filter(
            Submission.tenant_id == tenant_uuid,
            Submission.test_type == "SJT"
        ).count()
        
        # Get recent activity (last 30 days)
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        recent_submissions = db.query(Submission).filter(
            Submission.tenant_id == tenant_uuid,
            Submission.created_at >= thirty_days_ago
        ).count()
        
        active_users = db.query(User).filter(
            User.tenant_id == tenant_uuid,
            User.last_login >= thirty_days_ago
        ).count()
    
    return {
        "tenant_id": tenant_id,
        "users": {
            "total": total_users,
            "admins": admin_users,
            "candidates": candidate_users,
            "active_last_30_days": active_users
        },
        "submissions": {
            "total": total_submissions,
            "jdt": jdt_submissions,
            "sjt": sjt_submissions,
            "last_30_days": recent_submissions
        }
    }