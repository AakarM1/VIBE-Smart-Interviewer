"""
SQLAlchemy Models for Trajectorie Assessment Platform
Multi-tenant assessment platform with role-based access control
"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from sqlalchemy import (
    Column, String, Integer, Boolean, DateTime, Text,
    ForeignKey, CheckConstraint, UniqueConstraint, JSON,
    DECIMAL, BIGINT, Index
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from pydantic import BaseModel, Field
import uuid

Base = declarative_base()

class TimestampMixin:
    """Mixin for created_at and updated_at timestamps"""
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

class Tenant(Base, TimestampMixin):
    """Company/Organization model for multi-tenancy"""
    __tablename__ = 'tenants'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    domain = Column(String(255))
    logo_url = Column(Text)
    custom_branding = Column(JSON)
    
    # Configuration overrides
    max_test_attempts = Column(Integer, default=3)
    allowed_test_types = Column(Text, default='["JDT", "SJT"]')  # JSON string for SQLite compatibility
    
    is_active = Column(Boolean, default=True)
    
    # Relationships
    users = relationship("User", back_populates="tenant", cascade="all, delete-orphan")
    submissions = relationship("Submission", back_populates="tenant", cascade="all, delete-orphan")
    configurations = relationship("Configuration", back_populates="tenant", cascade="all, delete-orphan")
    competency_dictionaries = relationship("CompetencyDictionary", back_populates="tenant", cascade="all, delete-orphan")
    test_templates = relationship("TestTemplate", back_populates="tenant", cascade="all, delete-orphan")

class User(Base, TimestampMixin):
    """User model with role-based access control"""
    __tablename__ = 'users'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    candidate_name = Column(String(255), nullable=False)
    candidate_id = Column(String(100), nullable=False)
    client_name = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False)
    
    # Multi-language support
    preferred_language = Column(String(10), default='en')
    language_code = Column(String(10), default='en')
    
    # Audit fields
    last_login = Column(DateTime(timezone=True))
    is_active = Column(Boolean, default=True)
    
    # Multi-tenant isolation
    tenant_id = Column(String(36), ForeignKey('tenants.id'))
    
    # Constraints
    __table_args__ = (
        CheckConstraint("role IN ('superadmin', 'admin', 'candidate')", name='check_user_role'),
        UniqueConstraint('candidate_id', 'client_name', name='unique_candidate_per_client'),
    )
    # Relationships
    tenant = relationship("Tenant", back_populates="users")
    submissions = relationship("Submission", back_populates="user", cascade="all, delete-orphan")
    user_sessions = relationship("UserSession", back_populates="user", cascade="all, delete-orphan")
    created_configurations = relationship("Configuration", foreign_keys="Configuration.created_by")
    created_templates = relationship("TestTemplate", foreign_keys="TestTemplate.created_by")
    audit_logs = relationship("AuditLog", back_populates="user")

class Submission(Base, TimestampMixin):
    """Test submission and analysis results with enhanced tracking"""
    __tablename__ = 'submissions'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey('users.id', ondelete='CASCADE'))
    tenant_id = Column(String(36), ForeignKey('tenants.id', ondelete='CASCADE'))
    
    # Basic submission info
    candidate_name = Column(String(255), nullable=False)
    candidate_id = Column(String(100), nullable=False)
    test_type = Column(String(10), nullable=False)
    # Multi-language support
    candidate_language = Column(String(10), default='en')
    ui_language = Column(String(10), default='en')
    
    # Test data with enhanced structure
    conversation_history = Column(JSON, nullable=False)
    analysis_result = Column(JSON)
    
    # Enhanced tracking
    total_questions = Column(Integer, default=0)
    base_questions = Column(Integer, default=0)  # Number of original scenario questions
    follow_up_questions = Column(Integer, default=0)  # Number of AI-generated follow-ups
    
    # Configuration snapshot (store the config used for this test)
    test_configuration = Column(JSON)  # Store SJT/JDT config used
    
    # Status tracking
    status = Column(String(50), default='submitted')
    analysis_completed = Column(Boolean, default=False)
    analysis_completed_at = Column(DateTime(timezone=True))
    
    # Constraints
    __table_args__ = (
        CheckConstraint("test_type IN ('JDT', 'SJT')", name='check_test_type'),
        CheckConstraint("status IN ('submitted', 'analyzing', 'completed', 'failed')", name='check_status'),
    )
    
    # Relationships
    user = relationship("User", back_populates="submissions")
    tenant = relationship("Tenant", back_populates="submissions")
    media_files = relationship("MediaFile", back_populates="submission", cascade="all, delete-orphan")

class MediaFile(Base, TimestampMixin):
    """Video/Audio file management with enhanced organization"""
    __tablename__ = 'media_files'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    submission_id = Column(String(36), ForeignKey('submissions.id', ondelete='CASCADE'))
    
    # File metadata
    file_name = Column(String(255), nullable=False)
    file_path = Column(Text, nullable=False)
    file_type = Column(String(50), nullable=False)
    mime_type = Column(String(100))
    file_size = Column(BIGINT)
    
    # Enhanced question and scenario association
    question_index = Column(Integer, nullable=False)
    scenario_id = Column(String(100))  # Maps to SJT scenario ID
    is_follow_up = Column(Boolean, default=False)
    follow_up_sequence = Column(Integer, default=0)  # 0 for base question, 1+ for follow-ups
    
    # Storage details with Firebase support
    storage_provider = Column(String(50), default='firebase')
    storage_url = Column(Text)  # Firebase Storage URL
    firebase_path = Column(Text)  # Path in Firebase Storage for organization
    
    # Processing status
    transcription_status = Column(String(50), default='pending')
    transcription_text = Column(Text)
    
    # Constraints
    __table_args__ = (
        CheckConstraint("file_type IN ('video', 'audio')", name='check_file_type'),
        CheckConstraint("storage_provider IN ('local', 's3', 'firebase')", name='check_storage_provider'),
        CheckConstraint("transcription_status IN ('pending', 'processing', 'completed', 'failed')", name='check_transcription_status'),
    )
    
    # Relationships
    submission = relationship("Submission", back_populates="media_files")

class Configuration(Base, TimestampMixin):
    """Test and system configuration"""
    __tablename__ = 'configurations'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String(36), ForeignKey('tenants.id', ondelete='CASCADE'))
    
    # Configuration type and scope
    config_type = Column(String(50), nullable=False)
    scope = Column(String(50), default='tenant')
    
    # Configuration data
    config_data = Column(JSON, nullable=False)
    
    # Versioning
    version = Column(Integer, default=1)
    is_active = Column(Boolean, default=True)
    
    # Audit fields
    created_by = Column(String(36), ForeignKey('users.id'))
    
    # Constraints
    __table_args__ = (
        CheckConstraint("config_type IN ('jdt', 'sjt', 'global')", name='check_config_type'),
        CheckConstraint("scope IN ('system', 'tenant')", name='check_scope'),
    )
    
    # Relationships
    tenant = relationship("Tenant", back_populates="configurations")
    creator = relationship("User", foreign_keys=[created_by])

class CompetencyDictionary(Base, TimestampMixin):
    """Competency definitions and mappings"""
    __tablename__ = 'competency_dictionaries'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String(36), ForeignKey('tenants.id', ondelete='CASCADE'))
    
    # Unique code/primary key for competency (human-friendly)
    competency_code = Column(String(100), nullable=False)
    # Competency details
    competency_name = Column(String(255), nullable=False)
    competency_description = Column(Text)
    meta_competency = Column(String(255))
    
    # Scoring parameters removed: max_score, weight
    
    # Multi-language support
    translations = Column(JSON)
    
    # Category and classification
    category = Column(String(100))
    industry = Column(String(100))
    role_category = Column(String(100))
    
    is_active = Column(Boolean, default=True)
    
    # Relationships
    tenant = relationship("Tenant", back_populates="competency_dictionaries")

    # Constraints
    __table_args__ = (
        UniqueConstraint('tenant_id', 'competency_code', name='ux_competency_tenant_code'),
    )

class TestTemplate(Base, TimestampMixin):
    """Predefined test configurations"""
    __tablename__ = 'test_templates'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String(36), ForeignKey('tenants.id', ondelete='CASCADE'))
    
    # Template metadata
    template_name = Column(String(255), nullable=False)
    template_description = Column(Text)
    test_type = Column(String(10), nullable=False)
    
    # Template configuration
    template_config = Column(JSON, nullable=False)
    
    # Competency mappings
    competency_mappings = Column(JSON)
    
    # Usage tracking
    usage_count = Column(Integer, default=0)
    last_used = Column(DateTime(timezone=True))
    
    # Audit fields
    created_by = Column(String(36), ForeignKey('users.id'))
    is_active = Column(Boolean, default=True)
    
    # Constraints
    __table_args__ = (
        CheckConstraint("test_type IN ('JDT', 'SJT')", name='check_template_test_type'),
    )
    
    # Relationships
    tenant = relationship("Tenant", back_populates="test_templates")
    creator = relationship("User", foreign_keys=[created_by])

class UserSession(Base, TimestampMixin):
    """User session management for JWT tokens"""
    __tablename__ = 'user_sessions'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey('users.id', ondelete='CASCADE'))
    
    # Session details
    session_token = Column(String(512), unique=True, nullable=False)
    refresh_token = Column(String(512), unique=True)
    
    # Session metadata
    ip_address = Column(String(45))
    user_agent = Column(Text)
    device_info = Column(JSON)
    
    # Session timing
    expires_at = Column(DateTime(timezone=True), nullable=False)
    last_activity = Column(DateTime(timezone=True), default=func.now())
    
    # Session status
    is_active = Column(Boolean, default=True)
    revoked_at = Column(DateTime(timezone=True))
    revoke_reason = Column(String(255))
    
    # Relationships
    user = relationship("User", back_populates="user_sessions")

class UserAssignment(Base, TimestampMixin):
    """Assignment of users to admins by superadmin"""
    __tablename__ = 'user_assignments'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    admin_id = Column(String(36), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    tenant_id = Column(String(36), ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False)
    
    # Assignment metadata
    assigned_by = Column(String(36), ForeignKey('users.id'), nullable=False)  # superadmin who made assignment
    is_active = Column(Boolean, default=True)
    notes = Column(Text)
    
    # Constraints
    __table_args__ = (
        UniqueConstraint('user_id', 'admin_id', name='ux_user_admin_assignment'),
    )
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id], backref="assigned_to_admin")
    admin = relationship("User", foreign_keys=[admin_id], backref="assigned_users")
    assigner = relationship("User", foreign_keys=[assigned_by])
    tenant = relationship("Tenant")

class TestAssignment(Base, TimestampMixin):
    """Assignment of specific tests to users by admin"""
    __tablename__ = 'test_assignments'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    admin_id = Column(String(36), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    tenant_id = Column(String(36), ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False)
    
    # Test details
    test_type = Column(String(10), nullable=False)  # 'SJT' or 'JDT'
    due_date = Column(DateTime(timezone=True))
    max_attempts = Column(Integer, default=3)
    
    # Status tracking
    status = Column(String(20), default='assigned')  # assigned, started, completed, overdue
    assigned_at = Column(DateTime(timezone=True), server_default=func.now())
    started_at = Column(DateTime(timezone=True))
    completed_at = Column(DateTime(timezone=True))
    
    # Configuration overrides
    custom_config = Column(JSON)  # Optional test-specific configuration
    notes = Column(Text)
    
    # Constraints
    __table_args__ = (
        CheckConstraint("test_type IN ('JDT', 'SJT')", name='check_assignment_test_type'),
        CheckConstraint("status IN ('assigned', 'started', 'completed', 'overdue', 'cancelled')", name='check_assignment_status'),
        UniqueConstraint('user_id', 'test_type', name='ux_user_test_assignment'),  # One assignment per test type per user
        Index('ix_test_assignments_user_test', 'user_id', 'test_type'),
    )
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id], backref="test_assignments")
    admin = relationship("User", foreign_keys=[admin_id])
    tenant = relationship("Tenant")

class TestAttempt(Base, TimestampMixin):
    """Discrete attempt of a test (SJT/JDT) by a user"""
    __tablename__ = 'test_attempts'

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    test_type = Column(String(10), nullable=False)  # JDT or SJT
    assignment_id = Column(String(36), ForeignKey('test_assignments.id', ondelete='SET NULL'))
    attempt_number = Column(Integer, nullable=False, default=1)
    status = Column(String(20), default='in_progress')  # in_progress, completed, cancelled
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True))
    max_questions = Column(Integer)
    questions_snapshot = Column(JSON)  # Immutable list of questions served to user
    attempt_metadata = Column(JSON)  # roleCategory, config version, etc.

    __table_args__ = (
        CheckConstraint("test_type IN ('JDT','SJT')", name='check_attempt_test_type'),
        CheckConstraint("status IN ('in_progress','completed','cancelled')", name='check_attempt_status'),
        UniqueConstraint('user_id', 'test_type', 'attempt_number', name='ux_user_test_attempt_number'),
        Index('ix_test_attempts_user_test_status', 'user_id', 'test_type', 'status'),
        Index('ix_test_attempts_user_test_number', 'user_id', 'test_type', 'attempt_number'),
    )

    user = relationship("User")
    assignment = relationship("TestAssignment")

class AuditLog(Base):
    """System audit trail"""
    __tablename__ = 'audit_logs'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey('users.id', ondelete='SET NULL'))
    tenant_id = Column(String(36), ForeignKey('tenants.id', ondelete='SET NULL'))
    
    # Action details
    action = Column(String(100), nullable=False)
    resource_type = Column(String(100), nullable=False)
    resource_id = Column(String(36))
    
    # Change tracking
    old_values = Column(JSON)
    new_values = Column(JSON)
    
    # Request metadata
    ip_address = Column(String(45))
    user_agent = Column(Text)
    
    # Audit fields
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="audit_logs")
    tenant = relationship("Tenant")

# =====================================================
# PYDANTIC MODELS FOR API SERIALIZATION
# =====================================================

from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr
    candidate_name: str
    candidate_id: str
    client_name: str
    role: str = Field(..., pattern="^(superadmin|admin|candidate)$")
    preferred_language: str = "en"
    language_code: str = "en"

class UserCreate(UserBase):
    password: str = Field(..., min_length=6)
    tenant_id: Optional[uuid.UUID] = None

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    candidate_name: Optional[str] = None
    candidate_id: Optional[str] = None
    client_name: Optional[str] = None
    role: Optional[str] = Field(None, pattern="^(superadmin|admin|candidate)$")
    preferred_language: Optional[str] = None
    language_code: Optional[str] = None
    is_active: Optional[bool] = None
    tenant_id: Optional[uuid.UUID] = None

class UserResponse(UserBase):
    id: uuid.UUID
    is_active: bool
    last_login: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    tenant_id: Optional[uuid.UUID]
    
    class Config:
        from_attributes = True

class TenantBase(BaseModel):
    name: str
    logo_url: Optional[str] = None
    custom_branding: Optional[Dict[str, Any]] = None
    max_test_attempts: int = 3
    allowed_test_types: List[str] = ["JDT", "SJT"]

class TenantCreate(TenantBase):
    pass

class TenantResponse(TenantBase):
    id: uuid.UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class SubmissionBase(BaseModel):
    candidate_name: str
    candidate_id: str
    test_type: str = Field(..., pattern="^(JDT|SJT)$")
    candidate_language: str = "en"
    ui_language: str = "en"
    conversation_history: List[Dict[str, Any]]

class SubmissionCreate(SubmissionBase):
    pass

class SubmissionUpdate(BaseModel):
    analysis_result: Optional[Dict[str, Any]] = None
    status: Optional[str] = Field(None, pattern="^(submitted|analyzing|completed|failed)$")
    analysis_completed: Optional[bool] = None

class SubmissionResponse(SubmissionBase):
    id: uuid.UUID
    user_id: uuid.UUID
    tenant_id: uuid.UUID
    analysis_result: Optional[Dict[str, Any]]
    status: str
    analysis_completed: bool
    analysis_completed_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class ConfigurationBase(BaseModel):
    config_type: str = Field(..., pattern="^(jdt|sjt|global)$")
    scope: str = Field("tenant", pattern="^(system|tenant)$")
    config_data: Dict[str, Any]

class ConfigurationCreate(ConfigurationBase):
    tenant_id: Optional[uuid.UUID] = None

class ConfigurationResponse(ConfigurationBase):
    id: uuid.UUID
    tenant_id: Optional[uuid.UUID]
    version: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    created_by: Optional[uuid.UUID]
    
    class Config:
        from_attributes = True

class LoginRequest(BaseModel):
    email: str
    password: str

class LoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse

class RefreshTokenRequest(BaseModel):
    refresh_token: str

# =====================================================
# UTILITY FUNCTIONS
# =====================================================

# Assignment Pydantic models
class UserAssignmentBase(BaseModel):
    user_id: uuid.UUID
    admin_id: uuid.UUID
    notes: Optional[str] = None

class UserAssignmentCreate(UserAssignmentBase):
    tenant_id: Optional[uuid.UUID] = None

class UserAssignmentResponse(UserAssignmentBase):
    id: uuid.UUID
    tenant_id: uuid.UUID
    assigned_by: uuid.UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class TestAssignmentBase(BaseModel):
    user_id: uuid.UUID
    test_type: str = Field(..., pattern="^(JDT|SJT)$")
    due_date: Optional[datetime] = None
    max_attempts: int = 3
    custom_config: Optional[Dict[str, Any]] = None
    notes: Optional[str] = None

class TestAssignmentCreate(TestAssignmentBase):
    pass

class TestAssignmentUpdate(BaseModel):
    status: Optional[str] = Field(None, pattern="^(assigned|started|completed|overdue|cancelled)$")
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    notes: Optional[str] = None

class TestAssignmentResponse(TestAssignmentBase):
    id: uuid.UUID
    admin_id: uuid.UUID
    tenant_id: uuid.UUID
    status: str
    assigned_at: datetime
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# Test attempt Pydantic models
class TestAttemptBase(BaseModel):
    test_type: str = Field(..., pattern="^(JDT|SJT)$")
    attempt_number: int
    status: str
    started_at: datetime
    completed_at: Optional[datetime]
    max_questions: Optional[int]

class TestAttemptResponse(TestAttemptBase):
    id: uuid.UUID
    user_id: uuid.UUID
    assignment_id: Optional[uuid.UUID]
    questions_snapshot: Optional[List[Any]]
    attempt_metadata: Optional[Dict[str, Any]]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class StartAttemptRequest(BaseModel):
    test_type: str = Field(..., pattern="^(JDT|SJT)$")
    role_category: Optional[str] = None  # For JDT selection

class StartAttemptResponse(BaseModel):
    attempt: TestAttemptResponse
    questions: List[Dict[str, Any]]
    can_start: bool
    remaining_attempts: int

class TestAvailabilityResponse(BaseModel):
    test_type: str
    assigned: bool
    configured: bool
    attempts_used: int
    max_attempts: int
    can_start: bool
    assignment_status: Optional[str]
    assigned_question_count: Optional[int] = None

# Bulk assignment requests
class BulkUserAssignmentRequest(BaseModel):
    user_ids: List[uuid.UUID]
    admin_id: uuid.UUID
    notes: Optional[str] = None

class BulkTestAssignmentRequest(BaseModel):
    user_ids: List[uuid.UUID]
    test_types: List[str] = Field(..., description="List of test types to assign (JDT, SJT)")
    due_date: Optional[datetime] = None
    max_attempts: int = 3
    notes: Optional[str] = None
    sjt_scenario_ids: Optional[List[str]] = Field(
        None,
        description="For SJT assignments, restrict to these scenario IDs (from tenant SJT config)."
    )

# Competency Pydantic models
class CompetencyBase(BaseModel):
    competency_code: str
    competency_name: str
    competency_description: Optional[str] = None
    meta_competency: Optional[str] = None
    translations: Optional[Dict[str, Any]] = None
    category: Optional[str] = None
    industry: Optional[str] = None
    role_category: Optional[str] = None
    is_active: bool = True

class CompetencyCreate(CompetencyBase):
    tenant_id: Optional[uuid.UUID] = None

class CompetencyUpdate(BaseModel):
    competency_name: Optional[str] = None
    competency_description: Optional[str] = None
    meta_competency: Optional[str] = None
    translations: Optional[Dict[str, Any]] = None
    category: Optional[str] = None
    industry: Optional[str] = None
    role_category: Optional[str] = None
    is_active: Optional[bool] = None

class CompetencyResponse(CompetencyBase):
    id: uuid.UUID
    tenant_id: Optional[uuid.UUID]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# =====================================================
# BULK USER GENERATION (SUPERADMIN)
# =====================================================

class GeneratedCredential(BaseModel):
    user_id: uuid.UUID
    email: EmailStr
    password: str

class BulkUserGenerateRequest(BaseModel):
    count: int = Field(..., gt=0, le=1000)
    email_prefix: str = Field(..., description="Prefix for email usernames e.g., CompanyA")
    email_domain: str = Field("gmail.com", description="Email domain e.g., gmail.com")
    name_prefix: Optional[str] = Field(None, description="Prefix for candidate_name, defaults to 'Candidate'")
    start_from: int = Field(1, ge=1, description="Starting index for numbering")
    use_fixed_password: bool = Field(False, description="If true, use fixed_password for all accounts")
    fixed_password: Optional[str] = Field(None, description="Password to use when use_fixed_password=true")

class BulkUserGenerateResponse(BaseModel):
    created: int
    credentials: List[GeneratedCredential]

def create_tables(engine):
    """Create all database tables"""
    Base.metadata.create_all(bind=engine)

def drop_tables(engine):
    """Drop all database tables"""
    Base.metadata.drop_all(bind=engine)