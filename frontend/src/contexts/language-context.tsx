/**
 * Language Context for Multilingual Support
 * Simplified version using FastAPI backend
 */

'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './auth-context';
import { isRTLLanguage, getLanguageDisplayName } from '@/lib/i18n-utils';
import { featureFlags } from '@/lib/feature-flags';
import i18n from '@/lib/i18n';
import { translationService } from '@/lib/translation-service';

interface LanguageInfo {
  code: string;
  name: string;
  nativeName: string;
  rtl?: boolean;
}

interface LanguageContextType {
  // Current language state
  currentLanguage: string;
  isRTL: boolean;
  ready: boolean;
  
  // Supported languages
  supportedLanguages: LanguageInfo[];
  defaultLanguage: string;
  
  // Language management
  setLanguage: (languageCode: string) => Promise<void>;
  getSupportedLanguages: () => LanguageInfo[];
  
  // Translation utilities (simplified)
  translate: (text: string, targetLang?: string) => Promise<string>;
  translateBatch: (texts: string[], targetLang?: string) => Promise<string[]>;
  getTranslation: (key: string, fallback?: string) => Promise<string>;
  
  // Feature flag
  isMultilingualEnabled: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  children: ReactNode;
}

const LANGUAGE_STORAGE_KEY = 'user-language-preference';
const DEFAULT_LANGUAGE = 'en';

// Default supported languages
const DEFAULT_SUPPORTED_LANGUAGES: LanguageInfo[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', rtl: true },
];

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [currentLanguage, setCurrentLanguage] = useState<string>(DEFAULT_LANGUAGE);
  const [isRTL, setIsRTL] = useState<boolean>(false);
  const [ready, setReady] = useState<boolean>(false);
  const [supportedLanguages] = useState<LanguageInfo[]>(DEFAULT_SUPPORTED_LANGUAGES);
  const [defaultLanguage] = useState<string>(DEFAULT_LANGUAGE);
  
  // Feature-gated multilingual enablement
  const isMultilingualEnabled = featureFlags.isI18nEnabled();
  
  // Initialize user's preferred language
  useEffect(() => {
    const initializeLanguage = async () => {
      let preferredLang = DEFAULT_LANGUAGE;
      
      // Priority 1: User's saved preference in profile
      if (user?.language_preference) {
        preferredLang = user.language_preference;
      } 
      // Priority 2: Browser localStorage
      else if (typeof window !== 'undefined') {
        const savedLang = localStorage.getItem(LANGUAGE_STORAGE_KEY);
        if (savedLang) {
          preferredLang = savedLang;
        }
      }
      
      // Validate against supported languages
      const isSupported = supportedLanguages.some(lang => lang.code === preferredLang);
      if (!isSupported) {
        console.warn(`Language ${preferredLang} not supported, falling back to ${DEFAULT_LANGUAGE}`);
        preferredLang = DEFAULT_LANGUAGE;
      }
      
      await setLanguageInternal(preferredLang);
      setReady(true);
    };

    initializeLanguage();
  }, [user, supportedLanguages]);

  const setLanguageInternal = async (languageCode: string) => {
    console.log(`🌍 Setting language to: ${languageCode}`);
    
    setCurrentLanguage(languageCode);
    setIsRTL(isRTLLanguage(languageCode));
    
    // Update document direction
    if (typeof document !== 'undefined') {
      document.documentElement.dir = isRTLLanguage(languageCode) ? 'rtl' : 'ltr';
      document.documentElement.lang = languageCode;
    }
    
    // Persist to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, languageCode);
    }
    
    // Sync i18next language when feature enabled
    if (isMultilingualEnabled) {
      try { i18n.changeLanguage(languageCode); } catch {}
    }

    // TODO: Update user profile if logged in through API
    if (user && user.language_preference !== languageCode) {
      try {
        // This would need to be implemented in the API service
        console.log('💾 Would update user language preference via API');
      } catch (error) {
        console.error('❌ Failed to update user language preference:', error);
      }
    }
  };

  const setLanguage = async (languageCode: string): Promise<void> => {
    // Validate language is supported
    const isSupported = supportedLanguages.some(lang => lang.code === languageCode);
    if (!isSupported) {
      console.error(`Language ${languageCode} is not supported`);
      return;
    }
    
    await setLanguageInternal(languageCode);
  };

  const getSupportedLanguages = (): LanguageInfo[] => {
    return supportedLanguages;
  };

  // Simplified translation - for now just returns the original text
  const translate = async (text: string, targetLang?: string): Promise<string> => {
    if (!isMultilingualEnabled || !text) return text;
    const target = (targetLang || currentLanguage || DEFAULT_LANGUAGE).toLowerCase();
    if (target === 'en') return text; // No translation needed
    try {
      return await translationService.translate(text, target);
    } catch {
      return text;
    }
  };

  const translateBatch = async (texts: string[], targetLang?: string): Promise<string[]> => {
    if (!isMultilingualEnabled || !texts || texts.length === 0) return texts || [];
    const target = (targetLang || currentLanguage || DEFAULT_LANGUAGE).toLowerCase();
    if (target === 'en') return texts;
    try {
      const results = await translationService.translateBatch(
        texts.map(t => ({ text: t, targetLang: target }))
      );
      return results.map(r => (r.success ? r.translated : r.original));
    } catch {
      return texts;
    }
  };

  // Simplified translation lookup
  const getTranslation = async (key: string, fallback?: string): Promise<string> => {
    if (!isMultilingualEnabled) return fallback || key;
    try {
      // Use i18next for UI key translations
      const result = i18n.t(key);
      if (result && result !== key) return result as string;
      return fallback || key;
    } catch {
      return fallback || key;
    }
  };

  const value: LanguageContextType = {
    currentLanguage,
    isRTL,
    ready,
    supportedLanguages,
    defaultLanguage,
    setLanguage,
    getSupportedLanguages,
    translate,
  translateBatch,
    getTranslation,
    isMultilingualEnabled
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};