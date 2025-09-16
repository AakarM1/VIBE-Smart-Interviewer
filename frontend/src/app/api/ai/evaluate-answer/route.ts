import { NextRequest, NextResponse } from 'next/server';
import { evaluateAnswerQuality, type EvaluateAnswerQualityInput } from '@/ai/flows/evaluate-answer-quality';

export async function POST(request: NextRequest) {
  try {
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
