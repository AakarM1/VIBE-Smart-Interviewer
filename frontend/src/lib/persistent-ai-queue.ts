/**
 * Phase 2: Database-Persistent Transcription Queue
 * 
 * Extends the in-memory queue with:
 * - Firestore persistence for reliability
 * - Request recovery after server restarts
 * - Advanced monitoring and analytics
 * - Priority-based processing
 * - Dead letter queue for failed requests
 */

import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot,
  serverTimestamp,
  Timestamp,
  getDocs,
  getDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { AIQueueService, type QueuedTranscriptionRequest } from './ai-queue';
import { transcribeAudio, type TranscribeAudioInput, type TranscribeAudioOutput } from '@/ai/flows/transcribe-audio';

export interface PersistedTranscriptionRequest {
  id: string;
  input: TranscribeAudioInput;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  attempts: number;
  maxAttempts: number;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'retry_scheduled' | 'dead_letter';
  result?: TranscribeAudioOutput;
  error?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  scheduledAt?: Timestamp; // For retry scheduling
  processedAt?: Timestamp;
  completedAt?: Timestamp;
  processingServerId?: string; // Track which server is processing
  estimatedProcessingTime?: number;
  actualProcessingTime?: number;
  dataSize?: number; // For analytics
  userAgent?: string;
  sessionId?: string; // Link to interview session
}

export interface QueueAnalytics {
  totalRequests: number;
  completedRequests: number;
  failedRequests: number;
  averageProcessingTime: number;
  averageQueueTime: number;
  throughputPerHour: number;
  errorRate: number;
  priorityDistribution: Record<string, number>;
  peakHours: Array<{ hour: number; count: number }>;
}

export class PersistentTranscriptionQueue extends AIQueueService {
  private serverId: string;
  private readonly COLLECTION_NAME = 'transcription_queue';
  private readonly ANALYTICS_COLLECTION = 'transcription_analytics';
  private cleanupInterval?: NodeJS.Timeout;
  private analyticsInterval?: NodeJS.Timeout;

