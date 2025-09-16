
'use server';
/**
 * @fileOverview A Genkit flow to format and "send" an interview report via email.
 * This flow uses a tool that simulates email sending.
 *
 * - sendInterviewReport - A function that prepares and sends the report.
 * - SendInterviewReportInput - The input type for the sendInterviewReport function.
 * - SendInterviewReportOutput - The return type for the sendInterviewReport function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { sendEmailTool } from '@/ai/tools/email-tool'; // Import the tool

const SendInterviewReportInputSchema = z.object({
  candidateName: z.string().describe("The candidate's full name."),
  roleCategory: z.string().describe("The role category the candidate applied for."),
  report: z.object({
    strengths: z.string(),
    weaknesses: z.string(),
    summary: z.string(),
  }).describe("The structured analysis report of the interview."),
  recipientEmail: z.string().email().describe("The email address to send the report to."),
});
export type SendInterviewReportInput = z.infer<typeof SendInterviewReportInputSchema>;

const SendInterviewReportOutputSchema = z.object({
  statusMessage: z.string().describe("A message indicating the status of the email sending attempt."),
  emailSent: z.boolean().describe("Indicates if the email was successfully processed by the tool."),
});
export type SendInterviewReportOutput = z.infer<typeof SendInterviewReportOutputSchema>;

export async function sendInterviewReport(input: SendInterviewReportInput): Promise<SendInterviewReportOutput> {
  return sendInterviewReportFlow(input);
}

const sendInterviewReportFlow = ai.defineFlow(
  {
    name: 'sendInterviewReportFlow',
    inputSchema: SendInterviewReportInputSchema,
    outputSchema: SendInterviewReportOutputSchema,
  },
  async (input: SendInterviewReportInput): Promise<SendInterviewReportOutput> => {
    const subject = `Interview Analysis: ${input.candidateName} - ${input.roleCategory} Role`;
    
    const body = `
      <h1>Interview Analysis Report</h1>
      <p><strong>Candidate:</strong> ${input.candidateName}</p>
      <p><strong>Role Category:</strong> ${input.roleCategory}</p>
      <hr>
      <h2>Strengths:</h2>
      <p style="white-space: pre-wrap;">${input.report.strengths}</p>
      <h2>Weaknesses:</h2>
      <p style="white-space: pre-wrap;">${input.report.weaknesses}</p>
      <h2>Overall Summary:</h2>
      <p style="white-space: pre-wrap;">${input.report.summary}</p>
      <hr>
      <p><em>This is an auto-generated report from Verbal Insights by Trajectorie.</em></p>
    `;

    try {
      const emailResult = await sendEmailTool({
        to: input.recipientEmail,
        subject: subject,
        body: body,
      });

      return {
        statusMessage: emailResult.message,
        emailSent: emailResult.success,
      };
    } catch (error: any) {
      console.error("Error in sendInterviewReportFlow calling sendEmailTool:", error);
      return {
        statusMessage: `Failed to process email sending: ${error.message || 'Unknown error'}`,
        emailSent: false,
      };
    }
  }
);
