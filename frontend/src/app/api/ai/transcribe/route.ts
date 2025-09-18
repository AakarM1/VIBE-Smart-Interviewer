import { NextRequest, NextResponse } from 'next/server';
// Ensure Node.js runtime so process.env is available for Genkit/Gemini keys
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import { transcribeAudio } from '@/ai/flows/transcribe-audio';

export async function POST(request: NextRequest) {
  try {
    // Safe debug: confirm AI key visibility without printing secrets
    const hasAIKey = Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENAI_API_KEY);
    console.log('🔑 GEMINI/GOOGLE AI key present in server runtime (transcribe):', hasAIKey);
    if (!hasAIKey) {
      console.error('Missing GEMINI/GOOGLE AI API key in server environment');
      return NextResponse.json({ error: 'AI key not configured on server' }, { status: 500 });
    }

    let audioDataUri: string | null = null;

    // Try multipart/form-data first (preferred for large payloads)
    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData();
      const file = form.get('file') as File | null || (form.get('audio') as File | null);
      if (!file) {
        return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
      }
      const arrayBuf = await file.arrayBuffer();
      const base64 = Buffer.from(arrayBuf).toString('base64');
      const mime = file.type || 'audio/webm';
      audioDataUri = `data:${mime};base64,${base64}`;
    } else {
      // Fallback to JSON body with data URI
      const data = await request.json().catch(() => null);
      if (data && typeof data.audioDataUri === 'string' && data.audioDataUri.startsWith('data:')) {
        audioDataUri = data.audioDataUri;
      } else {
        return NextResponse.json({ error: 'Invalid input: expected audioDataUri data URI or multipart file' }, { status: 400 });
      }
    }

  const result = await transcribeAudio({ audioDataUri: audioDataUri as string });
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('❌ Error transcribing audio:', error);
    const message = typeof error?.message === 'string' ? error.message : 'Failed to transcribe audio';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
