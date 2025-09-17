"""
Submissions API endpoints for test submission handling
"""

from fastapi import APIRouter, HTTPException, Depends, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
import uuid
import json
from datetime import datetime

from app.database import get_db
from app.auth import get_current_active_user, require_admin, UserContext
from app.models import (
    Submission, SubmissionCreate, SubmissionResponse, SubmissionUpdate,
    User, MediaFile
)
from app.storage import upload_media_file, get_media_url, storage_manager

router = APIRouter(prefix="/submissions", tags=["submissions"])

@router.post("", response_model=SubmissionResponse)
async def create_submission(
    submission_data: SubmissionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new test submission"""
    
    # Create submission (convert UUIDs to strings for SQLite compatibility)
    new_submission = Submission(
        user_id=str(current_user.id),
        tenant_id=str(current_user.tenant_id) if current_user.tenant_id else None,
        candidate_name=submission_data.candidate_name,
        candidate_id=submission_data.candidate_id or current_user.candidate_id,
        test_type=submission_data.test_type,
        candidate_language=submission_data.candidate_language,
        ui_language=submission_data.ui_language,
        conversation_history=submission_data.conversation_history,
        status="submitted"
    )
    
    with UserContext(db, current_user):
        db.add(new_submission)
        db.commit()
        db.refresh(new_submission)
    
    return new_submission

@router.get("", response_model=List[SubmissionResponse])
async def list_submissions(
    skip: int = 0,
    limit: int = 100,
    test_type: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List submissions with filtering"""
    
    with UserContext(db, current_user):
        query = db.query(Submission)
        
        # Filter by tenant for non-superadmin users
        if current_user.role != "superadmin":
            query = query.filter(Submission.tenant_id == str(current_user.tenant_id))
        
        # Filter by candidate for regular users
        if current_user.role == "candidate":
            query = query.filter(Submission.user_id == str(current_user.id))
        
        # Apply filters
        if test_type:
            query = query.filter(Submission.test_type == test_type)
        if status:
            query = query.filter(Submission.status == status)
        
        submissions = query.order_by(Submission.created_at.desc()).offset(skip).limit(limit).all()
    
    return submissions

@router.get("/{submission_id}", response_model=SubmissionResponse)
async def get_submission(
    submission_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get submission by ID"""
    
    try:
        submission_uuid = uuid.UUID(submission_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid submission ID format"
        )
    
    with UserContext(db, current_user):
        submission = db.query(Submission).filter(Submission.id == submission_uuid).first()
    
    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Submission not found"
        )
    
    # Check permissions
    if (current_user.role == "candidate" and 
        submission.user_id != current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    if (current_user.role == "admin" and 
        submission.tenant_id != current_user.tenant_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    return submission

@router.put("/{submission_id}", response_model=SubmissionResponse)
async def update_submission(
    submission_id: str,
    submission_update: SubmissionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Update submission (admin only)"""
    
    try:
        submission_uuid = uuid.UUID(submission_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid submission ID format"
        )
    
    with UserContext(db, current_user):
        submission = db.query(Submission).filter(Submission.id == submission_uuid).first()
    
    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Submission not found"
        )
    
    # Check permissions
    if (current_user.role == "admin" and 
        submission.tenant_id != current_user.tenant_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Update submission fields
    update_data = submission_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(submission, field, value)
    
    # Set analysis completion timestamp if status is being set to completed
    if submission_update.analysis_completed:
        submission.analysis_completed_at = datetime.utcnow()
    
    with UserContext(db, current_user):
        db.commit()
        db.refresh(submission)
    
    return submission

@router.delete("/{submission_id}")
async def delete_submission(
    submission_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Delete submission (admin only)"""
    
    try:
        submission_uuid = uuid.UUID(submission_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid submission ID format"
        )
    
    with UserContext(db, current_user):
        submission = db.query(Submission).filter(Submission.id == submission_uuid).first()
    
    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Submission not found"
        )
    
    # Check permissions
    if (current_user.role == "admin" and 
        submission.tenant_id != current_user.tenant_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    with UserContext(db, current_user):
        db.delete(submission)
        db.commit()
    
    return {"message": "Submission deleted successfully"}

@router.post("/{submission_id}/media")
async def upload_media_file_endpoint(
    submission_id: str,
    question_index: int = Form(...),
    file_type: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Upload media file for submission"""
    
    try:
        submission_uuid = uuid.UUID(submission_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid submission ID format"
        )
    
    # Validate file type
    if file_type not in ["video", "audio"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File type must be 'video' or 'audio'"
        )
    
    # Check if submission exists and user has access
    with UserContext(db, current_user):
        submission = db.query(Submission).filter(Submission.id == submission_uuid).first()
    
    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Submission not found"
        )
    
    if (current_user.role == "candidate" and 
        submission.user_id != current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Upload file using storage manager
    try:
        upload_result = await upload_media_file(file, submission_id, question_index, file_type)
        
        # Create media file record
        media_file = MediaFile(
            submission_id=submission.id,
            file_name=file.filename,
            file_path=upload_result["file_path"],
            file_type=file_type,
            mime_type=file.content_type,
            file_size=upload_result["file_size"],
            question_index=question_index,
            storage_provider=upload_result["storage_provider"],
            storage_url=upload_result.get("storage_url")
        )
        
        with UserContext(db, current_user):
            db.add(media_file)
            db.commit()
            db.refresh(media_file)
        
        return {
            "message": "Media file uploaded successfully",
            "media_file_id": str(media_file.id),
            "file_path": media_file.file_path,
            "storage_url": upload_result.get("storage_url"),
            "file_size": upload_result["file_size"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"File upload failed: {str(e)}"
        )

@router.get("/{submission_id}/media")
async def list_media_files(
    submission_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List media files for submission"""
    
    try:
        submission_uuid = uuid.UUID(submission_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid submission ID format"
        )
    
    # Check if submission exists and user has access
    with UserContext(db, current_user):
        submission = db.query(Submission).filter(Submission.id == submission_uuid).first()
    
    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Submission not found"
        )
    
    if (current_user.role == "candidate" and 
        submission.user_id != current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    with UserContext(db, current_user):
        media_files = db.query(MediaFile).filter(
            MediaFile.submission_id == submission_uuid
        ).order_by(MediaFile.question_index).all()
    
    return [
        {
            "id": str(media_file.id),
            "file_name": media_file.file_name,
            "file_type": media_file.file_type,
            "question_index": media_file.question_index,
            "file_path": media_file.file_path,
            "storage_url": media_file.storage_url or get_media_url(media_file.file_path),
            "created_at": media_file.created_at
        }
        for media_file in media_files
    ]

@router.get("/user/{user_id}/attempts/{test_type}")
async def get_user_attempt_count(
    user_id: str,
    test_type: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get number of attempts for a user and test type"""
    
    if test_type not in ["JDT", "SJT"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Test type must be 'JDT' or 'SJT'"
        )
    
    try:
        user_uuid = uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user ID format"
        )
    
    # Check permissions
    if (current_user.role == "candidate" and 
        str(current_user.id) != user_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    with UserContext(db, current_user):
        count = db.query(Submission).filter(
            Submission.user_id == user_uuid,
            Submission.test_type == test_type
        ).count()
    
    return {
        "user_id": user_id,
        "test_type": test_type,
        "attempt_count": count
    }

@router.get("/user/{user_id}/latest/{test_type}", response_model=Optional[SubmissionResponse])
async def get_latest_user_submission(
    user_id: str,
    test_type: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get latest submission for a user and test type"""
    
    if test_type not in ["JDT", "SJT"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Test type must be 'JDT' or 'SJT'"
        )
    
    try:
        user_uuid = uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user ID format"
        )
    
    # Check permissions
    if (current_user.role == "candidate" and 
        str(current_user.id) != user_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    with UserContext(db, current_user):
        submission = db.query(Submission).filter(
            Submission.user_id == user_uuid,
            Submission.test_type == test_type
        ).order_by(Submission.created_at.desc()).first()
    
    return submission