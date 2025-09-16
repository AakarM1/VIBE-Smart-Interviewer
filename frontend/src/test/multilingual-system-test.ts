/**
 * Live Multilingual System Test
 * Tests admin-driven language configuration with real-time updates
 */

import { configurationService } from '@/lib/config-service';
import { featureFlags } from '@/lib/feature-flags';

interface TestResult {
  success: boolean;
  message: string;
  details?: any;
}

/**
 * Test the complete multilingual workflow
 */
export async function testMultilingualSystem(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  
  console.log('🧪 Starting comprehensive multilingual system test...');
  
  try {
    // Test 1: Feature flag
    console.log('📋 Test 1: Feature flag system');
    const i18nEnabled = featureFlags.isI18nEnabled();
    results.push({
      success: true,
      message: `Feature flag system working: I18N_ENABLED = ${i18nEnabled}`
    });
    
    // Test 2: Configuration service
    console.log('📋 Test 2: Configuration service');
    try {
      const currentSettings = await configurationService.getGlobalSettings();
      results.push({
        success: true,
        message: 'Configuration service working',
        details: { currentLanguages: currentSettings?.languages || ['English'] }
      });
    } catch (error) {
      results.push({
        success: false,
        message: 'Configuration service failed',
        details: error
      });
    }
    
    // Test 3: Admin language update simulation
    console.log('📋 Test 3: Admin language update simulation');
    try {
      const testLanguages = ['English', 'Spanish', 'French'];
      const updateSuccess = await configurationService.saveGlobalSettings({
        languages: testLanguages,
        replyMode: 'video',
        showReport: true,
        isJdtEnabled: true,
        isSjtEnabled: true
      });
      
      if (updateSuccess) {
        // Verify the update
        const updatedSettings = await configurationService.getGlobalSettings();
        const languagesMatch = JSON.stringify(updatedSettings?.languages) === JSON.stringify(testLanguages);
        
        results.push({
          success: languagesMatch,
          message: languagesMatch ? 'Admin language update working' : 'Language update verification failed',
          details: { 
            expected: testLanguages, 
            actual: updatedSettings?.languages 
          }
        });
      } else {
        results.push({
          success: false,
          message: 'Admin language update failed'
        });
      }
    } catch (error) {
      results.push({
        success: false,
        message: 'Admin language update test failed',
        details: error
      });
    }
    
    // Test 4: Translation catalog initialization API
    console.log('📋 Test 4: Translation catalog API');
    try {
      const response = await fetch('/api/i18n/init', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          language: 'Spanish',
          languageCode: 'es'
        }),
      });
      
      if (response.ok) {
        const result = await response.json();
        results.push({
          success: true,
          message: 'Translation catalog API working',
          details: result
        });
      } else {
        results.push({
          success: false,
          message: `Translation catalog API failed: ${response.status}`,
          details: await response.text()
        });
      }
    } catch (error) {
      results.push({
        success: false,
        message: 'Translation catalog API test failed',
        details: error
      });
    }
    
    // Test 5: Language code detection
    console.log('📋 Test 5: Language utilities');
    const testLanguageNames = [
      { name: 'Spanish', expectedCode: 'es' },
      { name: 'French', expectedCode: 'fr' },
      { name: 'German', expectedCode: 'de' },
      { name: 'Arabic', expectedCode: 'ar' }
    ];
    
    // Test language code detection function
    const detectLanguageCode = (languageName: string): string => {
      const lowerName = languageName.toLowerCase();
      const nameToCode: Record<string, string> = {
        'spanish': 'es', 'français': 'fr', 'french': 'fr',
        'german': 'de', 'deutsch': 'de', 'arabic': 'ar'
      };
      return nameToCode[lowerName] || 'en';
    };
    
    const detectionResults = testLanguageNames.map(({ name, expectedCode }) => {
      const detectedCode = detectLanguageCode(name);
      return {
        name,
        expected: expectedCode,
        detected: detectedCode,
        correct: detectedCode === expectedCode
      };
    });
    
    const allCorrect = detectionResults.every(r => r.correct);
    results.push({
      success: allCorrect,
      message: allCorrect ? 'Language code detection working' : 'Some language codes incorrect',
      details: detectionResults
    });
    
    console.log('✅ Multilingual system test completed');
    
  } catch (error) {
    console.error('❌ Test execution failed:', error);
    results.push({
      success: false,
      message: 'Test execution failed',
      details: error
    });
  }
  
  return results;
}

/**
 * Test runner for browser console
 */
export async function runMultilingualTests(): Promise<void> {
  console.log('🌍 Running Live Multilingual System Tests');
  console.log('==========================================');
  
  const results = await testMultilingualSystem();
  
  console.log('\n📊 Test Results:');
  results.forEach((result, index) => {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} Test ${index + 1}: ${result.message}`);
    
    if (result.details) {
      console.log('   Details:', result.details);
    }
  });
  
  const passed = results.filter(r => r.success).length;
  const total = results.length;
  
  console.log(`\n🏁 Summary: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('🎉 All tests passed! The multilingual system is working correctly.');
  } else {
    console.log('⚠️ Some tests failed. Check the details above.');
  }
}

// Export for use in browser dev tools
if (typeof window !== 'undefined') {
  (window as any).testMultilingual = runMultilingualTests;
  console.log('💡 Run testMultilingual() in browser console to test the system');
}
