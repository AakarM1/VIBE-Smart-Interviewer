/**
 * Central configuration file for AI model settings.
 * This file provides a single source of truth for AI model configurations
 * that can be imported throughout the application.
 * 
 * Model settings are loaded from environment variables with fallbacks.
 */

// Default model used for most operations - Updated to Gemini 2.0 Flash-Lite for better performance
export const DEFAULT_MODEL = process.env.GEMINI_DEFAULT_MODEL || 'googleai/gemini-2.0-flash-lite';

// Model specifically optimized for audio transcription
export const TRANSCRIPTION_MODEL = process.env.GEMINI_TRANSCRIPTION_MODEL || 'googleai/gemini-2.0-flash-lite';

// Model used for SJT evaluation and analysis
export const SJT_EVALUATION_MODEL = process.env.GEMINI_SJT_EVALUATION_MODEL || 'googleai/gemini-2.0-flash-lite';

/**
 * Gets the appropriate model to use based on the task
 * @param task - The AI task being performed
 * @returns The model identifier to use
 */
export function getModelForTask(task: 'transcription' | 'sjt-evaluation' | 'default'): string {
  switch (task) {
    case 'transcription':
      return TRANSCRIPTION_MODEL;
    case 'sjt-evaluation':
      return SJT_EVALUATION_MODEL;
    default:
      return DEFAULT_MODEL;
  }
}

// Logger function removed to avoid client/server component conflicts
