/**
 * Translation Hook for Component Integration
 * Provides easy-to-use translation utilities for React components
 */

import React, { useCallback, useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/language-context';

export interface UseTranslationReturn {
  // Core translation function
  t: (key: string, fallback?: string) => Promise<string>;
  
  // Synchronous version for immediate use (returns key if translation not available)
  ts: (key: string, fallback?: string) => string;
  
  // Translate arrays of strings
  tBatch: (keys: string[], fallbacks?: string[]) => Promise<string[]>;
  
  // Translation utilities
  translate: (text: string, targetLang?: string) => Promise<string>;
  translateBatch: (texts: string[], targetLang?: string) => Promise<string[]>;
  
  // Language info
  currentLanguage: string;
  isRTL: boolean;
  supportedLanguages: Array<{ code: string; name: string; nativeName: string; rtl?: boolean }>;
  ready: boolean;
}

/**
 * Hook for accessing translation functionality in components
 * 
 * @example
 * ```tsx
 * const { t, ts, currentLanguage, isRTL } = useTranslation();
 * 
 * // Async translation (preferred)
 * const [welcomeText, setWelcomeText] = useState('');
 * useEffect(() => {
 *   t('common.welcome', 'Welcome').then(setWelcomeText);
 * }, [t]);
 * 
 * // Sync translation (fallback)
 * const buttonText = ts('common.save', 'Save');
 * ```
 */
export const useTranslation = (): UseTranslationReturn => {
  const {
    currentLanguage,
    isRTL,
    supportedLanguages,
    ready,
    translate,
    translateBatch,
    getTranslation
  } = useLanguage();
  
  // Async translation with catalog lookup
  const t = useCallback(async (key: string, fallback?: string): Promise<string> => {
    try {
      return await getTranslation(key, fallback);
    } catch (error) {
      console.warn(`Translation failed for key: ${key}`, error);
      return fallback || key;
    }
  }, [getTranslation]);
  
  // Sync translation (returns immediately, may not be translated)
  const ts = useCallback((key: string, fallback?: string): string => {
    // For sync access, we return the fallback or key
    // This is used when async translation isn't practical
    return fallback || key.split('.').pop() || key;
  }, []);
  
  // Batch translation for multiple keys
  const tBatch = useCallback(async (keys: string[], fallbacks: string[] = []): Promise<string[]> => {
    const translations = await Promise.all(
      keys.map((key, index) => t(key, fallbacks[index]))
    );
    return translations;
  }, [t]);
  
  return {
    t,
    ts,
    tBatch,
    translate,
    translateBatch,
    currentLanguage,
    isRTL,
    supportedLanguages,
    ready
  };
};

/**
 * Higher-order component to provide translation context
 */
export function withTranslation<P extends object>(
  Component: React.ComponentType<P & UseTranslationReturn>
): React.ComponentType<P> {
  return function WrappedComponent(props: P) {
    const translation = useTranslation();
    return React.createElement(Component, { ...props, ...translation });
  };
}

/**
 * Translation text component for simple string replacement
 * 
 * @example
 * ```tsx
 * <TranslatedText translationKey="common.welcome" fallback="Welcome" />
 * ```
 */
interface TranslatedTextProps {
  translationKey: string;
  fallback?: string;
  className?: string;
  component?: 'span' | 'div' | 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
}

export const TranslatedText: React.FC<TranslatedTextProps> = ({
  translationKey,
  fallback,
  className,
  component: Component = 'span'
}) => {
  const { t, ts } = useTranslation();
  const [text, setText] = useState(ts(translationKey, fallback));
  
  useEffect(() => {
    t(translationKey, fallback).then(setText);
  }, [t, translationKey, fallback]);
  
  return React.createElement(Component, { className }, text);
};

export default useTranslation;
