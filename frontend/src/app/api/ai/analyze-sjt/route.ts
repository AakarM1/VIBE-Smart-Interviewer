import { NextRequest, NextResponse } from 'next/server';
import { analyzeSJTResponse, type AnalyzeSJTResponseInput } from '@/ai/flows/analyze-sjt-response';

export async function POST(request: NextRequest) {
  try {
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
