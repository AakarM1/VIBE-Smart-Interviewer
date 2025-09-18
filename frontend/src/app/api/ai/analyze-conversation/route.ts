import { NextRequest, NextResponse } from 'next/server';
// Ensure Node.js runtime for Genkit env access
export const runtime = 'nodejs';
import { analyzeConversation, type AnalyzeConversationInput } from '@/ai/flows/analyze-conversation';

export async function POST(request: NextRequest) {
  try {
    const hasAIKey = Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENAI_API_KEY);
    console.log('🔑 GEMINI/GOOGLE AI key present in server runtime (analyze-conversation):', hasAIKey);
    const data: AnalyzeConversationInput = await request.json();
    const result = await analyzeConversation(data);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error analyzing conversation:', error);
    return NextResponse.json(
      { error: 'Failed to analyze conversation' },
      { status: 500 }
    );
  }
}
