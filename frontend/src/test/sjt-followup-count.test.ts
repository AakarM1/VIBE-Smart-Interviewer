/**
 * Tests for SJT Follow-up Question Count Configuration
 * Ensures admin settings are respected throughout the pipeline
 */

import { getSjtFollowUpCount, type SJTSettings } from '@/lib/config-service';

describe('SJT Follow-up Question Count Configuration', () => {
  
  describe('getSjtFollowUpCount', () => {
    
    test('should return 1 when no settings provided', () => {
      const result = getSjtFollowUpCount();
      expect(result).toBe(1);
    });
    
    test('should return followUpCount when available', () => {
      const settings: SJTSettings = {
        timeLimit: 0,
        numberOfQuestions: 5,
        questionTimeLimit: 120,
        aiGeneratedQuestions: 3, // Legacy field
        followUpCount: 1, // New field takes precedence
        followUpPenalty: 0
      };
      
      const result = getSjtFollowUpCount(settings);
      expect(result).toBe(1);
    });
    
    test('should fall back to aiGeneratedQuestions when followUpCount not available', () => {
      const settings: SJTSettings = {
        timeLimit: 0,
        numberOfQuestions: 5,
        questionTimeLimit: 120,
        aiGeneratedQuestions: 2,
        followUpCount: undefined as any, // Simulate missing field
        followUpPenalty: 0
      };
      
      const result = getSjtFollowUpCount(settings);
      expect(result).toBe(2);
    });
    
    test('should default to 1 when invalid values provided', () => {
      const settings: SJTSettings = {
        timeLimit: 0,
        numberOfQuestions: 5,
        questionTimeLimit: 120,
        aiGeneratedQuestions: -1, // Invalid
        followUpCount: NaN, // Invalid
        followUpPenalty: 0
      };
      
      const result = getSjtFollowUpCount(settings);
      expect(result).toBe(1);
    });
    
    test('should cap at maximum of 5', () => {
      const settings: SJTSettings = {
        timeLimit: 0,
        numberOfQuestions: 5,
        questionTimeLimit: 120,
        aiGeneratedQuestions: 0,
        followUpCount: 10, // Exceeds max
        followUpPenalty: 0
      };
      
      const result = getSjtFollowUpCount(settings);
      expect(result).toBe(5);
    });
    
  });
  
  describe('Integration Test: Admin Configuration Validation', () => {
    
    test('should properly migrate from old aiGeneratedQuestions to new followUpCount', () => {
      // Simulate old configuration
      const legacySettings: SJTSettings = {
        timeLimit: 0,
        numberOfQuestions: 5,
        questionTimeLimit: 120,
        aiGeneratedQuestions: 3,
        followUpCount: undefined as any, // Missing new field
        followUpPenalty: 0
      };
      
      const result = getSjtFollowUpCount(legacySettings);
      expect(result).toBe(3); // Should use legacy value
    });
    
    test('should respect new followUpCount over legacy aiGeneratedQuestions', () => {
      const modernSettings: SJTSettings = {
        timeLimit: 0,
        numberOfQuestions: 5,
        questionTimeLimit: 120,
        aiGeneratedQuestions: 5, // Legacy value
        followUpCount: 1, // New value takes precedence
        followUpPenalty: 0
      };
      
      const result = getSjtFollowUpCount(modernSettings);
      expect(result).toBe(1); // Should use new value
    });
    
  });
  
  describe('Edge Cases and Error Handling', () => {
    
    test('should handle followUpCount = 0 (no follow-ups)', () => {
      const settings: SJTSettings = {
        timeLimit: 0,
        numberOfQuestions: 5,
        questionTimeLimit: 120,
        aiGeneratedQuestions: 0,
        followUpCount: 0,
        followUpPenalty: 0
      };
      
      const result = getSjtFollowUpCount(settings);
      expect(result).toBe(0);
    });
    
    test('should handle negative followUpCount', () => {
      const settings: SJTSettings = {
        timeLimit: 0,
        numberOfQuestions: 5,
        questionTimeLimit: 120,
        aiGeneratedQuestions: 0,
        followUpCount: -5,
        followUpPenalty: 0
      };
      
      const result = getSjtFollowUpCount(settings);
      expect(result).toBe(1); // Should default to 1
    });
    
    test('should handle completely missing settings object', () => {
      const result = getSjtFollowUpCount(undefined);
      expect(result).toBe(1);
    });
    
    test('should handle partially undefined settings', () => {
      const partialSettings = {
        timeLimit: 0,
        numberOfQuestions: 5
        // Missing other fields
      } as SJTSettings;
      
      const result = getSjtFollowUpCount(partialSettings);
      expect(result).toBe(1);
    });
    
  });
  
});
