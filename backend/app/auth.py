"""
JWT Authentication Module for Trajectorie Assessment Platform
Provides JWT token generation, validation, and role-based access control
"""

import jwt
import hashlib
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any, List
from fastapi import HTTPException, status, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy import and_
import uuid
import secrets
import logging

from app.models import User, UserSession, Tenant
from app.database import get_db

logger = logging.getLogger(__name__)

# JWT Configuration
SECRET_KEY = "your-secret-key-change-in-production"  # Change this in production!
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7

# Security
security = HTTPBearer()

class AuthManager:
    """Authentication and authorization manager"""
    
    def __init__(self):
        self.secret_key = SECRET_KEY
        self.algorithm = ALGORITHM
        self.access_token_expire_minutes = ACCESS_TOKEN_EXPIRE_MINUTES
        self.refresh_token_expire_days = REFRESH_TOKEN_EXPIRE_DAYS
    
    def hash_password(self, password: str) -> str:
        """Hash password using SHA-256 (upgrade to bcrypt in production)"""
        return hashlib.sha256(password.encode()).hexdigest()
    
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify password against hash"""
        return self.hash_password(plain_password) == hashed_password
    
    def create_access_token(self, data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
        """Create JWT access token"""
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.now(timezone.utc) + expires_delta
        else:
            expire = datetime.now(timezone.utc) + timedelta(minutes=self.access_token_expire_minutes)
        
        to_encode.update({"exp": expire, "type": "access"})
        encoded_jwt = jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)
        return encoded_jwt
    
    def create_refresh_token(self, data: Dict[str, Any]) -> str:
        """Create JWT refresh token"""
        to_encode = data.copy()
        expire = datetime.now(timezone.utc) + timedelta(days=self.refresh_token_expire_days)
        to_encode.update({"exp": expire, "type": "refresh"})
        encoded_jwt = jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)
        return encoded_jwt
    
    def verify_token(self, token: str, token_type: str = "access") -> Dict[str, Any]:
        """Verify and decode JWT token"""
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            if payload.get("type") != token_type:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail=f"Invalid token type. Expected {token_type}",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            return payload
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired",
                headers={"WWW-Authenticate": "Bearer"},
            )
        except jwt.JWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
    
    def authenticate_user(self, db: Session, email: str, password: str, request: Request = None) -> Optional[Dict[str, Any]]:
        """Authenticate user and create session"""
        user = db.query(User).filter(User.email == email, User.is_active == True).first()
        if not user or not self.verify_password(password, user.password_hash):
            return None
        
        # Update last login
        user.last_login = datetime.now(timezone.utc)
        
        # Clear existing active sessions for this user to avoid duplicates
        existing_sessions = db.query(UserSession).filter(
            UserSession.user_id == user.id,
            UserSession.is_active == True
        ).all()
        for session in existing_sessions:
            session.is_active = False
            session.revoked_at = datetime.now(timezone.utc)
            session.revoke_reason = "New login session"
        
        # Create session tokens
        access_token_data = {
            "user_id": str(user.id),
            "email": user.email,
            "role": user.role,
            "tenant_id": str(user.tenant_id) if user.tenant_id else None,
            "candidate_id": user.candidate_id,
            "client_name": user.client_name
        }
        
        access_token = self.create_access_token(access_token_data)
        refresh_token = self.create_refresh_token({"user_id": str(user.id)})

        # Token fingerprinting to avoid storing raw tokens and to ensure uniqueness without collisions
        def _fp(token: str) -> str:
            return "h:" + hashlib.sha256(token.encode()).hexdigest()
        
    # Store session in database by saving token fingerprints (sha256)
    # This avoids storing raw tokens and prevents UNIQUE collisions seen with short prefixes
        session = UserSession(
            user_id=user.id,
            session_token=_fp(access_token),
            refresh_token=_fp(refresh_token),
            ip_address=request.client.host if request else None,
            user_agent=request.headers.get("user-agent") if request else None,
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=self.access_token_expire_minutes),
            device_info={
                "ip": request.client.host if request else None,
                "user_agent": request.headers.get("user-agent") if request else None
            }
        )
        db.add(session)
        db.commit()
        db.refresh(user)
        
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "expires_in": self.access_token_expire_minutes * 60,
            "user": user
        }
    
    def refresh_access_token(self, db: Session, refresh_token: str) -> Dict[str, Any]:
        """Refresh access token using refresh token"""
        payload = self.verify_token(refresh_token, "refresh")
        user_id = payload.get("user_id")
        
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token",
            )
        
        # Verify session exists and is active
        # Backward-compatible matching: accept either old prefix slice or new hashed fingerprint
        from sqlalchemy import or_
        def _fp(token: str) -> str:
            return "h:" + hashlib.sha256(token.encode()).hexdigest()

        session = db.query(UserSession).filter(
            and_(
                or_(
                    UserSession.refresh_token == refresh_token[:50],
                    UserSession.refresh_token == _fp(refresh_token)
                ),
                UserSession.is_active == True,
                UserSession.expires_at > datetime.now(timezone.utc)
            )
        ).first()
        
        if not session:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired refresh token",
            )
        
        # Get user
        user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found or inactive",
            )
        
        # Create new access token
        access_token_data = {
            "user_id": str(user.id),
            "email": user.email,
            "role": user.role,
            "tenant_id": str(user.tenant_id) if user.tenant_id else None,
            "candidate_id": user.candidate_id,
            "client_name": user.client_name
        }
        
        new_access_token = self.create_access_token(access_token_data)

        # Update session to track the new access token (store fingerprint)
        session.session_token = "h:" + hashlib.sha256(new_access_token.encode()).hexdigest()
        session.expires_at = datetime.now(timezone.utc) + timedelta(minutes=self.access_token_expire_minutes)
        session.last_activity = datetime.now(timezone.utc)
        
        db.commit()
        
        return {
            "access_token": new_access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "expires_in": self.access_token_expire_minutes * 60,
            "user": user
        }
    
    def revoke_session(self, db: Session, session_token: str) -> bool:
        """Revoke a user session"""
        from sqlalchemy import or_
        token_fp = "h:" + hashlib.sha256(session_token.encode()).hexdigest()
        session = db.query(UserSession).filter(
            or_(
                UserSession.session_token == session_token[:50],
                UserSession.session_token == token_fp
            )
        ).first()
        
        if session:
            session.is_active = False
            session.revoked_at = datetime.now(timezone.utc)
            session.revoke_reason = "User logout"
            db.commit()
            return True
        return False
    
    def cleanup_expired_sessions(self, db: Session) -> int:
        """Clean up expired sessions"""
        expired_sessions = db.query(UserSession).filter(
            UserSession.expires_at < datetime.now(timezone.utc)
        ).all()
        
        count = 0
        for session in expired_sessions:
            session.is_active = False
            session.revoked_at = datetime.now(timezone.utc)
            session.revoke_reason = "Token expired"
            count += 1
        
        db.commit()
        return count

# Initialize auth manager
auth_manager = AuthManager()

# Dependency functions for FastAPI
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """Get current authenticated user"""
    token = credentials.credentials
    payload = auth_manager.verify_token(token)
    user_id = payload.get("user_id")
    
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Verify session is still active
    # Support both legacy prefix matching and new hashed fingerprint matching
    from sqlalchemy import or_
    token_fp = "h:" + hashlib.sha256(token.encode()).hexdigest()
    session = db.query(UserSession).filter(
        and_(
            or_(
                UserSession.session_token == token[:50],
                UserSession.session_token == token_fp
            ),
            UserSession.is_active == True,
            UserSession.expires_at > datetime.now(timezone.utc)
        )
    ).first()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or invalid",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Update last activity
    session.last_activity = datetime.now(timezone.utc)
    db.commit()
    
    return user

async def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    """Get current active user"""
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

# Role-based access control decorators
def require_role(allowed_roles: List[str]):
    """Decorator to require specific roles"""
    def role_checker(current_user: User = Depends(get_current_active_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required roles: {allowed_roles}. Your role: {current_user.role}"
            )
        return current_user
    return role_checker

def require_superadmin(current_user: User = Depends(get_current_active_user)) -> User:
    """Require superadmin role"""
    if current_user.role != "superadmin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Superadmin access required"
        )
    return current_user

def require_admin(current_user: User = Depends(get_current_active_user)) -> User:
    """Require admin or superadmin role"""
    if current_user.role not in ["admin", "superadmin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user

def require_same_tenant(current_user: User = Depends(get_current_active_user)):
    """Decorator to ensure user can only access their tenant's data"""
    def tenant_checker(tenant_id: uuid.UUID, db: Session = Depends(get_db)) -> User:
        if current_user.role == "superadmin":
            return current_user  # Superadmin can access all tenants
        
        if current_user.tenant_id != tenant_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. You can only access your organization's data."
            )
        return current_user
    return tenant_checker

