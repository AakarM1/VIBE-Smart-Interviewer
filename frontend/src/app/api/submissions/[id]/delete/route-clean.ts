import { NextRequest, NextResponse } from 'next/server';
import { submissionService } from '@/lib/database';
import { getStorage, ref, listAll, deleteObject } from 'firebase/storage';
import app from '@/lib/firebase';
import { getPossibleFolderPaths } from '@/lib/folder-utils';

const storage = getStorage(app);

/**
 * DELETE /api/submissions/[id]/delete
 * 
 * Enhanced cascading deletion endpoint that removes both:
 * 1. Firestore submission document 
 * 2. All associated Firebase Storage files
 * 
 * This ensures complete data cleanup and prevents orphaned files.
 * Supports both user-named and submission-ID folder structures.
 */

/**
 * Find submission across both Firestore and localStorage
 */
async function findSubmissionAcrossStorage(submissionId: string): Promise<{
  submission: any;
  storageMode: 'firestore' | 'localStorage' | null;
  actualStoragePaths: string[];
}> {
  // Try Firestore first
  try {
    const firestoreSubmission = await submissionService.getById(submissionId);
    if (firestoreSubmission) {
      const storagePaths = extractStoragePathsFromSubmission(firestoreSubmission);
      return {
        submission: firestoreSubmission,
        storageMode: 'firestore',
        actualStoragePaths: storagePaths
      };
    }
  } catch (error) {
    console.log(`📝 Firestore search failed for ${submissionId}:`, error instanceof Error ? error.message : String(error));
  }

  // Try localStorage (Note: This won't work server-side, but we'll check for the pattern)
  // If it's a localStorage pattern, we know it exists there
  if (submissionId.match(/^sub_\d+_[a-z0-9]+$/)) {
    console.log(`📝 Detected localStorage pattern ID: ${submissionId}`);
    // Generate expected storage paths for localStorage submissions
    const expectedPaths = [`submissions/${submissionId}`];
    return {
      submission: { id: submissionId, storageMode: 'localStorage' },
      storageMode: 'localStorage',
      actualStoragePaths: expectedPaths
    };
  }

  return {
    submission: null,
    storageMode: null,
    actualStoragePaths: []
  };
}

/**
 * Extract storage folder paths from submission history URLs
 */
