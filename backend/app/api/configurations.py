"""
Configuration API endpoints for test and system configuration
"""

from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
import uuid

from app.database import get_db
from app.auth import get_current_active_user, require_admin, UserContext
from app.models import (
    Configuration, ConfigurationCreate, ConfigurationResponse,
    User
)

router = APIRouter(prefix="/configurations", tags=["configurations"])

@router.post("", response_model=ConfigurationResponse)
async def create_configuration(
    config_data: ConfigurationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Create or update configuration (admin only)"""
    
    # Determine tenant_id
    tenant_id = config_data.tenant_id or current_user.tenant_id
    
    # Only superadmin can create system-wide configurations
    if config_data.scope == "system" and current_user.role != "superadmin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only superadmin can create system-wide configurations"
        )
    
    # Check if configuration already exists
    with UserContext(db, current_user):
        existing_config = db.query(Configuration).filter(
            Configuration.tenant_id == tenant_id,
            Configuration.config_type == config_data.config_type,
            Configuration.is_active == True
        ).first()
    
    if existing_config:
        # Deactivate existing configuration
        existing_config.is_active = False
        existing_config.version += 1
    
    # Create new configuration
    new_config = Configuration(
        tenant_id=tenant_id,
        config_type=config_data.config_type,
        scope=config_data.scope,
        config_data=config_data.config_data,
        created_by=current_user.id,
        version=1 if not existing_config else existing_config.version + 1
    )
    
    with UserContext(db, current_user):
        db.add(new_config)
        db.commit()
        db.refresh(new_config)
    
    return new_config

@router.get("", response_model=List[ConfigurationResponse])
async def list_configurations(
    config_type: Optional[str] = None,
    scope: Optional[str] = None,
    active_only: bool = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List configurations"""
    
    with UserContext(db, current_user):
        query = db.query(Configuration)
        
        # Filter by tenant for non-superadmin users
        if current_user.role != "superadmin":
            query = query.filter(
                (Configuration.tenant_id == current_user.tenant_id) |
                (Configuration.scope == "system")
            )
        
        # Apply filters
        if config_type:
            query = query.filter(Configuration.config_type == config_type)
        if scope:
            query = query.filter(Configuration.scope == scope)
        if active_only:
            query = query.filter(Configuration.is_active == True)
        
        configurations = query.order_by(Configuration.created_at.desc()).all()
    
    return configurations

@router.get("/{config_id}", response_model=ConfigurationResponse)
async def get_configuration(
    config_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get configuration by ID"""
    
    try:
        config_uuid = uuid.UUID(config_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid configuration ID format"
        )
    
    with UserContext(db, current_user):
        configuration = db.query(Configuration).filter(Configuration.id == config_uuid).first()
    
    if not configuration:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Configuration not found"
        )
    
    # Check permissions
    if (current_user.role != "superadmin" and 
        configuration.tenant_id != current_user.tenant_id and
        configuration.scope != "system"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    return configuration

@router.get("/type/{config_type}", response_model=Optional[ConfigurationResponse])
async def get_configuration_by_type(
    config_type: str,
    tenant_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get active configuration by type"""
    
    if config_type not in ["jdt", "sjt", "global"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid configuration type"
        )
    
    # Determine which tenant to query
    target_tenant_id = current_user.tenant_id
    if tenant_id:
        if current_user.role != "superadmin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
        try:
            target_tenant_id = uuid.UUID(tenant_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid tenant ID format"
            )
    
    with UserContext(db, current_user):
        # First try to get tenant-specific configuration
        configuration = db.query(Configuration).filter(
            Configuration.tenant_id == target_tenant_id,
            Configuration.config_type == config_type,
            Configuration.is_active == True
        ).first()
        
        # If not found, try system-wide configuration
        if not configuration:
            configuration = db.query(Configuration).filter(
                Configuration.scope == "system",
                Configuration.config_type == config_type,
                Configuration.is_active == True
            ).first()
    
    return configuration


@router.put("/{config_id}", response_model=ConfigurationResponse)
async def update_configuration(
    config_id: str,
    config_data: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Update configuration (admin only)"""
    
    try:
        config_uuid = uuid.UUID(config_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid configuration ID format"
        )
    
    with UserContext(db, current_user):
        configuration = db.query(Configuration).filter(Configuration.id == config_uuid).first()
    
    if not configuration:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Configuration not found"
        )
    
    # Check permissions
    if (current_user.role != "superadmin" and 
        configuration.tenant_id != current_user.tenant_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Update configuration data
    configuration.config_data = config_data
    configuration.version += 1
    
    with UserContext(db, current_user):
        db.commit()
        db.refresh(configuration)
    
    return configuration

@router.delete("/{config_id}")
async def delete_configuration(
    config_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Delete configuration (admin only)"""
    
    try:
        config_uuid = uuid.UUID(config_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid configuration ID format"
        )
    
    with UserContext(db, current_user):
        configuration = db.query(Configuration).filter(Configuration.id == config_uuid).first()
    
    if not configuration:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Configuration not found"
        )
    
    # Check permissions
    if (current_user.role != "superadmin" and 
        configuration.tenant_id != current_user.tenant_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Soft delete by deactivating
    configuration.is_active = False
    
    with UserContext(db, current_user):
        db.commit()
    
    return {"message": "Configuration deactivated successfully"}

# SJT Configuration endpoints
@router.post("/sjt", response_model=ConfigurationResponse)
async def save_sjt_configuration(
    sjt_config: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Save SJT configuration"""
    
    config_data = ConfigurationCreate(
        config_type="sjt",
        scope="tenant",
        config_data=sjt_config,
        tenant_id=current_user.tenant_id
    )
    
    return await create_configuration(config_data, db, current_user)

@router.get("/sjt", response_model=Optional[ConfigurationResponse])
async def get_sjt_configuration(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get SJT configuration"""
    
    return await get_configuration_by_type("sjt", None, db, current_user)

# JDT Configuration endpoints
@router.post("/jdt", response_model=ConfigurationResponse)
async def save_jdt_configuration(
    jdt_config: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Save JDT configuration"""
    
    config_data = ConfigurationCreate(
        config_type="jdt",
        scope="tenant",
        config_data=jdt_config,
        tenant_id=current_user.tenant_id
    )
    
    return await create_configuration(config_data, db, current_user)

@router.get("/jdt", response_model=Optional[ConfigurationResponse])
async def get_jdt_configuration(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get JDT configuration"""
    
    return await get_configuration_by_type("jdt", None, db, current_user)

# Global Settings endpoints
@router.post("/global", response_model=ConfigurationResponse)
async def save_global_settings(
    global_settings: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Save global settings"""
    
    config_data = ConfigurationCreate(
        config_type="global",
        scope="system" if current_user.role == "superadmin" else "tenant",
        config_data=global_settings,
        tenant_id=None if current_user.role == "superadmin" else current_user.tenant_id
    )
    
    return await create_configuration(config_data, db, current_user)

@router.get("/global", response_model=Optional[ConfigurationResponse])
async def get_global_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get global settings"""
    
    return await get_configuration_by_type("global", None, db, current_user)