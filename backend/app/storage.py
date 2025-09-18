"""
Media Storage System for Trajectorie Assessment Platform
Supports local file storage, AWS S3, and Firebase Storage
"""

import os
import uuid
import aiofiles
from typing import Optional, BinaryIO, Union
from pathlib import Path
from fastapi import HTTPException, UploadFile
try:
    # Import boto3 lazily/optionally; only required for S3 provider
    import boto3  # type: ignore
    from botocore.exceptions import ClientError, NoCredentialsError  # type: ignore
except Exception:  # pragma: no cover - optional dependency
    boto3 = None  # type: ignore
    ClientError = Exception  # type: ignore
    NoCredentialsError = Exception  # type: ignore

try:
    # Import Firebase Storage manager
    from app.firebase_storage import get_firebase_storage
except ImportError:
    get_firebase_storage = None

import logging

logger = logging.getLogger(__name__)

class MediaStorageConfig:
    """Configuration for media storage"""
    
    def __init__(self):
        self.storage_provider = os.getenv("STORAGE_PROVIDER", "firebase")  # Default to Firebase
        self.local_storage_path = os.getenv("STORAGE_PATH", "./uploads")
        self.max_file_size = int(os.getenv("MAX_FILE_SIZE", "10485760"))  # 10MB default
        
        # S3 Configuration
        self.aws_access_key_id = os.getenv("AWS_ACCESS_KEY_ID")
        self.aws_secret_access_key = os.getenv("AWS_SECRET_ACCESS_KEY")
        self.aws_s3_bucket = os.getenv("AWS_S3_BUCKET")
        self.aws_s3_region = os.getenv("AWS_S3_REGION", "us-east-1")
        
        # Firebase Configuration
        self.firebase_storage_bucket = os.getenv("FIREBASE_STORAGE_BUCKET", "trajectorie-uploads.appspot.com")
        self.firebase_service_account_key = os.getenv("FIREBASE_SERVICE_ACCOUNT_KEY_PATH")
        
        # Allowed file types
        self.allowed_video_types = [
            "video/webm", "video/mp4", "video/avi", "video/mov", "video/wmv"
        ]
        self.allowed_audio_types = [
            "audio/webm", "audio/mp3", "audio/wav", "audio/m4a", "audio/ogg"
        ]

