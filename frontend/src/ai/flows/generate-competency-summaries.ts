'use server';
/**
 * @fileOverview Generates qualitative summaries for each competency based on candidate performance.
 *
 * - generateCompetencySummaries - A function that analyzes competency performance and generates 2-3 line summaries
 * - GenerateCompetencySummariesInput - The input type for the function
 * - GenerateCompetencySummariesOutput - The return type for the function
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {SJT_EVALUATION_MODEL} from '@/ai/config';

const GenerateCompetencySummariesInputSchema = z.object({
  competencyName: z.string().describe('The name of the competency being analyzed (e.g., "Problem Solving").'),
  candidateName: z.string().describe('The name of the candidate being assessed.'),
  questionResponses: z.array(z.object({
    questionNumber: z.number(),
    question: z.string(),
    candidateAnswer: z.string(),
    prePenaltyScore: z.number(),
    postPenaltyScore: z.number(),
    penaltyApplied: z.number(),
    hasFollowUp: z.boolean(),
    rationale: z.string(),
    followUpQuestions: z.array(z.string()).optional(),
    followUpAnswers: z.array(z.string()).optional(),
  })).describe('Array of all questions and responses for this specific competency.'),
  overallScore: z.number().describe('The overall averaged score for this competency (post-penalty).'),
});
export type GenerateCompetencySummariesInput = z.infer<typeof GenerateCompetencySummariesInputSchema>;

const GenerateCompetencySummariesOutputSchema = z.object({
  strengthSummary: z.string().describe('A 2-3 line summary highlighting the candidate\'s strengths in this specific competency, based on their responses and scores.'),
  weaknessSummary: z.string().describe('A 2-3 line summary identifying areas for improvement in this specific competency, based on gaps in their responses.'),
});
export type GenerateCompetencySummariesOutput = z.infer<typeof GenerateCompetencySummariesOutputSchema>;

export async function generateCompetencySummaries(input: GenerateCompetencySummariesInput): Promise<GenerateCompetencySummariesOutput> {
  return generateCompetencySummariesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateCompetencySummariesPrompt',
  input: {schema: GenerateCompetencySummariesInputSchema},
  output: {schema: GenerateCompetencySummariesOutputSchema},
  model: SJT_EVALUATION_MODEL,
  prompt: `You are an expert HR analyst generating competency-specific feedback for talent assessment.

CANDIDATE: {{candidateName}}
COMPETENCY: {{competencyName}}
OVERALL SCORE: {{overallScore}}/10

PERFORMANCE DATA:
{{#each questionResponses}}
---
**Question {{this.questionNumber}}**: {{this.question}}

**Candidate's Answer**: "{{this.candidateAnswer}}"

**Performance**:
- Pre-penalty Score: {{this.prePenaltyScore}}/10
- Post-penalty Score: {{this.postPenaltyScore}}/10
{{#if this.hasFollowUp}}
- Follow-up Penalty Applied: {{this.penaltyApplied}}%
{{/if}}

**AI Rationale**: {{this.rationale}}

{{#if this.followUpQuestions}}
**Follow-up Questions**: 
{{#each this.followUpQuestions}}
- {{this}}
{{/each}}
{{/if}}

{{#if this.followUpAnswers}}
**Follow-up Answers**: 
{{#each this.followUpAnswers}}
- "{{this}}"
{{/each}}
{{/if}}
---
{{/each}}

TASK: Generate specific, evidence-based summaries for this competency:

**Instructions for strengthSummary**:
- Write 2-3 lines highlighting what the candidate did well in demonstrating this competency
- Focus on professional judgment, workplace appropriateness, and competency understanding shown
- Reference the spirit and approach of their responses rather than specific phrases
- Use positive, professional language that recognizes competency demonstration

**Instructions for weaknessSummary**:
- Write 2-3 lines identifying areas where the candidate could strengthen this competency
- Focus on gaps in professional approach or competency understanding
- Provide constructive feedback for competency development rather than specific phrase requirements
- Be specific about competency skills they should focus on improving

Both summaries should be:
- Specific to this competency only
- Evidence-based (referencing their actual responses)
- Professional and constructive in tone
- Actionable for development purposes`,
});

const generateCompetencySummariesFlow = ai.defineFlow(
  {
    name: 'generateCompetencySummariesFlow',
    inputSchema: GenerateCompetencySummariesInputSchema,
    outputSchema: GenerateCompetencySummariesOutputSchema,
  },
  async (input: GenerateCompetencySummariesInput): Promise<GenerateCompetencySummariesOutput> => {
    try {
      console.log(`🔍 Generating competency summary for: ${input.competencyName}`);
      
      const {output} = await prompt(input);
      if (!output || !output.strengthSummary || !output.weaknessSummary) {
        throw new Error("AI did not return valid competency summaries.");
      }
      
      console.log(`✅ Competency summary generated for: ${input.competencyName}`);
      return output;
    } catch (error: any) {
      console.error(`❌ Error generating competency summary for ${input.competencyName}:`, error);
      
      // Fallback summaries
      return {
        strengthSummary: `The candidate demonstrated engagement with ${input.competencyName.toLowerCase()} scenarios and provided responses that show some understanding of the required approaches.`,
        weaknessSummary: `The candidate could benefit from more detailed responses and deeper consideration of ${input.competencyName.toLowerCase()}-related factors in workplace situations.`
      };
    }
  }
);
