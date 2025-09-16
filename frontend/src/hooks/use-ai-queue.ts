/**
 * React Hook for Transcription Queue Management
 * 
 * Provides a React-friendly interface to the transcription queue with:
 * - Real-time status updates
 * - Automatic cleanup
 * - Error handling
 * - Progress tracking
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { getTranscriptionQueue, type QueuedAIRequest } from '@/lib/ai-queue';
import { type TranscribeAudioInput, type TranscribeAudioOutput } from '@/ai/flows/transcribe-audio';

export interface TranscriptionState {
  isQueued: boolean;
  isProcessing: boolean;
  isCompleted: boolean;
  isFailed: boolean;
  result?: TranscribeAudioOutput;
  error?: string;
  attempts: number;
  maxAttempts: number;
  queuePosition?: number;
  estimatedWaitTime?: number;
}

export interface UseTranscriptionQueueReturn {
  // State
  transcriptionState: TranscriptionState | null;
  queueStats: {
    queueSize: number;
    processing: number;
    completed: number;
  };
  
  // Actions
  queueTranscription: (
    input: TranscribeAudioInput,
    options?: {
      priority?: 'low' | 'normal' | 'high' | 'urgent';
      maxAttempts?: number;
    }
  ) => Promise<string>;
  cancelTranscription: (requestId: string) => boolean;
  clearCompleted: () => void;
  
  // Utilities
  getEstimatedWaitTime: (priority: 'low' | 'normal' | 'high' | 'urgent') => number;
}

export function useTranscriptionQueue(): UseTranscriptionQueueReturn {
  const [transcriptionState, setTranscriptionState] = useState<TranscriptionState | null>(null);
  const [queueStats, setQueueStats] = useState({ queueSize: 0, processing: 0, completed: 0 });
  const activeRequestId = useRef<string | null>(null);
  const queueService = useRef(getTranscriptionQueue());

  // Update queue stats periodically
  useEffect(() => {
    const updateStats = () => {
      const stats = queueService.current.getQueueStats();
      setQueueStats({
        queueSize: stats.queueSize,
        processing: stats.processing,
        completed: stats.completed
      });
    };

    updateStats();
    const interval = setInterval(updateStats, 2000); // Update every 2 seconds

    return () => clearInterval(interval);
  }, []);

  const queueTranscription = useCallback(async (
    input: TranscribeAudioInput,
    options: {
      priority?: 'low' | 'normal' | 'high' | 'urgent';
      maxAttempts?: number;
    } = {}
  ): Promise<string> => {
    
    // Clear any existing state
    setTranscriptionState(null);
    
    const requestId = await queueService.current.queueTranscription(input, {
      priority: options.priority || 'normal',
      maxAttempts: options.maxAttempts || 3,
      
      onProgress: (status: QueuedAIRequest) => {
        const newState: TranscriptionState = {
          isQueued: status.status === 'queued' || status.status === 'retry_scheduled',
          isProcessing: status.status === 'processing',
          isCompleted: status.status === 'completed',
          isFailed: status.status === 'failed',
          result: status.result,
          error: status.error,
          attempts: status.attempts,
          maxAttempts: status.maxAttempts,
        };

        // Calculate queue position and estimated wait time
        if (status.status === 'queued') {
          const stats = queueService.current.getQueueStats();
          newState.queuePosition = calculateQueuePosition(requestId, status.priority);
          newState.estimatedWaitTime = estimateWaitTime(newState.queuePosition || 0, stats.processing);
        }

        setTranscriptionState(newState);
      },
      
      onComplete: (result: TranscribeAudioOutput) => {
        console.log('✅ [useTranscriptionQueue] Transcription completed');
      },
      
      onError: (error: string) => {
        console.error('❌ [useTranscriptionQueue] Transcription failed:', error);
      }
    });

    activeRequestId.current = requestId;
    
    return requestId;
  }, []);

  const cancelTranscription = useCallback((requestId: string): boolean => {
    const success = queueService.current.cancelRequest(requestId);
    if (success && activeRequestId.current === requestId) {
      setTranscriptionState(null);
      activeRequestId.current = null;
    }
    return success;
  }, []);

  const clearCompleted = useCallback(() => {
    queueService.current.clearCompleted();
  }, []);

  const getEstimatedWaitTime = useCallback((priority: 'low' | 'normal' | 'high' | 'urgent'): number => {
    const stats = queueService.current.getQueueStats();
    const averageProcessingTime = 10; // seconds - adjust based on actual data
    
    // Estimate based on queue position for this priority level
    const position = calculateQueuePosition('temp', priority);
    const concurrentSlots = Math.max(1, 3 - stats.processing); // 3 is max concurrent
    
    return Math.ceil((position / concurrentSlots) * averageProcessingTime);
  }, []);

  // Helper function to calculate queue position based on priority
  const calculateQueuePosition = (requestId: string, priority: string): number => {
    const stats = queueService.current.getQueueStats();
    const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
    const requestPriorityLevel = priorityOrder[priority as keyof typeof priorityOrder];
    
    // Simplified calculation - in reality, you'd get this from the queue service
    let position = 1;
    Object.entries(stats.priorityBreakdown || {}).forEach(([p, count]) => {
      const pLevel = priorityOrder[p as keyof typeof priorityOrder];
      if (pLevel < requestPriorityLevel) {
        position += Number(count) || 0;
      }
    });
    
    return position;
  };

  const estimateWaitTime = (queuePosition: number, currentlyProcessing: number): number => {
    const averageProcessingTime = 10; // seconds
    const availableSlots = Math.max(1, 3 - currentlyProcessing);
    return Math.ceil((queuePosition / availableSlots) * averageProcessingTime);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (activeRequestId.current) {
        queueService.current.cancelRequest(activeRequestId.current);
      }
    };
  }, []);

  return {
    transcriptionState,
    queueStats,
    queueTranscription,
    cancelTranscription,
    clearCompleted,
    getEstimatedWaitTime
  };
}
