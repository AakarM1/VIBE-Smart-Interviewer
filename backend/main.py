"""
Trajectorie Assessment Platform - FastAPI Backend
Multi-tenant assessment platform with role-based access control
"""

from fastapi import FastAPI, HTTPException, Depends, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
import logging
import uvicorn
import os
from pathlib import Path

# Import app modules
from app.database import get_db, init_database, check_database_health, db_config, engine
from app.db_migrations import run_migrations
from app.auth import (
    auth_manager, get_current_user, get_current_active_user,
    require_admin, require_superadmin, check_rate_limit
)
from app.models import (
    LoginRequest, LoginResponse, RefreshTokenRequest,
    UserCreate, UserResponse, UserUpdate
)
from pydantic import BaseModel, EmailStr
from app.api import api_router
from fastapi import Path
from sqlalchemy import func

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Trajectorie Assessment Platform API",
    description="Multi-tenant assessment platform with SJT and JDT tests",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Trusted hosts middleware
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["localhost", "127.0.0.1", "*.trajectorie.com"]
)

# Include API routes
app.include_router(api_router)

# Serve media files for local storage
if os.getenv("STORAGE_PROVIDER", "local") == "local":
    media_path = os.getenv("STORAGE_PATH", "./uploads")
    if os.path.exists(media_path):
        app.mount("/media", StaticFiles(directory=media_path), name="media")

# =====================================================
# STARTUP AND SHUTDOWN EVENTS
# =====================================================

@app.on_event("startup")
async def startup_event():
    """Initialize application on startup"""
    logger.info("Starting Trajectorie Assessment Platform API...")
    logger.info(f"Database configuration: {db_config.get_connection_info()}")
    
    # Initialize database
    try:
        init_database()
        logger.info("Database initialized successfully")
        # Run lightweight migrations (e.g., add competency_code column if missing)
        run_migrations(engine)
        logger.info("Database migrations applied")
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")
        raise
    
    # Check database health
    if not check_database_health():
        logger.error("Database health check failed!")
        raise Exception("Database is not accessible")
    
    logger.info("Application startup completed successfully")

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on application shutdown"""
    logger.info("Shutting down Trajectorie Assessment Platform API...")
    # Add any cleanup tasks here
    logger.info("Application shutdown completed")

# =====================================================
# EXCEPTION HANDLERS
# =====================================================

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle HTTP exceptions"""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.detail,
            "status_code": exc.status_code,
            "path": str(request.url)
        }
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle general exceptions"""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "status_code": 500,
            "path": str(request.url)
        }
    )

# =====================================================
# HEALTH CHECK ENDPOINTS
# =====================================================

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "database": "connected" if check_database_health() else "disconnected",
        "database_type": "sqlite" if db_config.is_sqlite else "postgresql"
    }

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Trajectorie Assessment Platform API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health"
    }

# =====================================================
# AUTHENTICATION ENDPOINTS
# =====================================================

@app.post("/auth/login", response_model=LoginResponse)
async def login(
    login_request: LoginRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """Authenticate user and return JWT tokens"""
    # Rate limiting
    check_rate_limit(request, max_attempts=5, window_minutes=15)
    
    try:
        result = auth_manager.authenticate_user(
            db, login_request.email, login_request.password, request
        )
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        logger.info(f"User {login_request.email} logged in successfully")
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error for {login_request.email}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed due to server error"
        )

@app.post("/auth/refresh", response_model=LoginResponse)
async def refresh_token(
    refresh_request: RefreshTokenRequest,
    db: Session = Depends(get_db)
):
    """Refresh access token using refresh token"""
    try:
        result = auth_manager.refresh_access_token(db, refresh_request.refresh_token)
        logger.info("Token refreshed successfully")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Token refresh error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Token refresh failed"
        )

class RegisterRequest(BaseModel):
    """Public registration request (candidate users only)"""
    email: EmailStr
    password: str
    candidate_name: str
    candidate_id: str
    client_name: str

@app.post("/auth/register", response_model=UserResponse)
async def register_user(
    req: RegisterRequest,
    db: Session = Depends(get_db)
):
    """Public registration for candidates if enabled via ALLOW_PUBLIC_REGISTRATION=true"""
    import os
    from app.models import User, Tenant
    from app.auth import get_password_hash
    
    allow_registration_env = os.getenv("ALLOW_PUBLIC_REGISTRATION", "false").lower() == "true"
    allow_registration = allow_registration_env

    # Try system global config if env not set
    if not allow_registration:
        try:
            from app.models import Configuration
            cfg = (
                db.query(Configuration)
                .filter(
                    Configuration.config_type == "global",
                    Configuration.scope == "system",
                    Configuration.is_active == True,
                )
                .order_by(Configuration.created_at.desc())
                .first()
            )
            if cfg and isinstance(cfg.config_data, dict):
                allow_registration = bool(cfg.config_data.get("allow_public_registration"))
        except Exception:
            # Ignore config read errors
            pass

    # In development environment, permit registration by default for convenience
    if not allow_registration and os.getenv("ENVIRONMENT", "development").lower() in ("dev", "development"):
        allow_registration = True

    if not allow_registration:
        raise HTTPException(status_code=403, detail="Public registration is disabled. Set ALLOW_PUBLIC_REGISTRATION=true or enable allow_public_registration in global config.")

    # Normalize email and check for existing (case-insensitive)
    normalized_email = req.email.strip().lower()
    existing = db.query(User).filter(func.lower(User.email) == normalized_email).first()
    if existing:
        raise HTTPException(status_code=409, detail="User with this email already exists (duplicate)")

    # Ensure we have a tenant to attach users to (use System)
    system_tenant = db.query(Tenant).filter(Tenant.name == "System").first()
    if not system_tenant:
        # Fallback: create a System tenant if missing
        system_tenant = Tenant(name="System", domain="system.trajectorie.com")
        db.add(system_tenant)
        db.commit()
        db.refresh(system_tenant)

    new_user = User(
        email=normalized_email,
        password_hash=get_password_hash(req.password),
        candidate_name=req.candidate_name,
        candidate_id=req.candidate_id,
        client_name=req.client_name,
        role="candidate",
        preferred_language="en",
        language_code="en",
        tenant_id=system_tenant.id,
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    logger.info(f"Candidate {new_user.email} registered successfully")
    return new_user

@app.post("/auth/logout")
async def logout(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Logout user and revoke session"""
    try:
        # Note: In a full implementation, you'd get the session token from the request
        # For now, we'll just return success
        logger.info(f"User {current_user.email} logged out")
        return {"message": "Logged out successfully"}
    except Exception as e:
        logger.error(f"Logout error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Logout failed"
        )

