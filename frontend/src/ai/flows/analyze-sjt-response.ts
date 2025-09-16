
'use server';
/**
 * @fileOverview A Genkit flow to analyze a candidate's response to a Situational Judgement Test (SJT) scenario.
 * Updated to focus on competency demonstration rather than checklist matching for more accurate assessment.
 *
 * - analyzeSJTResponse - A function that evaluates a candidate's answer against competency standards.
 * - AnalyzeSJTResponseInput - The input type for the analyzeSJTResponse function.
 * - AnalyzeSJTResponseOutput - The return type for the analyzeSJTResponse function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { translateToEnglish, type TranslateToEnglishOutput } from './translate-text';

const AnalyzeSJTResponseInputSchema = z.object({
  situation: z.string().describe('The workplace scenario that was presented to the candidate.'),
  question: z.string().optional().describe('The specific question asked to the candidate about the situation (for backward compatibility).'),
  conversationHistory: z.array(z.object({
    question: z.string(),
    answer: z.string(), 
    isFollowUp: z.boolean().optional()
  })).optional().describe('Complete conversation history for the scenario (preferred over single question).'),
  bestResponseRationale: z.string().describe('A description of the ideal thought process or actions for the best possible response.'),
  worstResponseRationale: z.string().describe('A description of the thought process or actions that would constitute the worst possible response.'),
  assessedCompetency: z.string().describe('The primary competency being measured by this scenario (e.g., "Problem Solving").'),
  candidateAnswer: z.string().optional().describe("The candidate's transcribed answer to the question (for backward compatibility)."),
});
export type AnalyzeSJTResponseInput = z.infer<typeof AnalyzeSJTResponseInputSchema>;

const AnalyzeSJTResponseOutputSchema = z.object({
  score: z.number().min(0).max(10).describe('A score from 0 to 10 evaluating the candidate on the specified competency.'),
  rationale: z.string().describe('A detailed rationale explaining the score, referencing the best and worst response criteria.'),
});
export type AnalyzeSJTResponseOutput = z.infer<typeof AnalyzeSJTResponseOutputSchema>;

export async function analyzeSJTResponse(input: AnalyzeSJTResponseInput): Promise<AnalyzeSJTResponseOutput> {
  return analyzeSJTResponseFlow(input);
}

// Enhanced function for conversation-based single competency analysis
export async function analyzeSingleCompetency(input: {
  situation: string;
  conversationHistory: Array<{
    question: string;
    answer: string;
    isFollowUp?: boolean;
  }>;
  targetCompetency: string;
  bestResponseRationale: string;
  worstResponseRationale: string;
}): Promise<AnalyzeSJTResponseOutput> {
  return analyzeSJTResponseFlow({
    situation: input.situation,
    conversationHistory: input.conversationHistory,
    bestResponseRationale: input.bestResponseRationale,
    worstResponseRationale: input.worstResponseRationale,
    assessedCompetency: input.targetCompetency,
  });
}

const prompt = ai.definePrompt({
  name: 'analyzeSJTResponsePrompt',
  input: { schema: AnalyzeSJTResponseInputSchema },
  output: { schema: AnalyzeSJTResponseOutputSchema },
  model: process.env.GEMINI_SJT_EVALUATION_MODEL || 'googleai/gemini-2.0-flash-lite', // Use 2.0 Flash-Lite for better availability and performance
  prompt: `
    You are an expert talent assessor specializing in Situational Judgement Tests.
    A candidate was presented with the following scenario:

    **Situation**: {{{situation}}}

    **Complete Conversation**:
    {{#if conversationHistory}}
    {{#each conversationHistory}}
    Q{{@index}}: {{question}} {{#if isFollowUp}}(Follow-up){{/if}}
    A{{@index}}: {{answer}}
    
    {{/each}}
    {{else}}
    **Question**: {{{question}}}
    **Candidate's Answer**: "{{{candidateAnswer}}}"
    {{/if}}

    **COMPETENCY BEING EVALUATED**: {{{assessedCompetency}}}

    **REFERENCE RESPONSES**:
    - **BEST response approach**: {{{bestResponseRationale}}}
    - **WORST response approach**: {{{worstResponseRationale}}}

    **SCORING RUBRIC for {{{assessedCompetency}}} - COMPETENCY-BASED EVALUATION**:
    10 - Excellent: Demonstrates strong {{{assessedCompetency}}} competency with professional approach and sound judgment
    8-9 - Very Good: Shows good {{{assessedCompetency}}} demonstration with solid reasoning and appropriate response
    6-7 - Good: Adequate {{{assessedCompetency}}} understanding with reasonable professional approach
    4-5 - Fair: Basic {{{assessedCompetency}}} awareness with some appropriate elements but gaps in approach
    2-3 - Poor: Limited {{{assessedCompetency}}} demonstration, more aligned with unprofessional/inappropriate responses
    1 - Very Poor: Minimal {{{assessedCompetency}}} awareness, clearly inappropriate or harmful response
    0 - No response: No answer provided or completely unrelated to scenario

    **CRITICAL INSTRUCTIONS - COMPETENCY-FOCUSED ASSESSMENT**:
    1. EVALUATE THE SPIRIT: Focus on whether the response demonstrates good {{{assessedCompetency}}} competency, not specific phrases or solutions
    2. PROFESSIONAL JUDGMENT: Does this response show professional thinking and appropriate workplace behavior?
    3. BEST vs WORST SPECTRUM: Where does this fall between professional excellence and poor judgment? 
    4. INTENT RECOGNITION: Does the candidate understand what good {{{assessedCompetency}}} looks like in practice?
    5. GENEROUS INTERPRETATION: If the response shows competency understanding and professional intent, score 6+ range
    6. IGNORE: Specific phrases, exact solutions mentioned, communication style, or minor details - focus on competency demonstration

    Score the candidate's response (0-10) based on how well it demonstrates {{{assessedCompetency}}} competency. Focus on the professional judgment and competency demonstration rather than specific phrases or exact solutions. Consider whether this response shows someone who understands good {{{assessedCompetency}}} practices in a workplace setting.
  `,
});

const analyzeSJTResponseFlow = ai.defineFlow(
  {
    name: 'analyzeSJTResponseFlow',
    inputSchema: AnalyzeSJTResponseInputSchema,
    outputSchema: AnalyzeSJTResponseOutputSchema,
  },
  async (input) => {
    let lastError;
    
    // Preprocess candidate responses to ensure they're in English for consistent analysis
    let processedInput = { ...input };
    
    try {
      // Handle conversation history - translate all answers to English
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
                console.warn('Failed to translate conversation entry, using original:', translationError);
                return entry; // Fallback to original
              }
            }
            return entry;
          })
        );
        processedInput.conversationHistory = translatedHistory;
      }
      
      // Handle legacy single candidateAnswer - translate to English
      if (input.candidateAnswer && input.candidateAnswer.trim()) {
        try {
          const translation = await translateToEnglish({ text: input.candidateAnswer });
          processedInput.candidateAnswer = translation.translatedText;
        } catch (translationError) {
          console.warn('Failed to translate candidate answer, using original:', translationError);
          // Fallback to original answer if translation fails
        }
      }
    } catch (preprocessError) {
      console.warn('Response preprocessing failed, using original input:', preprocessError);
      // Continue with original input if preprocessing fails entirely
    }
    
    // Enhanced retry logic for overloaded API and rate limits
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const { output } = await prompt(processedInput);
        if (!output) {
          throw new Error("AI analysis did not return a valid SJT analysis.");
        }
        return output;
      } catch (error: any) {
        lastError = error;
        
        // Handle both 503 (overloaded) and 429 (rate limit) errors
        if ((error.status === 503 || error.status === 429) && attempt < 3) {
          const waitTime = error.status === 429 ? attempt * 1500 : attempt * 1000; // Reduced from 3000/2000 to 1500/1000
          console.log(`⏳ API ${error.status === 429 ? 'rate limited' : 'overloaded'}, retrying in ${waitTime/1000} seconds (attempt ${attempt}/3)...`);
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
