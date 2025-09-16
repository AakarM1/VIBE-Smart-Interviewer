/**
 * Enterprise AI Queue Management System
 * Enhanced version with enterprise features
 */

export interface EnterpriseTranscriptionRequest {
  id: string;
  input: any;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'retry_scheduled' | 'dead_letter';
  priority: 'urgent' | 'high' | 'normal' | 'low';
  requestedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  result?: any;
  error?: string;
  retryCount: number;
  maxRetries: number;
  attempts: number;
  maxAttempts: number;
  estimatedDuration?: number;
  actualDuration?: number;
  tenantId?: string;
  userId?: string;
  sessionId?: string;
  metadata?: any;
  callbacks?: {
    onProgress?: (status: EnterpriseTranscriptionRequest) => void;
    onComplete?: (result: any) => void;
    onError?: (error: string) => void;
  };
}

export class EnterpriseTranscriptionQueueService {
  private queue: EnterpriseTranscriptionRequest[] = [];
  private processing = false;
  private completed: Map<string, EnterpriseTranscriptionRequest> = new Map();
  private listeners: Set<(requests: EnterpriseTranscriptionRequest[]) => void> = new Set();

  /**
   * Queue enterprise transcription request
   */
  async queueEnterpriseTranscription(
    input: any,
    options: {
      priority?: 'urgent' | 'high' | 'normal' | 'low';
      tenantId?: string;
      userId?: string;
      sessionId?: string;
      metadata?: any;
      onProgress?: (status: EnterpriseTranscriptionRequest) => void;
      onComplete?: (result: any) => void;
      onError?: (error: string) => void;
    } = {}
  ): Promise<{
    requestId: string;
    position: number;
    estimatedWait: number;
    rateLimitInfo: any;
  }> {
    const requestId = this.addRequest(input, options);
    const position = this.queue.length;
    const estimatedWait = position * 1000; // Simple estimation
    
    return {
      requestId,
      position,
      estimatedWait,
      rateLimitInfo: {
        remainingRequests: 100,
        resetTime: Date.now() + 3600000 // 1 hour
      }
    };
  }

  /**
   * Get enterprise statistics
   */
  async getEnterpriseStats(): Promise<{
    total: number;
    queued: number;
    processing: number;
    completed: number;
    failed: number;
    performance: {
      averageProcessingTime: number;
    };
    queueStats: {
      totalInQueue: number;
    };
  }> {
    const total = this.queue.length + this.completed.size;
    const queued = this.queue.filter(req => req.status === 'queued').length;
    const processing = this.queue.filter(req => req.status === 'processing').length;
    const completed = Array.from(this.completed.values()).filter(req => req.status === 'completed').length;
    const failed = Array.from(this.completed.values()).filter(req => req.status === 'failed').length;

    const completedRequests = Array.from(this.completed.values()).filter(req => req.actualDuration);
    const averageProcessingTime = completedRequests.length > 0 
      ? completedRequests.reduce((sum, req) => sum + (req.actualDuration || 0), 0) / completedRequests.length
      : 0;

    return { 
      total, 
      queued, 
      processing, 
      completed, 
      failed,
      performance: {
        averageProcessingTime
      },
      queueStats: {
        totalInQueue: this.queue.length
      }
    };
  }

  /**
   * Add request to enterprise transcription queue
   */
  addRequest(
    input: any,
    options: {
      priority?: 'urgent' | 'high' | 'normal' | 'low';
      tenantId?: string;
      userId?: string;
      onProgress?: (status: EnterpriseTranscriptionRequest) => void;
      onComplete?: (result: any) => void;
      onError?: (error: string) => void;
    } = {}
  ): string {
    const requestId = `ent_req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const request: EnterpriseTranscriptionRequest = {
      id: requestId,
      input,
      status: 'queued',
      priority: options.priority || 'normal',
      requestedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      retryCount: 0,
      maxRetries: 3,
      attempts: 0,
      maxAttempts: 3,
      tenantId: options.tenantId,
      userId: options.userId,
      callbacks: {
        onProgress: options.onProgress,
        onComplete: options.onComplete,
        onError: options.onError,
      }
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
  getRequestStatus(requestId: string): EnterpriseTranscriptionRequest | null {
    const queuedRequest = this.queue.find(req => req.id === requestId);
    if (queuedRequest) return queuedRequest;
    return this.completed.get(requestId) || null;
  }

  /**
   * Get all queue items
   */
  getAllRequests(): EnterpriseTranscriptionRequest[] {
    return [...this.queue, ...Array.from(this.completed.values())];
  }

  /**
   * Subscribe to queue updates
   */
  subscribe(listener: (requests: EnterpriseTranscriptionRequest[]) => void): () => void {
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

  private async processRequest(request: EnterpriseTranscriptionRequest): Promise<void> {
    try {
      request.status = 'processing';
      request.startedAt = new Date();
      this.notifyListeners();

      request.callbacks?.onProgress?.(request);

      // Simulate processing (replace with actual enterprise transcription logic)
      await new Promise(resolve => setTimeout(resolve, 1000));
      const result = { transcription: "Mock enterprise transcription result" };

      request.status = 'completed';
      request.completedAt = new Date();
      request.result = result;
      request.actualDuration = request.completedAt.getTime() - request.startedAt!.getTime();

      this.completed.set(request.id, request);
      this.notifyListeners();

      request.callbacks?.onComplete?.(result);

    } catch (error) {
      request.retryCount++;
      
      if (request.retryCount < request.maxRetries) {
        request.status = 'queued';
        this.queue.unshift(request);
      } else {
        request.status = 'failed';
        request.error = error instanceof Error ? error.message : String(error);
        request.completedAt = new Date();
        
        this.completed.set(request.id, request);
        request.callbacks?.onError?.(request.error);
      }
      
      this.notifyListeners();
    }
  }
}

// Singleton instance
let enterpriseQueueInstance: EnterpriseTranscriptionQueueService | null = null;

export function getEnterpriseTranscriptionQueue(): EnterpriseTranscriptionQueueService {
  if (!enterpriseQueueInstance) {
    enterpriseQueueInstance = new EnterpriseTranscriptionQueueService();
  }
  return enterpriseQueueInstance;
}
