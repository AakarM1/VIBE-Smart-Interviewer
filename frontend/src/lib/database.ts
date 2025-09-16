/**
 * Database service layer for FastAPI backend
 * Replaces Firebase Firestore with FastAPI endpoints
 */

import { apiService, User as ApiUser } from '@/lib/api-service';
import type { Submission } from '@/types';

// Use the API User type for consistency
export type User = ApiUser;

// Configuration interface
export interface Config {
  id: string;
  type: 'jdt' | 'sjt' | 'global';
  data: any;
  createdAt?: string;
  updatedAt?: string;
}

// User operations
export const userService = {
  // Get all users
  async getAll(): Promise<User[]> {
    try {
      const result = await apiService.getUsers();
      return result.data?.users || [];
    } catch (error) {
      console.error('Error fetching users:', error);
      return [];
    }
  },

  // Get user by email
  async getByEmail(email: string): Promise<User | null> {
    try {
      const result = await apiService.getUserByEmail(email);
      return result.data || null;
    } catch (error) {
      console.error('Error fetching user by email:', error);
      return null;
    }
  },

  // Create new user
  async create(userData: Partial<User> & { password?: string; passwordHash?: string }): Promise<string | null> {
    try {
      const result = await apiService.createUser(userData);
      return result.data?.id || null;
    } catch (error) {
      console.error('Error creating user:', error);
      return null;
    }
  },

  // Update user
  async update(userId: string, updates: Partial<User>): Promise<boolean> {
    try {
      const result = await apiService.updateUser(userId, updates);
      return !!result.data;
    } catch (error) {
      console.error('Error updating user:', error);
      return false;
    }
  },

  // Delete user
  async delete(userId: string): Promise<boolean> {
    try {
      const result = await apiService.deleteUser(userId);
      return !!result.data;
    } catch (error) {
      console.error('Error deleting user:', error);
      return false;
    }
  }
};

// Submission operations
export const submissionService = {
  // Get all submissions (one-time fetch)
  async getAll(): Promise<Submission[]> {
    try {
      const result = await apiService.getSubmissions();
      return result.data || [];
    } catch (error) {
      console.error('Error fetching submissions:', error);
      return [];
    }
  },

  // Listen to all submissions (polling-based since REST API doesn't support real-time)
  onSubmissionsChange(callback: (submissions: Submission[]) => void): () => void {
    console.log('🔄 Setting up polling-based listener for submissions');
    
    let intervalId: NodeJS.Timeout;
    let isActive = true;
    
    const pollSubmissions = async () => {
      if (!isActive) return;
      
      try {
        const submissions = await this.getAll();
        console.log(`� Polling update: ${submissions.length} submissions found`);
        callback(submissions);
      } catch (error) {
        console.error('❌ Error polling submissions:', error);
        callback([]);
      }
    };
    
    // Initial fetch
    pollSubmissions();
    
    // Poll every 5 seconds
    intervalId = setInterval(pollSubmissions, 5000);
    
    // Return cleanup function
    return () => {
      isActive = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
      console.log('🔄 Submission polling listener cleaned up');
    };
  },

  // Get submission by ID
  async getById(submissionId: string): Promise<Submission | null> {
    try {
      const result = await apiService.getSubmission(submissionId);
      return result.data || null;
    } catch (error) {
      console.error('Error fetching submission:', error);
      return null;
    }
  },

  // Create new submission
  async create(submissionData: Omit<Submission, 'id' | 'date'>): Promise<string | null> {
    try {
      console.log('🗄️ Creating submission via FastAPI:', {
        candidateName: submissionData.candidateName,
        testType: submissionData.testType
      });
      
      const result = await apiService.createSubmission(submissionData);
      
      if (result.data) {
        console.log('✅ Submission created with ID:', result.data.id);
        return result.data.id;
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error creating submission:', error);
      return null;
    }
  },

  // Update submission
  async update(submissionId: string, updates: Partial<Submission>): Promise<boolean> {
    try {
      console.log('📝 Updating submission via FastAPI:', submissionId);
      
      const result = await apiService.updateSubmission(submissionId, updates);
      
      if (result.data) {
        console.log('✅ Submission updated successfully:', submissionId);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ Error updating submission:', error);
      return false;
    }
  },

  // Delete submission
  async delete(submissionId: string): Promise<boolean> {
    try {
      const result = await apiService.deleteSubmission(submissionId);
      return !!result.data;
    } catch (error) {
      console.error('Error deleting submission:', error);
      return false;
    }
  },

  // Helper function - no longer needed with JSON API but kept for compatibility
  removeUndefinedFields(obj: any): any {
    // FastAPI handles JSON serialization automatically
    return obj;
  }
};

// Configuration operations
export const configService = {
  // Get configuration by type
  async getByType(type: 'jdt' | 'sjt' | 'global'): Promise<any | null> {
    try {
      const result = await apiService.getConfiguration(type);
      return result.data || null;
    } catch (error) {
      console.error('Error fetching configuration:', error);
      return null;
    }
  },

  // Save configuration
  async save(type: 'jdt' | 'sjt' | 'global', configData: any): Promise<boolean> {
    try {
      const result = await apiService.saveConfiguration(type, configData);
      return !!result.data;
    } catch (error) {
      console.error('Error saving configuration:', error);
      return false;
    }
  }
};

// Utility functions - simplified for FastAPI
export const timestampToDate = (timestamp: string | null): Date => {
  if (!timestamp) {
    return new Date();
  }
  return new Date(timestamp);
};

// No longer needed - FastAPI returns regular objects
export const convertFirestoreSubmission = (submission: Submission): Submission => {
  return submission;
};

// Legacy interfaces for backward compatibility
export interface FirestoreUser extends User {
  passwordHash?: string;
}

export interface FirestoreConfig extends Config {}

export interface FirestoreSubmission extends Submission {}
