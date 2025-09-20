import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';

/**
 * Lists available Google Cloud Text-to-Speech voices for exploration.
 * Requires GOOGLE_TTS_API_KEY (or compatible) on the server.
 * GET /api/tts/voices?languageCode=en-US (optional languageCode filter)
 */
export async function GET(request: NextRequest) {
  try {
    const key = process.env.GOOGLE_TTS_API_KEY
      || process.env.GOOGLE_GENAI_API_KEY
      || process.env.GEMINI_API_KEY
      || process.env.GOOGLE_API_KEY;

    if (!key) {
      return NextResponse.json(
        { error: 'Text-to-Speech not configured. Set GOOGLE_TTS_API_KEY in frontend/.env.local and enable the Cloud Text-to-Speech API.' },
        { status: 501 }
      );
    }

    const { searchParams } = new URL(request.url);
    const languageCode = searchParams.get('languageCode') || undefined;

    const endpoint = `https://texttospeech.googleapis.com/v1/voices?key=${encodeURIComponent(key)}`;
    const res = await fetch(endpoint, { method: 'GET' });
    if (!res.ok) {
      const text = await res.text();
      console.error('List voices error:', res.status, text);
      return NextResponse.json({ error: `Voices list failed: ${res.status}` }, { status: 500 });
    }
    const data = await res.json();
    let voices = data?.voices || [];
    if (languageCode) {
      voices = voices.filter((v: any) => Array.isArray(v.languageCodes) && v.languageCodes.includes(languageCode));
    }

    // Normalize a compact shape for UI display
    const mapped = voices.map((v: any) => ({
      name: v.name,
      languageCodes: v.languageCodes,
      ssmlGender: v.ssmlGender,
      naturalSampleRateHertz: v.naturalSampleRateHertz,
    }));
    return NextResponse.json({ voices: mapped });
  } catch (err) {
    console.error('❌ TTS voices route error:', err);
    return NextResponse.json({ error: 'Failed to fetch voices' }, { status: 500 });
  }
}
