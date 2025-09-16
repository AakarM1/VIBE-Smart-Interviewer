"""
Database configuration and connection management
Supports both SQLite (development) and PostgreSQL (production)
"""

import os
from sqlalchemy import create_engine, event
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool
from typing import Generator
import logging

logger = logging.getLogger(__name__)

# Database configuration
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./trajectorie.db")
TESTING = os.getenv("TESTING", "false").lower() == "true"

# Determine database type
if DATABASE_URL.startswith("postgresql"):
    # PostgreSQL configuration
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        pool_recycle=300,
        echo=os.getenv("SQL_ECHO", "false").lower() == "true"
    )
elif DATABASE_URL.startswith("sqlite"):
    # SQLite configuration
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        echo=os.getenv("SQL_ECHO", "false").lower() == "true"
    )
    
    # Enable foreign keys for SQLite
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()
else:
    raise ValueError(f"Unsupported database URL: {DATABASE_URL}")

# Session configuration
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Database dependency for FastAPI
def get_db() -> Generator[Session, None, None]:
    """Get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Test database configuration
def get_test_db():
    """Get test database session"""
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    
    test_engine = create_engine(
        "sqlite:///./test_trajectorie.db",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool
    )
    
    # Enable foreign keys for test SQLite
    @event.listens_for(test_engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()
    
    TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
    
    # Create tables
    from app.models import Base
    Base.metadata.create_all(bind=test_engine)
    
    db = TestSessionLocal()
    try:
        yield db
    finally:
        db.close()

# Database initialization
def init_database():
    """Initialize database with tables and default data"""
    from app.models import Base, User, Tenant
    import uuid
    
    logger.info("Initializing database...")
    
    # Create all tables
    Base.metadata.create_all(bind=engine)
    
    # Create default data
    db = SessionLocal()
    try:
        # Check if system tenant exists
        system_tenant = db.query(Tenant).filter(Tenant.name == "System").first()
        if not system_tenant:
            logger.info("Creating system tenant...")
            system_tenant = Tenant(
                id="00000000-0000-0000-0000-000000000001",
                name="System",
                domain="system.trajectorie.com"
            )
            db.add(system_tenant)
            db.commit()
            db.refresh(system_tenant)
        
        # Check if superadmin user exists
        superadmin = db.query(User).filter(User.email == "superadmin@gmail.com").first()
        if not superadmin:
            logger.info("Creating superadmin user...")
            from app.auth import get_password_hash
            superadmin = User(
                id="00000000-0000-0000-0000-000000000002",
                email="superadmin@gmail.com",
                password_hash=get_password_hash("superadmin123"),
                candidate_name="Super Administrator",
                candidate_id="SUPERADMIN001",
                client_name="System",
                role="superadmin",
                tenant_id=system_tenant.id
            )
            db.add(superadmin)
            db.commit()
            logger.info("Superadmin user created successfully")
        
        # Check if admin user exists
        admin = db.query(User).filter(User.email == "admin@gmail.com").first()
        if not admin:
            logger.info("Creating admin user...")
            from app.auth import get_password_hash
            admin = User(
                email="admin@gmail.com",
                password_hash=get_password_hash("admin123"),
                candidate_name="Admin User",
                candidate_id="ADMIN001",
                client_name="System",
                role="admin",
                tenant_id=system_tenant.id
            )
            db.add(admin)
            db.commit()
            logger.info("Admin user created successfully")
        
        logger.info("Database initialization completed")
        
    except Exception as e:
        logger.error(f"Error initializing database: {e}")
        db.rollback()
        raise
    finally:
        db.close()

# Database health check
def check_database_health() -> bool:
    """Check if database is accessible"""
    try:
        from sqlalchemy import text
        db = SessionLocal()
        # Try a simple query
        db.execute(text("SELECT 1"))
        db.close()
        return True
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        return False

# Database migration utilities
def run_migrations():
    """Run database migrations (placeholder for Alembic)"""
    # In production, you would use Alembic for migrations
    # For now, we'll just ensure all tables exist
    from app.models import Base
    Base.metadata.create_all(bind=engine)
    logger.info("Database migrations completed")

# Backup utilities
def backup_database(backup_path: str = None):
    """Backup database (SQLite only)"""
    if not DATABASE_URL.startswith("sqlite"):
        raise ValueError("Backup currently only supported for SQLite")
    
    import shutil
    from datetime import datetime
    
    if not backup_path:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_path = f"backup_trajectorie_{timestamp}.db"
    
    db_path = DATABASE_URL.replace("sqlite:///", "")
    shutil.copy2(db_path, backup_path)
    logger.info(f"Database backed up to: {backup_path}")
    return backup_path

# Environment-specific configurations
class DatabaseConfig:
    """Database configuration class"""
    
    def __init__(self):
        self.database_url = DATABASE_URL
        self.is_sqlite = DATABASE_URL.startswith("sqlite")
        self.is_postgresql = DATABASE_URL.startswith("postgresql")
        self.testing = TESTING
    
    def get_connection_info(self):
        """Get connection information"""
        return {
            "database_url": self.database_url,
            "database_type": "sqlite" if self.is_sqlite else "postgresql",
            "testing_mode": self.testing
        }

# Singleton instance
db_config = DatabaseConfig()

# Connection pooling for production
if db_config.is_postgresql:
    # PostgreSQL-specific optimizations
    engine = create_engine(
        DATABASE_URL,
        pool_size=20,
        max_overflow=0,
        pool_pre_ping=True,
        pool_recycle=300,
        echo=os.getenv("SQL_ECHO", "false").lower() == "true"
    )

# Logging configuration for database operations
logging.getLogger('sqlalchemy.engine').setLevel(
    logging.INFO if os.getenv("SQL_ECHO", "false").lower() == "true" else logging.WARNING
)