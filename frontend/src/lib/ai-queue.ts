/**
 * AI Queue Management System
 * Handles transcription request queuing and processing
 */

import { type TranscribeRequest, type TranscribeResponse, transcribeViaServer } from '@/lib/transcribe';

export interface QueuedTranscriptionRequest {
  id: string;
  input: TranscribeRequest;
  operationType: 'transcribe';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  requestedAt: Date;
  lastAttemptAt?: Date;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'retry_scheduled';
  result?: TranscribeResponse;
  error?: string;
  retryAfter?: Date;
  retryCount: number;
  maxRetries: number;
  onProgress?: (status: QueuedTranscriptionRequest) => void;
  onComplete?: (result: TranscribeResponse) => void;
  onError?: (error: string) => void;
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

  async shutdown(): Promise<void> {
    this.processing = false;
    this.queue = [];
    this.completed.clear();
    this.listeners.clear();
  }

  async queueTranscription(
    input: TranscribeRequest,
    options: {
      priority?: 'urgent' | 'high' | 'normal' | 'low';
      maxAttempts?: number;
      onProgress?: (status: QueuedTranscriptionRequest) => void;
      onComplete?: (result: TranscribeResponse) => void;
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

  getRequestStatus(requestId: string): QueuedTranscriptionRequest | null {
    const queuedRequest = this.queue.find(req => req.id === requestId);
    if (queuedRequest) return queuedRequest;
    return this.completed.get(requestId) || null;
  }

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
      priorityBreakdown,
    };
  }

  cancelRequest(requestId: string): boolean {
    const index = this.queue.findIndex(req => req.id === requestId);
    if (index >= 0) {
      this.queue.splice(index, 1);
      this.notifyListeners();
      return true;
    }
    return false;
  }

  clearCompleted(): void {
    this.completed.clear();
    this.notifyListeners();
  }

  getAllRequests(): QueuedTranscriptionRequest[] {
    return [...this.queue, ...Array.from(this.completed.values())];
  }

  subscribe(listener: (requests: QueuedTranscriptionRequest[]) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private sortQueueByPriority(): void {
    const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 } as const;
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

      request.onProgress?.(request);

      const result = await transcribeViaServer(request.input);

      request.status = 'completed';
      request.result = result;
      this.completed.set(request.id, request);
      this.notifyListeners();
      request.onComplete?.(result);
    } catch (error) {
      if (request.attempts < request.maxAttempts) {
        request.status = 'retry_scheduled';
        request.retryAfter = new Date(Date.now() + 2000 * Math.pow(2, request.attempts));
        this.queue.unshift(request);
      } else {
        request.status = 'failed';
        request.error = error instanceof Error ? error.message : String(error);
        this.completed.set(request.id, request);
        request.onError?.(request.error);
      }
      this.notifyListeners();
    }
  }
}

export class TranscriptionQueueService extends AIQueueService {}

let queueInstance: TranscriptionQueueService | null = null;

export function getTranscriptionQueue(): TranscriptionQueueService {
  if (!queueInstance) {
    queueInstance = new TranscriptionQueueService();
  }
  return queueInstance;
}
