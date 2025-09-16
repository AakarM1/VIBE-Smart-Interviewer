import { NextRequest, NextResponse } from 'next/server';
import { submissionService } from '@/lib/database';

/**
 * DELETE /api/submissions/[id]/delete
 * 
 * Simplified deletion endpoint that removes submission documents
 * TODO: Integrate with FastAPI backend for file storage management
 */
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

    console.log(`🗑️ Starting deletion for submission: ${submissionId}`);

    // TODO: Replace with FastAPI backend integration
    // For now, attempt deletion through existing service
    const deletionSuccess = await submissionService.delete(submissionId);
    
    if (!deletionSuccess) {
      console.error(`❌ Failed to delete submission: ${submissionId}`);
      return NextResponse.json(
        { error: 'Failed to delete submission from database' },
        { status: 500 }
      );
    }

    console.log(`✅ Successfully deleted submission: ${submissionId}`);
    
    return NextResponse.json({
      success: true,
      message: 'Submission deleted successfully',
      submissionId,
      filesDeleted: 0, // TODO: Implement file deletion count when integrated with FastAPI
      storageMode: 'database'
    });

  } catch (error) {
    console.error('❌ Unexpected error during deletion:', error);
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    
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

// Handle OPTIONS request for CORS preflight
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
