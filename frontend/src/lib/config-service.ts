import { configService } from '@/lib/database';

// Typed interfaces for SJT configuration
export interface SJTSettings {
  timeLimit: number; // in minutes, 0 for no limit
  numberOfQuestions: number;
  questionTimeLimit: number; // per-question time limit in seconds
  aiGeneratedQuestions: number; // DEPRECATED: Use followUpCount instead
  followUpCount: number; // Number of AI-generated follow-up questions (replaces aiGeneratedQuestions)
  followUpPenalty: number; // Percentage penalty for follow-up questions (0-100)
}

export interface SJTScenario {
  id: number;
  situation: string;
  question: string;
  bestResponseRationale: string;
  worstResponseRationale: string;
  assessedCompetency: string;
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
      console.log('💾 Saving JDT config to Firestore');
      const result = await configService.save('jdt', config);
      console.log('✅ JDT config saved successfully');
      return result;
    } catch (error) {
      console.error('❌ Error saving JDT config to Firestore:', error);
      return false;
    }
  },

  // Get JDT configuration
  async getJDTConfig(): Promise<any | null> {
    try {
      console.log('📖 Fetching JDT config from Firestore');
      const config = await configService.getByType('jdt');
      console.log('✅ JDT config fetched:', config ? 'Found' : 'Not found');
      return config;
    } catch (error) {
      console.error('❌ Error getting JDT config from Firestore:', error);
      return null;
    }
  },

  // Save SJT configuration
  async saveSJTConfig(config: any): Promise<boolean> {
    try {
      console.log('💾 Saving SJT config to Firestore');
      const result = await configService.save('sjt', config);
      console.log('✅ SJT config saved successfully');
      return result;
    } catch (error) {
      console.error('❌ Error saving SJT config to Firestore:', error);
      return false;
    }
  },

  // Get SJT configuration
  async getSJTConfig(): Promise<any | null> {
    try {
      console.log('📖 Fetching SJT config from Firestore');
      const config = await configService.getByType('sjt');
      console.log('✅ SJT config fetched:', config ? 'Found' : 'Not found');
      return config;
    } catch (error) {
      console.error('❌ Error getting SJT config from Firestore:', error);
      return null;
    }
  },

  // Save global settings
  async saveGlobalSettings(settings: any): Promise<boolean> {
    try {
      console.log('💾 Saving global settings to Firestore');
      const result = await configService.save('global', settings);
      console.log('✅ Global settings saved successfully');
      return result;
    } catch (error) {
      console.error('❌ Error saving global settings to Firestore:', error);
      return false;
    }
  },

  // Get global settings
  async getGlobalSettings(): Promise<any | null> {
    try {
      console.log('📖 Fetching global settings from Firestore');
      const settings = await configService.getByType('global');
      if (!settings) {
        // Safe fallback if backend returns 404 Not Found
        console.warn('Global settings not found, using safe defaults');
        return null;
      }
      console.log('✅ Global settings fetched:', 'Found');
      return settings;
    } catch (error) {
      console.error('❌ Error getting global settings from Firestore:', error);
      return null;
    }
  }
};
