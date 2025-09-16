// Test Next.js Environment Variable Loading
require('dotenv').config({ path: '.env.local' });

console.log('🔍 NEXT.JS ENVIRONMENT TEST');
console.log('=' .repeat(50));

console.log('\n📋 Environment Variables from .env.local:');
console.log('PROGRESSIVE_SAVE:', process.env.NEXT_PUBLIC_FEATURE_PROGRESSIVE_SAVE);
console.log('SESSION_RECOVERY:', process.env.NEXT_PUBLIC_FEATURE_SESSION_RECOVERY);
console.log('ENHANCED_PROGRESS:', process.env.NEXT_PUBLIC_FEATURE_ENHANCED_PROGRESS);
console.log('FIREBASE_PROJECT_ID:', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);

const isProgressiveSaveEnabled = process.env.NEXT_PUBLIC_FEATURE_PROGRESSIVE_SAVE === 'true';
const isSessionRecoveryEnabled = process.env.NEXT_PUBLIC_FEATURE_SESSION_RECOVERY === 'true';
const isProgressiveUploadEnabled = process.env.NEXT_PUBLIC_FEATURE_ENHANCED_PROGRESS === 'true';

console.log('\n📋 Feature Flags:');
console.log('Progressive Save Enabled:', isProgressiveSaveEnabled);
console.log('Session Recovery Enabled:', isSessionRecoveryEnabled);
console.log('Progressive Upload Enabled:', isProgressiveUploadEnabled);

if (isProgressiveSaveEnabled && isSessionRecoveryEnabled && isProgressiveUploadEnabled) {
  console.log('\n✅ ALL PROGRESSIVE FEATURES ENABLED!');
  console.log('🔄 Progressive upload should now work in the application');
} else {
  console.log('\n❌ PROGRESSIVE FEATURES DISABLED');
  console.log('🔧 Check .env.local file configuration');
}
