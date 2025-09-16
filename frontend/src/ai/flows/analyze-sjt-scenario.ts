'use server';
/**
 * @fileOverview A Genkit flow to analyze a complete SJT scenario conversation.
 * Updated to focus on competency demonstration and professional judgment rather than exact response matching.
 * This analyzes an entire scenario conversation (including follow-ups) for comprehensive assessment.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { translateToEnglish } from './translate-text';

const ConversationEntrySchema = z.object({
  question: z.string().describe('The question asked to the candidate'),
  answer: z.string().describe('The candidate\'s response'),
  isFollowUp: z.boolean().optional().describe('Whether this is a follow-up question')
});

const AnalyzeSJTScenarioInputSchema = z.object({
  situation: z.string().describe('The workplace scenario that was presented to the candidate'),
  conversationHistory: z.array(ConversationEntrySchema).describe('The complete conversation for this scenario'),
  bestResponseRationale: z.string().describe('A description of the ideal thought process or actions for the best possible response'),
  worstResponseRationale: z.string().describe('A description of the thought process or actions that would constitute the worst possible response'),
  assessedCompetencies: z.array(z.string()).describe('The competencies being measured by this scenario')
});

export type AnalyzeSJTScenarioInput = z.infer<typeof AnalyzeSJTScenarioInputSchema>;

const CompetencyScoreSchema = z.object({
  competency: z.string().describe('The name of the competency'),
  score: z.number().min(0).max(10).describe('A score from 0 to 10 evaluating the candidate on this competency'),
  rationale: z.string().describe('A detailed rationale explaining the score for this competency')
});

const AnalyzeSJTScenarioOutputSchema = z.object({
  competencyScores: z.array(CompetencyScoreSchema).describe('Scores for each assessed competency'),
  conversationQuality: z.enum(['Poor', 'Fair', 'Good', 'Excellent']).describe('Overall quality of the conversation'),
  overallAssessment: z.string().describe('A comprehensive assessment of the candidate\'s performance in this scenario')
});

export type AnalyzeSJTScenarioOutput = z.infer<typeof AnalyzeSJTScenarioOutputSchema>;

export async function analyzeSJTScenario(input: AnalyzeSJTScenarioInput): Promise<AnalyzeSJTScenarioOutput> {
  return analyzeSJTScenarioFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeSJTScenarioPrompt',
  input: { schema: AnalyzeSJTScenarioInputSchema },
  output: { schema: AnalyzeSJTScenarioOutputSchema },
  model: process.env.GEMINI_SJT_EVALUATION_MODEL || 'googleai/gemini-2.0-flash-lite', // Use 2.0 Flash-Lite for better availability and performance
  prompt: `
    You are an expert talent assessor specializing in Situational Judgement Tests.
    A candidate was presented with the following scenario and engaged in a complete conversation:

    **Situation**: {{{situation}}}

    **Complete Conversation**:
    {{#each conversationHistory}}
    Q{{@index}}: {{question}} {{#if isFollowUp}}(Follow-up){{/if}}
    A{{@index}}: {{answer}}
    
    {{/each}}

    Your task is to evaluate this complete conversation across the following competencies: {{#each assessedCompetencies}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}

    **Evaluation Criteria**:
    - The **best response approach** represents professional excellence: "{{{bestResponseRationale}}}"
    - The **worst response approach** represents poor professional judgment: "{{{worstResponseRationale}}}"

    **Important Instructions**:
    1. Consider the ENTIRE conversation as a cohesive response, not individual answers in isolation
    2. Evaluate how well the candidate's overall approach demonstrates each competency in practice
    3. Focus on competency demonstration and professional judgment rather than specific phrases or solutions
    4. Consider how follow-up responses build upon or clarify initial responses
    5. Score each competency based on where the response falls between professional excellence and poor judgment
    6. Look for understanding of good workplace practices and sound professional reasoning

    For each competency, provide:
    - A score from 0 (shows poor professional judgment) to 10 (demonstrates excellent competency)
    - A detailed rationale explaining how the conversation demonstrates competency understanding and professional approach

    Also assess the overall conversation quality and provide a comprehensive assessment of the candidate's performance.
  `,
});

const analyzeSJTScenarioFlow = ai.defineFlow(
  {
    name: 'analyzeSJTScenarioFlow',
    inputSchema: AnalyzeSJTScenarioInputSchema,
    outputSchema: AnalyzeSJTScenarioOutputSchema,
  },
  async (input) => {
    let lastError;
    
    // Preprocess conversation history to ensure answers are in English
    let processedInput = { ...input };
    
    try {
      if (input.conversationHistory && input.conversationHistory.length > 0) {
        const translatedHistory = await Promise.all(
          input.conversationHistory.map(async (entry) => {
            if (entry.answer && entry.answer.trim()) {
              try {
                const translation = await translateToEnglish({ text: entry.answer });
                return {
                  ...entry,
                  answer: translation.translatedText
                };
              } catch (translationError) {
                console.warn('Failed to translate scenario conversation entry, using original:', translationError);
                return entry; // Fallback to original
              }
            }
            return entry;
          })
        );
        processedInput.conversationHistory = translatedHistory;
      }
    } catch (preprocessError) {
      console.warn('Scenario preprocessing failed, using original input:', preprocessError);
      // Continue with original input if preprocessing fails
    }
    
    // Retry logic for overloaded API
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const { output } = await prompt(processedInput);
        if (!output) {
          throw new Error("AI analysis did not return a valid SJT scenario analysis.");
        }
        return output;
      } catch (error: any) {
        lastError = error;
        
        // Handle both 503 (overloaded) and 429 (rate limit) errors  
        if ((error.status === 503 || error.status === 429) && attempt < 3) {
          const waitTime = error.status === 429 ? attempt * 1500 : attempt * 1000; // Optimized timing
          console.log(`⏳ Scenario API ${error.status === 429 ? 'rate limited' : 'overloaded'}, retrying in ${waitTime/1000} seconds (attempt ${attempt}/3)...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
        
        // For other errors or final attempt, throw
        throw error;
      }
    }
    
    throw lastError;
  }
);