import { NextRequest, NextResponse } from 'next/server';
// Ensure Node.js runtime for Genkit env access
export const runtime = 'nodejs';
import { translateText } from '@/ai/flows/translate-text';

export async function POST(request: NextRequest) {
  try {
    const hasAIKey = Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENAI_API_KEY);
    console.log('🔑 GEMINI/GOOGLE AI key present in server runtime (translate):', hasAIKey);
    if (!hasAIKey) {
      return NextResponse.json(
        { error: 'AI key not configured on server. Set GEMINI_API_KEY or GOOGLE_API_KEY in frontend/.env.local and restart dev server.' },
        { status: 500 }
      );
    }
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
