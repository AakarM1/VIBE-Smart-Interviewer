/**
 * 🔒 MINIMAL IMPACT PROGRESSIVE CONTEXT - Works alongside AuthContext
 * Provides progressive saving functionality without modifying existing auth flow
 */

'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { partialSubmissionService } from '@/lib/partial-submission-service';
import { featureFlags } from '@/lib/feature-flags';
import type { 
  PartialSubmission, 
  SessionRecovery, 
  ProgressInfo, 
  SaveResult 
} from '@/types/partial-submission';
import type { ConversationEntry } from '@/types';

interface ProgressiveContextType {
  // Session management
  currentSessionId: string | null;
  sessionProgress: ProgressInfo | null;
  
  // Progressive saving
  saveQuestionProgress: (
    questionIndex: number,
    questionData: ConversationEntry,
    interviewType: 'JDT' | 'SJT',
    totalQuestions: number
  ) => Promise<SaveResult>;
  
  // 🔒 MINIMAL IMPACT - Enhanced save with upload
  saveQuestionWithUpload: (
    questionIndex: number,
    questionData: ConversationEntry,
    interviewType: 'JDT' | 'SJT',
    totalQuestions: number,
    onUploadProgress?: (progress: number, type: 'video' | 'audio') => void
  ) => Promise<SaveResult>;
  
  // Session recovery
  checkForRecovery: () => Promise<SessionRecovery | null>;
  resumeSession: (sessionId: string) => Promise<boolean>;
  
  // Session control
  startNewSession: (interviewType: 'JDT' | 'SJT') => string;
  markSessionComplete: () => Promise<void>;
  
  // State
  isProgressiveSaveEnabled: boolean;
  isProgressiveUploadEnabled: boolean; // 🔒 NEW FLAG
  isSaving: boolean;
  isUploading: boolean; // 🔒 NEW STATE
  lastSaveResult: SaveResult | null;
  uploadProgress: Map<string, { progress: number; type: 'video' | 'audio' }>; // 🔒 NEW STATE
}

const ProgressiveContext = createContext<ProgressiveContextType | undefined>(undefined);

