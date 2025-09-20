"""
User and Test Assignment API endpoints
Admin assigns tests to users. Superadmin no longer assigns users to admins directly;
instead, superadmin generates users per tenant and tenant admins manage test assignments.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.auth import get_current_user, require_superadmin, require_admin
from app.models import (
    User, UserAssignment, TestAssignment, Tenant,
    UserAssignmentCreate, UserAssignmentResponse,
    TestAssignmentCreate, TestAssignmentResponse, TestAssignmentUpdate,
    BulkUserAssignmentRequest, BulkTestAssignmentRequest
)
import uuid
from datetime import datetime

router = APIRouter(prefix="/assignments", tags=["assignments"])

# =====================================================
# (DEPRECATED) SUPERADMIN USER ASSIGNMENT ENDPOINTS
# Retained for backward compatibility but not recommended.
# =====================================================

@router.get("/users", response_model=List[UserAssignmentResponse])
async def get_user_assignments(
    admin_id: Optional[str] = None,
    user_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_superadmin)
):
    """Get all user assignments, optionally filtered by admin or user"""
    query = db.query(UserAssignment).filter(UserAssignment.is_active == True)
    
    if admin_id:
        query = query.filter(UserAssignment.admin_id == admin_id)
    if user_id:
        query = query.filter(UserAssignment.user_id == user_id)
    
    return query.all()

@router.post("/users/bulk", response_model=List[UserAssignmentResponse])
async def bulk_assign_users_to_admin(
    request: BulkUserAssignmentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_superadmin)
):
    """Assign multiple users to an admin (superadmin only) [Deprecated]"""
    # Verify admin exists and has admin role
    admin = db.query(User).filter(
        User.id == str(request.admin_id),
        User.role == "admin"
    ).first()
    if not admin:
        raise HTTPException(status_code=404, detail="Admin user not found")
    
    # Verify users exist and have candidate role
    users = db.query(User).filter(
        User.id.in_([str(uid) for uid in request.user_ids]),
        User.role == "candidate"
    ).all()
    if len(users) != len(request.user_ids):
        raise HTTPException(status_code=400, detail="Some users not found or not candidates")
    
    created_assignments = []
    for user in users:
        # Check if assignment already exists
        existing = db.query(UserAssignment).filter(
            UserAssignment.user_id == user.id,
            UserAssignment.admin_id == str(request.admin_id),
            UserAssignment.is_active == True
        ).first()
        
        if existing:
            continue  # Skip if already assigned
        
        # Create new assignment
        assignment = UserAssignment(
            id=str(uuid.uuid4()),
            user_id=user.id,
            admin_id=str(request.admin_id),
            tenant_id=user.tenant_id,
            assigned_by=current_user.id,
            notes=request.notes
        )
        db.add(assignment)
        created_assignments.append(assignment)
    
    db.commit()
    for assignment in created_assignments:
        db.refresh(assignment)
    
    return created_assignments

@router.delete("/users/{assignment_id}")
async def remove_user_assignment(
    assignment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_superadmin)
):
    """Remove user assignment (superadmin only)"""
    assignment = db.query(UserAssignment).filter(
        UserAssignment.id == assignment_id,
        UserAssignment.is_active == True
    ).first()
    
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    assignment.is_active = False
    db.commit()
    
    return {"message": "User assignment removed successfully"}

# =====================================================
# ADMIN TEST ASSIGNMENT ENDPOINTS
# =====================================================

@router.get("/tests", response_model=List[TestAssignmentResponse])
async def get_test_assignments(
    user_id: Optional[str] = None,
    test_type: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Get test assignments for admin's assigned users"""
    # Get user IDs assigned to this admin
    if current_user.role == "superadmin":
        # Superadmin can see all assignments
        query = db.query(TestAssignment)
    else:
        # Admin can only see assignments for their assigned users
        assigned_user_ids = db.query(UserAssignment.user_id).filter(
            UserAssignment.admin_id == current_user.id,
            UserAssignment.is_active == True
        ).subquery()
        
        query = db.query(TestAssignment).filter(
            TestAssignment.user_id.in_(assigned_user_ids)
        )
    
    if user_id:
        query = query.filter(TestAssignment.user_id == user_id)
    if test_type:
        query = query.filter(TestAssignment.test_type == test_type)
    if status:
        query = query.filter(TestAssignment.status == status)
    
    return query.all()

