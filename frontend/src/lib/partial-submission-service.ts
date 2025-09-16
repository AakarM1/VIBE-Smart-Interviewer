/**
 * Progressive Submission Service for FastAPI
 * Simplified version without Firebase dependencies
 */

import { apiService } from '@/lib/api-service';

export interface PartialSubmissionEntry {
  question: string;
  answer?: string;
  videoDataUri?: string | null;
  videoUrl?: string | null;
  audioTranscription?: string;
  isVideoReady?: boolean;
  isUploaded?: boolean;
}

export interface PartialSubmission {
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

class PartialSubmissionService {
  private currentSubmission: PartialSubmission | null = null;

  /**
   * Create a new partial submission
   */
  async createPartialSubmission(candidateName: string, testType: string, totalQuestions: number): Promise<string> {
    const submission: PartialSubmission = {
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
  getCurrentSubmission(): PartialSubmission | null {
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