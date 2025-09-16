import { NextRequest, NextResponse } from 'next/server';
import { translateText } from '@/ai/flows/translate-text';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const result = await translateText(data);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error translating text:', error);
    return NextResponse.json(
      { error: 'Failed to translate text' },
      { status: 500 }
    );
  }
}
