/**
 * React Hook for Enterprise Transcription Queue
 * 
 * Provides a clean interface for components to interact with the enterprise queue:
 * - Queue transcription requests with enterprise features
 * - Monitor request status and progress
 * - Handle enterprise-specific metadata
 * - Real-time updates and error handling
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { getEnterpriseTranscriptionQueue, type EnterpriseTranscriptionRequest } from '@/lib/enterprise-ai-queue';
import { type TranscribeAudioInput, type TranscribeAudioOutput } from '@/ai/flows/transcribe-audio';

export interface UseEnterpriseTranscriptionQueueOptions {
  userId?: string;
  sessionId?: string;
  autoRetry?: boolean;
  onProgress?: (status: EnterpriseTranscriptionRequest) => void;
  onComplete?: (result: TranscribeAudioOutput) => void;
  onError?: (error: string) => void;
}

export interface EnterpriseQueueRequest {
  id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'retry_scheduled' | 'dead_letter';
  progress?: number;
  result?: TranscribeAudioOutput;
  error?: string;
  position?: number;
  estimatedWait?: number;
  attempts: number;
  maxAttempts: number;
  priority: 'urgent' | 'high' | 'normal' | 'low';
  metadata?: {
    audioSize?: number;
    estimatedDuration?: number;
    userAgent?: string;
    ipAddress?: string;
  };
  rateLimitInfo?: {
    remaining: number;
    resetAt: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface EnterpriseQueueStats {
  totalRequests: number;
  completedRequests: number;
  failedRequests: number;
  averageProcessingTime: number;
  successRate: number;
  currentQueueSize: number;
  userRateLimit: {
    remaining: number;
    resetAt: Date;
  };
}

export function useEnterpriseTranscriptionQueue(options: UseEnterpriseTranscriptionQueueOptions = {}) {
  const [requests, setRequests] = useState<Map<string, EnterpriseQueueRequest>>(new Map());
  const [stats, setStats] = useState<EnterpriseQueueStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Use refs to avoid stale closures in callbacks
  const optionsRef = useRef(options);
  optionsRef.current = options;
  
  const enterpriseQueue = getEnterpriseTranscriptionQueue();

  /**
   * Queue a transcription request with enterprise features
   */
  const queueTranscription = useCallback(async (
    input: TranscribeAudioInput,
    requestOptions: {
      priority?: 'urgent' | 'high' | 'normal' | 'low';
      maxAttempts?: number;
      metadata?: {
        userAgent?: string;
        ipAddress?: string;
        audioSize?: number;
        estimatedDuration?: number;
      };
    } = {}
  ): Promise<string> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await enterpriseQueue.queueEnterpriseTranscription(input, {
        ...requestOptions,
        userId: optionsRef.current.userId,
        sessionId: optionsRef.current.sessionId,
        metadata: {
          userAgent: navigator.userAgent,
          ...requestOptions.metadata,
        }
      });

      // Create initial request state
      const newRequest: EnterpriseQueueRequest = {
        id: result.requestId,
        status: 'queued',
        priority: requestOptions.priority || 'normal',
        attempts: 0,
        maxAttempts: requestOptions.maxAttempts || 3,
        position: result.position,
        estimatedWait: result.estimatedWait,
        rateLimitInfo: result.rateLimitInfo,
        metadata: requestOptions.metadata,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      setRequests(prev => new Map(prev).set(result.requestId, newRequest));
      
      console.log(`🚀 [EnterpriseQueue] Queued request ${result.requestId} at position ${result.position}`);
      
      return result.requestId;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to queue transcription';
      setError(errorMessage);
      
      if (optionsRef.current.onError) {
        optionsRef.current.onError(errorMessage);
      }
      
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [enterpriseQueue]);

  /**
   * Get the status of a specific request
   */
  const getRequestStatus = useCallback((requestId: string): EnterpriseQueueRequest | null => {
    return requests.get(requestId) || null;
  }, [requests]);

  /**
   * Get all requests for the current session/user
   */
  const getAllRequests = useCallback((): EnterpriseQueueRequest[] => {
    return Array.from(requests.values()).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }, [requests]);

  /**
   * Cancel a queued request (if possible)
   */
  const cancelRequest = useCallback(async (requestId: string): Promise<boolean> => {
    try {
      // In a full implementation, this would call enterpriseQueue.cancelRequest(requestId)
      // For now, we'll just mark it as cancelled locally
      setRequests(prev => {
        const newMap = new Map(prev);
        const request = newMap.get(requestId);
        if (request && request.status === 'queued') {
          newMap.set(requestId, {
            ...request,
            status: 'failed',
            error: 'Cancelled by user',
            updatedAt: new Date()
          });
          return newMap;
        }
        return prev;
      });
      
      return true;
    } catch (err) {
      console.error('Failed to cancel request:', err);
      return false;
    }
  }, []);

  /**
   * Retry a failed request
   */
  const retryRequest = useCallback(async (requestId: string): Promise<string | null> => {
    const request = requests.get(requestId);
    if (!request || request.status !== 'failed') {
      return null;
    }

    try {
      // Re-queue the request
      // In a full implementation, this would extract the original input and re-queue it
      console.log(`🔄 [EnterpriseQueue] Retrying request ${requestId}`);
      
      setRequests(prev => {
        const newMap = new Map(prev);
        newMap.set(requestId, {
          ...request,
          status: 'queued',
          error: undefined,
          attempts: request.attempts + 1,
          updatedAt: new Date()
        });
        return newMap;
      });
      
      return requestId;
    } catch (err) {
      console.error('Failed to retry request:', err);
      return null;
    }
  }, [requests]);

  /**
   * Clear completed requests from state
   */
  const clearCompletedRequests = useCallback(() => {
    setRequests(prev => {
      const newMap = new Map();
      for (const [id, request] of prev) {
        if (request.status !== 'completed') {
          newMap.set(id, request);
        }
      }
      return newMap;
    });
  }, []);

  /**
   * Get queue statistics
   */
  const refreshStats = useCallback(async () => {
    try {
      const enterpriseStats = await enterpriseQueue.getEnterpriseStats();
      
      // Calculate user-specific stats
      const userRequests = getAllRequests();
      const completed = userRequests.filter(r => r.status === 'completed');
      const failed = userRequests.filter(r => r.status === 'failed' || r.status === 'dead_letter');
      
      const userStats: EnterpriseQueueStats = {
        totalRequests: userRequests.length,
        completedRequests: completed.length,
        failedRequests: failed.length,
        averageProcessingTime: enterpriseStats.performance.averageProcessingTime,
        successRate: userRequests.length > 0 ? completed.length / userRequests.length : 1,
        currentQueueSize: enterpriseStats.queueStats.totalInQueue,
        userRateLimit: {
          remaining: 100, // Would be calculated from actual rate limiting
          resetAt: new Date(Date.now() + 60000)
        }
      };
      
      setStats(userStats);
    } catch (err) {
      console.error('Failed to refresh stats:', err);
    }
  }, [getAllRequests, enterpriseQueue]);

  /**
   * Update request status (would be called by real-time listeners)
   */
  const updateRequestStatus = useCallback((requestId: string, update: Partial<EnterpriseQueueRequest>) => {
    setRequests(prev => {
      const current = prev.get(requestId);
      if (!current) return prev;
      
      const updated = {
        ...current,
        ...update,
        updatedAt: new Date()
      };
      
      // Call progress callback
      if (optionsRef.current.onProgress) {
        // Convert to EnterpriseTranscriptionRequest format for callback
        const progressUpdate: EnterpriseTranscriptionRequest = {
          id: updated.id,
          input: {} as any, // Would have actual input
          priority: updated.priority,
          attempts: updated.attempts,
          maxAttempts: updated.maxAttempts,
          status: updated.status,
          result: updated.result,
          error: updated.error,
          requestedAt: new Date(updated.createdAt),
          createdAt: { toDate: () => updated.createdAt } as any,
          updatedAt: { toDate: () => updated.updatedAt } as any,
          retryCount: updated.attempts || 0,
          maxRetries: updated.maxAttempts || 3,
          metadata: updated.metadata
        };
        
        optionsRef.current.onProgress(progressUpdate);
      }
      
      // Call completion callback
      if (updated.status === 'completed' && updated.result && optionsRef.current.onComplete) {
        optionsRef.current.onComplete(updated.result);
      }
      
      // Call error callback
      if (updated.status === 'failed' && updated.error && optionsRef.current.onError) {
        optionsRef.current.onError(updated.error);
      }
      
      const newMap = new Map(prev);
      newMap.set(requestId, updated);
      return newMap;
    });
  }, []);

  // Initialize stats on mount
  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  // Auto-refresh stats
  useEffect(() => {
    const interval = setInterval(refreshStats, 10000); // Every 10 seconds
    return () => clearInterval(interval);
  }, [refreshStats]);

  // In a real implementation, you would set up real-time listeners here
  useEffect(() => {
    // This would set up Firestore listeners for request updates
    // For now, we'll simulate some updates for demo purposes
    
    const simulateUpdates = () => {
      // This is just for demonstration - real implementation would use Firestore listeners
      requests.forEach((request, id) => {
        if (request.status === 'queued') {
          // Simulate processing
          setTimeout(() => {
            updateRequestStatus(id, { status: 'processing', progress: 0 });
            
            // Simulate completion
            setTimeout(() => {
              updateRequestStatus(id, { 
                status: 'completed', 
                progress: 100,
                result: { text: 'Sample transcription result' } as any
              });
            }, 5000);
          }, 2000);
        }
      });
    };

    if (requests.size > 0) {
      simulateUpdates();
    }
  }, [requests.size, updateRequestStatus]);

  return {
    // Actions
    queueTranscription,
    cancelRequest,
    retryRequest,
    clearCompletedRequests,
    refreshStats,
    
    // State
    requests: getAllRequests(),
    stats,
    isLoading,
    error,
    
    // Utilities
    getRequestStatus,
    
    // Status helpers
    hasActiveRequests: getAllRequests().some(r => ['queued', 'processing'].includes(r.status)),
    hasFailedRequests: getAllRequests().some(r => ['failed', 'dead_letter'].includes(r.status)),
    completedCount: getAllRequests().filter(r => r.status === 'completed').length,
    failedCount: getAllRequests().filter(r => ['failed', 'dead_letter'].includes(r.status)).length,
    queuedCount: getAllRequests().filter(r => r.status === 'queued').length,
    processingCount: getAllRequests().filter(r => r.status === 'processing').length
  };
}

export default useEnterpriseTranscriptionQueue;
