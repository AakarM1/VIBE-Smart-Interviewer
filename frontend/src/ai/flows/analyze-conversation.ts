
'use server';

/**
 * @fileOverview Analyzes a conversation for a given role, providing a qualitative report and quantitative competency scores.
 *
 * - analyzeConversation - A function that analyzes the conversation.
 * - AnalyzeConversationInput - The input type for the analyzeConversation function.
 * - AnalyzeConversationOutput - The return type for the analyzeConversation function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { translateToEnglish } from './translate-text';
import { translationService } from '@/lib/translation-service';

const QuestionAnswerSchema = z.object({
  question: z.string(),
  answer: z.string(),
  preferredAnswer: z.string().optional().describe("Guidance on what constitutes a good answer for this specific question."),
  competency: z.string().optional().describe("The competency this question is designed to assess."),
  // Multilingual fields
  languageCode: z.string().optional().describe("Language code of the original answer"),
  answerNative: z.string().optional().describe("Original answer in native language"),
  answerEn: z.string().optional().describe("Answer translated to English"),
  questionTranslated: z.string().optional().describe("Question translated to user's language"),
});

const AnalyzeConversationInputSchema = z.object({
  conversationHistory: z.array(QuestionAnswerSchema).describe('The history of the conversation, including questions, answers, and AI guidance.'),
  name: z.string().describe('The name of the candidate.'),
  roleCategory: z.string().describe('The role category the candidate applied for (e.g., Sales Manager, Software Engineer).'),
  jobDescription: z.string().optional().describe('The job description for the role.'),
});
export type AnalyzeConversationInput = z.infer<typeof AnalyzeConversationInputSchema>;


// Schema for individual competency scoring
const CompetencySchema = z.object({
  name: z.string().describe("The name of the competency, e.g., 'Problem Solving'."),
  score: z.number().min(0).max(10).describe("The score for the competency, from 0 to 10."),
});

// Schema for grouping competencies under a meta-competency
const MetaCompetencySchema = z.object({
  name: z.string().describe("The name of the meta-competency, e.g., 'Core Skills'."),
  competencies: z.array(CompetencySchema).describe("An array of competencies under this meta-competency."),
});

const AnalyzeConversationOutputSchema = z.object({
  strengths: z.string().describe("A paragraph detailing the candidate's key strengths, supported by specific examples from the conversation. This should be in natural language and not use lists or special characters."),
  weaknesses: z.string().describe("A paragraph detailing the candidate's areas for improvement or weaknesses, supported by specific examples from the conversation. This should be in natural language and not use lists or special characters."),
  summary: z.string().describe("An overall summary of the candidate's suitability and performance for the specified role, written in natural language without special characters."),
  competencyAnalysis: z.array(MetaCompetencySchema).describe("A detailed, scored analysis of various competencies, grouped by meta-competencies and sorted alphabetically.")
});
export type AnalyzeConversationOutput = z.infer<typeof AnalyzeConversationOutputSchema>;

export async function analyzeConversation(input: AnalyzeConversationInput): Promise<AnalyzeConversationOutput> {
  // Dynamically determine competencies from the input
  const uniqueCompetencies = [...new Set(input.conversationHistory.map(h => h.competency).filter(Boolean) as string[])];
  
  // Ensure all questions have competencies by using the question index as fallback
  const enhancedHistory = input.conversationHistory.map((entry, index) => {
    return {
      ...entry,
      competency: entry.competency || `Interview Question ${index + 1}`,
    };
  });

  const augmentedInput = {
    ...input,
    conversationHistory: enhancedHistory,
    competenciesToAssess: uniqueCompetencies.length > 0 
      ? uniqueCompetencies.join(', ')
      : enhancedHistory.map(h => h.competency).join(', '),
  };

  return analyzeConversationFlow(augmentedInput);
}

const prompt = ai.definePrompt({
  name: 'analyzeConversationPrompt',
  input: {schema: AnalyzeConversationInputSchema.extend({ competenciesToAssess: z.string() })},
  output: {schema: AnalyzeConversationOutputSchema},
  model: process.env.GEMINI_DEFAULT_MODEL || 'googleai/gemini-2.0-flash-lite',
  prompt: `You are an expert AI hiring analyst for a top-tier recruitment firm. Your task is to evaluate a candidate named {{{name}}} for a {{{roleCategory}}} position based on the provided job description and interview transcript.

**Job Description Context:**
"{{{jobDescription}}}"

**Interview Transcript & Analysis Guidance:**
For each question, you must evaluate the candidate's response based on the admin-defined competency criteria and ideal answer characteristics provided.

{{#each conversationHistory}}
---
**Question {{@index}} - {{{this.question}}}**
**Required Competency: {{{this.competency}}}**
**Ideal Answer Criteria:** The ideal response should demonstrate: "{{{this.preferredAnswer}}}"

**Candidate's Answer:** "{{{this.answer}}}"

You must evaluate this answer specifically on how well it demonstrates the "{{{this.competency}}}" competency using the ideal answer criteria as your benchmark.
---
{{/each}}

ANALYSIS REQUIRED:

Based *only* on the conversation and criteria provided, provide the following comprehensive analysis in the specified JSON format:

PART 1: QUALITATIVE REPORT

- **strengths**: Provide a detailed analysis structured as follows:
  1. **Individual Question Analysis - Strong Performances**: Analyze each question where the candidate performed well, referencing the specific competency demonstrated and how their answer met the ideal criteria.
  2. **Overall Competency Analysis**: For each competency where the candidate showed strength, provide a comprehensive assessment of their performance across all related questions.
  3. **Summary**: Overall assessment of the candidate's key strengths.

- **weaknesses**: Provide a detailed analysis structured as follows:
  1. **Individual Question Analysis - Areas for Development**: Analyze each question where the candidate could improve, explaining how their answer fell short of the ideal criteria for the required competency.
  2. **Overall Competency Development Areas**: For each competency needing improvement, provide detailed development recommendations and explain the gaps identified.
  3. **Development Recommendations**: Specific, actionable recommendations for improvement.

- **summary**: Provide a comprehensive assessment structured as follows:
  1. **Overall Performance Overview**: Include performance distribution, competency coverage, and overall assessment level.
  2. **Competency Analysis**: Summarize performance for each assessed competency with specific insights.
  3. **Final Assessment**: Overall suitability determination with specific reasoning.

- **IMPORTANT**: For each section, structure your analysis by competency with specific examples from the conversation. Write in natural language using full sentences and professional assessment language. Provide detailed, actionable insights rather than generic feedback.

PART 2: COMPETENCY ANALYSIS
- You must assess the candidate on each of the following competencies: {{{competenciesToAssess}}}.
- For each competency, derive a score from 0 (no evidence) to 10 (excellent evidence).
- Base your score *strictly* on how the candidate's answer for the corresponding question matches the provided ideal answer criteria.
- For each competency, consider only the questions specifically tagged with that competency.
- Group all assessed competencies under a single meta-competency named "Job-Specific Competencies".
- The competencies within the group MUST be sorted alphabetically in the final output.

Return the entire analysis in the specified JSON format.
`,
});

const analyzeConversationFlow = ai.defineFlow(
  {
    name: 'analyzeConversationFlow',
    inputSchema: AnalyzeConversationInputSchema.extend({ competenciesToAssess: z.string() }),
    outputSchema: AnalyzeConversationOutputSchema,
  },
  async input => {
    // Preprocess conversation history to ensure answers are in English
    let processedInput = { ...input };
    
    try {
      if (input.conversationHistory && input.conversationHistory.length > 0) {
        const translatedHistory = await Promise.all(
          input.conversationHistory.map(async (qa) => {
            if (qa.answer && qa.answer.trim()) {
              try {
                // Use new translation service for better handling
                const translatedAnswer = qa.languageCode && qa.languageCode !== 'en' 
                  ? await translationService.translate(qa.answer, 'en', qa.languageCode)
                  : qa.answer;
                
                return {
                  ...qa,
                  answer: translatedAnswer,
                  answerEn: translatedAnswer,
                  answerNative: qa.answerNative || qa.answer
                };
              } catch (translationError) {
                console.warn('Failed to translate conversation answer, using original:', translationError);
                return qa; // Fallback to original
              }
            }
            return qa;
          })
        );
        processedInput.conversationHistory = translatedHistory;
      }
    } catch (preprocessError) {
      console.warn('Conversation preprocessing failed, using original input:', preprocessError);
      // Continue with original input if preprocessing fails
    }
    
    const {output} = await prompt(processedInput);
    if (!output || !output.strengths || !output.weaknesses || !output.summary || !output.competencyAnalysis) {
      throw new Error("AI analysis did not return a valid structured report.");
    }
    return output;
  }
);
