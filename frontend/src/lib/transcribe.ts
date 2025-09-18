export type TranscribeRequest =
  | { audioDataUri: string; blob?: undefined }
  | { audioDataUri?: undefined; blob: Blob };

export type TranscribeResponse = {
  transcription: string;
};

export async function transcribeViaServer(input: TranscribeRequest): Promise<TranscribeResponse> {
  let res: Response;
  if ('blob' in input && input.blob instanceof Blob) {
    const form = new FormData();
    form.append('file', input.blob, 'audio.webm');
    res = await fetch('/api/ai/transcribe', {
      method: 'POST',
      body: form,
    });
  } else if ('audioDataUri' in input && typeof input.audioDataUri === 'string') {
    res = await fetch('/api/ai/transcribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
  } else {
    throw new Error('Invalid transcription input');
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Transcription failed: ${res.status} ${text}`);
  }
  return res.json();
}
