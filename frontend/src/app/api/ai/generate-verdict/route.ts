import { NextRequest, NextResponse } from 'next/server';
import { generateFinalVerdict, type GenerateFinalVerdictOutput } from '@/ai/flows/generate-final-verdict';

export async function POST(request: NextRequest) {
  try {
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
