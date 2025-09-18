import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import {DEFAULT_MODEL} from './config';

// Bridge environment variables: prefer GOOGLE_GENAI_API_KEY (native), but accept GEMINI_API_KEY/GOOGLE_API_KEY
(() => {
  const hasNative = !!process.env.GOOGLE_GENAI_API_KEY;
  const fallback = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!hasNative && fallback) {
    // Do not log secrets; just note presence
    console.log('🔑 Using fallback AI key from GEMINI_API_KEY/GOOGLE_API_KEY for GOOGLE_GENAI_API_KEY');
    process.env.GOOGLE_GENAI_API_KEY = fallback;
  }
})();

export const ai = genkit({
  plugins: [googleAI()],
  model: DEFAULT_MODEL, // Use the model specified in config which reads from .env file
});
