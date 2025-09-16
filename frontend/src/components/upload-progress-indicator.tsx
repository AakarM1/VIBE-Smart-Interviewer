/**
 * 🔒 MINIMAL IMPACT COMPONENT - Upload progress indicator
 * This component can be optionally added to show upload progress
 * Does not affect existing UI if not used
 */

'use client';

import React from 'react';
import { CheckCircle, Loader2, Upload, AlertCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useProgressive } from '@/contexts/progressive-context';

interface UploadProgressIndicatorProps {
  questionIndex: number;
  compact?: boolean;
  showLabel?: boolean;
}

export const UploadProgressIndicator: React.FC<UploadProgressIndicatorProps> = ({ 
  questionIndex, 
  compact = false,
  showLabel = true 
}) => {
  const { currentSessionId, uploadProgress, isUploading, isProgressiveUploadEnabled } = useProgressive();
  
  // Don't render if progressive upload is disabled
  if (!isProgressiveUploadEnabled || !currentSessionId) {
    return null;
  }
  
  const progressKey = `${currentSessionId}_${questionIndex}`;
  const progress = uploadProgress.get(progressKey);
  
  // If no progress data and not currently uploading, assume completed or not started
  if (!progress && !isUploading) {
    return compact ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <div className="flex items-center gap-2 text-sm text-green-600">
        <CheckCircle className="h-4 w-4" />
        {showLabel && <span>Uploaded</span>}
      </div>
    );
  }
  
  // Show upload progress
  if (progress) {
    const isComplete = progress.progress >= 100;
    
    if (compact) {
      return isComplete ? (
        <CheckCircle className="h-4 w-4 text-green-500" />
      ) : (
        <div className="flex items-center gap-1">
          <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
          <span className="text-xs text-muted-foreground">{Math.round(progress.progress)}%</span>
        </div>
      );
    }
    
    return (
      <div className="flex items-center gap-2 text-sm">
        {isComplete ? (
          <>
            <CheckCircle className="h-4 w-4 text-green-500" />
            {showLabel && <span className="text-green-600">Upload Complete</span>}
          </>
        ) : (
          <>
            <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
            <div className="flex items-center gap-2">
              <Progress value={progress.progress} className="w-20" />
              <span className="text-muted-foreground">
                {Math.round(progress.progress)}%
              </span>
              {showLabel && (
                <span className="text-blue-600">
                  Uploading {progress.type}...
                </span>
              )}
            </div>
          </>
        )}
      </div>
    );
  }
  
  // Default state - ready to upload
  return compact ? (
    <Upload className="h-4 w-4 text-muted-foreground" />
  ) : (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Upload className="h-4 w-4" />
      {showLabel && <span>Ready to upload</span>}
    </div>
  );
};

/**
 * 🔒 MINIMAL IMPACT - Overall upload status for all questions
 */
export const OverallUploadProgress: React.FC<{
  totalQuestions: number;
  compact?: boolean;
}> = ({ totalQuestions, compact = false }) => {
  const { uploadProgress, isProgressiveUploadEnabled } = useProgressive();
  
  if (!isProgressiveUploadEnabled) {
    return null;
  }
  
  const totalUploads = uploadProgress.size;
  const completedUploads = Array.from(uploadProgress.values()).filter(p => p.progress >= 100).length;
  const averageProgress = totalUploads > 0 
    ? Array.from(uploadProgress.values()).reduce((sum, p) => sum + p.progress, 0) / totalUploads
    : 100;
  
  if (compact) {
    return (
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Upload className="h-3 w-3" />
        <span>{completedUploads}/{totalQuestions}</span>
      </div>
    );
  }
  
  const allComplete = completedUploads === totalQuestions && totalQuestions > 0;
  
  return (
    <div className="flex items-center gap-2 text-sm">
      {allComplete ? (
        <>
          <CheckCircle className="h-4 w-4 text-green-500" />
          <span className="text-green-600">All uploads complete</span>
        </>
      ) : totalUploads > 0 ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
          <Progress value={averageProgress} className="w-24" />
          <span className="text-blue-600">
            {completedUploads}/{totalQuestions} uploaded
          </span>
        </>
      ) : (
        <>
          <Upload className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Ready to upload</span>
        </>
      )}
    </div>
  );
};

export default UploadProgressIndicator;