export const ProgressiveProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessionProgress, setSessionProgress] = useState<ProgressInfo | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false); // 🔒 NEW STATE
  const [lastSaveResult, setLastSaveResult] = useState<SaveResult | null>(null);
  const [uploadProgress, setUploadProgress] = useState<Map<string, { progress: number; type: 'video' | 'audio' }>>(new Map()); // 🔒 NEW STATE
  
  // Check if progressive save is enabled
  const isProgressiveSaveEnabled = featureFlags.isProgressiveSaveEnabled();
  const isProgressiveUploadEnabled = featureFlags.isProgressiveSaveEnabled(); // 🔒 Use same flag for now
  
  /**
   * 🔒 MINIMAL IMPACT - Enhanced save with progressive upload
   * This is a new method that doesn't affect existing functionality
   */
  const saveQuestionWithUpload = async (
    questionIndex: number,
    questionData: ConversationEntry,
    interviewType: 'JDT' | 'SJT',
    totalQuestions: number,
    onUploadProgress?: (progress: number, type: 'video' | 'audio') => void
  ): Promise<SaveResult> => {
    // Fallback to regular save if upload is disabled
    if (!isProgressiveUploadEnabled) {
      return saveQuestionProgress(questionIndex, questionData, interviewType, totalQuestions);
    }
    
    if (!user || !currentSessionId) {
      console.warn('⚠️ [Progressive] No user or session ID available');
      return { 
        success: false, 
        error: 'No active session',
        shouldRetry: false 
      };
    }
    
    setIsSaving(true);
    setIsUploading(true);
    
    try {
      console.log(`📤 [Progressive] Saving question ${questionIndex + 1}/${totalQuestions} with upload`);
      
      // Track upload progress
      const progressKey = `${currentSessionId}_${questionIndex}`;
      
      const handleUploadProgress = (progress: number, type: 'video' | 'audio') => {
        setUploadProgress(prev => {
          const newMap = new Map(prev);
          newMap.set(progressKey, { progress, type });
          return newMap;
        });
        onUploadProgress?.(progress, type);
      };
      
      const result = await partialSubmissionService.saveQuestionAnswer({
        sessionId: currentSessionId,
        userId: user.id,
        candidateId: user.candidateId,
        candidateName: user.candidateName,
        interviewType,
        questionIndex,
        totalQuestions,
        questionData,
        uploadImmediately: true, // 🔒 Enable immediate upload
        onUploadProgress: handleUploadProgress
      });
      
      setLastSaveResult(result);
      
      if (result.success) {
        // Update session progress
        const progress = await partialSubmissionService.getSessionProgress(currentSessionId);
        setSessionProgress(progress);
        console.log('✅ [Progressive] Question saved with upload successfully');
        
        // Clear progress tracking
        setUploadProgress(prev => {
          const newMap = new Map(prev);
          newMap.delete(progressKey);
          return newMap;
        });
      }
      
      return result;
      
    } catch (error) {
      const errorResult: SaveResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        shouldRetry: true
      };
      
      setLastSaveResult(errorResult);
      return errorResult;
      
    } finally {
      setIsSaving(false);
      setIsUploading(false);
    }
  };
  
  /**
   * Save a question's progress
   */
  const saveQuestionProgress = async (
    questionIndex: number,
    questionData: ConversationEntry,
    interviewType: 'JDT' | 'SJT',
    totalQuestions: number
  ): Promise<SaveResult> => {
    // Return early if feature is disabled
    if (!isProgressiveSaveEnabled) {
      console.log('⚠️ [Progressive] Progressive save disabled, skipping...');
      return { success: true }; // Don't block the UI
    }
    
    if (!user || !currentSessionId) {
      console.warn('⚠️ [Progressive] No user or session ID available');
      return { 
        success: false, 
        error: 'No active session',
        shouldRetry: false 
      };
    }
    
    setIsSaving(true);
    
    try {
      console.log(`💾 [Progressive] Saving question ${questionIndex + 1}/${totalQuestions}`);
      
      const result = await partialSubmissionService.saveQuestionAnswer({
        sessionId: currentSessionId,
        userId: user.id,
        candidateId: user.candidateId,
        candidateName: user.candidateName,
        interviewType,
        questionIndex,
        totalQuestions,
        questionData
      });
      
      setLastSaveResult(result);
      
      if (result.success) {
        // Update session progress
        const progress = await partialSubmissionService.getSessionProgress(currentSessionId);
        setSessionProgress(progress);
        console.log('✅ [Progressive] Question saved successfully');
      }
      
      return result;
      
    } catch (error) {
      const errorResult: SaveResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        shouldRetry: true
      };
      
      setLastSaveResult(errorResult);
      return errorResult;
      
    } finally {
      setIsSaving(false);
    }
  };
  
  /**
   * Check for incomplete sessions that can be recovered
   */
  const checkForRecovery = async (): Promise<SessionRecovery | null> => {
    // Session recovery is disabled
    return null;
  };
  
  /**
   * Resume a recovered session
   */
  const resumeSession = async (sessionId: string): Promise<boolean> => {
    try {
      console.log('🔄 [Progressive] Resuming session:', sessionId);
      
      setCurrentSessionId(sessionId);
      
      const progress = await partialSubmissionService.getSessionProgress(sessionId);
      setSessionProgress(progress);
      
      console.log('✅ [Progressive] Session resumed successfully');
      return true;
      
    } catch (error) {
      console.error('❌ [Progressive] Error resuming session:', error);
      return false;
    }
  };
  
  /**
   * Start a new session
   */
  const startNewSession = (interviewType: 'JDT' | 'SJT'): string => {
    const sessionId = partialSubmissionService.generateSessionId();
    setCurrentSessionId(sessionId);
    setSessionProgress(null);
    setLastSaveResult(null);
    
    console.log('🚀 [Progressive] Started new session:', sessionId, 'for', interviewType);
    
    return sessionId;
  };
  
  /**
   * Mark the current session as complete
   */
  const markSessionComplete = async (): Promise<void> => {
    if (!currentSessionId) {
      return;
    }
    
    try {
      console.log('🏁 [Progressive] Marking session complete:', currentSessionId);
      
      await partialSubmissionService.markSessionComplete(currentSessionId);
      
      // Clear session state
      setCurrentSessionId(null);
      setSessionProgress(null);
      setLastSaveResult(null);
      
      console.log('✅ [Progressive] Session marked complete');
      
    } catch (error) {
      console.error('❌ [Progressive] Error marking session complete:', error);
    }
  };
  
  const value: ProgressiveContextType = {
    currentSessionId,
    sessionProgress,
    saveQuestionProgress,
    saveQuestionWithUpload, // 🔒 NEW METHOD
    checkForRecovery,
    resumeSession,
    startNewSession,
    markSessionComplete,
    isProgressiveSaveEnabled,
    isProgressiveUploadEnabled, // 🔒 NEW FLAG
    isSaving,
    isUploading, // 🔒 NEW STATE
    lastSaveResult,
    uploadProgress // 🔒 NEW STATE
  };
  
  return (
    <ProgressiveContext.Provider value={value}>
      {children}
    </ProgressiveContext.Provider>
  );
};

export const useProgressive = () => {
  const context = useContext(ProgressiveContext);
  if (context === undefined) {
    throw new Error('useProgressive must be used within a ProgressiveProvider');
  }
  return context;
};
