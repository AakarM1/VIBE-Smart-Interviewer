/**
 * 🔒 MINIMAL IMPACT ENHANCED SUBMIT BUTTON - Backward compatible
 * Works with both progressive and traditional saving modes
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Check, AlertCircle, Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SubmitState = 'ready' | 'saving' | 'saved' | 'error' | 'offline';

interface EnhancedSubmitButtonProps {
  onSubmit: () => Promise<void>;
  disabled?: boolean;
  isProcessing?: boolean; // For backward compatibility with existing code
  children?: React.ReactNode;
  className?: string;
  
  // Progressive saving props
  showProgressiveStates?: boolean; // Enable new progressive states
  saveResult?: { success: boolean; error?: string } | null;
  retryCount?: number;
  
  // 🔒 MINIMAL IMPACT - Upload progress props (optional)
  showUploadProgress?: boolean; // Enable upload progress indicators
  uploadProgress?: number; // 0-100 upload progress
  isUploading?: boolean; // Currently uploading
  uploadType?: 'video' | 'audio'; // Type of media being uploaded
  
  // Customization
  loadingText?: string;
  savedText?: string;
  errorText?: string;
  offlineText?: string;
  uploadingText?: string; // 🔒 NEW - Text for upload state
}

export const EnhancedSubmitButton: React.FC<EnhancedSubmitButtonProps> = ({
  onSubmit,
  disabled = false,
  isProcessing = false, // Backward compatibility
  children = 'Submit Answer',
  className,
  showProgressiveStates = false,
  saveResult = null,
  retryCount = 0,
  showUploadProgress = false, // 🔒 NEW
  uploadProgress = 0, // 🔒 NEW
  isUploading = false, // 🔒 NEW
  uploadType = 'video', // 🔒 NEW
  loadingText = 'Saving...',
  savedText = 'Saved ✓',
  errorText = 'Retry Submit',
  offlineText = 'Will save when online',
  uploadingText = 'Uploading...' // 🔒 NEW
}) => {
  const [currentState, setCurrentState] = useState<SubmitState>('ready');
  const [isOnline, setIsOnline] = useState(true);
  
  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    setIsOnline(navigator.onLine);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  // Update state based on props (progressive mode)
  useEffect(() => {
    if (!showProgressiveStates) {
      // Backward compatibility mode
      if (isProcessing) {
        setCurrentState('saving');
      } else {
        setCurrentState('ready');
      }
      return;
    }
    
    // 🔒 MINIMAL IMPACT - Handle upload states first
    if (showUploadProgress && isUploading) {
      setCurrentState('saving'); // Use existing 'saving' state for uploads
      return;
    }
    
    // Progressive mode - update based on save result
    if (saveResult) {
      if (saveResult.success) {
        setCurrentState('saved');
        
        // Auto-reset to ready after success
        const timer = setTimeout(() => {
          setCurrentState('ready');
        }, 2000);
        
        return () => clearTimeout(timer);
      } else {
        setCurrentState('error');
      }
    } else if (!isOnline) {
      setCurrentState('offline');
    }
  }, [isProcessing, saveResult, showProgressiveStates, isOnline, showUploadProgress, isUploading]); // 🔒 Added upload dependencies
  
  const handleClick = async () => {
    if (disabled || currentState === 'saving') {
      return;
    }
    
    if (showProgressiveStates) {
      setCurrentState('saving');
    }
    
    try {
      await onSubmit();
      
      if (!showProgressiveStates) {
        // In backward compatibility mode, don't change state
        // The parent component will handle isProcessing
      }
    } catch (error) {
      if (showProgressiveStates) {
        setCurrentState('error');
      }
    }
  };
  
  const getButtonContent = () => {
    switch (currentState) {
      case 'saving':
        // 🔒 MINIMAL IMPACT - Show upload progress if available
        if (showUploadProgress && isUploading && uploadProgress > 0) {
          return (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {uploadingText} ({Math.round(uploadProgress)}%)
            </>
          );
        }
        return (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {loadingText}
          </>
        );
      case 'saved':
        return (
          <>
            <Check className="mr-2 h-4 w-4" />
            {savedText}
          </>
        );
      case 'error':
        return (
          <>
            <AlertCircle className="mr-2 h-4 w-4" />
            {errorText}
            {retryCount > 0 && (
              <span className="ml-1 text-xs opacity-75">
                (Attempt {retryCount + 1})
              </span>
            )}
          </>
        );
      case 'offline':
        return (
          <>
            <WifiOff className="mr-2 h-4 w-4" />
            {offlineText}
          </>
        );
      default:
        return (
          <>
            {isOnline ? (
              <Wifi className="mr-2 h-4 w-4" />
            ) : (
              <WifiOff className="mr-2 h-4 w-4" />
            )}
            {children}
          </>
        );
    }
  };
  
  const getButtonVariant = () => {
    switch (currentState) {
      case 'saved':
        return 'default'; // Green-ish
      case 'error':
        return 'destructive'; // Red
      case 'offline':
        return 'secondary'; // Muted
      default:
        return 'default'; // Default blue
    }
  };
  
  const isButtonDisabled = disabled || currentState === 'saving' || (!isOnline && currentState === 'offline');
  
  return (
    <Button
      onClick={handleClick}
      disabled={isButtonDisabled}
      variant={getButtonVariant()}
      className={cn(
        'transition-all duration-300',
        currentState === 'saved' && 'bg-green-600 hover:bg-green-700',
        currentState === 'error' && 'animate-pulse',
        className
      )}
    >
      {getButtonContent()}
    </Button>
  );
};
