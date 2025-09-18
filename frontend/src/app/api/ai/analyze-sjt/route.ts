import { NextRequest, NextResponse } from 'next/server';
// Ensure Node.js runtime so process.env is available for Genkit/Gemini keys
export const runtime = 'nodejs';
import { analyzeSJTResponse, type AnalyzeSJTResponseInput } from '@/ai/flows/analyze-sjt-response';

export async function POST(request: NextRequest) {
  try {
    // Safe debug: confirm AI key visibility without printing secrets
    const hasAIKey = Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENAI_API_KEY);
    console.log('🔑 GEMINI/GOOGLE AI key present in server runtime (analyze-sjt):', hasAIKey);
    const data: AnalyzeSJTResponseInput = await request.json();
    const result = await analyzeSJTResponse(data);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error analyzing SJT response:', error);
    return NextResponse.json(
      { error: 'Failed to analyze SJT response' },
      { status: 500 }
    );
  }
}
