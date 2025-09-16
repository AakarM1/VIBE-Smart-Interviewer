
'use server';
/**
 * @fileOverview A Genkit flow to translate text into a specified language.
 *
 * - translateText - A function that translates a given text string.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const TranslateTextInputSchema = z.object({
  textToTranslate: z.string().describe('The text that needs to be translated.'),
  targetLanguage: z.string().describe('The language to translate the text into (e.g., "Spanish", "French").'),
});
export type TranslateTextInput = z.infer<typeof TranslateTextInputSchema>;

const TranslateTextOutputSchema = z.object({
  translatedText: z.string().describe('The resulting translated text.'),
});
export type TranslateTextOutput = z.infer<typeof TranslateTextOutputSchema>;

// Enhanced schemas for language detection and universal translation
const DetectLanguageInputSchema = z.object({
  text: z.string().describe('The text to analyze for language detection.'),
});
export type DetectLanguageInput = z.infer<typeof DetectLanguageInputSchema>;

const DetectLanguageOutputSchema = z.object({
  language: z.string().describe('The detected language (e.g., "English", "Spanish", "Hindi").'),
  confidence: z.number().describe('Confidence score between 0-1 for the detection.'),
  isEnglish: z.boolean().describe('Whether the text is primarily in English.'),
});
export type DetectLanguageOutput = z.infer<typeof DetectLanguageOutputSchema>;

const TranslateToEnglishInputSchema = z.object({
  text: z.string().describe('The text to translate to English.'),
  sourceLanguage: z.string().optional().describe('Optional source language hint.'),
});
export type TranslateToEnglishInput = z.infer<typeof TranslateToEnglishInputSchema>;

const TranslateToEnglishOutputSchema = z.object({
  translatedText: z.string().describe('The text translated to English.'),
  wasTranslated: z.boolean().describe('Whether translation was actually performed.'),
  detectedLanguage: z.string().describe('The detected source language.'),
});
export type TranslateToEnglishOutput = z.infer<typeof TranslateToEnglishOutputSchema>;


export async function translateText(input: TranslateTextInput): Promise<TranslateTextOutput> {
  return translateTextFlow(input);
}

// Enhanced function to detect language of any text
export async function detectLanguage(input: DetectLanguageInput): Promise<DetectLanguageOutput> {
  return detectLanguageFlow(input);
}

// Universal function to translate any text to English for AI analysis
export async function translateToEnglish(input: TranslateToEnglishInput): Promise<TranslateToEnglishOutput> {
  return translateToEnglishFlow(input);
}

const prompt = ai.definePrompt({
  name: 'translateTextPrompt',
  input: { schema: TranslateTextInputSchema },
  output: { schema: TranslateTextOutputSchema },
  model: process.env.GEMINI_DEFAULT_MODEL || 'googleai/gemini-2.0-flash-lite',
  prompt: `
    Translate the following text into {{{targetLanguage}}}.
    Return only the translated text, with no additional commentary or explanations.

    Text to translate: "{{{textToTranslate}}}"
  `,
});

// Enhanced prompt for language detection
const detectLanguagePrompt = ai.definePrompt({
  name: 'detectLanguagePrompt',
  input: { schema: DetectLanguageInputSchema },
  output: { schema: DetectLanguageOutputSchema },
  model: process.env.GEMINI_DEFAULT_MODEL || 'googleai/gemini-2.0-flash-lite',
  prompt: `
    Analyze the following text and detect its primary language.
    Consider mixed-language text and provide the dominant language.
    Be very accurate in your detection.

    Text to analyze: "{{{text}}}"

    Provide:
    - language: The name of the detected language (e.g., "English", "Spanish", "Hindi", "French")
    - confidence: A score between 0-1 indicating detection confidence
    - isEnglish: true if the text is primarily English, false otherwise
  `,
});

// Enhanced prompt for universal English translation
const translateToEnglishPrompt = ai.definePrompt({
  name: 'translateToEnglishPrompt',
  input: { schema: TranslateToEnglishInputSchema },
  output: { schema: TranslateToEnglishOutputSchema },
  model: process.env.GEMINI_DEFAULT_MODEL || 'googleai/gemini-2.0-flash-lite',
  prompt: `
    Analyze this text and translate it to English if needed.
    If the text is already primarily in English, return it as-is.
    Handle mixed-language text by translating non-English portions.
    
    Text: "{{{text}}}"

    Provide:
    - translatedText: The text in English (original if already English)
    - wasTranslated: true if translation was performed, false if text was already English
    - detectedLanguage: The detected source language of the original text
  `,
});

const translateTextFlow = ai.defineFlow(
  {
    name: 'translateTextFlow',
    inputSchema: TranslateTextInputSchema,
    outputSchema: TranslateTextOutputSchema,
  },
  async (input) => {
    // If the target language is English, no need to call the AI
    if (input.targetLanguage.toLowerCase() === 'english') {
      return { translatedText: input.textToTranslate };
    }

    const { output } = await prompt(input);
    if (!output) {
      throw new Error('AI translation did not return a valid response.');
    }
    return output;
  }
);

// Enhanced flow for language detection
const detectLanguageFlow = ai.defineFlow(
  {
    name: 'detectLanguageFlow',
    inputSchema: DetectLanguageInputSchema,
    outputSchema: DetectLanguageOutputSchema,
  },
  async (input) => {
    // Quick check for obvious English patterns
    const text = input.text.toLowerCase();
    const englishWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
    const englishMatches = englishWords.filter(word => text.includes(` ${word} `) || text.startsWith(`${word} `) || text.endsWith(` ${word}`)).length;
    
    // If significant English markers and mostly Latin script, likely English
    if (englishMatches >= 2 && /^[a-zA-Z0-9\s.,!?'"()-]+$/.test(input.text)) {
      return {
        language: 'English',
        confidence: 0.9,
        isEnglish: true
      };
    }

    try {
      const { output } = await detectLanguagePrompt(input);
      if (!output) {
        // Fallback to English assumption
        return {
          language: 'English',
          confidence: 0.5,
          isEnglish: true
        };
      }
      return output;
    } catch (error) {
      console.warn('Language detection failed, assuming English:', error);
      return {
        language: 'English',
        confidence: 0.5,
        isEnglish: true
      };
    }
  }
);

// Enhanced flow for universal English translation
const translateToEnglishFlow = ai.defineFlow(
  {
    name: 'translateToEnglishFlow',
    inputSchema: TranslateToEnglishInputSchema,
    outputSchema: TranslateToEnglishOutputSchema,
  },
  async (input) => {
    // First detect if text is already English
    try {
      const detection = await detectLanguage({ text: input.text });
      
      if (detection.isEnglish && detection.confidence > 0.7) {
        return {
          translatedText: input.text,
          wasTranslated: false,
          detectedLanguage: detection.language
        };
      }

      // Text needs translation
      const { output } = await translateToEnglishPrompt(input);
      if (!output) {
        // Fallback - return original text
        return {
          translatedText: input.text,
          wasTranslated: false,
          detectedLanguage: detection.language
        };
      }
      return output;
    } catch (error) {
      console.warn('Translation to English failed, using original text:', error);
      return {
        translatedText: input.text,
        wasTranslated: false,
        detectedLanguage: 'Unknown'
      };
    }
  }
);
