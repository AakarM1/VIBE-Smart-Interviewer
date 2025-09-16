/**
 * Phase 1: In-Memory AI Request Queue Service
 * 
 * Provides immediate relief for API overload iss    const request: QueuedTranscriptionRequest = {
      id: `transcribe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      input,
      operationType: 'transcribe',
      priority: options.priority || 'normal',
      attempts: 0,
      maxAttempts: options.maxAttempts || 3,
      createdAt: new Date(),
      status: 'queued',
      onProgress: options.onProgress,
      onComplete: options.onComplete,
      onError: options.onError,
    };* - Request queuing and rate limiting
 * - Exponential backoff retry logic
 * - Priority handling for urgent requests
 * - Real-time status updates for UI
 */

export interface TranscribeAudioInput {
  audioFile: File | Blob;
  language?: string;
  format?: string;
}

export interface TranscribeAudioOutput {
  text: string;
  confidence?: number;
  language?: string;
}

export interface QueuedTranscriptionRequest {
  id: string;
  input: TranscribeAudioInput;
  operationType: 'transcribe';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  lastAttemptAt?: Date;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'retry_scheduled';
  result?: TranscribeAudioOutput;
  error?: string;
  retryAfter?: Date;
  onProgress?: (status: QueuedTranscriptionRequest) => void;
  onComplete?: (result: TranscribeAudioOutput) => void;
  onError?: (error: string) => void;
}

export interface QueuedAIRequest<TInput = any, TOutput = any> {
  id: string;
  input: TInput;
  operationType: 'transcribe' | 'analyze-sjt' | 'analyze-conversation' | 'generate-verdict' | 'generate-questions' | 'evaluate-answer' | 'translate';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  lastAttemptAt?: Date;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'retry_scheduled';
  result?: TOutput;
  error?: string;
  retryAfter?: Date;
  onProgress?: (status: QueuedAIRequest<TInput, TOutput>) => void;
  onComplete?: (result: TOutput) => void;
  onError?: (error: string) => void;
}

export interface QueueConfig {
  maxConcurrentRequests: number;
  maxQueueSize: number;
  baseRetryDelayMs: number;
  maxRetryDelayMs: number;
  retryMultiplier: number;
  requestTimeoutMs: number;
}

export class TranscriptionQueueService {
  private queue: QueuedTranscriptionRequest[] = [];
  private processing: Set<string> = new Set();
  private completed: Map<string, QueuedTranscriptionRequest> = new Map();
  private config: QueueConfig;
  private isProcessing = false;

  constructor(config: Partial<QueueConfig> = {}) {
    this.config = {
      maxConcurrentRequests: 3, // Gemini API rate limit consideration
      maxQueueSize: 100,
      baseRetryDelayMs: 2000, // 2 seconds
      maxRetryDelayMs: 32000, // 32 seconds max
      retryMultiplier: 2,
      requestTimeoutMs: 30000, // 30 seconds
      ...config
    };
    
    this.startProcessing();
  }