@router.post("/tests/bulk", response_model=List[TestAssignmentResponse])
async def bulk_assign_tests_to_users(
    request: BulkTestAssignmentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Assign tests to multiple users (admin only for their assigned users)"""
    # Verify admin has access to these users
    if current_user.role != "superadmin":
        assigned_user_ids = {
            row[0] for row in db.query(UserAssignment.user_id).filter(
                UserAssignment.admin_id == current_user.id,
                UserAssignment.is_active == True
            ).all()
        }
        
        requested_user_ids = {str(uid) for uid in request.user_ids}
        if not requested_user_ids.issubset(assigned_user_ids):
            raise HTTPException(status_code=403, detail="Cannot assign tests to users not assigned to you")
    
    # Verify users exist
    users = db.query(User).filter(
        User.id.in_([str(uid) for uid in request.user_ids]),
        User.role == "candidate"
    ).all()
    if len(users) != len(request.user_ids):
        raise HTTPException(status_code=400, detail="Some users not found or not candidates")
    
    created_assignments = []
    for user in users:
        for test_type in request.test_types:
            # Normalize test type to uppercase to match constraint (JDT/SJT)
            test_type = test_type.upper()
            if test_type not in ("JDT", "SJT"):
                continue
            # Check if assignment already exists
            existing = db.query(TestAssignment).filter(
                TestAssignment.user_id == user.id,
                TestAssignment.test_type == test_type
            ).first()
            
            if existing:
                continue  # Skip if already assigned
            
            # Create new test assignment
            assignment = TestAssignment(
                id=str(uuid.uuid4()),
                user_id=user.id,
                admin_id=current_user.id,
                tenant_id=user.tenant_id,
                test_type=test_type,
                status='assigned',  # Explicitly set status
                due_date=request.due_date,
                max_attempts=request.max_attempts,
                notes=request.notes,
                custom_config=(
                    { 'sjt_scenario_ids': request.sjt_scenario_ids }
                    if (test_type == 'SJT' and request.sjt_scenario_ids)
                    else None
                )
            )
            db.add(assignment)
            created_assignments.append(assignment)
    
    db.commit()
    for assignment in created_assignments:
        db.refresh(assignment)
    
    return created_assignments

@router.put("/tests/{assignment_id}", response_model=TestAssignmentResponse)
async def update_test_assignment(
    assignment_id: str,
    update_data: TestAssignmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Update test assignment status and details"""
    query = db.query(TestAssignment).filter(TestAssignment.id == assignment_id)
    
    # Admin can only update assignments for their assigned users
    if current_user.role != "superadmin":
        assigned_user_ids = db.query(UserAssignment.user_id).filter(
            UserAssignment.admin_id == current_user.id,
            UserAssignment.is_active == True
        ).subquery()
        
        query = query.filter(TestAssignment.user_id.in_(assigned_user_ids))
    
    assignment = query.first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Test assignment not found")
    
    # Update fields
    update_dict = update_data.dict(exclude_unset=True)
    for field, value in update_dict.items():
        setattr(assignment, field, value)
    
    assignment.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(assignment)
    
    return assignment

@router.delete("/tests/{assignment_id}")
async def remove_test_assignment(
    assignment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Remove test assignment"""
    query = db.query(TestAssignment).filter(TestAssignment.id == assignment_id)
    
    # Admin can only delete assignments for their assigned users
    if current_user.role != "superadmin":
        assigned_user_ids = db.query(UserAssignment.user_id).filter(
            UserAssignment.admin_id == current_user.id,
            UserAssignment.is_active == True
        ).subquery()
        
        query = query.filter(TestAssignment.user_id.in_(assigned_user_ids))
    
    assignment = query.first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Test assignment not found")
    
    db.delete(assignment)
    db.commit()
    
    return {"message": "Test assignment removed successfully"}

# =====================================================
# USER-FACING ENDPOINTS
# =====================================================

@router.get("/my-tests", response_model=List[TestAssignmentResponse])
async def get_my_assigned_tests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get tests assigned to the current user"""
    if current_user.role != "candidate":
        raise HTTPException(status_code=403, detail="Only candidates can view assigned tests")
    
    assignments = db.query(TestAssignment).filter(
    TestAssignment.user_id == current_user.id
    ).all()
    
    return assignments

@router.post("/my-tests/{assignment_id}/start")
async def start_assigned_test(
    assignment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark a test assignment as started"""
    if current_user.role != "candidate":
        raise HTTPException(status_code=403, detail="Only candidates can start tests")
    
    assignment = db.query(TestAssignment).filter(
    TestAssignment.id == assignment_id,
    TestAssignment.user_id == current_user.id,
        TestAssignment.status == "assigned"
    ).first()
    
    if not assignment:
        raise HTTPException(status_code=404, detail="Test assignment not found or already started")
    
    assignment.status = "started"
    assignment.started_at = datetime.utcnow()
    assignment.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(assignment)
    
    return {"message": "Test started successfully", "assignment": assignment}