function extractStoragePathsFromSubmission(submission: any): string[] {
  const paths = new Set<string>();
  
  if (submission.history) {
    submission.history.forEach((entry: any) => {
      if (entry.videoDataUri?.includes('firebasestorage.googleapis.com')) {
        const match = entry.videoDataUri.match(/submissions%2F([^%]+?)%2F/);
        if (match) {
          const folderName = decodeURIComponent(match[1]);
          paths.add(`submissions/${folderName}`);
        }
      }
    });
  }
  
  return Array.from(paths);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const submissionId = params.id;
    
    if (!submissionId || typeof submissionId !== 'string') {
      console.error('❌ Invalid submission ID provided:', submissionId);
      return NextResponse.json(
        { error: 'Valid submission ID is required' },
        { status: 400 }
      );
    }

    console.log(`🗑️ Starting enhanced cascading deletion for submission: ${submissionId}`);

    // Step 1: Find submission across all storage modes
    const { submission, storageMode, actualStoragePaths } = await findSubmissionAcrossStorage(submissionId);
    
    if (!submission && actualStoragePaths.length === 0) {
      console.warn(`⚠️ Submission not found in any storage mode: ${submissionId}`);
      return NextResponse.json(
        { error: 'Submission not found in Firestore or localStorage pattern' },
        { status: 404 }
      );
    }

    console.log(`📍 Found submission in ${storageMode} mode with ${actualStoragePaths.length} storage paths`);

    let filesDeleted = 0;
    let storageErrors: string[] = [];
    let foldersFound: string[] = [];

    // Step 2: Generate all possible storage paths to check
    const allPathsToCheck = [
      ...actualStoragePaths,
      `submissions/${submissionId}`, // Current structure
      `submissions/temp_${submissionId}`, // Legacy temp structure
      `submissions/partials_${submissionId}` // Partial submissions
    ];
    
    // If we have submission with candidateName, also check user-named paths
    if (submission && submission.candidateName) {
      const userNamedPaths = getPossibleFolderPaths(submissionId, submission.candidateName);
      allPathsToCheck.push(...userNamedPaths);
    }
    
    // Remove duplicates
    const uniquePaths = [...new Set(allPathsToCheck)];
    console.log(`📁 Checking ${uniquePaths.length} possible folder paths:`, uniquePaths);
    
    // Step 3: Delete files from all possible storage locations
    for (const folderPath of uniquePaths) {
      try {
        // Remove trailing slash and get folder name for Firebase Storage ref
        const cleanFolderPath = folderPath.replace(/\/$/, '');
        const submissionFolderRef = ref(storage, cleanFolderPath);
        
        // List all files in this folder
        const listResult = await listAll(submissionFolderRef);
        
        console.log(`📁 Found ${listResult.items.length} files in ${cleanFolderPath}`);
        
        if (listResult.items.length > 0) {
          foldersFound.push(cleanFolderPath);
          
          // Delete all files in parallel for better performance
          const deletePromises = listResult.items.map(async (fileRef) => {
            try {
              await deleteObject(fileRef);
              console.log(`✅ Successfully deleted file: ${fileRef.fullPath}`);
              return { success: true, path: fileRef.fullPath };
            } catch (fileError) {
              const errorMsg = `Failed to delete ${fileRef.fullPath}: ${fileError instanceof Error ? fileError.message : String(fileError)}`;
              console.error(`❌ ${errorMsg}`);
              return { success: false, path: fileRef.fullPath, error: errorMsg };
            }
          });
          
          const deleteResults = await Promise.all(deletePromises);
          
          // Count successful deletions and collect errors
          const successfulDeletes = deleteResults.filter(result => result.success).length;
          filesDeleted += successfulDeletes;
          
          const folderErrors = deleteResults
            .filter(result => !result.success)
            .map(result => result.error || 'Unknown error');
          storageErrors.push(...folderErrors);
          
          console.log(`✅ Deleted ${successfulDeletes} files from ${cleanFolderPath}`);
          
          if (folderErrors.length > 0) {
            console.warn(`⚠️ Some files failed to delete from ${cleanFolderPath}:`, folderErrors);
          }
        } else {
          console.log(`📝 No files found in ${cleanFolderPath}`);
        }
        
      } catch (storageListError) {
        console.log(`📝 Folder ${folderPath} not accessible (likely doesn't exist):`, 
          storageListError instanceof Error ? storageListError.message : String(storageListError));
        // This is expected for one of the two possible paths, so we continue
      }
    }

    console.log(`🗄️ Storage deletion complete: ${filesDeleted} total files deleted`);
    
    if (storageErrors.length > 0) {
      console.warn(`⚠️ ${storageErrors.length} storage errors encountered:`, storageErrors);
    }

    // Step 4: Delete the submission document (only if in Firestore)
    let submissionDeleted = false;
    let submissionError = '';
    
    if (storageMode === 'firestore') {
      console.log(`🗄️ Deleting Firestore document: ${submissionId}`);
      const firestoreDeleteSuccess = await submissionService.delete(submissionId);
      
      if (!firestoreDeleteSuccess) {
        submissionError = 'Failed to delete submission from Firestore';
        console.error(`❌ ${submissionError}`);
      } else {
        submissionDeleted = true;
      }
    } else if (storageMode === 'localStorage') {
      // localStorage submissions can't be deleted server-side
      // Client will need to handle localStorage cleanup
      submissionDeleted = true;
      console.log(`📝 localStorage submission flagged for client-side deletion`);
    } else {
      submissionDeleted = true; // For orphaned files without submission record
      console.log(`📝 Orphaned files deleted without submission document`);
    }

    if (!submissionDeleted && submissionError) {
      return NextResponse.json(
        { 
          error: submissionError,
          details: 'Storage files deleted but submission document deletion failed',
          submissionId,
          storageMode,
          filesDeleted,
          foldersFound: foldersFound.length,
          storageErrors
        },
        { status: 500 }
      );
    }

    console.log(`✅ Successfully completed enhanced cascading deletion for: ${submissionId}`);
    
    const summary = {
      success: true,
      message: 'Enhanced cascading deletion completed successfully',
      submissionId,
      storageMode,
      submissionDeleted,
      filesDeleted,
      foldersFound: foldersFound.length,
      foldersChecked: uniquePaths.length,
      pathsChecked: uniquePaths,
      actualPathsFromUrls: actualStoragePaths,
      storageErrors: storageErrors.length > 0 ? storageErrors : undefined
    };

    console.log(`📊 Enhanced deletion summary:`, summary);
    return NextResponse.json(summary);

  } catch (error) {
    console.error('❌ Unexpected error during cascading deletion:', error);
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    console.error('❌ Error details:', { message: errorMessage, stack: errorStack });
    
    return NextResponse.json(
      { 
        error: 'Internal server error during deletion',
        details: errorMessage,
        submissionId: params.id
      },
      { status: 500 }
    );
  }
}

// Handle OPTIONS request for CORS preflight (following existing pattern)
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}
