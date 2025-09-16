
'use server';
/**
 * @fileOverview Generates a set of interview questions for a given role.
 *
 * - generateInterviewQuestions - A function that generates interview questions.
 * - GenerateInterviewQuestionsInput - The input type for the function.
 * - GenerateInterviewQuestionsOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { translationService } from '@/lib/translation-service';

const GenerateInterviewQuestionsInputSchema = z.object({
  name: z.string().optional().describe('The name of the candidate.'),
  roleCategory: z.string().describe('The role category the candidate is applying for.'),
  jobDescription: z.string().optional().describe('The full job description for the role.'),
  numberOfQuestions: z.number().describe('The total number of questions to generate for the interview.'),
  isFollowUp: z.boolean().optional().describe('Whether these are follow-up questions or the start of an interview.'),
  followUpCount: z.number().optional().describe('EXACT number of follow-up questions to generate (enforced server-side).'),
  // Multilingual support
  targetLanguage: z.string().optional().describe('Target language code for generating questions (e.g., "es", "fr"). Defaults to "en".'),
});
export type GenerateInterviewQuestionsInput = z.infer<typeof GenerateInterviewQuestionsInputSchema>;

const GenerateInterviewQuestionsOutputSchema = z.object({
  questions: z.array(z.string()).describe('An array of interview questions.'),
  questionsTranslated: z.array(z.string()).optional().describe('An array of translated interview questions in target language.'),
  languageCode: z.string().optional().describe('Language code of the generated questions.'),
});
export type GenerateInterviewQuestionsOutput = z.infer<typeof GenerateInterviewQuestionsOutputSchema>;

export async function generateInterviewQuestions(input: GenerateInterviewQuestionsInput): Promise<GenerateInterviewQuestionsOutput> {
  return generateInterviewQuestionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateInterviewQuestionsPrompt',
  input: {schema: GenerateInterviewQuestionsInputSchema},
  output: {schema: GenerateInterviewQuestionsOutputSchema},
  model: 'openai/gpt-4-turbo',
  prompt: `You are an expert AI interviewer. Your task is to generate a set of {{numberOfQuestions}} diverse and insightful interview questions for a {{{roleCategory}}} role.
The questions should be based on the provided job description to assess the candidate's suitability.

**Job Description:**
"{{{jobDescription}}}"

{{#if isFollowUp}}
Generate EXACTLY {{numberOfQuestions}} follow-up questions that dig deeper into the skills and responsibilities mentioned. Do not include introductory questions like "tell me about yourself".
{{#if followUpCount}}
CRITICAL: You must generate EXACTLY {{followUpCount}} questions, no more, no less. If you cannot generate {{followUpCount}} quality questions, generate fewer rather than padding with low-quality questions.
{{/if}}
{{else}}
The first question should always be a friendly introduction. For example: "Hello {{#if name}}{{{name}}}{{else}}candidate{{/if}}, thank you for your interest in the {{{roleCategory}}} role. To start, please introduce yourself and tell me a bit about why you're applying for this position."
The subsequent questions should be varied and cover different aspects to holistically assess the candidate's suitability, such as behavioral examples, situational judgment, technical depth, and problem-solving skills relevant to the role and job description.
{{/if}}

Return exactly {{numberOfQuestions}} questions in the 'questions' array. Do not add any other commentary.
  `,
});

const generateInterviewQuestionsFlow = ai.defineFlow(
  {
    name: 'generateInterviewQuestionsFlow',
    inputSchema: GenerateInterviewQuestionsInputSchema,
    outputSchema: GenerateInterviewQuestionsOutputSchema,
  },
  async (input: GenerateInterviewQuestionsInput): Promise<GenerateInterviewQuestionsOutput> => {
    try {
      console.log('🚀 Generating interview questions with input:', input);
      
      // Enforce followUpCount if specified for SJT follow-ups
      const configuredCount = input.followUpCount ?? input.numberOfQuestions;
      console.log(`🎯 Configured to generate exactly ${configuredCount} questions`);
      
      const {output} = await prompt(input);
      console.log('✅ AI response received:', output);
      
      if (output && output.questions && output.questions.length > 0) {
        // CRITICAL: Enforce the configured count on server side
        let finalQuestions = output.questions;
        
        if (input.followUpCount && finalQuestions.length > input.followUpCount) {
          console.log(`⚡ AI generated ${finalQuestions.length} questions, enforcing limit of ${input.followUpCount}`);
          finalQuestions = finalQuestions.slice(0, input.followUpCount);
        }
        
        console.log(`✅ Successfully generated ${finalQuestions.length} questions (requested: ${configuredCount})`);
        
        // Add multilingual support if target language is specified and not English
        if (input.targetLanguage && input.targetLanguage !== 'en') {
          try {
            const translationRequests = finalQuestions.map(question => ({
              text: question,
              targetLang: input.targetLanguage!,
              sourceLang: 'en'
            }));
            
            const translationResults = await translationService.translateBatch(translationRequests);
            const translatedQuestions = translationResults
              .filter(result => result.success)
              .map(result => result.translated);
            
            return {
              questions: finalQuestions, // Keep original English questions
              questionsTranslated: translatedQuestions, // Add translated versions
              languageCode: input.targetLanguage
            };
          } catch (translationError) {
            console.warn('⚠️ Translation failed, returning English questions only:', translationError);
            return { questions: finalQuestions };
          }
        }
        
        return { questions: finalQuestions };
      } else {
        console.warn('⚠️ AI returned empty or invalid questions, using fallbacks');
      }
    } catch (error) {
      console.error('❌ Error in generate interview questions flow:', error);
    }
    
    // Fallback if AI fails
    console.log('📋 Using fallback questions');
    let fallbackQuestions;
    
    if (input.isFollowUp) {
      // Situational follow-up questions for SJT
      if (input.roleCategory.toLowerCase().includes('situation')) {
        fallbackQuestions = [
          `What specific skills would you utilize to handle this situation effectively?`,
          `What would be your top priority when addressing this scenario?`,
          `How would you measure the success of your approach to this situation?`,
          `What potential challenges do you anticipate in this scenario?`,
          `How would you adapt your approach if your initial solution didn't work?`,
        ];
      } else {
        // Generic follow-up questions for interviews
        fallbackQuestions = [
          `Can you elaborate on how you've demonstrated these skills in your previous roles?`,
          `What specific experience do you have that relates directly to this aspect of the role?`,
          `How would you approach solving a complex problem in this area?`,
          `What metrics would you use to measure success in this aspect of the position?`,
          `How do you stay current with developments in this field?`,
        ];
      }
    } else {
      // Standard interview questions
      fallbackQuestions = [
        `Hello ${input.name || 'candidate'}, thank you for your interest in the ${input.roleCategory} role. To start, please introduce yourself and tell me a bit about why you're applying for this position.`,
        `Could you describe a challenging project you worked on and how you approached it?`,
        `What do you know about our company and this ${input.roleCategory} role?`,
        `Where do you see yourself in five years?`,
        `Do you have any questions for us?`,
      ];
    }
    
    // Apply followUpCount limit to fallback questions as well
    const requestedCount = input.followUpCount ?? input.numberOfQuestions;
    return { questions: fallbackQuestions.slice(0, requestedCount) };
  }
);
