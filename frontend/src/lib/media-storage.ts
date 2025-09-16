/**
 * Media storage service for FastAPI backend
 * Replaces Firebase Storage with FastAPI file upload endpoints
 */

import { apiService } from '@/lib/api-service';

/**
 * Upload media blob to FastAPI backend
 * @param blob - The media blob (audio/video)
 * @param submissionId - The submission ID for organizing files
 * @param entryIndex - The question index
 * @param mediaType - 'audio' or 'video'
 * @param candidateName - Optional candidate name (for backward compatibility)
 * @returns Promise<string> - The file URL or storage path
 */
export async function uploadMediaToStorage(
  blob: Blob,
  submissionId: string,
  entryIndex: number,
  mediaType: 'audio' | 'video',
  candidateName?: string
): Promise<string> {
  try {
    const formData = new FormData();
    const fileName = `Q${entryIndex + 1}_${mediaType}.webm`;
    formData.append('file', blob, fileName);
    formData.append('submission_id', submissionId);
    formData.append('entry_index', entryIndex.toString());
    formData.append('media_type', mediaType);
    
    if (candidateName) {
      formData.append('candidate_name', candidateName);
    }

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'}/media/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    console.log(`✅ ${mediaType} uploaded to FastAPI backend: ${fileName}`);
    console.log(`📁 File stored at: ${result.file_path || result.url}`);
    
    return result.file_path || result.url || `/uploads/submissions/${submissionId}/${fileName}`;
  } catch (error) {
    console.error(`❌ Error uploading ${mediaType} to FastAPI backend:`, error);
    throw error;
  }
}

/**
 * Check if a data URI is too large for processing (500KB threshold)
 * @param dataUri - The data URI string
 * @returns boolean - True if the data URI is too large
 */
export function isDataUriTooLarge(dataUri: string): boolean {
  // Rough calculation: base64 encoding increases size by ~33%
  const estimatedSize = (dataUri.length * 3) / 4; // Convert from base64 to bytes
  const maxSizeBytes = 500 * 1024; // 500KB threshold
  
  return estimatedSize > maxSizeBytes;
}

/**
 * Convert data URI to blob
 * @param dataUri - The data URI string
 * @returns Promise<Blob> - The blob
 */
export function dataUriToBlob(dataUri: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      const response = fetch(dataUri);
      response.then(res => res.blob()).then(resolve).catch(reject);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Delete media files for a submission
 * @param submissionId - The submission ID
 * @returns Promise<boolean> - Success status
 */
export async function deleteSubmissionMedia(submissionId: string): Promise<boolean> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'}/media/submissions/${submissionId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`
      },
    });

    if (!response.ok) {
      throw new Error(`Delete failed: ${response.status} ${response.statusText}`);
    }

    console.log(`✅ Media files deleted for submission: ${submissionId}`);
    return true;
  } catch (error) {
    console.error(`❌ Error deleting media for submission ${submissionId}:`, error);
    return false;
  }
}
