# **App Name**: Verbal Insights

## Core Features:

- Audio Input: Live in-browser microphone capture.
- Speech Transcription: Transcribe captured speech via a Python Cloud Function using SpeechRecognition. Uses API_KEY = process.env.GOOGLE_API_KEY
- Question Generation: Generate follow-up questions based on the transcription using the Gemini ChatCompletion API, to use in the conversation. A maximum of 5 questions will be asked. For each question, the replies to the previous question will be sent for context, except for the first question. At the end of 5 questions, all questions and replies will be sent to Gemini AI for analysis and results.
- Flashcard UI: Present questions one at a time in a flashcard-style user interface.
- Conversation History: Store conversation history for context, passed to the AI tool for generating appropriate questions. The API_KEY is: AIzaSyDdNbACt-eseLyvXluj1uKuBQ7zWK47t-o

## Style Guidelines:

- Primary color: Vivid purple (#9D4EDD) to convey intellect and focus.
- Background color: Light gray (#E9ECEF) for a clean, unobtrusive backdrop.
- Accent color: Soft pink (#F589D0) for highlighting important elements like the active question.
- Headline font: 'Space Grotesk' (sans-serif) for a tech-forward feel; Body font: 'Inter' (sans-serif).
- Code font: 'Source Code Pro' (monospace) for displaying configuration details, if necessary.
- Use minimalist, line-based icons for a clean and modern aesthetic.
- Emphasize a clean, single-column layout for easy readability and focus on the conversation.
- Subtle fade-in/fade-out animations when transitioning between questions to maintain user engagement without distraction.