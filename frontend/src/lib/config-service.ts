import { apiService } from '@/lib/api-service';
import { configService as legacyConfigService } from '@/lib/database';

// Typed interfaces for SJT configuration
export interface SJTSettings {
  timeLimit: number; // in minutes, 0 for no limit
  numberOfQuestions: number;
  questionTimeLimit: number; // per-question time limit in seconds
  aiGeneratedQuestions: number; // DEPRECATED: Use followUpCount instead
  followUpCount: number; // Number of AI-generated follow-up questions (replaces aiGeneratedQuestions)
  followUpPenalty: number; // Percentage penalty for follow-up questions (0-100)
  // NEW advanced SJT behavior fields (optional to preserve compatibility)
  prepTimeSeconds?: number;
  autoStartRecording?: boolean;
  answerTimeSeconds?: number;
  reRecordLimit?: number;
  ttsEnabled?: boolean;
  ttsVoice?: string;
}

export interface SJTScenario {
  id: number;
  situation: string;
  question: string;
  bestResponseRationale: string;
  worstResponseRationale: string;
  assessedCompetency: string;
  // Optional per-scenario overrides
  prepTimeSeconds?: number;
  answerTimeSeconds?: number;
  reRecordLimit?: number;
  ttsVoice?: string;
}

export interface SJTConfig {
  scenarios: SJTScenario[];
  settings: SJTSettings;
}

/**
 * Get SJT configuration with typed return and safe defaults
 */
export function getSjtConfig(): Promise<SJTConfig | null> {
  return configurationService.getSJTConfig();
}

/**
 * Extract follow-up count from SJT settings with fallback handling
 */
export function getSjtFollowUpCount(settings?: SJTSettings): number {
  if (!settings) return 1; // Default fallback
  
  // Use new followUpCount if available, otherwise fall back to deprecated aiGeneratedQuestions
  const followUpCount = settings.followUpCount ?? settings.aiGeneratedQuestions ?? 1;
  
  // Validate and normalize the count
  if (typeof followUpCount !== 'number' || followUpCount < 0) {
    console.warn('Invalid followUpCount, using default of 1');
    return 1;
  }
  
  // Cap at reasonable maximum
  return Math.min(followUpCount, 5);
}

export const configurationService = {
  // Save JDT configuration
  async saveJDTConfig(config: any): Promise<boolean> {
    try {
      console.log('💾 Saving JDT config to FastAPI');
      const result = await apiService.saveConfiguration('jdt', config);
      console.log('✅ JDT config saved successfully');
      return !!result.data;
    } catch (error) {
      console.error('❌ Error saving JDT config to FastAPI:', error);
      return false;
    }
  },

  // Get JDT configuration
  async getJDTConfig(): Promise<any | null> {
    try {
      console.log('📖 Fetching JDT config from FastAPI');
      const result = await apiService.getConfiguration('jdt');
      console.log('✅ JDT config fetched:', result.data ? 'Found' : 'Not found');
      return result.data?.config_data || null;
    } catch (error) {
      console.error('❌ Error getting JDT config from FastAPI:', error);
      return null;
    }
  },

  // Save SJT configuration with fallback
  async saveSJTConfig(config: any): Promise<boolean> {
    try {
      console.log('💾 Saving SJT config to FastAPI (primary)');
      const result = await apiService.saveConfiguration('sjt', config);
      console.log('✅ SJT config saved successfully to FastAPI');
      return !!result.data;
    } catch (error) {
      console.warn('⚠️ FastAPI save failed, trying legacy Firestore fallback:', error);
      try {
        const fallbackResult = await legacyConfigService.save('sjt', config);
        console.log('✅ SJT config saved successfully to Firestore (fallback)');
        return fallbackResult;
      } catch (fallbackError) {
        console.error('❌ Both FastAPI and Firestore save failed:', fallbackError);
        return false;
      }
    }
  },

  // Get SJT configuration with fallback
  async getSJTConfig(): Promise<any | null> {
    try {
      console.log('📖 Fetching SJT config from FastAPI (primary)');
      const result = await apiService.getConfiguration('sjt');
      console.log('✅ SJT config fetched from FastAPI:', result.data ? 'Found' : 'Not found');
      return result.data?.config_data || null;
    } catch (error) {
      console.warn('⚠️ FastAPI fetch failed, trying legacy Firestore fallback:', error);
      try {
        const fallbackResult = await legacyConfigService.getByType('sjt');
        console.log('✅ SJT config fetched from Firestore (fallback):', fallbackResult ? 'Found' : 'Not found');
        return fallbackResult;
      } catch (fallbackError) {
        console.error('❌ Both FastAPI and Firestore fetch failed:', fallbackError);
        return null;
      }
    }
  },

  // Save global settings
  async saveGlobalSettings(settings: any): Promise<boolean> {
    try {
      console.log('💾 Saving global settings to FastAPI');
      const result = await apiService.saveConfiguration('global', settings);
      console.log('✅ Global settings saved successfully');
      return !!result.data;
    } catch (error) {
      console.error('❌ Error saving global settings to FastAPI:', error);
      return false;
    }
  },

  // Get global settings
  async getGlobalSettings(): Promise<any | null> {
    try {
      console.log('📖 Fetching global settings from FastAPI');
      const result = await apiService.getConfiguration('global');
      if (!result.data) {
        // Safe fallback if backend returns 404 Not Found
        console.warn('Global settings not found, using safe defaults');
        return null;
      }
      console.log('✅ Global settings fetched:', 'Found');
      return result.data?.config_data || null;
    } catch (error) {
      console.error('❌ Error getting global settings from FastAPI:', error);
      return null;
    }
  }
};
