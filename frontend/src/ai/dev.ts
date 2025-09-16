
import { config } from 'dotenv';
config();

import '@/ai/flows/transcribe-audio.ts';
import '@/ai/flows/analyze-conversation.ts';
import '@/ai/flows/generate-follow-up-questions.ts';
import '@/ai/flows/send-interview-report.ts';
import '@/ai/flows/analyze-sjt-response.ts';
import '@/ai/flows/generate-final-verdict.ts';
import '@/ai/flows/translate-text.ts';
// Tools are typically imported by the flows that use them, not directly in dev.ts
// For example, email-tool.ts is imported by send-interview-report.ts

