import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';

/**
 * Production-ready Text-to-Speech endpoint using Google Cloud Text-to-Speech API.
 * Requires a Google Cloud API key with Text-to-Speech API enabled.
 *
 * Env vars (server-side only):
 * - GOOGLE_TTS_API_KEY (preferred)
 * - fallback: GOOGLE_GENAI_API_KEY or GEMINI_API_KEY (only works if the key has TTS access in your project)
 *
 * Request body JSON:
 * { text: string; languageCode?: string; voiceName?: string; speakingRate?: number; pitch?: number; audioEncoding?: 'MP3'|'OGG_OPUS'|'LINEAR16' }
 *
 * Response JSON:
 * { audioContent: string } where audioContent is a data URI (e.g., data:audio/mp3;base64,...)
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json().catch(() => null);
    if (!body || typeof body.text !== 'string' || !body.text.trim()) {
      return NextResponse.json({ error: 'Invalid input: text is required' }, { status: 400 });
    }

    const text: string = body.text;
  const languageCodeInput: string = body.languageCode || 'en-US';
    // Choose a pleasant neural voice by default per language; can be overridden via body.voiceName
    const defaultVoices: Record<string, string> = {
      'en-US': 'en-US-Neural2-C',
      'en-GB': 'en-GB-Neural2-B',
      'es-ES': 'es-ES-Neural2-B',
      'fr-FR': 'fr-FR-Neural2-D',
      'de-DE': 'de-DE-Neural2-B',
      'pt-PT': 'pt-PT-Neural2-B',
      'hi-IN': 'hi-IN-Neural2-A',
      'ja-JP': 'ja-JP-Neural2-B',
      'ru-RU': 'ru-RU-Neural2-B',
      'ar-XA': 'ar-XA-Wavenet-B'
    };
  const voiceName: string | undefined = body.voiceName || defaultVoices[languageCodeInput] || 'en-US-Neural2-C';
  // Ensure languageCode matches voice locale if voice provided (avoids API mismatch)
  const voiceLocaleMatch = voiceName ? voiceName.match(/^[a-z]{2}-[A-Z]{2}/) : null;
  const languageCode: string = voiceLocaleMatch ? voiceLocaleMatch[0] : (languageCodeInput.length === 2 ? `${languageCodeInput}-US` : languageCodeInput);
    // Confident, natural delivery defaults; can be overridden
    const speakingRate: number | undefined = (typeof body.speakingRate === 'number') ? body.speakingRate : 1.02; // 0.25 to 4.0
    const pitch: number | undefined = (typeof body.pitch === 'number') ? body.pitch : 0.5; // -20.0 to 20.0
    const audioEncoding: string = body.audioEncoding || 'MP3';

    const endpoint = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(key)}`;
    const payload = {
      input: { text },
      voice: {
        languageCode,
        name: voiceName,
      },
      audioConfig: {
        audioEncoding, // 'MP3' | 'OGG_OPUS' | 'LINEAR16'
        speakingRate,
        pitch,
      },
    };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      // Important: do not send API keys to client; this is server-side only
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('TTS API error:', res.status, text);
      return NextResponse.json({ error: `TTS API request failed: ${res.status}` }, { status: 500 });
    }

    const data = await res.json();
    const audioBase64: string | undefined = data?.audioContent;
    if (!audioBase64) {
      return NextResponse.json({ error: 'TTS API returned no audio content' }, { status: 500 });
    }

    // Build data URI for browser playback
    const mime = audioEncoding === 'OGG_OPUS' ? 'audio/ogg' : (audioEncoding === 'LINEAR16' ? 'audio/wav' : 'audio/mp3');
    const audioContent = `data:${mime};base64,${audioBase64}`;
    return NextResponse.json({ audioContent });
  } catch (err) {
    console.error('❌ TTS route error:', err);
    return NextResponse.json({ error: 'Failed to synthesize speech' }, { status: 500 });
  }
}
