/**
 * i18n Utilities for Language Management
 * Provides RTL detection, language mapping, and display name utilities
 */

// RTL language codes (ISO 639-1)
const RTL_LANGUAGES = new Set([
  'ar', 'he', 'fa', 'ur', 'ku', 'dv', 'ps', 'sd', 'ug', 'yi'
]);

/**
 * Check if a language uses right-to-left writing
 */
export function isRTLLanguage(languageCode: string): boolean {
  const code = languageCode.toLowerCase().split('-')[0]; // Handle locale variants like 'ar-SA'
  return RTL_LANGUAGES.has(code);
}

/**
 * Get native display name for a language code using Intl.DisplayNames
 */
export function getLanguageDisplayName(languageCode: string, inLanguage?: string): string {
  try {
    if (typeof Intl !== 'undefined' && Intl.DisplayNames) {
      const displayNames = new Intl.DisplayNames([inLanguage || languageCode], { 
        type: 'language' 
      });
      return displayNames.of(languageCode) || languageCode;
    }
  } catch (error) {
    console.warn('Failed to get display name for', languageCode, error);
  }
  
  // Fallback to simple mapping
  return getLanguageFallbackName(languageCode);
}

/**
 * Fallback language name mapping for browsers without Intl.DisplayNames
 */
function getLanguageFallbackName(languageCode: string): string {
  const fallbackNames: Record<string, string> = {
    'en': 'English',
    'es': 'Español',
    'fr': 'Français',
    'de': 'Deutsch',
    'it': 'Italiano',
    'pt': 'Português',
    'ru': 'Русский',
    'ja': '日本語',
    'ko': '한국어',
    'zh': '中文',
    'ar': 'العربية',
    'he': 'עברית',
    'hi': 'हिन्दी',
    'tr': 'Türkçe',
    'pl': 'Polski',
    'nl': 'Nederlands',
    'sv': 'Svenska',
    'da': 'Dansk',
    'no': 'Norsk',
    'fi': 'Suomi'
  };
  
  return fallbackNames[languageCode.toLowerCase()] || languageCode.toUpperCase();
}

/**
 * Extract language code from locale string (e.g., 'en-US' -> 'en')
 */
export function getLanguageCode(locale: string): string {
  return locale.split('-')[0].toLowerCase();
}

/**
 * Validate if a language code is valid ISO 639-1 format
 */
export function isValidLanguageCode(code: string): boolean {
  return /^[a-z]{2}(-[A-Z]{2})?$/.test(code);
}
