"""
Users API endpoints
Provides CRUD operations for users, including updating company (tenant) and role fields.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import uuid

from app.database import get_db
from app.auth import get_current_active_user, require_admin, require_superadmin
from app.models import User, Tenant, UserUpdate, UserResponse, UserCreate
from app.auth import get_password_hash

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/", response_model=List[UserResponse])
async def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """List users. Admins see users in their tenant; superadmins see all."""
    q = db.query(User)
    if current_user.role != 'superadmin':
        q = q.filter(User.tenant_id == current_user.tenant_id)
    users = q.order_by(User.created_at.desc()).limit(500).all()
    return users


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if current_user.role != 'superadmin' and user.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    return user


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Update a user. Allows changing company (tenant), role, and profile fields.

    Access rules:
    - Superadmin can update any user and move them across tenants.
    - Admin can update users only within their tenant; cannot move users to another tenant.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Admins are limited to their tenant users
    if current_user.role != 'superadmin' and user.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Forbidden")

    update_data = payload.dict(exclude_unset=True)

    # If tenant change is requested, validate and enforce permissions
    if 'tenant_id' in update_data and update_data['tenant_id'] is not None:
        new_tenant_id = str(update_data['tenant_id'])
        tenant = db.query(Tenant).filter(Tenant.id == new_tenant_id).first()
        if not tenant:
            raise HTTPException(status_code=404, detail="Target tenant not found")
        if current_user.role != 'superadmin':
            # Admins cannot move users to a different tenant
            if str(user.tenant_id) != new_tenant_id:
                raise HTTPException(status_code=403, detail="Admins cannot change user company")
        user.tenant_id = new_tenant_id

    # Update other allowed fields
    for field in (
        'email', 'candidate_name', 'candidate_id', 'client_name', 'role',
        'preferred_language', 'language_code', 'is_active'
    ):
        if field in update_data and update_data[field] is not None:
            setattr(user, field, update_data[field])

    db.commit()
    db.refresh(user)
    return user


@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Create a new user in the current tenant (admins) or any tenant (superadmin)."""
    # If admin, force tenant to their own unless explicitly set and matches
    tenant_id = str(payload.tenant_id) if payload.tenant_id else (str(current_user.tenant_id) if current_user.role != 'superadmin' else None)
    if tenant_id:
        tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
        if not tenant:
            raise HTTPException(status_code=404, detail="Tenant not found")
    # Check email uniqueness
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already in use")
    user = User(
        email=payload.email,
        password_hash=get_password_hash(payload.password),
        candidate_name=payload.candidate_name,
        candidate_id=payload.candidate_id,
        client_name=payload.client_name,
        role=payload.role,
        preferred_language=payload.preferred_language,
        language_code=payload.language_code,
        tenant_id=tenant_id
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.delete("/{user_id}")
async def delete_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if current_user.role != 'superadmin' and user.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    db.delete(user)
    db.commit()
    return {"message": "User deleted"}


@router.get("/by-email/{email}", response_model=UserResponse)
async def get_user_by_email(
    email: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if current_user.role != 'superadmin' and user.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    return user