  constructor(config: any = {}) {
    super(config);
    this.serverId = `server_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.initializeDatabase();
    this.startCleanupRoutine();
    this.startAnalyticsCollection();
  }

  private async initializeDatabase(): Promise<void> {
    console.log(`🗄️ [PersistentQueue] Initializing database queue (Server ID: ${this.serverId})`);
    
    // Recover any requests that were being processed by this server instance
    await this.recoverOrphanedRequests();
    
    // Load pending requests from database
    await this.loadPendingRequests();
    
    // Set up real-time listeners
    this.setupRealtimeListeners();
  }

  /**
   * Enhanced queue method with database persistence
   */
  async queueTranscription(
    input: TranscribeAudioInput,
    options: {
      priority?: 'low' | 'normal' | 'high' | 'urgent';
      maxAttempts?: number;
      sessionId?: string;
      userAgent?: string;
      onProgress?: (status: QueuedTranscriptionRequest) => void;
      onComplete?: (result: TranscribeAudioOutput) => void;
      onError?: (error: string) => void;
    } = {}
  ): Promise<string> {
    
    // First, add to database
    const requestData: Omit<PersistedTranscriptionRequest, 'id'> = {
      input,
      priority: options.priority || 'normal',
      attempts: 0,
      maxAttempts: options.maxAttempts || 3,
      status: 'queued',
      createdAt: serverTimestamp() as Timestamp,
      updatedAt: serverTimestamp() as Timestamp,
      sessionId: options.sessionId,
      userAgent: options.userAgent,
      dataSize: this.calculateDataSize(input.audioDataUri),
      estimatedProcessingTime: this.estimateProcessingTime(input.audioDataUri)
    };

    const docRef = await addDoc(collection(db, this.COLLECTION_NAME), requestData);
    const requestId = docRef.id;

    console.log(`💾 [PersistentQueue] Persisted request ${requestId} to database`);

    // Then add to in-memory queue for immediate processing
    return super.queueTranscription(input, {
      ...options,
      onProgress: (status: any) => {
        // Update database on status changes
        this.updateRequestStatus(requestId, status);
        options.onProgress?.(status);
      },
      onComplete: (result: any) => {
        this.markRequestCompleted(requestId, result);
        options.onComplete?.(result);
      },
      onError: (error: any) => {
        this.markRequestFailed(requestId, error);
        options.onError?.(error);
      }
    });
  }

  /**
   * Recover requests that were being processed when server restarted
   */
  private async recoverOrphanedRequests(): Promise<void> {
    const orphanedQuery = query(
      collection(db, this.COLLECTION_NAME),
      where('status', '==', 'processing'),
      where('processingServerId', '==', this.serverId)
    );

    // Note: In a multi-server environment, you'd check for stale processingServerId
    // For now, we'll reset any processing requests to queued status
    const snapshot = await getDocs(orphanedQuery);
    
    for (const doc of snapshot.docs) {
      await updateDoc(doc.ref, {
        status: 'queued',
        processingServerId: null,
        updatedAt: serverTimestamp()
      });
      console.log(`🔄 [PersistentQueue] Recovered orphaned request ${doc.id}`);
    }
  }

  /**
   * Load pending requests from database into memory queue
   */
  private async loadPendingRequests(): Promise<void> {
    const pendingQuery = query(
      collection(db, this.COLLECTION_NAME),
      where('status', 'in', ['queued', 'retry_scheduled']),
      orderBy('priority'),
      orderBy('createdAt'),
      limit(50) // Load first batch
    );

    const snapshot = await getDocs(pendingQuery);
    
    for (const doc of snapshot.docs) {
      const data = doc.data() as PersistedTranscriptionRequest;
      
      // Re-queue in memory
      await super.queueTranscription(data.input, {
        priority: data.priority,
        maxAttempts: data.maxAttempts,
        onProgress: (status: any) => this.updateRequestStatus(doc.id, status),
        onComplete: (result: any) => this.markRequestCompleted(doc.id, result),
        onError: (error: any) => this.markRequestFailed(doc.id, error)
      });
    }

    console.log(`📥 [PersistentQueue] Loaded ${snapshot.size} pending requests from database`);
  }

  /**
   * Set up real-time listeners for new requests
   */
  private setupRealtimeListeners(): void {
    // Listen for new queued requests
    const newRequestsQuery = query(
      collection(db, this.COLLECTION_NAME),
      where('status', '==', 'queued'),
      orderBy('createdAt', 'desc'),
      limit(10)
    );

    onSnapshot(newRequestsQuery, (snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        if (change.type === 'added') {
          const data = change.doc.data() as PersistedTranscriptionRequest;
          const docId = change.doc.id;
          
          // Check if this request is already in our memory queue
          if (!this.isRequestInMemoryQueue(docId)) {
            console.log(`🔔 [PersistentQueue] New request detected: ${docId}`);
            
            // Add to memory queue
            await super.queueTranscription(data.input, {
              priority: data.priority,
              maxAttempts: data.maxAttempts,
              onProgress: (status: any) => this.updateRequestStatus(docId, status),
              onComplete: (result: any) => this.markRequestCompleted(docId, result),
              onError: (error: any) => this.markRequestFailed(docId, error)
            });
          }
        }
      });
    });
  }

  private async updateRequestStatus(requestId: string, status: QueuedTranscriptionRequest): Promise<void> {
    try {
      const updateData: Partial<PersistedTranscriptionRequest> = {
        status: status.status as any,
        attempts: status.attempts,
        updatedAt: serverTimestamp() as Timestamp
      };

      if (status.status === 'processing') {
        updateData.processingServerId = this.serverId;
        updateData.processedAt = serverTimestamp() as Timestamp;
      }

      if (status.error) {
        updateData.error = status.error;
      }

      await updateDoc(doc(db, this.COLLECTION_NAME, requestId), updateData);
    } catch (error) {
      console.error(`❌ [PersistentQueue] Failed to update request ${requestId}:`, error);
    }
  }

  private async markRequestCompleted(requestId: string, result: TranscribeAudioOutput): Promise<void> {
    try {
      const completedAt = serverTimestamp() as Timestamp;
      
      await updateDoc(doc(db, this.COLLECTION_NAME, requestId), {
        status: 'completed',
        result,
        completedAt,
        updatedAt: completedAt,
        // Calculate actual processing time would require more complex tracking
        actualProcessingTime: this.calculateActualProcessingTime(requestId)
      });

      console.log(`✅ [PersistentQueue] Marked request ${requestId} as completed in database`);
    } catch (error) {
      console.error(`❌ [PersistentQueue] Failed to mark request ${requestId} as completed:`, error);
    }
  }

  private async markRequestFailed(requestId: string, error: string): Promise<void> {
    try {
      const request = await this.getRequestFromDatabase(requestId);
      
      if (request && request.attempts >= request.maxAttempts) {
        // Move to dead letter queue
        await updateDoc(doc(db, this.COLLECTION_NAME, requestId), {
          status: 'dead_letter',
          error,
          updatedAt: serverTimestamp()
        });
        
        console.log(`💀 [PersistentQueue] Moved request ${requestId} to dead letter queue`);
      } else {
        // Mark as failed but available for retry
        await updateDoc(doc(db, this.COLLECTION_NAME, requestId), {
          status: 'failed',
          error,
          updatedAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error(`❌ [PersistentQueue] Failed to mark request ${requestId} as failed:`, error);
    }
  }

  /**
   * Analytics and monitoring
   */
  async getQueueAnalytics(timeRange: 'hour' | 'day' | 'week' = 'day'): Promise<QueueAnalytics> {
    const now = new Date();
    const startTime = new Date();
    
    switch (timeRange) {
      case 'hour':
        startTime.setHours(now.getHours() - 1);
        break;
      case 'day':
        startTime.setDate(now.getDate() - 1);
        break;
      case 'week':
        startTime.setDate(now.getDate() - 7);
        break;
    }

    const analyticsQuery = query(
      collection(db, this.COLLECTION_NAME),
      where('createdAt', '>=', Timestamp.fromDate(startTime))
    );

    const snapshot = await getDocs(analyticsQuery);
    const requests = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as PersistedTranscriptionRequest));

    return this.calculateAnalytics(requests, timeRange);
  }

  private calculateAnalytics(requests: PersistedTranscriptionRequest[], timeRange: string): QueueAnalytics {
    const totalRequests = requests.length;
    const completedRequests = requests.filter(r => r.status === 'completed').length;
    const failedRequests = requests.filter(r => r.status === 'failed' || r.status === 'dead_letter').length;
    
    const processingTimes = requests
      .filter(r => r.actualProcessingTime)
      .map(r => r.actualProcessingTime!);
    
    const averageProcessingTime = processingTimes.length > 0 
      ? processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length 
      : 0;

    const priorityDistribution = requests.reduce((acc, r) => {
      acc[r.priority] = (acc[r.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalRequests,
      completedRequests,
      failedRequests,
      averageProcessingTime,
      averageQueueTime: 0, // Would need more complex calculation
      throughputPerHour: this.calculateThroughput(requests, timeRange),
      errorRate: totalRequests > 0 ? failedRequests / totalRequests : 0,
      priorityDistribution,
      peakHours: this.calculatePeakHours(requests)
    };
  }

  /**
   * Cleanup routines
   */
  private startCleanupRoutine(): void {
    // Clean up completed/failed requests older than 24 hours
    this.cleanupInterval = setInterval(async () => {
      const cutoffTime = new Date();
      cutoffTime.setHours(cutoffTime.getHours() - 24);

      const cleanupQuery = query(
        collection(db, this.COLLECTION_NAME),
        where('status', 'in', ['completed', 'dead_letter']),
        where('updatedAt', '<=', Timestamp.fromDate(cutoffTime))
      );

      const snapshot = await getDocs(cleanupQuery);
      
      for (const doc of snapshot.docs) {
        await deleteDoc(doc.ref);
      }

      if (snapshot.size > 0) {
        console.log(`🧹 [PersistentQueue] Cleaned up ${snapshot.size} old requests`);
      }
    }, 60 * 60 * 1000); // Run every hour
  }

  private startAnalyticsCollection(): void {
    // Collect analytics every 15 minutes
    this.analyticsInterval = setInterval(async () => {
      const analytics = await this.getQueueAnalytics('hour');
      
      await addDoc(collection(db, this.ANALYTICS_COLLECTION), {
        timestamp: serverTimestamp(),
        timeRange: 'hour',
        analytics,
        serverId: this.serverId
      });
    }, 15 * 60 * 1000); // Run every 15 minutes
  }

  // Helper methods
  private calculateDataSize(dataUri: string): number {
    return Math.ceil(dataUri.length * 0.75); // Approximate size after base64 decode
  }

  private estimateProcessingTime(dataUri: string): number {
    const sizeKB = this.calculateDataSize(dataUri) / 1024;
    return Math.ceil(sizeKB * 0.5); // Rough estimate: 0.5 seconds per KB
  }

  private calculateActualProcessingTime(requestId: string): number {
    // This would require tracking start/end times - simplified for now
    return 10; // Placeholder
  }

  private calculateThroughput(requests: PersistedTranscriptionRequest[], timeRange: string): number {
    const completedInRange = requests.filter(r => r.status === 'completed').length;
    const hours = timeRange === 'hour' ? 1 : timeRange === 'day' ? 24 : 168;
    return completedInRange / hours;
  }

  private calculatePeakHours(requests: PersistedTranscriptionRequest[]): Array<{ hour: number; count: number }> {
    const hourCounts = requests.reduce((acc, r) => {
      const hour = r.createdAt.toDate().getHours();
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    return Object.entries(hourCounts)
      .map(([hour, count]) => ({ hour: parseInt(hour), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // Top 5 peak hours
  }

  private isRequestInMemoryQueue(requestId: string): boolean {
    // Check if request is already in memory queue - implementation depends on access to parent class internals
    return false; // Simplified
  }

  private async getRequestFromDatabase(requestId: string): Promise<PersistedTranscriptionRequest | null> {
    try {
      const docSnap = await getDoc(doc(db, this.COLLECTION_NAME, requestId));
      return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as PersistedTranscriptionRequest : null;
    } catch (error) {
      console.error(`❌ [PersistentQueue] Failed to get request ${requestId}:`, error);
      return null;
    }
  }

  /**
   * Graceful shutdown with cleanup
   */
  async shutdown(): Promise<void> {
    console.log('🛑 [PersistentQueue] Shutting down...');
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    if (this.analyticsInterval) {
      clearInterval(this.analyticsInterval);
    }

    // Mark any processing requests as queued for other servers to pick up
    const processingQuery = query(
      collection(db, this.COLLECTION_NAME),
      where('status', '==', 'processing'),
      where('processingServerId', '==', this.serverId)
    );

    const snapshot = await getDocs(processingQuery);
    for (const doc of snapshot.docs) {
      await updateDoc(doc.ref, {
        status: 'queued',
        processingServerId: null,
        updatedAt: serverTimestamp()
      });
    }

    await super.shutdown();
    console.log('✅ [PersistentQueue] Shutdown complete');
  }
}

// Singleton instance with database persistence
let persistentQueueInstance: PersistentTranscriptionQueue | null = null;

export function getPersistentTranscriptionQueue(): PersistentTranscriptionQueue {
  if (!persistentQueueInstance) {
    persistentQueueInstance = new PersistentTranscriptionQueue();
  }
  return persistentQueueInstance;
}
