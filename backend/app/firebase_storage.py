"""
Firebase Storage service for media file management
Organizes files by tenant/user/submission/scenario structure
"""

import os
import uuid
from typing import Optional, Dict, Any
from datetime import datetime
import firebase_admin
from firebase_admin import credentials, storage
import logging

logger = logging.getLogger(__name__)

class FirebaseStorageManager:
    """
    Firebase Storage manager with organized file structure:
    
    Storage Structure:
    /trajectorie-media/
    ├── tenants/
    │   └── {tenant_id}/
    │       └── users/
    │           └── {user_id}/
    │               └── submissions/
    │                   └── {submission_id}/
    │                       ├── scenarios/
    │                       │   └── {scenario_id}/
    │                       │       ├── base/
    │                       │       │   ├── video.webm
    │                       │       │   └── audio.wav
    │                       │       └── followups/
    │                       │           ├── 1/
    │                       │           │   ├── video.webm
    │                       │           │   └── audio.wav
    │                       │           └── 2/
    │                       │               ├── video.webm
    │                       │               └── audio.wav
    │                       └── metadata.json
    """
    
    def __init__(self):
        self.bucket = None
        self._initialized = False
    
    def initialize(self):
        """Initialize Firebase Admin SDK if not already done"""
        if self._initialized:
            return
        
        try:
            # Check if Firebase is already initialized
            firebase_admin.get_app()
            logger.info("Firebase already initialized")
        except ValueError:
            # Initialize Firebase
            cred_path = os.getenv('FIREBASE_SERVICE_ACCOUNT_KEY_PATH')
            if cred_path and os.path.exists(cred_path):
                cred = credentials.Certificate(cred_path)
                firebase_admin.initialize_app(cred, {
                    'storageBucket': os.getenv('FIREBASE_STORAGE_BUCKET', 'trajectorie-uploads.appspot.com')
                })
                logger.info("Firebase initialized with service account")
            else:
                # Try to initialize with default credentials (for local development)
                try:
                    firebase_admin.initialize_app()
                    logger.info("Firebase initialized with default credentials")
                except Exception as e:
                    logger.warning(f"Could not initialize Firebase: {e}")
                    return
        
        try:
            self.bucket = storage.bucket()
            self._initialized = True
            logger.info("Firebase Storage bucket connected successfully")
        except Exception as e:
            logger.error(f"Failed to connect to Firebase Storage: {e}")
    
    def generate_file_path(
        self,
        tenant_id: str,
        user_id: str,
        submission_id: str,
        scenario_id: str,
        question_index: int,
        is_follow_up: bool = False,
        follow_up_sequence: int = 0,
        file_type: str = "video",
        file_extension: str = "webm"
    ) -> str:
        """
        Generate organized file path for Firebase Storage
        
        Args:
            tenant_id: Organization ID
            user_id: User ID
            submission_id: Submission ID
            scenario_id: SJT/JDT scenario ID
            question_index: Index of the question (0-based)
            is_follow_up: Whether this is a follow-up question
            follow_up_sequence: Sequence number for follow-up (1, 2, 3, etc.)
            file_type: 'video' or 'audio'
            file_extension: File extension (webm, mp4, wav, etc.)
        
        Returns:
            Organized file path for Firebase Storage
        """
        
        # Base path
        base_path = f"trajectorie-media/tenants/{tenant_id}/users/{user_id}/submissions/{submission_id}"
        
        # Scenario path
        scenario_path = f"{base_path}/scenarios/{scenario_id}"
        
        # Question type path
        if is_follow_up:
            question_path = f"{scenario_path}/followups/{follow_up_sequence}"
        else:
            question_path = f"{scenario_path}/base"
        
        # Final file path
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        file_path = f"{question_path}/{file_type}_{timestamp}.{file_extension}"
        
        return file_path
    
    def upload_media_file(
        self,
        file_data: bytes,
        file_path: str,
        content_type: str = "video/webm"
    ) -> Optional[str]:
        """
        Upload media file to Firebase Storage
        
        Args:
            file_data: File content as bytes
            file_path: Generated file path
            content_type: MIME type of the file
        
        Returns:
            Public URL of uploaded file or None if failed
        """
        if not self._initialized:
            self.initialize()
        
        if not self.bucket:
            logger.error("Firebase Storage not initialized")
            return None
        
        try:
            # Create blob and upload
            blob = self.bucket.blob(file_path)
            blob.upload_from_string(file_data, content_type=content_type)
            
            # Make the file publicly accessible
            blob.make_public()
            
            logger.info(f"File uploaded successfully: {file_path}")
            return blob.public_url
            
        except Exception as e:
            logger.error(f"Failed to upload file to Firebase Storage: {e}")
            return None
    
    def delete_media_file(self, file_path: str) -> bool:
        """Delete media file from Firebase Storage"""
        if not self._initialized:
            self.initialize()
        
        if not self.bucket:
            logger.error("Firebase Storage not initialized")
            return False
        
        try:
            blob = self.bucket.blob(file_path)
            blob.delete()
            logger.info(f"File deleted successfully: {file_path}")
            return True
        except Exception as e:
            logger.error(f"Failed to delete file from Firebase Storage: {e}")
            return False
    
    def get_submission_media_files(
        self,
        tenant_id: str,
        user_id: str,
        submission_id: str
    ) -> Dict[str, Any]:
        """
        Get all media files for a submission organized by scenarios
        
        Returns:
            Dictionary with organized file structure
        """
        if not self._initialized:
            self.initialize()
        
        if not self.bucket:
            logger.error("Firebase Storage not initialized")
            return {}
        
        try:
            prefix = f"trajectorie-media/tenants/{tenant_id}/users/{user_id}/submissions/{submission_id}/"
            blobs = self.bucket.list_blobs(prefix=prefix)
            
            organized_files = {}
            for blob in blobs:
                # Parse the path to organize files
                path_parts = blob.name.replace(prefix, "").split("/")
                if len(path_parts) >= 3:  # scenarios/scenario_id/type/file
                    scenario_id = path_parts[1]
                    question_type = path_parts[2]  # 'base' or 'followups'
                    
                    if scenario_id not in organized_files:
                        organized_files[scenario_id] = {}
                    
                    if question_type not in organized_files[scenario_id]:
                        organized_files[scenario_id][question_type] = []
                    
                    organized_files[scenario_id][question_type].append({
                        'path': blob.name,
                        'url': blob.public_url,
                        'size': blob.size,
                        'created': blob.time_created
                    })
            
            return organized_files
            
        except Exception as e:
            logger.error(f"Failed to list submission media files: {e}")
            return {}
    
    def create_submission_metadata(
        self,
        tenant_id: str,
        user_id: str,
        submission_id: str,
        metadata: Dict[str, Any]
    ) -> bool:
        """Create metadata file for a submission"""
        if not self._initialized:
            self.initialize()
        
        if not self.bucket:
            return False
        
        try:
            import json
            metadata_path = f"trajectorie-media/tenants/{tenant_id}/users/{user_id}/submissions/{submission_id}/metadata.json"
            blob = self.bucket.blob(metadata_path)
            blob.upload_from_string(json.dumps(metadata, indent=2), content_type="application/json")
            
            logger.info(f"Metadata created: {metadata_path}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to create submission metadata: {e}")
            return False


# Global instance
firebase_storage_manager = FirebaseStorageManager()


def get_firebase_storage() -> FirebaseStorageManager:
    """Get the global Firebase Storage manager instance"""
    return firebase_storage_manager


# Utility functions for common operations
def upload_scenario_media(
    tenant_id: str,
    user_id: str,
    submission_id: str,
    scenario_id: str,
    question_index: int,
    file_data: bytes,
    is_follow_up: bool = False,
    follow_up_sequence: int = 0,
    file_type: str = "video",
    file_extension: str = "webm",
    content_type: str = "video/webm"
) -> Optional[str]:
    """
    Upload scenario media file with proper organization
    
    Returns:
        Public URL of uploaded file or None if failed
    """
    storage_manager = get_firebase_storage()
    
    file_path = storage_manager.generate_file_path(
        tenant_id=tenant_id,
        user_id=user_id,
        submission_id=submission_id,
        scenario_id=scenario_id,
        question_index=question_index,
        is_follow_up=is_follow_up,
        follow_up_sequence=follow_up_sequence,
        file_type=file_type,
        file_extension=file_extension
    )
    
    return storage_manager.upload_media_file(file_data, file_path, content_type)