import { NextRequest, NextResponse } from 'next/server';
import { analyzeConversation, type AnalyzeConversationInput } from '@/ai/flows/analyze-conversation';

export async function POST(request: NextRequest) {
  try {
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
