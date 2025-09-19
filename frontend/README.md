# Frontend

## Local Environment Variables

This app uses Genkit with Google AI (Gemini). Genkit reads the API key from the server runtime environment. Create a `.env.local` in the `frontend/` folder:

1. Copy the example file:

   - `.env.local.example` → `.env.local`

2. Set your key:

   - `GEMINI_API_KEY=your_google_ai_api_key`
   - Alternatively: `GOOGLE_API_KEY=your_google_ai_api_key`

3. Ensure the Next.js API route uses the Node.js runtime (already set in `src/app/api/ai/evaluate-answer/route.ts`).

### Windows PowerShell quick setup

In PowerShell (from the `frontend` directory):

```
Copy-Item .env.local.example .env.local -Force
# Edit .env.local and paste your actual GEMINI_API_KEY value
npm run dev
```

Next.js automatically loads `.env.local` for server-side code, so Genkit can read `process.env.GEMINI_API_KEY`.

### Text-to-Speech (TTS)

SJT can optionally read questions aloud. The browser uses Web Speech API voices when available.

- For cross-browser consistency or server-side TTS, we include a production-ready Google Cloud Text-to-Speech handler at `src/app/api/tts/route.ts`.
   - Enable the Text-to-Speech API in your Google Cloud project.
   - Set `GOOGLE_TTS_API_KEY` in `frontend/.env.local` (server-only). Alternatively, `GOOGLE_GENAI_API_KEY`/`GEMINI_API_KEY` will be used if present and authorized for TTS.
   - Then enable TTS in Admin → SJT → Test Settings.

If server TTS is not configured or fails, the client automatically falls back to browser TTS.

## Backend API URL

Set `NEXT_PUBLIC_API_URL` in `.env.local` to your FastAPI base URL (default `http://127.0.0.1:8000`). This value is used by the frontend to call the API.

## SJT Advanced Settings

Admin → SJT → Test Settings now includes:

- `Prep Time (seconds)`: Countdown before auto-record starts.
- `Auto-start Recording after Prep`: Start recording automatically after prep.
- `Answer Time (seconds)`: Auto-stop recording and auto-submit on timeout.
- `Re-record Limit`: Limit how many times a candidate can re-record (0 = unlimited).
- `Enable Text-to-Speech` and `TTS Voice Hint`: Reads the question via browser TTS; the voice hint is best-effort.

These settings are saved in the SJT config and used by the candidate player on `/sjt`.
