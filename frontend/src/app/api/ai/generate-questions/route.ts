import { NextRequest, NextResponse } from 'next/server';
import { generateInterviewQuestions, type GenerateInterviewQuestionsInput } from '@/ai/flows/generate-follow-up-questions';

export async function POST(request: NextRequest) {
  try {
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
