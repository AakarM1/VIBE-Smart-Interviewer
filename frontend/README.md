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

## Backend API URL

Set `NEXT_PUBLIC_API_URL` in `.env.local` to your FastAPI base URL (default `http://127.0.0.1:8000`). This value is used by the frontend to call the API.
