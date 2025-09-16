"""
SQLAlchemy Models for Trajectorie Assessment Platform
Multi-tenant assessment platform with role-based access control
"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from sqlalchemy import (
    Column, String, Integer, Boolean, DateTime, Text, 
    ForeignKey, CheckConstraint, UniqueConstraint, JSON,
    DECIMAL, BIGINT
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
    """Test submission and analysis results"""
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
    
    # Test data
    conversation_history = Column(JSON, nullable=False)
    analysis_result = Column(JSON)
    
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
    """Video/Audio file management"""
    __tablename__ = 'media_files'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    submission_id = Column(String(36), ForeignKey('submissions.id', ondelete='CASCADE'))
    
    # File metadata
    file_name = Column(String(255), nullable=False)
    file_path = Column(Text, nullable=False)
    file_type = Column(String(50), nullable=False)
    mime_type = Column(String(100))
    file_size = Column(BIGINT)
    
    # Question association
    question_index = Column(Integer, nullable=False)
    
    # Storage details
    storage_provider = Column(String(50), default='local')
    storage_url = Column(Text)
    
    # Constraints
    __table_args__ = (
        CheckConstraint("file_type IN ('video', 'audio')", name='check_file_type'),
        CheckConstraint("storage_provider IN ('local', 's3', 'firebase')", name='check_storage_provider'),
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
    preferred_language: Optional[str] = None
    language_code: Optional[str] = None
    is_active: Optional[bool] = None

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

def create_tables(engine):
    """Create all database tables"""
    Base.metadata.create_all(bind=engine)

def drop_tables(engine):
    """Drop all database tables"""
    Base.metadata.drop_all(bind=engine)