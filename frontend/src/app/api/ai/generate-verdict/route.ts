import { NextRequest, NextResponse } from 'next/server';
// Ensure Node.js runtime for Genkit env access
export const runtime = 'nodejs';
import { generateFinalVerdict, type GenerateFinalVerdictOutput } from '@/ai/flows/generate-final-verdict';

export async function POST(request: NextRequest) {
  try {
    const hasAIKey = Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENAI_API_KEY);
    console.log('🔑 GEMINI/GOOGLE AI key present in server runtime (generate-verdict):', hasAIKey);
    const data = await request.json();
    const result = await generateFinalVerdict(data);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error generating final verdict:', error);
    return NextResponse.json(
      { error: 'Failed to generate final verdict' },
      { status: 500 }
    );
  }
}
