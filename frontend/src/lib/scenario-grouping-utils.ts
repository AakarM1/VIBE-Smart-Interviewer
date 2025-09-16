/**
 * @fileOverview Utilities for grouping SJT conversation entries by scenario.
 * This module provides functions to organize question/answer pairs by their scenarios
 * to enable comprehensive scenario-based analysis while maintaining backward compatibility.
 */

import type { ConversationEntry } from '@/types';

/**
 * Extended conversation entry with analysis metadata
 */
export interface EnhancedConversationEntry extends ConversationEntry {
  isFollowUp: boolean;
  questionNumber: number;
  penaltyApplied?: number;
}

/**
 * Groups conversation entries by scenario for comprehensive analysis.
 * Maintains backward compatibility with existing data structures.
 * 
 * @param entries - Array of conversation entries from a submission
 * @returns Map where keys are scenario identifiers and values are arrays of related entries
 */
export function groupEntriesByScenario(entries: ConversationEntry[]): Map<string, EnhancedConversationEntry[]> {
  const scenarioGroups = new Map<string, EnhancedConversationEntry[]>();
  
  console.log(`🔍 Grouping ${entries.length} entries by scenario...`);
  
  entries.forEach((entry, index) => {
    // Generate a scenario key based on the situation text
    // If no situation is provided, fall back to a question-based key for backward compatibility
    let scenarioKey: string;
    
    if (entry.situation && entry.situation.trim().length > 0) {
      // Use first 50 characters of situation as the key (normalized)
      scenarioKey = entry.situation.trim().substring(0, 50).replace(/[^\w\s]/g, '').trim();
      console.log(`📝 Entry ${index + 1}: situation="${entry.situation.substring(0, 100)}..." → key="${scenarioKey}"`);
    } else {
      // Fallback: use question-based grouping for backward compatibility
      scenarioKey = `Question_${index + 1}`;
      console.log(`📝 Entry ${index + 1}: no situation → key="${scenarioKey}"`);
    }
    
    // Ensure we have a valid key
    if (!scenarioKey || scenarioKey.length === 0) {
      scenarioKey = `Scenario_${index + 1}`;
      console.log(`📝 Entry ${index + 1}: empty key → fallback="${scenarioKey}"`);
    }
    
    // Add entry to the appropriate scenario group
    if (!scenarioGroups.has(scenarioKey)) {
      scenarioGroups.set(scenarioKey, []);
      console.log(`🆕 Created new scenario group: "${scenarioKey}"`);
    } else {
      console.log(`📂 Adding to existing scenario group: "${scenarioKey}"`);
    }
    
    const enhancedEntry: EnhancedConversationEntry = {
      ...entry,
      // Add derived fields for analysis while preserving original data
      isFollowUp: entry.followUpGenerated || false,
      questionNumber: scenarioGroups.get(scenarioKey)!.length + 1
    };
    
    scenarioGroups.get(scenarioKey)!.push(enhancedEntry);
  });
  
  console.log(`📊 Final grouping: ${scenarioGroups.size} scenarios`);
  scenarioGroups.forEach((entries, key) => {
    console.log(`  "${key}": ${entries.length} entries`);
  });
  
  return scenarioGroups;
}

/**
 * Determines if an entry is a follow-up question based on various indicators.
 * This function provides backward compatibility for entries that don't have explicit follow-up flags.
 * 
 * @param entry - The conversation entry to check
 * @param allEntries - All entries in the submission for context
 * @param entryIndex - Index of the current entry
 * @returns Boolean indicating if this is likely a follow-up question
 */
export function isFollowUpQuestion(entry: ConversationEntry, allEntries: ConversationEntry[], entryIndex: number): boolean {
  // Check explicit flag first
  if (entry.followUpGenerated !== undefined) {
    return entry.followUpGenerated;
  }
  
  // If we don't have the explicit flag, try to infer from context
  // Look for entries with the same situation that come after the first occurrence
  if (entry.situation) {
    const firstOccurrenceIndex = allEntries.findIndex(e => e.situation === entry.situation);
    return firstOccurrenceIndex !== -1 && entryIndex > firstOccurrenceIndex;
  }
  
  // Default to false if we can't determine
  return false;
}

/**
 * Enhanced grouping function that includes follow-up detection and penalty calculation support.
 * This function maintains backward compatibility while adding enhanced features.
 * 
 * @param entries - Array of conversation entries from a submission
 * @param followUpPenalty - Percentage penalty to apply for follow-up questions (0-100)
 * @returns Map with enhanced scenario groups including penalty information
 */
export function groupEntriesByScenarioWithPenalties(
  entries: ConversationEntry[], 
  followUpPenalty: number = 0
): Map<string, EnhancedConversationEntry[]> {
  const baseGroups = groupEntriesByScenario(entries);
  const enhancedGroups = new Map<string, EnhancedConversationEntry[]>();
  
  baseGroups.forEach((groupEntries, scenarioKey) => {
    const enhancedEntries = groupEntries.map((entry, indexInGroup) => {
      const globalIndex = entries.indexOf(entry);
      const isFollowUp = indexInGroup > 0 || isFollowUpQuestion(entry, entries, globalIndex);
      
      const enhancedEntry: EnhancedConversationEntry = {
        ...entry,
        isFollowUp,
        questionNumber: indexInGroup + 1,
        penaltyApplied: isFollowUp ? followUpPenalty : 0
      };
      
      return enhancedEntry;
    });
    
    enhancedGroups.set(scenarioKey, enhancedEntries);
  });
  
  return enhancedGroups;
}

/**
 * Applies penalty calculation to a score based on follow-up status.
 * This maintains the existing penalty system while providing a centralized calculation.
 * 
 * @param originalScore - The original score (0-10)
 * @param isFollowUp - Whether this response is to a follow-up question
 * @param penaltyPercentage - The penalty percentage to apply (0-100)
 * @returns Object with original score, penalty applied, and final score
 */
export function calculatePenaltyScore(
  originalScore: number, 
  isFollowUp: boolean, 
  penaltyPercentage: number
): {
  prePenaltyScore: number;
  postPenaltyScore: number;
  penaltyApplied: number;
  hasFollowUp: boolean;
} {
  const prePenaltyScore = originalScore;
  const penaltyApplied = isFollowUp ? penaltyPercentage : 0;
  const postPenaltyScore = isFollowUp ? 
    Math.max(0, originalScore * (1 - penaltyPercentage / 100)) : 
    originalScore;
  
  return {
    prePenaltyScore,
    postPenaltyScore,
    penaltyApplied,
    hasFollowUp: isFollowUp
  };
}
