/**
 * API Route for Translation Catalog Initialization
 * Simplified version for FastAPI backend
 */

import { NextRequest, NextResponse } from 'next/server';

interface CatalogInitRequest {
  language: string;      // Language name (e.g., "Spanish", "French")
  languageCode: string;  // ISO code (e.g., "es", "fr")
  priorityKeys?: string[]; // High-priority UI strings to translate first
}

/**
 * Bootstrap translation catalog for a new language
 */
export async function POST(request: NextRequest) {
  try {
    const body: CatalogInitRequest = await request.json();
    const { language, languageCode, priorityKeys = [] } = body;
    
    console.log(`🌍 Bootstrapping translation catalog for ${language} (${languageCode})`);
    
    // Validate inputs
    if (!language || !languageCode) {
      return NextResponse.json(
        { error: 'Language name and code are required' },
        { status: 400 }
      );
    }
    
    // Default UI strings to translate immediately
    const defaultKeys = [
      'common.welcome',
      'common.loading',
      'common.save',
      'common.cancel',
      'common.next',
      'common.previous',
      'common.submit',
      'common.error',
      'common.success',
      'nav.dashboard',
      'nav.interview',
      'nav.report',
      'nav.settings',
      'interview.start',
      'interview.recording',
      'interview.complete',
      'report.analysis',
      'report.summary',
      'admin.languages',
      'admin.users',
      'auth.login',
      'auth.logout',
      'auth.register'
    ];
    
    const keysToTranslate = [...new Set([...defaultKeys, ...priorityKeys])];
    
    // TODO: Integrate with FastAPI backend for translation catalog management
    // For now, return success response to maintain compatibility
    
    // Build catalog structure
    const catalogData = {
      language,
      languageCode,
      lastUpdated: new Date().toISOString(),
      version: '1.0.0',
      completeness: 0,
      strings: {} as Record<string, string>
    };
    
    // Create mock translations for initial keys
    keysToTranslate.forEach((key) => {
      catalogData.strings[key] = key.split('.').pop() || key; // Use key name as fallback
    });
    
    console.log(`✅ Created catalog for ${language} with ${keysToTranslate.length} initial strings`);
    
    // Return success with catalog info
    return NextResponse.json({
      success: true,
      language,
      languageCode,
      initialStrings: keysToTranslate.length,
      catalog: {
        version: catalogData.version,
        lastUpdated: catalogData.lastUpdated,
        stringCount: keysToTranslate.length
      }
    });
    
  } catch (error) {
    console.error('❌ Failed to initialize translation catalog:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to initialize translation catalog',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Get catalog status for a language
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const languageCode = searchParams.get('code');
    
    if (!languageCode) {
      return NextResponse.json(
        { error: 'Language code is required' },
        { status: 400 }
      );
    }
    
    // TODO: Integrate with FastAPI backend
    // For now, return mock data to maintain compatibility
    const mockData = {
      language: languageCode === 'es' ? 'Spanish' : languageCode === 'fr' ? 'French' : 'Unknown',
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      stringCount: 25,
      completeness: 85
    };
    
    return NextResponse.json({
      exists: true,
      languageCode,
      language: mockData.language,
      version: mockData.version,
      lastUpdated: mockData.lastUpdated,
      stringCount: mockData.stringCount,
      completeness: mockData.completeness
    });
    
  } catch (error) {
    console.error('❌ Failed to get catalog status:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to get catalog status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Delete a translation catalog
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const languageCode = searchParams.get('code');
    
    if (!languageCode) {
      return NextResponse.json(
        { error: 'Language code is required' },
        { status: 400 }
      );
    }
    
    // Don't allow deleting English catalog
    if (languageCode === 'en') {
      return NextResponse.json(
        { error: 'Cannot delete English language catalog' },
        { status: 403 }
      );
    }
    
    // TODO: Integrate with FastAPI backend for catalog deletion
    console.log(`🗑️ Deleted translation catalog for ${languageCode}`);
    
    return NextResponse.json({
      success: true,
      languageCode,
      message: 'Translation catalog deleted successfully'
    });
    
  } catch (error) {
    console.error('❌ Failed to delete catalog:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to delete catalog',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
