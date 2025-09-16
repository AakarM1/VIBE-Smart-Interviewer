/**
 * i18n Catalog Loader
 * Simplified version for FastAPI backend
 */

interface CatalogEntry {
  [key: string]: string;
}

interface CacheEntry {
  catalog: CatalogEntry;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

export class CatalogLoader {
  private cache = new Map<string, CacheEntry>();
  private readonly CACHE_TTL = 30 * 60 * 1000; // 30 minutes

  /**
   * Load translation catalog for a language
   */
  async loadCatalog(languageCode: string): Promise<CatalogEntry> {
    console.log(`🌍 Loading catalog for ${languageCode}`);
    
    // Check cache first
    const cached = this.getCachedCatalog(languageCode);
    if (cached) {
      console.log(`📋 Using cached catalog for ${languageCode}`);
      return cached;
    }

    try {
      // Try local file first
      const localCatalog = await this.loadLocalCatalog(languageCode);
      if (localCatalog && Object.keys(localCatalog).length > 0) {
        console.log(`📁 Loaded local catalog for ${languageCode}`);
        this.setCachedCatalog(languageCode, localCatalog);
        return localCatalog;
      }
    } catch (error) {
      console.log(`📁 No local catalog for ${languageCode}:`, error);
    }

    // Fallback: create minimal catalog
    console.log(`🤖 Creating fallback catalog for ${languageCode}`);
    const fallbackCatalog = this.createFallbackCatalog(languageCode);
    this.setCachedCatalog(languageCode, fallbackCatalog);
    
    return fallbackCatalog;
  }

  /**
   * Get a specific translation key
   */
  async getTranslation(languageCode: string, key: string): Promise<string> {
    const catalog = await this.loadCatalog(languageCode);
    
    if (catalog[key]) {
      return catalog[key];
    }

    // Key missing - fallback to English or key itself
    console.log(`🔍 Missing key "${key}" for ${languageCode}`);
    
    try {
      const englishCatalog = await this.loadCatalog('en');
      const englishText = englishCatalog[key];
      return englishText || key;
    } catch (error) {
      console.error(`Failed to get translation for key "${key}":`, error);
      return key; // Ultimate fallback
    }
  }

  /**
   * Load catalog from local file
   */
  private async loadLocalCatalog(languageCode: string): Promise<CatalogEntry | null> {
    try {
      const response = await fetch(`/locales/${languageCode}/common.json`);
      if (!response.ok) {
        return null;
      }
      return response.json();
    } catch (error) {
      return null;
    }
  }

  /**
   * Create fallback catalog with seed keys
   */
  private createFallbackCatalog(languageCode: string): CatalogEntry {
    const seedKeys = {
      // Common UI elements
      'common.start': 'Start',
      'common.next': 'Next',
      'common.previous': 'Previous', 
      'common.submit': 'Submit',
      'common.cancel': 'Cancel',
      'common.save': 'Save',
      'common.loading': 'Loading...',
      'common.error': 'Error',
      'common.success': 'Success',
      'common.close': 'Close',
      
      // Interview specific
      'interview.start_test': 'Start Test',
      'interview.question': 'Question',
      'interview.your_answer': 'Your Answer',
      'interview.time_remaining': 'Time Remaining',
      'interview.record_answer': 'Record Answer',
      'interview.stop_recording': 'Stop Recording',
      'interview.next_question': 'Next Question',
      'interview.finish_test': 'Finish Test',
      'interview.test_completed': 'Test Completed',
      'interview.thank_you': 'Thank you for completing the assessment',
      
      // Form elements
      'form.name': 'Name',
      'form.email': 'Email',
      'form.role': 'Role',
      'form.language': 'Language',
      'form.select_option': 'Select an option',
      'form.required_field': 'This field is required'
    };

    // For now, just return English keys regardless of language
    // TODO: Implement proper translation
    return seedKeys;
  }

  /**
   * Cache management
   */
  private getCachedCatalog(languageCode: string): CatalogEntry | null {
    const cached = this.cache.get(languageCode);
    if (cached && Date.now() < cached.timestamp + cached.ttl) {
      return cached.catalog;
    }
    
    if (cached) {
      this.cache.delete(languageCode); // Remove expired cache
    }
    
    return null;
  }

  private setCachedCatalog(languageCode: string, catalog: CatalogEntry): void {
    this.cache.set(languageCode, {
      catalog,
      timestamp: Date.now(),
      ttl: this.CACHE_TTL
    });
  }

  /**
   * Clear cache for a specific language or all languages
   */
  clearCache(languageCode?: string): void {
    if (languageCode) {
      this.cache.delete(languageCode);
    } else {
      this.cache.clear();
    }
  }
}

// Export singleton instance
export const catalogLoader = new CatalogLoader();