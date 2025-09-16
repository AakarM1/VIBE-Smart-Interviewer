import { configService } from '@/lib/database';

// Configuration keys for localStorage fallback
const JDT_CONFIG_KEY = 'jdt-config';
const SJT_CONFIG_KEY = 'sjt-config';
const GLOBAL_SETTINGS_KEY = 'global-settings';

// Check if we should use localStorage instead of Firestore
const useLocalStorage = () => {
  return process.env.NEXT_PUBLIC_USE_LOCALSTORAGE === 'true';
};

export const configurationService = {
  // Save JDT configuration
  async saveJDTConfig(config: any): Promise<boolean> {
    if (useLocalStorage()) {
      if (typeof window !== 'undefined') {
        localStorage.setItem(JDT_CONFIG_KEY, JSON.stringify(config));
        return true;
      }
      return false;
    }

    try {
      return await configService.save('jdt', config);
    } catch (error) {
      console.error('Error saving JDT config to Firestore, falling back to localStorage:', error);
      if (typeof window !== 'undefined') {
        localStorage.setItem(JDT_CONFIG_KEY, JSON.stringify(config));
        return true;
      }
      return false;
    }
  },

  // Get JDT configuration
  async getJDTConfig(): Promise<any | null> {
    if (useLocalStorage()) {
      if (typeof window !== 'undefined') {
        const data = localStorage.getItem(JDT_CONFIG_KEY);
        return data ? JSON.parse(data) : null;
      }
      return null;
    }

    try {
      const config = await configService.getByType('jdt');
      if (config) return config;
    } catch (error) {
      console.error('Error getting JDT config from Firestore, falling back to localStorage:', error);
    }
    
    // Fallback to localStorage
    if (typeof window !== 'undefined') {
      const data = localStorage.getItem(JDT_CONFIG_KEY);
      return data ? JSON.parse(data) : null;
    }
    return null;
  },

  // Save SJT configuration
  async saveSJTConfig(config: any): Promise<boolean> {
    if (useLocalStorage()) {
      if (typeof window !== 'undefined') {
        localStorage.setItem(SJT_CONFIG_KEY, JSON.stringify(config));
        return true;
      }
      return false;
    }

    try {
      return await configService.save('sjt', config);
    } catch (error) {
      console.error('Error saving SJT config to Firestore, falling back to localStorage:', error);
      if (typeof window !== 'undefined') {
        localStorage.setItem(SJT_CONFIG_KEY, JSON.stringify(config));
        return true;
      }
      return false;
    }
  },

  // Get SJT configuration
  async getSJTConfig(): Promise<any | null> {
    if (useLocalStorage()) {
      if (typeof window !== 'undefined') {
        const data = localStorage.getItem(SJT_CONFIG_KEY);
        return data ? JSON.parse(data) : null;
      }
      return null;
    }

    try {
      const config = await configService.getByType('sjt');
      if (config) return config;
    } catch (error) {
      console.error('Error getting SJT config from Firestore, falling back to localStorage:', error);
    }
    
    // Fallback to localStorage
    if (typeof window !== 'undefined') {
      const data = localStorage.getItem(SJT_CONFIG_KEY);
      return data ? JSON.parse(data) : null;
    }
    return null;
  },

  // Save global settings
  async saveGlobalSettings(settings: any): Promise<boolean> {
    if (useLocalStorage()) {
      if (typeof window !== 'undefined') {
        localStorage.setItem(GLOBAL_SETTINGS_KEY, JSON.stringify(settings));
        return true;
      }
      return false;
    }

    try {
      return await configService.save('global', settings);
    } catch (error) {
      console.error('Error saving global settings to Firestore, falling back to localStorage:', error);
      if (typeof window !== 'undefined') {
        localStorage.setItem(GLOBAL_SETTINGS_KEY, JSON.stringify(settings));
        return true;
      }
      return false;
    }
  },

  // Get global settings
  async getGlobalSettings(): Promise<any | null> {
    if (useLocalStorage()) {
      if (typeof window !== 'undefined') {
        const data = localStorage.getItem(GLOBAL_SETTINGS_KEY);
        return data ? JSON.parse(data) : null;
      }
      return null;
    }

    try {
      const settings = await configService.getByType('global');
      if (settings) return settings;
    } catch (error) {
      console.error('Error getting global settings from Firestore, falling back to localStorage:', error);
    }
    
    // Fallback to localStorage
    if (typeof window !== 'undefined') {
      const data = localStorage.getItem(GLOBAL_SETTINGS_KEY);
      return data ? JSON.parse(data) : null;
    }
    return null;
  }
};