class MediaStorageManager:
    """Manager for handling media file storage operations"""
    
    def __init__(self, config: MediaStorageConfig = None):
        self.config = config or MediaStorageConfig()
        self.s3_client = None
        
        if self.config.storage_provider == "s3":
            self._init_s3_client()
        elif self.config.storage_provider == "local":
            self._init_local_storage()
        elif self.config.storage_provider == "firebase":
            # Lazy init via firebase helper when uploading
            # Ensure local temp exists for any fallback
            self._init_local_storage()
    
    def _init_s3_client(self):
        """Initialize S3 client"""
        try:
            if boto3 is None:
                raise ValueError("boto3 is not installed; cannot use S3 storage provider")
            if not all([self.config.aws_access_key_id, self.config.aws_secret_access_key, self.config.aws_s3_bucket]):
                raise ValueError("S3 credentials and bucket name are required")
            
            self.s3_client = boto3.client(
                's3',
                aws_access_key_id=self.config.aws_access_key_id,
                aws_secret_access_key=self.config.aws_secret_access_key,
                region_name=self.config.aws_s3_region
            )
            
            # Test S3 connection
            self.s3_client.head_bucket(Bucket=self.config.aws_s3_bucket)
            logger.info(f"S3 storage initialized successfully. Bucket: {self.config.aws_s3_bucket}")
            
        except (ClientError, NoCredentialsError, ValueError) as e:
            logger.error(f"Failed to initialize S3 storage: {e}")
            logger.info("Falling back to local storage")
            self.config.storage_provider = "local"
            self._init_local_storage()
    
    def _init_local_storage(self):
        """Initialize local storage"""
        try:
            storage_path = Path(self.config.local_storage_path)
            storage_path.mkdir(parents=True, exist_ok=True)
            
            # Create subdirectories
            (storage_path / "submissions").mkdir(exist_ok=True)
            (storage_path / "temp").mkdir(exist_ok=True)
            
            logger.info(f"Local storage initialized at: {storage_path.absolute()}")
            
        except Exception as e:
            logger.error(f"Failed to initialize local storage: {e}")
            raise
    
    def validate_file(self, file: UploadFile, file_type: str) -> bool:
        """Validate uploaded file"""
        if not file.filename:
            raise HTTPException(status_code=400, detail="No file selected")
        
        # Check file size
        if file.size and file.size > self.config.max_file_size:
            raise HTTPException(
                status_code=400, 
                detail=f"File too large. Maximum size: {self.config.max_file_size} bytes"
            )
        
        # Check file type
        allowed_types = (
            self.config.allowed_video_types if file_type == "video" 
            else self.config.allowed_audio_types
        )
        
        if file.content_type not in allowed_types:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file type. Allowed types for {file_type}: {allowed_types}"
            )
        
        return True
    
    async def upload_file(
        self, 
        file: UploadFile, 
        submission_id: str, 
        question_index: int, 
        file_type: str,
        *,
        tenant_id: Optional[str] = None,
        user_id: Optional[str] = None,
        scenario_id: Optional[str] = None,
        is_follow_up: bool = False,
        follow_up_sequence: int = 0
    ) -> dict:
        """Upload file to configured storage"""
        
        # Validate file
        self.validate_file(file, file_type)
        
        # Generate file path
        file_extension = Path(file.filename).suffix or ".webm"
        file_name = f"Q{question_index + 1}_{file_type}{file_extension}"
        folder_path = f"submissions/{submission_id}"
        full_path = f"{folder_path}/{file_name}"
        
        try:
            if self.config.storage_provider == "s3":
                return await self._upload_to_s3(file, full_path)
            elif self.config.storage_provider == "firebase":
                # Use organized path if we have the necessary context
                firebase_helper = get_firebase_storage if get_firebase_storage else None
                if firebase_helper is None:
                    logger.warning("Firebase storage helper not available; falling back to local storage")
                    return await self._upload_to_local(file, full_path)
                storage = firebase_helper()
                try:
                    from app.firebase_storage import FirebaseStorageManager  # type: ignore
                except Exception:
                    pass
                # Build organized path when possible
                if tenant_id and user_id and scenario_id:
                    # Remove leading dot from extension
                    ext = file_extension.lstrip('.')
                    firebase_path = storage.generate_file_path(
                        tenant_id=tenant_id,
                        user_id=user_id,
                        submission_id=submission_id,
                        scenario_id=scenario_id,
                        question_index=question_index,
                        is_follow_up=is_follow_up,
                        follow_up_sequence=follow_up_sequence,
                        file_type=file_type,
                        file_extension=ext
                    )
                else:
                    # Fallback simple path in Firebase bucket
                    from datetime import datetime
                    ts = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
                    firebase_path = f"trajectorie-media/submissions/{submission_id}/{file_type}_{ts}{file_extension}"

                # Read file content
                content = await file.read()
                url = storage.upload_media_file(content, firebase_path, content_type=file.content_type or "application/octet-stream")
                if not url:
                    raise RuntimeError("Firebase upload returned no URL")
                return {
                    "storage_provider": "firebase",
                    "file_path": firebase_path,
                    "firebase_path": firebase_path,
                    "storage_url": url,
                    "file_size": len(content)
                }
            else:
                return await self._upload_to_local(file, full_path)
                
        except Exception as e:
            logger.error(f"File upload failed: {e}")
            raise HTTPException(status_code=500, detail=f"File upload failed: {str(e)}")
    
    async def _upload_to_s3(self, file: UploadFile, file_path: str) -> dict:
        """Upload file to S3"""
        try:
            # Read file content
            content = await file.read()
            
            # Upload to S3
            self.s3_client.put_object(
                Bucket=self.config.aws_s3_bucket,
                Key=file_path,
                Body=content,
                ContentType=file.content_type,
                Metadata={
                    'original_filename': file.filename,
                    'upload_timestamp': str(uuid.uuid4())
                }
            )
            
            # Generate URL
            storage_url = f"https://{self.config.aws_s3_bucket}.s3.{self.config.aws_s3_region}.amazonaws.com/{file_path}"
            
            return {
                "storage_provider": "s3",
                "file_path": file_path,
                "storage_url": storage_url,
                "file_size": len(content)
            }
            
        except Exception as e:
            logger.error(f"S3 upload failed: {e}")
            raise
    
    async def _upload_to_local(self, file: UploadFile, file_path: str) -> dict:
        """Upload file to local storage"""
        try:
            full_local_path = Path(self.config.local_storage_path) / file_path
            full_local_path.parent.mkdir(parents=True, exist_ok=True)
            
            # Save file
            async with aiofiles.open(full_local_path, 'wb') as f:
                content = await file.read()
                await f.write(content)
            
            return {
                "storage_provider": "local",
                "file_path": str(full_local_path),
                "storage_url": f"/media/{file_path}",  # Relative URL for serving
                "file_size": len(content)
            }
            
        except Exception as e:
            logger.error(f"Local upload failed: {e}")
            raise
    
    async def delete_file(self, file_path: str) -> bool:
        """Delete file from storage"""
        try:
            if self.config.storage_provider == "s3":
                self.s3_client.delete_object(
                    Bucket=self.config.aws_s3_bucket,
                    Key=file_path
                )
                logger.info(f"File deleted from S3: {file_path}")
            elif self.config.storage_provider == "firebase":
                firebase_helper = get_firebase_storage if get_firebase_storage else None
                if firebase_helper is None:
                    logger.warning("Firebase storage helper not available; cannot delete from Firebase")
                    return False
                storage = firebase_helper()
                deleted = storage.delete_media_file(file_path)
                if deleted:
                    logger.info(f"File deleted from Firebase: {file_path}")
                else:
                    logger.warning(f"Failed to delete file from Firebase: {file_path}")
                return deleted
            else:
                full_path = Path(self.config.local_storage_path) / file_path
                if full_path.exists():
                    full_path.unlink()
                    logger.info(f"File deleted locally: {full_path}")
            
            return True
            
        except Exception as e:
            logger.error(f"File deletion failed: {e}")
            return False
    
    def get_file_url(self, file_path: str, expires_in: int = 3600) -> str:
        """Get accessible URL for file"""
        if self.config.storage_provider == "s3":
            try:
                # Generate presigned URL for S3
                url = self.s3_client.generate_presigned_url(
                    'get_object',
                    Params={'Bucket': self.config.aws_s3_bucket, 'Key': file_path},
                    ExpiresIn=expires_in
                )
                return url
            except Exception as e:
                logger.error(f"Failed to generate presigned URL: {e}")
                return ""
        elif self.config.storage_provider == "firebase":
            # For Firebase, URLs are generally stored as public URLs at upload time
            # Caller should prefer stored storage_url; if not available, return empty
            return ""
        else:
            # Return relative URL for local files
            return f"/media/{file_path}"
    
    async def get_file_info(self, file_path: str) -> dict:
        """Get file information"""
        try:
            if self.config.storage_provider == "s3":
                response = self.s3_client.head_object(
                    Bucket=self.config.aws_s3_bucket,
                    Key=file_path
                )
                return {
                    "exists": True,
                    "size": response['ContentLength'],
                    "last_modified": response['LastModified'],
                    "content_type": response.get('ContentType', ''),
                    "metadata": response.get('Metadata', {})
                }
            else:
                full_path = Path(self.config.local_storage_path) / file_path
                if full_path.exists():
                    stat = full_path.stat()
                    return {
                        "exists": True,
                        "size": stat.st_size,
                        "last_modified": stat.st_mtime,
                        "content_type": "",  # Would need python-magic for this
                        "metadata": {}
                    }
                else:
                    return {"exists": False}
                    
        except Exception as e:
            logger.error(f"Failed to get file info: {e}")
            return {"exists": False, "error": str(e)}

# Global storage manager instance
storage_manager = MediaStorageManager()

# Utility functions for easy use
async def upload_media_file(
    file: UploadFile, 
    submission_id: str, 
    question_index: int, 
    file_type: str,
    **kwargs
) -> dict:
    """Upload media file (convenience function)"""
    return await storage_manager.upload_file(file, submission_id, question_index, file_type, **kwargs)

async def delete_media_file(file_path: str) -> bool:
    """Delete media file (convenience function)"""
    return await storage_manager.delete_file(file_path)

def get_media_url(file_path: str, expires_in: int = 3600) -> str:
    """Get media file URL (convenience function)"""
    return storage_manager.get_file_url(file_path, expires_in)

async def get_media_info(file_path: str) -> dict:
    """Get media file info (convenience function)"""
    return await storage_manager.get_file_info(file_path)