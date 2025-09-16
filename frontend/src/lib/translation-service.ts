/**
 * Enhanced Translation Service
 * Extends existing translate-text.ts with caching, batch processing, and UI support
 */

import { translateToEnglish, translateText } from '@/ai/flows/translate-text';

interface CacheEntry {
  text: string;
  targetLang: string;
  translated: string;
  timestamp: number;
}

interface BatchTranslationRequest {
  text: string;
  targetLang: string;
  sourceLang?: string;
}

interface BatchTranslationResult {
  original: string;
  translated: string;
  success: boolean;
  error?: string;
}

export class TranslationService {
  private cache: Map<string, CacheEntry> = new Map();
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
  private readonly MAX_CACHE_SIZE = 10000;
  
  /**
   * Get cache key for translation
   */
  private getCacheKey(text: string, targetLang: string, sourceLang?: string): string {
    return `${sourceLang || 'auto'}:${targetLang}:${text.substring(0, 100)}`;
  }
  
  /**
   * Check if cache entry is valid
   */
  private isCacheValid(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp < this.CACHE_TTL;
  }
  
  /**
   * Clean expired cache entries
   */
  private cleanCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.CACHE_TTL) {
        this.cache.delete(key);
      }
    }
    
    // If still too large, remove oldest entries
    if (this.cache.size > this.MAX_CACHE_SIZE) {
      const sorted = Array.from(this.cache.entries())
        .sort(([,a], [,b]) => a.timestamp - b.timestamp);
      
      const toRemove = this.cache.size - this.MAX_CACHE_SIZE;
      for (let i = 0; i < toRemove; i++) {
        this.cache.delete(sorted[i][0]);
      }
    }
  }
  
  /**
   * Translate text to English (backward compatibility)
   */
  async toEnglish(text: string, sourceLang?: string): Promise<string> {
    if (!text || text.trim().length === 0) return text;
    
    // Quick check if already English
    if (this.isLikelyEnglish(text)) {
      return text;
    }
    
    const cacheKey = this.getCacheKey(text, 'en', sourceLang);
    const cached = this.cache.get(cacheKey);
    
    if (cached && this.isCacheValid(cached)) {
      console.log('🔄 Translation cache hit');
      return cached.translated;
    }
    
    try {
      const result = await translateToEnglish({ text });
      
      // Cache the result
      this.cache.set(cacheKey, {
        text,
        targetLang: 'en',
        translated: result.translatedText,
        timestamp: Date.now()
      });
      
      this.cleanCache();
      return result.translatedText;
    } catch (error) {
      console.warn('Translation to English failed:', error);
      return text; // Fallback to original
    }
  }
  
  /**
   * Translate text to any target language
   */
  async translate(text: string, targetLang: string, sourceLang?: string): Promise<string> {
    if (!text || text.trim().length === 0) return text;
    
    // No translation needed if source and target are the same
    if (sourceLang === targetLang) return text;
    
    const cacheKey = this.getCacheKey(text, targetLang, sourceLang);
    const cached = this.cache.get(cacheKey);
    
    if (cached && this.isCacheValid(cached)) {
      console.log('🔄 Translation cache hit');
      return cached.translated;
    }
    
    try {
      const result = await translateText({ 
        textToTranslate: text, 
        targetLanguage: targetLang
      });
      
      // Cache the result
      this.cache.set(cacheKey, {
        text,
        targetLang,
        translated: result.translatedText,
        timestamp: Date.now()
      });
      
      this.cleanCache();
      return result.translatedText;
    } catch (error) {
      console.warn(`Translation to ${targetLang} failed:`, error);
      return text; // Fallback to original
    }
  }
  
  /**
   * Batch translate multiple texts
   */
  async translateBatch(requests: BatchTranslationRequest[]): Promise<BatchTranslationResult[]> {
    const results: BatchTranslationResult[] = [];
    
    // Process in parallel with reasonable concurrency
    const BATCH_SIZE = 5;
    for (let i = 0; i < requests.length; i += BATCH_SIZE) {
      const batch = requests.slice(i, i + BATCH_SIZE);
      const batchPromises = batch.map(async (req) => {
        try {
          const translated = await this.translate(req.text, req.targetLang, req.sourceLang);
          return {
            original: req.text,
            translated,
            success: true
          };
        } catch (error) {
          return {
            original: req.text,
            translated: req.text,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }
    
    return results;
  }
  
  /**
   * Quick heuristic to detect if text is likely English
   */
  private isLikelyEnglish(text: string): boolean {
    if (!text) return true;
    
    // Basic heuristics for English detection
    const englishWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
    const words = text.toLowerCase().split(/\s+/);
    const englishWordCount = words.filter(word => englishWords.includes(word)).length;
    
    // If more than 10% are common English words, likely English
    return englishWordCount / words.length > 0.1;
  }
  
  /**
   * Detect language of text (simple heuristic)
   */
  detectLanguage(text: string): string {
    if (!text) return 'en';
    
    // Arabic script detection
    if (/[\u0600-\u06FF]/.test(text)) return 'ar';
    
    // Spanish common words
    if (/\b(el|la|de|que|y|en|un|es|se|no|te|lo|le|da|su|por|son|con|para|una|ser|al|todo|esta|como|más|pero|sus|yo|muy|sin|sobre|también|me|hasta|donde|quien|cuando|él|tiempo|cada|uno|dos|forma|está|estos|mis|otro|entre|sin|través|durante|trabajo|vida|puede|así|agua|parte|del|gran|había|todos|esos|años|ellos|cualquier|aunque|creo|tanto|bajo|sea|misma|desde|tienen|ella)\b/i.test(text)) return 'es';
    
    // Default to English
    return 'en';
  }
  
  /**
   * Get supported languages
   */
  getSupportedLanguages(): Array<{code: string, name: string, nativeName: string, rtl?: boolean}> {
    return [
      { code: 'en', name: 'English', nativeName: 'English' },
      { code: 'es', name: 'Spanish', nativeName: 'Español' },
      { code: 'ar', name: 'Arabic', nativeName: 'العربية', rtl: true },
      { code: 'fr', name: 'French', nativeName: 'Français' },
      { code: 'de', name: 'German', nativeName: 'Deutsch' },
      { code: 'zh', name: 'Chinese', nativeName: '中文' },
      { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
      { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
      { code: 'ru', name: 'Russian', nativeName: 'Русский' },
      { code: 'ja', name: 'Japanese', nativeName: '日本語' }
    ];
  }
  
  /**
   * Clear translation cache
   */
  clearCache(): void {
    this.cache.clear();
    console.log('🗑️ Translation cache cleared');
  }
  
  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; hitRate: number } {
    return {
      size: this.cache.size,
      hitRate: 0 // Would need to track hits/misses for real hit rate
    };
  }
}

// Export singleton instance
export const translationService = new TranslationService();