@app.get("/auth/me", response_model=UserResponse)
async def get_current_user_info(current_user: dict = Depends(get_current_active_user)):
    """Get current user information"""
    return current_user

# Convenience user lookup by email for frontend utilities
@app.get("/users/by-email/{email}", response_model=UserResponse)
async def get_user_by_email(
    email: EmailStr = Path(..., description="User email address"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """Lookup a user by email (admin or superadmin only)"""
    from app.models import User
    user = db.query(User).filter(User.email == str(email)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    # Admins can only see users in their tenant
    if current_user.role == "admin" and user.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Access denied")
    return user

# =====================================================
# USER MANAGEMENT ENDPOINTS
# =====================================================

@app.post("/users", response_model=UserResponse)
async def create_user(
    user_data: UserCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """Create a new user (admin only)"""
    from app.models import User
    from app.auth import get_password_hash
    
    # Normalize email and check if user already exists (case-insensitive)
    normalized_email = user_data.email.strip().lower()
    existing_user = db.query(User).filter(func.lower(User.email) == normalized_email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User with this email already exists"
        )
    
    # Create new user
    new_user = User(
        email=normalized_email,
        password_hash=get_password_hash(user_data.password),
        candidate_name=user_data.candidate_name,
        candidate_id=user_data.candidate_id,
        client_name=user_data.client_name,
        role=user_data.role,
        preferred_language=user_data.preferred_language,
        language_code=user_data.language_code,
        tenant_id=user_data.tenant_id or current_user.tenant_id
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    logger.info(f"User {new_user.email} created by {current_user.email}")
    return new_user

@app.get("/users", response_model=list[UserResponse])
async def list_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """List users (admin sees only assigned users, superadmin sees all)"""
    from app.models import User, UserAssignment
    
    query = db.query(User)
    
    if current_user.role == "superadmin":
        # Superadmin can see all users
        query = query.filter(User.tenant_id == current_user.tenant_id)
    elif current_user.role == "admin":
        # Admin can only see users assigned to them
        assigned_user_ids = db.query(UserAssignment.user_id).filter(
            UserAssignment.admin_id == current_user.id,
            UserAssignment.is_active == True
        ).subquery()
        
        query = query.filter(User.id.in_(assigned_user_ids))
    else:
        # Candidates see only themselves (shouldn't reach here due to require_admin)
        query = query.filter(User.id == current_user.id)
    
    users = query.offset(skip).limit(limit).all()
    return users

@app.get("/users/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """Get user by ID"""
    from app.models import User
    import uuid
    
    try:
        user_uuid = uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user ID format"
        )
    
    user = db.query(User).filter(User.id == user_uuid).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Check permissions
    if (current_user.role not in ["admin", "superadmin"] and 
        str(current_user.id) != user_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    if (current_user.role == "admin" and 
        current_user.tenant_id != user.tenant_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    return user

@app.put("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    user_update: UserUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """Update user (admin only)"""
    from app.models import User
    import uuid
    
    try:
        user_uuid = uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user ID format"
        )
    
    user = db.query(User).filter(User.id == user_uuid).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Check permissions
    if (current_user.role == "admin" and 
        current_user.tenant_id != user.tenant_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Update user fields
    update_data = user_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)
    
    db.commit()
    db.refresh(user)
    
    logger.info(f"User {user.email} updated by {current_user.email}")
    return user

@app.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """Delete user (admin only)"""
    from app.models import User
    import uuid
    
    try:
        user_uuid = uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user ID format"
        )
    
    user = db.query(User).filter(User.id == user_uuid).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Check permissions
    if (current_user.role == "admin" and 
        current_user.tenant_id != user.tenant_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Don't allow deleting yourself
    if str(user.id) == str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account"
        )
    
    db.delete(user)
    db.commit()
    
    logger.info(f"User {user.email} deleted by {current_user.email}")
    return {"message": "User deleted successfully"}

# =====================================================
# DEVELOPMENT ENDPOINTS
# =====================================================

if os.getenv("ENVIRONMENT") == "development":
    @app.get("/dev/seed-users")
    async def seed_test_users(db: Session = Depends(get_db)):
        """Seed test users for development"""
        from app.models import User, Tenant
        from app.auth import get_password_hash
        
        # Get or create test tenant
        test_tenant = db.query(Tenant).filter(Tenant.name == "Test Company").first()
        if not test_tenant:
            test_tenant = Tenant(name="Test Company", domain="test.com")
            db.add(test_tenant)
            db.commit()
            db.refresh(test_tenant)
        
        # Create test users
        test_users = [
            {
                "email": "candidate1@test.com",
                "name": "Alice Johnson",
                "id": "C001",
                "client": "TechCorp"
            },
            {
                "email": "candidate2@test.com",
                "name": "Bob Smith",
                "id": "C002",
                "client": "InnovateCo"
            },
            {
                "email": "candidate3@test.com",
                "name": "Carol Davis",
                "id": "C003",
                "client": "StartupXYZ"
            }
        ]
        
        created_users = []
        for user_data in test_users:
            existing_user = db.query(User).filter(User.email == user_data["email"]).first()
            if not existing_user:
                new_user = User(
                    email=user_data["email"],
                    password_hash=get_password_hash("password123"),
                    candidate_name=user_data["name"],
                    candidate_id=user_data["id"],
                    client_name=user_data["client"],
                    role="candidate",
                    tenant_id=test_tenant.id
                )
                db.add(new_user)
                created_users.append(user_data["email"])
        
        db.commit()
        
        return {
            "message": f"Created {len(created_users)} test users",
            "users": created_users
        }

# =====================================================
# RUN APPLICATION
# =====================================================

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
        log_level="info"
    )