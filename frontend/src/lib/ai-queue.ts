/**
 * AI Queue Management System
 * Handles transcription request queuing and processing
 */

import { type TranscribeAudioInput, type TranscribeAudioOutput } from '@/ai/flows/transcribe-audio';

export interface QueuedTranscriptionRequest {
  id: string;
  input: TranscribeAudioInput;
  operationType: 'transcribe';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  requestedAt: Date;
  lastAttemptAt?: Date;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'retry_scheduled';
  result?: TranscribeAudioOutput;
  error?: string;
  retryAfter?: Date;
  retryCount: number;
  maxRetries: number;
  onProgress?: (status: QueuedTranscriptionRequest) => void;
  onComplete?: (result: TranscribeAudioOutput) => void;
  onError?: (error: string) => void;
}

export interface QueuedAIRequest {
  id: string;
  input: TranscribeAudioInput;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'retry_scheduled';
  priority: 'urgent' | 'high' | 'normal' | 'low';
  requestedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  result?: TranscribeAudioOutput;
  error?: string;
  attempts: number;
  maxAttempts: number;
  retryCount: number;
  maxRetries: number;
  estimatedDuration?: number;
  actualDuration?: number;
  callbacks?: {
    onProgress?: (status: QueuedAIRequest) => void;
    onComplete?: (result: TranscribeAudioOutput) => void;
    onError?: (error: string) => void;
  };
}

export interface QueueStats {
  total: number;
  queued: number;
  processing: number;
  completed: number;
  failed: number;
  queueSize: number;
  priorityBreakdown?: { [key: string]: number };
}

export class AIQueueService {
  private queue: QueuedTranscriptionRequest[] = [];
  private processing = false;
  private completed: Map<string, QueuedTranscriptionRequest> = new Map();
  private listeners: Set<(requests: QueuedTranscriptionRequest[]) => void> = new Set();

  constructor(config?: any) {
    // Optional config parameter for compatibility
  }

  /**
   * Shutdown the queue service
   */
  async shutdown(): Promise<void> {
    this.processing = false;
    this.queue = [];
    this.completed.clear();
    this.listeners.clear();
  }

  /**
   * Queue a transcription request
   */
  async queueTranscription(
    input: TranscribeAudioInput,
    options: {
      priority?: 'urgent' | 'high' | 'normal' | 'low';
      maxAttempts?: number;
      onProgress?: (status: QueuedTranscriptionRequest) => void;
      onComplete?: (result: TranscribeAudioOutput) => void;
      onError?: (error: string) => void;
    } = {}
  ): Promise<string> {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const request: QueuedTranscriptionRequest = {
      id: requestId,
      input,
      operationType: 'transcribe',
      status: 'queued',
      priority: options.priority || 'normal',
      attempts: 0,
      maxAttempts: options.maxAttempts || 3,
      createdAt: new Date(),
      requestedAt: new Date(),
      retryCount: 0,
      maxRetries: options.maxAttempts || 3,
      onProgress: options.onProgress,
      onComplete: options.onComplete,
      onError: options.onError,
    };

    this.queue.push(request);
    this.sortQueueByPriority();
    this.notifyListeners();
    this.processQueue();

    return requestId;
  }

  /**
   * Get request status
   */
  getRequestStatus(requestId: string): QueuedTranscriptionRequest | null {
    // Check queue
    const queuedRequest = this.queue.find(req => req.id === requestId);
    if (queuedRequest) return queuedRequest;

    // Check completed
    return this.completed.get(requestId) || null;
  }

  /**
   * Get queue statistics
   */
  getQueueStats(): QueueStats {
    const total = this.queue.length + this.completed.size;
    const queued = this.queue.filter(req => req.status === 'queued').length;
    const processing = this.queue.filter(req => req.status === 'processing').length;
    const completed = Array.from(this.completed.values()).filter(req => req.status === 'completed').length;
    const failed = Array.from(this.completed.values()).filter(req => req.status === 'failed').length;

    const priorityBreakdown = {
      urgent: this.queue.filter(req => req.priority === 'urgent').length,
      high: this.queue.filter(req => req.priority === 'high').length,
      normal: this.queue.filter(req => req.priority === 'normal').length,
      low: this.queue.filter(req => req.priority === 'low').length,
    };

    return { 
      total, 
      queued, 
      processing, 
      completed, 
      failed, 
      queueSize: this.queue.length,
      priorityBreakdown 
    };
  }

  /**
   * Cancel a request
   */
  cancelRequest(requestId: string): boolean {
    const index = this.queue.findIndex(req => req.id === requestId);
    if (index >= 0) {
      this.queue.splice(index, 1);
      this.notifyListeners();
      return true;
    }
    return false;
  }

  /**
   * Clear completed requests
   */
  clearCompleted(): void {
    this.completed.clear();
    this.notifyListeners();
  }

  /**
   * Get all queue items
   */
  getAllRequests(): QueuedTranscriptionRequest[] {
    return [...this.queue, ...Array.from(this.completed.values())];
  }

  /**
   * Subscribe to queue updates
   */
  subscribe(listener: (requests: QueuedTranscriptionRequest[]) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private sortQueueByPriority(): void {
    const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
    this.queue.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  }

  private notifyListeners(): void {
    const allRequests = this.getAllRequests();
    this.listeners.forEach(listener => listener(allRequests));
  }

  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;

    while (this.queue.length > 0) {
      const request = this.queue.shift()!;
      await this.processRequest(request);
    }

    this.processing = false;
  }

  private async processRequest(request: QueuedTranscriptionRequest): Promise<void> {
    try {
      request.status = 'processing';
      request.lastAttemptAt = new Date();
      request.attempts++;
      this.notifyListeners();

      // Notify progress callback
      request.onProgress?.(request);

      // Import transcription function dynamically to avoid circular dependencies
      const { transcribeAudio } = await import('@/ai/flows/transcribe-audio');
      
      const result = await transcribeAudio(request.input);

      request.status = 'completed';
      request.result = result;

      // Move to completed
      this.completed.set(request.id, request);
      this.notifyListeners();

      // Notify completion callback
      request.onComplete?.(result);

    } catch (error) {
      if (request.attempts < request.maxAttempts) {
        // Retry: put back in queue
        request.status = 'retry_scheduled';
        request.retryAfter = new Date(Date.now() + 2000 * Math.pow(2, request.attempts));
        this.queue.unshift(request);
      } else {
        // Max retries reached
        request.status = 'failed';
        request.error = error instanceof Error ? error.message : String(error);
        
        // Move to completed (failed)
        this.completed.set(request.id, request);
        
        // Notify error callback
        request.onError?.(request.error);
      }
      
      this.notifyListeners();
    }
  }
}

export class TranscriptionQueueService extends AIQueueService {
  // Legacy compatibility class
}

// Singleton instance
let queueInstance: TranscriptionQueueService | null = null;

export function getTranscriptionQueue(): TranscriptionQueueService {
  if (!queueInstance) {
    queueInstance = new TranscriptionQueueService();
  }
  return queueInstance;
}
