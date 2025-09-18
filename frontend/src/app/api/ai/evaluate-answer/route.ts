import { NextRequest, NextResponse } from 'next/server';
// Force Node.js runtime to ensure access to process.env for Genkit API keys
export const runtime = 'nodejs';
import { evaluateAnswerQuality, type EvaluateAnswerQualityInput } from '@/ai/flows/evaluate-answer-quality';

export async function POST(request: NextRequest) {
  try {
    // Safe debug: confirm AI key visibility without printing secrets
    const hasAIKey = Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENAI_API_KEY);
    console.log('🔑 GEMINI/GOOGLE AI key present in server runtime:', hasAIKey);
    if (!hasAIKey) {
      return NextResponse.json(
        { error: 'AI key not configured on server. Set GEMINI_API_KEY or GOOGLE_API_KEY in frontend/.env.local and restart dev server.' },
        { status: 500 }
      );
    }
    console.log('📝 Answer quality evaluation API called');
    const data: EvaluateAnswerQualityInput = await request.json();
    console.log('📊 Evaluating answer quality for scenario:', data.questionNumber);
    
    const result = await evaluateAnswerQuality(data);
    console.log('✅ Answer quality evaluation complete');
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('❌ Error evaluating answer quality:', error);
    return NextResponse.json(
      { error: 'Failed to evaluate answer quality' },
      { status: 500 }
    );
  }
}
