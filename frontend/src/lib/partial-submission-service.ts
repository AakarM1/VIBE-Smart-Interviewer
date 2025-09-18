/**
 * Progressive Submission Service for FastAPI
 * Simplified version without Firebase dependencies
 */

import { apiService } from '@/lib/api-service';
import type { ConversationEntry } from '@/types';
import type { ProgressInfo, SaveResult, PartialSubmission as PartialQuestionSubmission } from '@/types/partial-submission';

export interface PartialSubmissionEntry {
  question: string;
  answer?: string;
  videoDataUri?: string | null;
  videoUrl?: string | null;
  audioTranscription?: string;
  isVideoReady?: boolean;
  isUploaded?: boolean;
}

export interface LegacyPartialSubmission {
  id?: string;
  candidateName: string;
  testType: string;
  currentQuestion: number;
  totalQuestions: number;
  entries: PartialSubmissionEntry[];
  lastSaved: string;
  isComplete: boolean;
  status: 'in-progress' | 'completed' | 'paused';
}

// Exporting class to support test imports while keeping singleton usage in app
export class PartialSubmissionService {
  private currentSubmission: LegacyPartialSubmission | null = null;
  // 🔒 Minimal-impact in-memory session store (no backend dependency)
  private sessions: Map<string, {
    sessionId: string;
    interviewType: 'JDT' | 'SJT';
    userId?: string;
    candidateId?: string;
    candidateName?: string;
    totalQuestions: number;
    entries: Array<{
      questionIndex: number;
      data: ConversationEntry;
      savedAt: string;
    }>;
    isComplete: boolean;
    startedAt: string;
    completedAt?: string;
  }> = new Map();

  /**
   * Create a new partial submission
   */
  async createPartialSubmission(candidateName: string, testType: string, totalQuestions: number): Promise<string> {
    const submission: LegacyPartialSubmission = {
      candidateName,
      testType,
      currentQuestion: 0,
      totalQuestions,
      entries: [],
      lastSaved: new Date().toISOString(),
      isComplete: false,
      status: 'in-progress'
    };

    this.currentSubmission = submission;
    
    // In a real implementation, you would save this to the backend
    console.log('Created partial submission:', submission);
    
    return 'temp-id-' + Date.now();
  }

  /**
   * Generate a new client-side session id
   */
  generateSessionId(): string {
    // Use crypto if available for better randomness, fallback to Date.now
    const rand = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? (crypto as any).randomUUID()
      : Math.random().toString(36).slice(2) + Date.now().toString(36);
    const sessionId = `sess_${rand}`;
    return sessionId;
  }

  /**
   * Optional: Check for any incomplete session (stubbed for minimal impact)
   * Keeping this for compatibility with existing test helper code.
   */
  async checkIncompleteSession(_userId: string): Promise<null> {
    return null;
  }

