/**
 * 🔒 MINIMAL IMPACT ADDITION - New types for per-question storage
 * This file adds new functionality without modifying existing types
 */

import type { ConversationEntry } from './index';

/**
 * Represents a single question's answer saved progressively
 * This is separate from the main Submission type to avoid conflicts
 */
export interface PartialSubmission {
  id: string;
  sessionId: string;          // Groups questions from same interview session
  userId: string;             // User who submitted this
  candidateId: string;        // Candidate identifier
  candidateName: string;      // Candidate name for easier admin tracking
  
  // Interview metadata
  interviewType: 'JDT' | 'SJT';
  questionIndex: number;      // Which question (0-based)
  totalQuestions: number;     // Total questions in this interview
  
  // Question data (same structure as ConversationEntry)
  question: string;
  answer: string | null;
  videoDataUri?: string | null;      // Video/audio data or Firebase Storage URL
  videoUrl?: string | null;          // 🔒 NEW FIELD - Firebase Storage URL when uploaded progressively
  preferredAnswer?: string | null;
  competency?: string | null;
  
  // SJT specific fields
  situation?: string | null;
  bestResponseRationale?: string | null;
  worstResponseRationale?: string | null;
  assessedCompetency?: string | null;
  
  // Metadata for tracking
  timestamp: Date;            // When this was saved
  status: 'saved' | 'error' | 'retry';
  retryCount: number;         // How many save attempts
  isComplete: boolean;        // Is this the final submission for this session?
  
  // Firebase timestamps
  createdAt?: any;            // Firestore serverTimestamp
  updatedAt?: any;            // Firestore serverTimestamp
}

/**
 * Session recovery information
 */
export interface SessionRecovery {
  sessionId: string;
  candidateName: string;
  interviewType: 'JDT' | 'SJT';
  totalQuestions: number;
  completedQuestions: number;
  lastQuestionIndex: number;
  canResume: boolean;
  partialSubmissions: PartialSubmission[];
  startedAt: Date;
  lastActivityAt: Date;
}

/**
 * Progress information for UI
 */
export interface ProgressInfo {
  sessionId: string;
  currentQuestion: number;
  totalQuestions: number;
  completedQuestions: PartialSubmission[];
  nextQuestionIndex: number;
  canContinue: boolean;
}

/**
 * Save result for individual questions
 */
export interface SaveResult {
  success: boolean;
  submissionId?: string;
  error?: string;
  shouldRetry?: boolean;
  retryAfterSeconds?: number;
}

/**
 * Enhanced submission that includes session metadata
 * This extends the existing Submission without modifying it
 */
export interface EnhancedSubmission {
  // All original submission fields
  id: string;
  candidateName: string;
  testType: 'JDT' | 'SJT';
  date: string;
  report: any; // AnalysisResult
  history: ConversationEntry[];
  candidateId?: string;
  
  // New session tracking fields
  sessionId?: string;         // Links to partial submissions
  wasRecovered?: boolean;     // Was this session recovered?
  originalSessionId?: string; // If recovered from different session
  
  // Timing information
  sessionStarted?: Date;
  sessionCompleted?: Date;
  totalDurationMinutes?: number;
  averageQuestionTimeMinutes?: number;
  
  // Progress timeline
  progressTimeline?: Array<{
    questionIndex: number;
    completedAt: Date;
    retryCount: number;
  }>;
}
