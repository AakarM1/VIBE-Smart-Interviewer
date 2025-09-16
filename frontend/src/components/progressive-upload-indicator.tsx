/**
 * 🔒 MINIMAL IMPACT - Progressive Upload Indicator
 * Optional UI component that shows upload progress
 */

import React, { useEffect, useState } from 'react';
import { useProgressive } from '@/contexts/progressive-context';
import { Loader2, Check, AlertCircle } from 'lucide-react';

/**
 * ProgressiveUploadIndicator - Shows upload progress when enabled
 * This is a floating indicator that appears only during uploads
 */
export const ProgressiveUploadIndicator: React.FC = () => {
  const {
    isProgressiveUploadEnabled,
    isUploading,
    uploadProgress,
    lastSaveResult
  } = useProgressive();
  
  const [showIndicator, setShowIndicator] = useState(false);
  const [combinedProgress, setCombinedProgress] = useState(0);
  const [uploadType, setUploadType] = useState<'video' | 'audio' | null>(null);
  
  // Calculate combined progress from all active uploads
  useEffect(() => {
    if (!isProgressiveUploadEnabled || !uploadProgress || uploadProgress.size === 0) {
      setShowIndicator(false);
      return;
    }
    
    // Show indicator when upload is in progress
    setShowIndicator(isUploading);
    
    // Calculate overall progress
    let totalProgress = 0;
    let count = 0;
    let lastType: 'video' | 'audio' | null = null;
    
    uploadProgress.forEach((value) => {
      totalProgress += value.progress;
      count++;
      lastType = value.type;
    });
    
    const averageProgress = count > 0 ? Math.round(totalProgress / count) : 0;
    setCombinedProgress(averageProgress);
    setUploadType(lastType);
    
  }, [isProgressiveUploadEnabled, isUploading, uploadProgress]);
  
  // Auto-hide success indicator after 3 seconds
  useEffect(() => {
    if (!isUploading && combinedProgress >= 100) {
      const timeout = setTimeout(() => {
        setShowIndicator(false);
      }, 3000);
      
      return () => clearTimeout(timeout);
    }
  }, [isUploading, combinedProgress]);
  
  // Don't render if feature is disabled or nothing to show
  if (!isProgressiveUploadEnabled || !showIndicator) {
    return null;
  }
  
  return (
    <div className="fixed bottom-4 right-4 max-w-xs z-50 animate-fadeIn">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
        <div className="p-4 flex flex-col space-y-2">
          <div className="flex items-center justify-between">
            {isUploading ? (
              <>
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                  <span className="text-sm font-medium text-blue-700">
                    Uploading {uploadType || 'response'}...
                  </span>
                </div>
                <span className="text-xs font-bold text-blue-600">
                  {combinedProgress}%
                </span>
              </>
            ) : combinedProgress >= 100 ? (
              <div className="flex items-center space-x-2 w-full justify-between">
                <div className="flex items-center space-x-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-700">
                    Upload complete
                  </span>
                </div>
                <span className="text-xs font-bold text-green-600">
                  100%
                </span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-medium text-amber-700">
                  Upload paused
                </span>
              </div>
            )}
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div 
              className={`h-1.5 rounded-full transition-all duration-500 ${
                isUploading 
                  ? 'bg-blue-600' 
                  : combinedProgress >= 100 
                  ? 'bg-green-600' 
                  : 'bg-amber-500'
              }`} 
              style={{ width: `${combinedProgress}%` }}
            ></div>
          </div>
          
          {lastSaveResult && !lastSaveResult.success && (
            <div className="text-xs text-red-600 mt-1">
              {lastSaveResult.error || "Upload error. Will retry automatically."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
