import { NextRequest, NextResponse } from 'next/server';
// Ensure Node.js runtime for Genkit env access
export const runtime = 'nodejs';
import { generateInterviewQuestions, type GenerateInterviewQuestionsInput } from '@/ai/flows/generate-follow-up-questions';

export async function POST(request: NextRequest) {
  try {
    const hasAIKey = Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENAI_API_KEY);
    console.log('🔑 GEMINI/GOOGLE AI key present in server runtime (generate-questions):', hasAIKey);
    const data: GenerateInterviewQuestionsInput = await request.json();
    const result = await generateInterviewQuestions(data);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error generating interview questions:', error);
    return NextResponse.json(
      { error: 'Failed to generate interview questions' },
      { status: 500 }
    );
  }
}