  /**
   * Save an individual question's answer (progressive save)
   */
  async saveQuestionAnswer(args: {
    sessionId: string;
    userId: string;
    candidateId?: string;
    candidateName?: string;
    interviewType: 'JDT' | 'SJT';
    questionIndex: number;
    totalQuestions: number;
    questionData: ConversationEntry;
    uploadImmediately?: boolean;
    onUploadProgress?: (progress: number, type: 'video' | 'audio') => void;
  }): Promise<SaveResult> {
    const {
      sessionId,
      userId,
      candidateId,
      candidateName,
      interviewType,
      questionIndex,
      totalQuestions,
      questionData,
      uploadImmediately,
      onUploadProgress,
    } = args;

    // Initialize session if not present
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, {
        sessionId,
        interviewType,
        userId,
        candidateId,
        candidateName,
        totalQuestions,
        entries: [],
        isComplete: false,
        startedAt: new Date().toISOString(),
      });
    }

    const sess = this.sessions.get(sessionId)!;
    // Update metadata if missing
    sess.userId = sess.userId || userId;
    if (candidateId) sess.candidateId = candidateId;
    if (candidateName) sess.candidateName = candidateName;
    if (!sess.totalQuestions) sess.totalQuestions = totalQuestions;

    // Simulate progressive upload progress if requested
    if (uploadImmediately && onUploadProgress) {
      try {
        onUploadProgress(15, 'video');
        onUploadProgress(60, 'video');
        onUploadProgress(100, 'video');
      } catch {}
    }

    // Upsert entry by questionIndex
    const existingIdx = sess.entries.findIndex(e => e.questionIndex === questionIndex);
    const record = {
      questionIndex,
      data: questionData,
      savedAt: new Date().toISOString(),
    };
    if (existingIdx >= 0) {
      sess.entries[existingIdx] = record;
    } else {
      sess.entries.push(record);
    }

    // Maintain currentSubmission for legacy getters
    this.currentSubmission = {
      candidateName: candidateName || '',
      testType: interviewType,
      currentQuestion: Math.min(questionIndex + 1, totalQuestions),
      totalQuestions,
      entries: [],
      lastSaved: record.savedAt,
      isComplete: false,
      status: 'in-progress',
    };

    return {
      success: true,
      submissionId: `${sessionId}_${questionIndex}`,
    };
  }

  /**
   * Get session progress for UI
   */
  async getSessionProgress(sessionId: string): Promise<ProgressInfo> {
    const sess = this.sessions.get(sessionId);
    if (!sess) {
      return {
        sessionId,
        currentQuestion: 0,
        totalQuestions: 0,
        completedQuestions: [],
        nextQuestionIndex: 0,
        canContinue: false,
      };
    }

    const completed: PartialQuestionSubmission[] = [...sess.entries]
      .sort((a, b) => a.questionIndex - b.questionIndex)
      .map(e => ({
        id: `${sess.sessionId}_${e.questionIndex}`,
        sessionId: sess.sessionId,
        userId: sess.userId || '',
        candidateId: sess.candidateId || '',
        candidateName: sess.candidateName || '',
        interviewType: sess.interviewType,
        questionIndex: e.questionIndex,
        totalQuestions: sess.totalQuestions,
        question: e.data.question,
        answer: e.data.answer ?? null,
        videoDataUri: e.data.videoDataUri,
        videoUrl: e.data._isStorageUrl ? e.data.videoDataUri : undefined,
        preferredAnswer: e.data.preferredAnswer,
        competency: e.data.competency,
        timestamp: new Date(e.savedAt),
        status: 'saved' as const,
        retryCount: 0,
        isComplete: sess.isComplete,
      }));

    const currentQuestion = completed.length;
    const nextQuestionIndex = Math.min(currentQuestion, Math.max(sess.totalQuestions - 1, 0));

    return {
      sessionId: sess.sessionId,
      currentQuestion,
      totalQuestions: sess.totalQuestions,
      completedQuestions: completed,
      nextQuestionIndex,
      canContinue: !sess.isComplete && currentQuestion < sess.totalQuestions,
    };
  }

  /**
   * Mark a session as complete (no-op persistence)
   */
  async markSessionComplete(sessionId: string): Promise<void> {
    const sess = this.sessions.get(sessionId);
    if (sess) {
      sess.isComplete = true;
      sess.completedAt = new Date().toISOString();
    }
  }

  /**
   * Update current submission with new entry
   */
  async updateEntry(questionIndex: number, entry: Partial<PartialSubmissionEntry>): Promise<void> {
    if (!this.currentSubmission) {
      throw new Error('No active submission');
    }

    // Ensure entries array is large enough
    while (this.currentSubmission.entries.length <= questionIndex) {
      this.currentSubmission.entries.push({
        question: '',
        answer: undefined,
        videoDataUri: null,
        isVideoReady: false,
        isUploaded: false
      });
    }

    // Update the entry
    this.currentSubmission.entries[questionIndex] = {
      ...this.currentSubmission.entries[questionIndex],
      ...entry
    };

    this.currentSubmission.lastSaved = new Date().toISOString();
    
    console.log('Updated entry:', questionIndex, entry);
  }

  /**
   * Get current submission
   */
  getCurrentSubmission(): LegacyPartialSubmission | null {
    return this.currentSubmission;
  }

  /**
   * Complete the submission
   */
  async completeSubmission(): Promise<void> {
    if (!this.currentSubmission) {
      throw new Error('No active submission');
    }

    this.currentSubmission.isComplete = true;
    this.currentSubmission.status = 'completed';
    this.currentSubmission.lastSaved = new Date().toISOString();

    // In a real implementation, you would save this to the backend
    console.log('Completed submission:', this.currentSubmission);
    
    // Clear current submission
    this.currentSubmission = null;
  }

  /**
   * Delete a partial submission
   */
  async deletePartialSubmission(id: string): Promise<void> {
    console.log('Would delete partial submission:', id);
    if (this.currentSubmission?.id === id) {
      this.currentSubmission = null;
    }
  }

  /**
   * Clear current submission
   */
  clearCurrentSubmission(): void {
    this.currentSubmission = null;
  }
}

// Export singleton instance
export const partialSubmissionService = new PartialSubmissionService();