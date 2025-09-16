'use server';
/**
 * @fileOverview Evaluates the quality of a candidate's answer to determine if follow-up questions are nee      const {output} = await prompt(input);
      if (output) {
        console.log(`✅ Answer quality evaluation complete: score=${output.score}, isComplete=${output.isComplete}`);
        console.log(`🔍 AI Evaluation Details:`, {
          score: output.score,
          isComplete: output.isComplete,
          missingAspects: output.missingAspects,
          hasFollowUp: !!output.followUpQuestion,
          rationale: output.rationale.substring(0, 100) + '...'
        });
        
        // SAFEGUARD: Enforce completion rules if AI makes logical errors
        const shouldBeIncomplete = output.score < 4 && input.followUpCount < input.maxFollowUps;
        const shouldBeComplete = output.score >= 4 || input.followUpCount >= input.maxFollowUps; evaluateAnswerQuality - A function that evaluates a candidate's answer quality and generates follow-up questions if needed.
 * - EvaluateAnswerQualityInput - The input type for the function.
 * - EvaluateAnswerQualityOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {SJT_EVALUATION_MODEL} from '@/ai/config';

const EvaluateAnswerQualityInputSchema = z.object({
  situation: z.string().describe('The workplace scenario that was presented to the candidate.'),
  question: z.string().describe('The specific question asked to the candidate about the situation.'),
  bestResponseRationale: z.string().describe('A description of the ideal thought process or actions for the best possible response.'),
  assessedCompetency: z.string().describe('The primary competency being measured by this scenario (e.g., "Problem Solving").'),
  candidateAnswer: z.string().describe("The candidate's transcribed answer to the question."),
  questionNumber: z.number().describe("The number of the main question (e.g. 1, 2, etc.)"),
  followUpCount: z.number().describe("The current number of follow-up questions that have been asked for this scenario."),
  maxFollowUps: z.number().describe("The maximum number of follow-up questions allowed per scenario."),
});
export type EvaluateAnswerQualityInput = z.infer<typeof EvaluateAnswerQualityInputSchema>;

const EvaluateAnswerQualityOutputSchema = z.object({
  isComplete: z.boolean().describe('Whether the answer covers all key elements from the best response criteria, or if a follow-up question is needed to guide toward missing best-response elements.'),
  score: z.number().min(1).max(5).describe('A score from 1-5 indicating how well the answer aligns with the best response criteria. 4+ means most key elements covered.'),
  missingAspects: z.array(z.string()).describe('Specific elements from the best response criteria that are missing or underdeveloped in the candidate\'s answer.'),
  followUpQuestion: z.string().optional().describe('A targeted follow-up question to guide the candidate toward the most important missing element from the best response criteria.'),
  rationale: z.string().describe('Explanation comparing the candidate\'s answer to the best response criteria, highlighting gaps and why the follow-up targets specific missing elements.'),
});
export type EvaluateAnswerQualityOutput = z.infer<typeof EvaluateAnswerQualityOutputSchema>;

export async function evaluateAnswerQuality(input: EvaluateAnswerQualityInput): Promise<EvaluateAnswerQualityOutput> {
  return evaluateAnswerQualityFlow(input);
}

const prompt = ai.definePrompt({
  name: 'evaluateAnswerQualityPrompt',
  input: {schema: EvaluateAnswerQualityInputSchema},
  output: {schema: EvaluateAnswerQualityOutputSchema},
  model: SJT_EVALUATION_MODEL,
  prompt: `You are an expert talent assessor evaluating candidate responses in a Situational Judgment Test.
Your task is to compare the candidate's answer to the BEST RESPONSE criteria and generate follow-up questions that guide them toward the optimal answer.

CONTEXT:
- Scenario: {{situation}}
- Question {{questionNumber}}: {{question}}
- BEST RESPONSE CRITERIA: {{bestResponseRationale}}
- Competency being assessed: {{assessedCompetency}}
- Current follow-up count: {{followUpCount}} out of {{maxFollowUps}} maximum allowed

CANDIDATE'S ANSWER:
"{{candidateAnswer}}"

EVALUATION INSTRUCTIONS:
1. **Compare the candidate's answer directly to the BEST RESPONSE CRITERIA above**
2. **Identify specific elements from the best response that are missing or underdeveloped in the candidate's answer**
3. **Focus on gaps**: What key aspects mentioned in the best response criteria did the candidate NOT address?
4. **Generate ONE targeted follow-up question** that:
   - Guides the candidate toward the MOST IMPORTANT missing element from the best response
   - Helps bridge the gap between their current answer and the ideal response
   - Encourages them to consider specific aspects they haven't thought about yet
   - Use this exact format: "{{questionNumber}}.a)" for first follow-up, "{{questionNumber}}.b)" for second, etc.
   - ONLY generate ONE question, not multiple questions in a single response

SCORING CRITERIA (SCALE 1-5):
- **5**: Answer perfectly aligns with best response criteria, covers ALL major elements
- **4**: Answer covers most elements from best response, minor gaps only
- **3**: Answer covers some elements but misses several important aspects from best response  
- **2**: Answer covers few elements from the best response criteria
- **1**: Answer covers very few or no elements from the best response criteria

COMPLETION RULES (CRITICAL - FOLLOW EXACTLY):
- **Mark isComplete = false** if:
  - Score is 1, 2, or 3 AND
  - Follow-ups are still available (followUpCount < maxFollowUps)
- **Mark isComplete = true** ONLY if:
  - Score is 4 or 5 (covers most/all best response elements), OR
  - Maximum follow-ups have been reached (followUpCount >= maxFollowUps)

EXAMPLES:
- Score = 1, followUpCount = 0, maxFollowUps = 2 → isComplete = FALSE (generate follow-up)
- Score = 1, followUpCount = 1, maxFollowUps = 2 → isComplete = FALSE (generate follow-up)
- Score = 1, followUpCount = 2, maxFollowUps = 2 → isComplete = TRUE (max reached)
- Score = 4, followUpCount = 0, maxFollowUps = 2 → isComplete = TRUE (good enough)

FOLLOW-UP STRATEGY:
- If score is 1, 2, or 3 and follow-ups available: Generate ONE question targeting the most important missing element from the best response
- If score is 4+ or maximum follow-ups reached: Mark as complete

The follow-up question should specifically help the candidate discover and incorporate the missing best-response elements they haven't considered yet.`,
});

const evaluateAnswerQualityFlow = ai.defineFlow(
  {
    name: 'evaluateAnswerQualityFlow',
    inputSchema: EvaluateAnswerQualityInputSchema,
    outputSchema: EvaluateAnswerQualityOutputSchema,
  },
  async (input: EvaluateAnswerQualityInput): Promise<EvaluateAnswerQualityOutput> => {
    try {
      console.log('🔍 Evaluating answer quality for question', input.questionNumber);
      
      // Check if we've reached the maximum follow-ups
      if (input.followUpCount >= input.maxFollowUps) {
        console.log('⚠️ Maximum follow-up questions reached, marking as complete');
        return {
          isComplete: true, // Force complete when max follow-ups reached
          score: 3, // Default score when max reached
          missingAspects: ["Maximum follow-up limit reached"],
          rationale: "The maximum number of follow-up questions has been reached for this scenario. Assessment complete based on current responses."
        };
      }
      
      // Generate the assessment with improved error handling
      console.log(`🤖 Using ${SJT_EVALUATION_MODEL} for sjt-evaluation`);
      console.log(`🔍 Input data:`, {
        questionNumber: input.questionNumber,
        followUpCount: input.followUpCount,
        maxFollowUps: input.maxFollowUps,
        candidateAnswerLength: input.candidateAnswer.length,
        candidateAnswerPreview: input.candidateAnswer.substring(0, 100) + '...'
      });
      
      const {output} = await prompt(input);
      if (output) {
        console.log(`✅ Answer quality evaluation complete: score=${output.score}, isComplete=${output.isComplete}`);
        console.log(`🔍 AI Evaluation Details:`, {
          score: output.score,
          isComplete: output.isComplete,
          missingAspects: output.missingAspects,
          hasFollowUp: !!output.followUpQuestion,
          rationale: output.rationale.substring(0, 200) + '...'
        });
        
        // SAFEGUARD: Enforce completion logic in case AI makes a mistake
        const shouldBeIncomplete = output.score < 4 && input.followUpCount < input.maxFollowUps;
        const shouldBeComplete = output.score >= 4 || input.followUpCount >= input.maxFollowUps;
        
        if (shouldBeIncomplete && output.isComplete) {
          console.log(`⚠️ AI incorrectly marked as complete (score=${output.score}, followUps=${input.followUpCount}/${input.maxFollowUps}), fixing...`);
          output.isComplete = false;
          // If AI didn't generate a follow-up question when it should have, we need one
          if (!output.followUpQuestion) {
            const followUpLetter = String.fromCharCode(97 + input.followUpCount);
            output.followUpQuestion = `${input.questionNumber}.${followUpLetter}) Could you provide more specific details about how you would handle this situation, considering the best practices for this scenario?`;
          }
        } else if (shouldBeComplete && !output.isComplete) {
          console.log(`⚠️ AI incorrectly marked as incomplete (score=${output.score}, followUps=${input.followUpCount}/${input.maxFollowUps}), fixing...`);
          output.isComplete = true;
          output.followUpQuestion = undefined; // Remove follow-up if max reached or score sufficient
        }
        
        // Critical safeguard: Never generate follow-up if we've reached the limit
        if (input.followUpCount >= input.maxFollowUps) {
          console.log(`🛡️ Follow-up limit enforcement: ${input.followUpCount}/${input.maxFollowUps} - forcing completion`);
          output.isComplete = true;
          output.followUpQuestion = undefined;
        }
        
        // If there's a follow-up question, ensure it has the correct letter format
        if (output.followUpQuestion) {
          // Convert follow-up count to letter (0 -> 'a', 1 -> 'b', etc.)
          const followUpLetter = String.fromCharCode(97 + input.followUpCount);
          
          // Check if the follow-up question already has the correct format
          const expectedPrefix = `${input.questionNumber}.${followUpLetter})`;
          if (!output.followUpQuestion.startsWith(expectedPrefix)) {
            // Replace any existing numbering pattern or add the correct prefix
            output.followUpQuestion = output.followUpQuestion.replace(
              /^\d+\.[a-z]\)\s*/i, 
              `${expectedPrefix} `
            );
            
            // If no replacement was made, add the prefix
            if (!output.followUpQuestion.startsWith(expectedPrefix)) {
              output.followUpQuestion = `${expectedPrefix} ${output.followUpQuestion}`;
            }
          }
          
          // Add proper spacing and formatting for follow-up questions
          // Ensure there's a line break after "Situation:" to improve readability
          output.followUpQuestion = output.followUpQuestion.trim();
        }
        
        return output;
      }
      
      // Fallback if AI fails
      console.warn('⚠️ AI evaluation failed, using fallback');
      return {
        isComplete: true, // Default to complete to avoid system getting stuck
        score: 3, // Middle score when uncertain
        missingAspects: ["Could not evaluate answer properly"],
        rationale: "Unable to properly evaluate the answer quality due to technical limitations. Proceeding without follow-up."
      };
    } catch (error: any) {
      console.error('❌ Error in answer quality evaluation:', error);
      
      // Special handling for service unavailable errors
      const errorMessage = String(error);
      if (errorMessage.includes('Service Unavailable') || errorMessage.includes('overloaded')) {
        console.warn('⚠️ Model overloaded, using graceful fallback');
        return {
          isComplete: true, // Move to next question when model is unavailable
          score: 4, // Slightly above middle score
          missingAspects: ["Model temporarily unavailable"],
          rationale: "The AI model is currently experiencing high demand. Your answer has been recorded, but detailed feedback is not available at this time."
        };
      }
      
      // Generic error fallback
      return {
        isComplete: true, // Default to complete on error
        score: 3, // Middle score when uncertain
        missingAspects: ["Error during evaluation"],
        rationale: "An error occurred during answer evaluation. Proceeding without follow-up."
      };
    }
  }
);
