/**
 * Utility to validate Firebase configuration and determine storage type
 */

export interface FirebaseValidationResult {
  isValid: boolean;
  storageType: 'firestore' | 'localStorage';
  message: string;
}

/**
 * Validates if Firebase environment variables are properly configured
 */
export const validateFirebaseConfig = (): FirebaseValidationResult => {
  // Check for forced localStorage override first
  if (process.env.NEXT_PUBLIC_USE_LOCALSTORAGE === 'true') {
    console.log('🔧 Forced localStorage mode via NEXT_PUBLIC_USE_LOCALSTORAGE');
    return {
      isValid: false,
      storageType: 'localStorage',
      message: 'Using Local Storage - Forced via NEXT_PUBLIC_USE_LOCALSTORAGE environment variable'
    };
  }

  // Only run validation on client side where NEXT_PUBLIC_ vars are available
  if (typeof window === 'undefined') {
    console.log('🌍 Server-side rendering, using localStorage fallback');
    return {
      isValid: false,
      storageType: 'localStorage',
      message: 'Server-side rendering - using localStorage fallback'
    };
  }

  console.log('🔍 Client-side Firebase validation starting...');

  // Direct access to environment variables to avoid timing issues
  const envVars = {
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };

  const requiredEnvVars = [
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', 
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
    'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    'NEXT_PUBLIC_FIREBASE_APP_ID'
  ];

  const placeholderValues = [
    'your_firebase_api_key_here',
    'your_project.firebaseapp.com',
    'your_project_id',
    'your_project.appspot.com',
    'your_sender_id',
    'your_app_id'
  ];

  // Check if all required environment variables exist and are not placeholder values
  const missingOrInvalid = requiredEnvVars.filter((envVar, index) => {
    const value = envVars[envVar as keyof typeof envVars];
    const isEmpty = !value || value.trim() === '';
    const isPlaceholder = value === placeholderValues[index];
    const containsYour = value && value.includes('your_');
    const isInvalid = isEmpty || isPlaceholder || containsYour;
    
    if (isInvalid) {
      console.log(`❌ ${envVar} failed validation: ${value || 'undefined'}`);
    }
    
    return isInvalid;
  });

  if (missingOrInvalid.length > 0) {
    console.log('❌ Firebase validation FAILED - using localStorage');
    return {
      isValid: false,
      storageType: 'localStorage',
      message: `Using Local Storage - Firebase config incomplete. Missing/invalid: ${missingOrInvalid.join(', ')}`
    };
  }

  // Additional validation for API key format (Firebase API keys typically start with "AIza")
  const apiKey = envVars.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (apiKey && !apiKey.startsWith('AIza')) {
    console.log('❌ Firebase validation FAILED - API key format invalid');
    return {
      isValid: false,
      storageType: 'localStorage',
      message: 'Using Local Storage - Firebase API key format appears invalid'
    };
  }

  // Log success for debugging
  console.log('✅ Firebase configuration validated successfully!');
  console.log('🔥 USING FIRESTORE DATABASE!');

  return {
    isValid: true,
    storageType: 'firestore',
    message: 'Using Firestore Database - Shared storage for all users'
  };
};

/**
 * Get the current storage configuration
 */
export const getStorageConfig = () => {
  const validation = validateFirebaseConfig();
  
  return {
    useFirestore: validation.isValid,
    storageType: validation.storageType,
    message: validation.message
  };
};
