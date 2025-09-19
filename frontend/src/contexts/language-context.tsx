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
import { configurationService } from '@/lib/config-service';

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
  const [supportedLanguages, setSupportedLanguages] = useState<LanguageInfo[]>(DEFAULT_SUPPORTED_LANGUAGES);
  const [defaultLanguage] = useState<string>(DEFAULT_LANGUAGE);
  
  // Feature-gated multilingual enablement
  const isMultilingualEnabled = featureFlags.isI18nEnabled();
  
  // Initialize supported languages from admin global settings (optional)
  useEffect(() => {
    let cancelled = false;
    const loadGlobalLanguages = async () => {
      try {
        const gs = await configurationService.getGlobalSettings();
        const langs: string[] | undefined = gs?.languages || gs?.supportedLanguages;
        if (Array.isArray(langs) && langs.length > 0) {
          const mapped = langs.map((name: any) => {
            const n = String(name);
            // Attempt to infer code from common names; default to en if unknown
            const code = n.toLowerCase().startsWith('eng') ? 'en' :
                         n.toLowerCase().startsWith('span') ? 'es' :
                         n.toLowerCase().startsWith('arab') ? 'ar' :
                         n.toLowerCase().startsWith('fren') ? 'fr' :
                         n.toLowerCase().startsWith('ger') ? 'de' :
                         n.toLowerCase().startsWith('hin') ? 'hi' :
                         n.toLowerCase().startsWith('port') ? 'pt' :
                         n.toLowerCase().startsWith('russ') ? 'ru' :
                         n.toLowerCase().startsWith('jap') ? 'ja' :
                         n.toLowerCase().startsWith('chin') || n.toLowerCase().startsWith('mand') ? 'zh' : 'en';
            return {
              code,
              name: n,
              nativeName: n,
              rtl: isRTLLanguage(code)
            } as LanguageInfo;
          });
          if (!cancelled) {
            // Ensure at least English exists
            const ensureSet = mapped.some(l => l.code === 'en') ? mapped : [{ code: 'en', name: 'English', nativeName: 'English' }, ...mapped];
            setSupportedLanguages(ensureSet);
          }
        }
      } catch (e) {
        // Ignore; keep defaults
      }
    };
    loadGlobalLanguages();
    return () => { cancelled = true; };
  }, []);

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
    // Allow any known language code from translation service to enable full header list
    const known = new Set(translationService.getSupportedLanguages().map(l => l.code));
    const isSupported = supportedLanguages.some(lang => lang.code === languageCode) || known.has(languageCode);
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
      // Simple in-memory cache to avoid repeated translations in-session
      const key = `${target}::${text}`;
      if (!(window as any).__i18nCache) (window as any).__i18nCache = new Map<string,string>();
      const cache: Map<string,string> = (window as any).__i18nCache;
      if (cache.has(key)) return cache.get(key)!;
      const translated = await translationService.translate(text, target);
      cache.set(key, translated);
      return translated;
    } catch {
      return text;
    }
  };

  const translateBatch = async (texts: string[], targetLang?: string): Promise<string[]> => {
    if (!isMultilingualEnabled || !texts || texts.length === 0) return texts || [];
    const target = (targetLang || currentLanguage || DEFAULT_LANGUAGE).toLowerCase();
    if (target === 'en') return texts;
    try {
      // Use cache where possible
      const cacheKey = (t: string) => `${target}::${t}`;
      if (!(window as any).__i18nCache) (window as any).__i18nCache = new Map<string,string>();
      const cache: Map<string,string> = (window as any).__i18nCache;
      const toTranslate: { text: string; targetLang: string }[] = [];
      const indices: number[] = [];
      const output: string[] = new Array(texts.length);
      texts.forEach((t, idx) => {
        const k = cacheKey(t);
        if (cache.has(k)) {
          output[idx] = cache.get(k)!;
        } else {
          toTranslate.push({ text: t, targetLang: target });
          indices.push(idx);
        }
      });
      if (toTranslate.length > 0) {
        const results = await translationService.translateBatch(toTranslate);
        results.forEach((r, i) => {
          const idx = indices[i];
          const original = toTranslate[i].text;
          const translated = r.success ? r.translated : original;
          output[idx] = translated;
          cache.set(cacheKey(original), translated);
        });
      }
      return output.map((v, i) => v ?? texts[i]);
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