# Utility functions
def get_password_hash(password: str) -> str:
    """Hash password"""
    return auth_manager.hash_password(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password"""
    return auth_manager.verify_password(plain_password, hashed_password)

def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Create access token"""
    return auth_manager.create_access_token(data, expires_delta)

def create_refresh_token(data: Dict[str, Any]) -> str:
    """Create refresh token"""
    return auth_manager.create_refresh_token(data)

# Rate limiting (basic implementation)
class RateLimiter:
    """Simple in-memory rate limiter"""
    
    def __init__(self):
        self.attempts = {}
    
    def is_rate_limited(self, key: str, max_attempts: int = 5, window_minutes: int = 15) -> bool:
        """Check if a key is rate limited"""
        now = datetime.now(timezone.utc)
        window_start = now - timedelta(minutes=window_minutes)
        
        if key not in self.attempts:
            self.attempts[key] = []
        
        # Clean old attempts
        self.attempts[key] = [attempt for attempt in self.attempts[key] if attempt > window_start]
        
        if len(self.attempts[key]) >= max_attempts:
            return True
        
        self.attempts[key].append(now)
        return False

rate_limiter = RateLimiter()

def check_rate_limit(request: Request, max_attempts: int = 5, window_minutes: int = 15):
    """Check rate limit for IP address"""
    ip = request.client.host
    if rate_limiter.is_rate_limited(ip, max_attempts, window_minutes):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Too many attempts. Try again in {window_minutes} minutes."
        )

# Context manager for setting user context (for RLS)
class UserContext:
    """Set user context for database operations"""
    
    def __init__(self, db: Session, user: User):
        self.db = db
        self.user = user
    
    def __enter__(self):
        # Set PostgreSQL session variables for Row Level Security
        # Note: These are for PostgreSQL RLS, skip for SQLite
        if self.db.get_bind().dialect.name == 'postgresql':
            from sqlalchemy import text
            self.db.execute(text(f"SET app.current_user_id = '{self.user.id}'"))
            self.db.execute(text(f"SET app.current_user_role = '{self.user.role}'"))
            if self.user.tenant_id:
                self.db.execute(text(f"SET app.current_tenant_id = '{self.user.tenant_id}'"))
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        # Reset session variables  
        # Note: These are for PostgreSQL RLS, skip for SQLite
        if self.db.get_bind().dialect.name == 'postgresql':
            from sqlalchemy import text
            self.db.execute(text("RESET app.current_user_id"))
            self.db.execute(text("RESET app.current_user_role"))
            self.db.execute(text("RESET app.current_tenant_id"))

# Middleware for automatic context setting
async def set_user_context(request: Request, call_next):
    """Middleware to automatically set user context"""
    response = await call_next(request)
    return response