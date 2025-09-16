/**
 * 🔒 MINIMAL IMPACT FEATURE FLAGS - Safe rollout control
 * Controls whether progressive saving is enabled without breaking existing flow
 */

// Feature flags interface
export interface FeatureFlags {
  progressiveSave: boolean;
  enhancedProgress: boolean;
  adminLiveTracking: boolean;
  i18nEnabled: boolean;        // New: Multilingual support
}

// Default feature flags (all disabled for safety)
const DEFAULT_FLAGS: FeatureFlags = {
  progressiveSave: false,      // Progressive per-question saving
  enhancedProgress: false,     // Enhanced progress indicators
  adminLiveTracking: false,    // Live admin tracking
  i18nEnabled: false,          // Multilingual support
};

/**
 * Feature flag service
 * Can be controlled via environment variables or database settings
 */
export class FeatureFlagService {
  private flags: FeatureFlags;
  
  constructor() {
    this.flags = this.loadFlags();
  }
  
  /**
   * Load feature flags from environment or defaults
   */
  private loadFlags(): FeatureFlags {
    // Check environment variables first
    const envFlags: Partial<FeatureFlags> = {
      progressiveSave: process.env.NEXT_PUBLIC_FEATURE_PROGRESSIVE_SAVE === 'true',
      enhancedProgress: process.env.NEXT_PUBLIC_FEATURE_ENHANCED_PROGRESS === 'true',
      adminLiveTracking: process.env.NEXT_PUBLIC_FEATURE_ADMIN_LIVE_TRACKING === 'true',
      i18nEnabled: process.env.NEXT_PUBLIC_FEATURE_I18N_ENABLED === 'true',
    };
    
    // Merge with defaults
    return {
      ...DEFAULT_FLAGS,
      ...envFlags
    };
  }
  
  /**
   * Check if progressive saving is enabled
   */
  isProgressiveSaveEnabled(): boolean {
    return this.flags.progressiveSave;
  }
  
  /**
   * Check if enhanced progress indicators are enabled
   */
  isEnhancedProgressEnabled(): boolean {
    return this.flags.enhancedProgress;
  }
  
  /**
   * Check if admin live tracking is enabled
   */
  isAdminLiveTrackingEnabled(): boolean {
    return this.flags.adminLiveTracking;
  }
  
  /**
   * Check if internationalization is enabled
   */
  isI18nEnabled(): boolean {
    return this.flags.i18nEnabled;
  }
  
  /**
   * Get all flags
   */
  getAllFlags(): FeatureFlags {
    return { ...this.flags };
  }
  
  /**
   * Update flags programmatically (for testing/admin control)
   */
  updateFlags(newFlags: Partial<FeatureFlags>): void {
    this.flags = {
      ...this.flags,
      ...newFlags
    };
    console.log('🚩 [FeatureFlags] Updated flags:', this.flags);
  }
  
  /**
   * Reset to defaults
   */
  resetToDefaults(): void {
    this.flags = { ...DEFAULT_FLAGS };
    console.log('🚩 [FeatureFlags] Reset to defaults');
  }
}

// Export singleton instance
export const featureFlags = new FeatureFlagService();