  /**
   * Add a transcription request to the queue
   */
  async queueTranscription(
    input: TranscribeAudioInput,
    options: {
      priority?: 'low' | 'normal' | 'high' | 'urgent';
      maxAttempts?: number;
      onProgress?: (status: QueuedTranscriptionRequest) => void;
      onComplete?: (result: TranscribeAudioOutput) => void;
      onError?: (error: string) => void;
    } = {}
  ): Promise<string> {
    
    // Check queue capacity
    if (this.queue.length >= this.config.maxQueueSize) {
      throw new Error('Transcription queue is full. Please try again later.');
    }

    const request: QueuedTranscriptionRequest = {
      id: `transcription_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      input,
      operationType: 'transcribe',
      priority: options.priority || 'normal',
      attempts: 0,
      maxAttempts: options.maxAttempts || 3,
      createdAt: new Date(),
      status: 'queued',
      onProgress: options.onProgress,
      onComplete: options.onComplete,
      onError: options.onError
    };

    // Insert with priority ordering (urgent first, then by creation time)
    this.insertByPriority(request);
    
    console.log(`📝 [TranscriptionQueue] Added request ${request.id} (priority: ${request.priority}, queue size: ${this.queue.length})`);
    
    // Notify progress callback
    request.onProgress?.(request);
    
    return request.id;
  }

  /**
   * Get the status of a queued request
   */
  getRequestStatus(requestId: string): QueuedTranscriptionRequest | null {
    // Check queue
    const queued = this.queue.find(r => r.id === requestId);
    if (queued) return queued;
    
    // Check completed
    const completed = this.completed.get(requestId);
    if (completed) return completed;
    
    return null;
  }

  /**
   * Get queue statistics for monitoring
   */
  getQueueStats() {
    const priorityCounts = this.queue.reduce((acc, req) => {
      acc[req.priority] = (acc[req.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      queueSize: this.queue.length,
      processing: this.processing.size,
      completed: this.completed.size,
      maxConcurrent: this.config.maxConcurrentRequests,
      priorityBreakdown: priorityCounts,
      oldestRequestAge: this.queue.length > 0 
        ? Date.now() - this.queue[this.queue.length - 1].createdAt.getTime()
        : 0
    };
  }

  /**
   * Cancel a queued request
   */
  cancelRequest(requestId: string): boolean {
    const index = this.queue.findIndex(r => r.id === requestId);
    if (index >= 0) {
      const request = this.queue[index];
      this.queue.splice(index, 1);
      request.onError?.('Request cancelled by user');
      console.log(`❌ [TranscriptionQueue] Cancelled request ${requestId}`);
      return true;
    }
    return false;
  }

  /**
   * Clear all completed requests (for memory management)
   */
  clearCompleted(): void {
    this.completed.clear();
    console.log(`🧹 [TranscriptionQueue] Cleared completed requests`);
  }

  private insertByPriority(request: QueuedTranscriptionRequest): void {
    const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
    
    // Find insertion point based on priority and creation time
    let insertIndex = this.queue.length;
    for (let i = 0; i < this.queue.length; i++) {
      const existing = this.queue[i];
      const requestPriorityLevel = priorityOrder[request.priority];
      const existingPriorityLevel = priorityOrder[existing.priority];
      
      if (requestPriorityLevel < existingPriorityLevel) {
        insertIndex = i;
        break;
      }
    }
    
    this.queue.splice(insertIndex, 0, request);
  }

  private async startProcessing(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    console.log(`🚀 [TranscriptionQueue] Starting queue processor (max concurrent: ${this.config.maxConcurrentRequests})`);

    while (this.isProcessing) {
      try {
        // Process requests up to concurrent limit
        while (this.processing.size < this.config.maxConcurrentRequests && this.queue.length > 0) {
          const request = this.getNextRequest();
          if (request) {
            this.processRequest(request);
          }
        }

        // Wait before next check
        await this.sleep(1000);
      } catch (error) {
        console.error('❌ [TranscriptionQueue] Processing loop error:', error);
        await this.sleep(5000); // Wait longer on error
      }
    }
  }

  private getNextRequest(): QueuedTranscriptionRequest | null {
    const now = new Date();
    
    // Find first request that's ready to process (not in retry delay)
    for (let i = 0; i < this.queue.length; i++) {
      const request = this.queue[i];
      
      if (request.status === 'queued' || 
          (request.status === 'retry_scheduled' && request.retryAfter && request.retryAfter <= now)) {
        
        // Remove from queue and add to processing
        this.queue.splice(i, 1);
        return request;
      }
    }
    
    return null;
  }

  private async processRequest(request: QueuedTranscriptionRequest): Promise<void> {
    this.processing.add(request.id);
    request.status = 'processing';
    request.attempts++;
    request.lastAttemptAt = new Date();
    
    console.log(`⚡ [TranscriptionQueue] Processing request ${request.id} (attempt ${request.attempts}/${request.maxAttempts})`);
    
    // Notify progress
    request.onProgress?.(request);

    try {
      // Add timeout to prevent hanging requests
      const result = await Promise.race([
        transcribeAudio(request.input),
        this.createTimeoutPromise(this.config.requestTimeoutMs)
      ]);

      // Success
      request.status = 'completed';
      request.result = result;
      this.completed.set(request.id, request);
      
      console.log(`✅ [TranscriptionQueue] Completed request ${request.id} after ${request.attempts} attempts`);
      
      request.onProgress?.(request);
      request.onComplete?.(result);

    } catch (error) {
      console.error(`❌ [TranscriptionQueue] Request ${request.id} failed (attempt ${request.attempts}):`, error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Check if we should retry
      if (request.attempts < request.maxAttempts && this.shouldRetry(errorMessage)) {
        // Schedule retry with exponential backoff
        const delay = Math.min(
          this.config.baseRetryDelayMs * Math.pow(this.config.retryMultiplier, request.attempts - 1),
          this.config.maxRetryDelayMs
        );
        
        request.status = 'retry_scheduled';
        request.retryAfter = new Date(Date.now() + delay);
        request.error = errorMessage;
        
        // Put back in queue for retry
        this.insertByPriority(request);
        
        console.log(`🔄 [TranscriptionQueue] Scheduled retry for ${request.id} in ${delay}ms`);
        request.onProgress?.(request);
        
      } else {
        // Max attempts reached or non-retryable error
        request.status = 'failed';
        request.error = errorMessage;
        this.completed.set(request.id, request);
        
        console.log(`💀 [TranscriptionQueue] Request ${request.id} permanently failed after ${request.attempts} attempts`);
        
        request.onProgress?.(request);
        request.onError?.(errorMessage);
      }
    } finally {
      this.processing.delete(request.id);
    }
  }

  private shouldRetry(errorMessage: string): boolean {
    // Define retryable errors
    const retryableErrors = [
      'model overload',
      'rate limit',
      'timeout',
      'network error',
      'service unavailable',
      '429', // Too Many Requests
      '500', // Internal Server Error
      '502', // Bad Gateway
      '503', // Service Unavailable
      '504', // Gateway Timeout
    ];
    
    const lowerError = errorMessage.toLowerCase();
    return retryableErrors.some(error => lowerError.includes(error));
  }

  private createTimeoutPromise(timeoutMs: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), timeoutMs);
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    console.log('🛑 [TranscriptionQueue] Shutting down...');
    this.isProcessing = false;
    
    // Wait for current processing to complete
    while (this.processing.size > 0) {
      await this.sleep(100);
    }
    
    // Clear queue and notify pending requests
    this.queue.forEach(request => {
      request.onError?.('Service shutting down');
    });
    this.queue = [];
    
    console.log('✅ [TranscriptionQueue] Shutdown complete');
  }
}

// Placeholder transcribeAudio function - should be implemented with actual AI service
async function transcribeAudio(input: TranscribeAudioInput): Promise<TranscribeAudioOutput> {
  // This is a placeholder - replace with actual transcription service
  return {
    text: "Transcription not implemented",
    confidence: 0,
    language: input.language || 'en'
  };
}

// Singleton instance for the application
let transcriptionQueueInstance: TranscriptionQueueService | null = null;

export function getTranscriptionQueue(): TranscriptionQueueService {
  if (!transcriptionQueueInstance) {
    transcriptionQueueInstance = new TranscriptionQueueService();
  }
  return transcriptionQueueInstance;
}
