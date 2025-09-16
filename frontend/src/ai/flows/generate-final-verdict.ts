
'use server';

/**
 * @fileOverview A Genkit flow to generate a final hiring verdict based on JDT and SJT reports.
 *
 * - generateFinalVerdict - A function that synthesizes two reports into a final recommendation.
 * - GenerateFinalVerdictInput - The input type for the function.
 * - GenerateFinalVerdictOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import type { AnalysisResult } from '@/types';


const AnalysisResultSchema = z.object({
  strengths: z.string(),
  weaknesses: z.string(),
  summary: z.string(),
  competencyAnalysis: z.array(z.object({
      name: z.string(),
      competencies: z.array(z.object({
          name: z.string(),
          score: z.number(),
      }))
  }))
});


const GenerateFinalVerdictInputSchema = z.object({
  candidateName: z.string().describe("The candidate's full name."),
  roleCategory: z.string().describe("The role the candidate applied for."),
  jobDescriptionTestReport: AnalysisResultSchema.describe("The analysis report from the Job Description Test."),
  situationalJudgementTestReport: AnalysisResultSchema.describe("The analysis report from the Situational Judgement Test."),
});
export type GenerateFinalVerdictInput = z.infer<typeof GenerateFinalVerdictInputSchema>;

const GenerateFinalVerdictOutputSchema = z.object({
  finalVerdict: z.string().describe("A comprehensive, final verdict on the candidate's suitability. This should be a detailed paragraph synthesizing all available data."),
  recommendation: z.enum(["Strong Hire", "Hire", "Hire with Reservations", "No Hire"]).describe("A clear, one-choice hiring recommendation."),
  justification: z.string().describe("A paragraph justifying the recommendation, referencing specific strengths and weaknesses from both reports."),
});
export type GenerateFinalVerdictOutput = z.infer<typeof GenerateFinalVerdictOutputSchema>;

export async function generateFinalVerdict(input: GenerateFinalVerdictInput): Promise<GenerateFinalVerdictOutput> {
  return generateFinalVerdictFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateFinalVerdictPrompt',
  input: { schema: GenerateFinalVerdictInputSchema },
  output: { schema: GenerateFinalVerdictOutputSchema },
  model: process.env.GEMINI_DEFAULT_MODEL || 'googleai/gemini-2.0-flash-lite',
  prompt: `
    You are a senior hiring manager responsible for making the final decision on a candidate.
    You have received two separate performance reports for a candidate named {{{candidateName}}} who applied for the role of {{{roleCategory}}}.

    Your task is to synthesize these two reports into a single, decisive final verdict.

    **Report 1: Job Description Test (JDT) Analysis**
    - Summary: {{{jobDescriptionTestReport.summary}}}
    - Strengths: {{{jobDescriptionTestReport.strengths}}}
    - Weaknesses: {{{jobDescriptionTestReport.weaknesses}}}
    - Competency Scores:
    {{#each jobDescriptionTestReport.competencyAnalysis}}
      {{#each this.competencies}}
      - {{this.name}}: {{this.score}}/10
      {{/each}}
    {{/each}}

    **Report 2: Situational Judgement Test (SJT) Analysis**
    - Summary: {{{situationalJudgementTestReport.summary}}}
    - Strengths: {{{situationalJudgementTestReport.strengths}}}
    - Weaknesses: {{{situationalJudgementTestReport.weaknesses}}}
    - Competency Scores:
    {{#each situationalJudgementTestReport.competencyAnalysis}}
      {{#each this.competencies}}
      - {{this.name}}: {{this.score}}/10
      {{/each}}
    {{/each}}

    **Analysis Required:**

    Based on a holistic review of BOTH reports, provide the following in the specified JSON format:

    1.  **finalVerdict**: Write a comprehensive, final summary of the candidate. Synthesize their performance from both tests, highlighting how their practical skills (from JDT) and behavioral responses (from SJT) align or conflict.
    2.  **recommendation**: Choose ONE of the following options: "Strong Hire", "Hire", "Hire with Reservations", "No Hire".
    3.  **justification**: Provide a clear rationale for your recommendation. Justify your choice by referencing specific evidence from both the JDT and SJT reports. For example, "The 'Hire with Reservations' recommendation stems from their strong technical skills demonstrated in the JDT, but their poor handling of customer conflict in the SJT raises concerns about client-facing responsibilities."
  `,
});


const generateFinalVerdictFlow = ai.defineFlow(
  {
    name: 'generateFinalVerdictFlow',
    inputSchema: GenerateFinalVerdictInputSchema,
    outputSchema: GenerateFinalVerdictOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error("AI analysis did not return a valid final verdict.");
    }
    return output;
  }
);
