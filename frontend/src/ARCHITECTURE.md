# Verbal Insights - System Architecture & Logic

This document provides a comprehensive overview of the Verbal Insights application, detailing its architecture, data flow, project structure, and core logic. It is intended for knowledge transfer to developers and system architects.

## 1. Core Philosophy

The application is designed as a headless, AI-driven assessment platform. The frontend (Next.js/React) is responsible for user interaction and media capture, while the backend (Genkit AI flows) handles all heavy lifting related to transcription, analysis, and scoring. This separation of concerns allows for independent scaling and development of the UI and the AI engine.

---

## 2. High-Level System Flow

The application follows a modern web architecture, separating the user interface from the backend AI processing.

```mermaid
flowchart TD
    subgraph "User's Browser"
        A[Candidate Starts Interview] --> B{Frontend (Next.js/React)};
        B --> C[Records Audio/Video];
        C --> D{Encode to Data URI};
        D --> E[Send to Backend];
        E --> I[Display Results];
    end

    subgraph "Firebase/Google Cloud Backend"
        E --> F[API Route (Next.js)];
        F --> G[Genkit AI Flow];
        G --> H{Gemini Model (Transcription & Analysis)};
        H --> G;
        G --> F;
        F --> I;
    end

    subgraph "Admin Experience"
        J[Admin Logs In] --> K{Admin Dashboard};
        K --> L[View Candidate Results];
        L --> M{Edit/Correct AI Analysis};
        M --> N[Submit Feedback];
        N --> O[Feedback API];
        O --> P[Store Corrections in Firestore/BigQuery];
    end

    subgraph "Model Improvement Loop"
        P --> Q[Periodically Trigger Fine-Tuning Job];
        Q --> R[Train a New Custom Model Version];
        R --> S{Deploy New Model Endpoint};
        S --> H;
    end

    style A fill:#D6EAF8
    style I fill:#D6EAF8
    style J fill:#D5F5E3
```

**Flow Description:**

1.  **User Interaction:** The candidate interacts with the frontend application built with Next.js and React. They record their answers, which are encoded into a `data URI` string directly in the browser.
2.  **Backend Processing:** The `data URI` is sent to a Next.js API route. This route invokes a **Genkit AI Flow**.
3.  **AI Analysis:** The Genkit flow handles the multi-step AI logic. It first sends the audio data to the **Gemini model** for transcription. Then, it uses the transcript and the conversation context to perform analysis, generate follow-up questions, or score competencies.
4.  **Results:** The structured JSON output from the AI flow is returned to the frontend and displayed to the user in a formatted report.

---

## 3. Project Structure and File Breakdown

The project is organized into logical directories, primarily within the `/src` folder.

```
/
├── public/
│   └── logo.png              # Static assets like the company logo.
├── src/
│   ├── app/                  # Next.js App Router: Contains all pages and layouts.
│   │   ├── admin/            # Admin-only pages for configuration and reporting.
│   │   │   ├── jd/page.tsx     # Configuration for Job Description Based (JDB) tests.
│   │   │   ├── sjt/page.tsx    # Configuration for Situational Judgement Tests (SJT).
│   │   │   ├── submissions/  # Page to view and manage all candidate submissions.
│   │   │   ├── users/        # Page for user creation and management.
│   │   │   └── page.tsx      # The main admin dashboard.
│   │   ├── interview/page.tsx  # The page where candidates take the JDB interview.
│   │   ├── sjt/page.tsx        # The page for the SJT interview.
│   │   ├── login/page.tsx      # User login page.
│   │   └── page.tsx          # The main candidate dashboard/assessment selection page.
│   │
│   ├── ai/                   # All Genkit AI-related code.
│   │   ├── flows/            # Contains all the core AI logic flows.
│   │   │   ├── transcribe-audio.ts # Flow to convert audio data to text.
│   │   │   ├── generate-follow-up-questions.ts # Flow to create AI-based questions.
│   │   │   ├── analyze-conversation.ts # Analyzes a full JDB interview transcript.
│   │   │   ├── analyze-sjt-response.ts # Analyzes a single SJT response.
│   │   │   └── ...and other flows.
│   │   └── genkit.ts         # Initialization and configuration of the Genkit AI object.
│   │
│   ├── components/           # Reusable React components.
│   │   ├── ui/               # Auto-generated ShadCN UI components (Button, Card, etc.).
│   │   ├── audio-recorder.tsx  # Component for capturing microphone/camera input.
│   │   ├── flashcard.tsx       # The main UI for displaying questions and capturing answers.
│   │   └── conversation-summary.tsx # Component to display the final analysis report.
│   │
│   ├── contexts/             # React Context for global state management.
│   │   └── auth-context.tsx    # Manages user session, auth, and submission storage.
│   │
│   ├── hooks/                # Custom React hooks.
│   │   └── use-toast.ts        # Hook for displaying notifications.
│   │
│   └── types/                # TypeScript type definitions.
│       └── index.ts          # Defines all major data structures (User, Submission, etc.).
│
├── package.json              # Project dependencies and scripts.
└── tailwind.config.ts        # Tailwind CSS configuration.
```

---

## 4. Detailed Logic and Data Flow

This section details the end-to-end process of the application.

### Phase 1: Admin Configuration

This entire phase happens in the `/src/app/admin/**` routes. For this prototype, all configuration data is stored in the browser's **`localStorage`**.

1.  **Global Settings (`/admin/page.tsx`):**
    *   The admin configures platform-wide settings like the **Reply Mode** (video, audio, text), **Available Languages**, and which assessments (**JDT/SJT**) are enabled globally.
    *   This data is saved to a `global-settings` object in `localStorage`.

2.  **JDT Configuration (`/admin/jd/page.tsx`):**
    *   The admin defines one or more "Roles". For each role, they provide a name, a full job description, and a list of interview questions.
    *   For each question, they also provide "Preferred Answer Characteristics" and the "Competency" it assesses. This information is crucial for guiding the AI's analysis.
    *   The admin also sets the number of manual and AI-generated questions to use, and a time limit.
    *   All this data is saved to a `jdt-config` object in `localStorage`.

3.  **SJT Configuration (`/admin/sjt/page.tsx`):**
    *   The admin defines one or more "Scenarios". Each scenario consists of a `situation`, a `question`, and critically, the `bestResponseRationale` and `worstResponseRationale`.
    *   This rationale is the primary input for the AI to score the candidate's response.
    *   This is saved to an `sjt-config` object in `localStorage`.

### Phase 2: Candidate Experience

1.  **Authentication (`/login` & `auth-context.tsx`):**
    *   The candidate logs in. The `auth-context` handles the session, storing the logged-in user's details in `sessionStorage` or `localStorage`.

2.  **Assessment Selection (`/page.tsx`):**
    *   The main candidate dashboard checks `localStorage` for the global settings and the user's specific permissions.
    *   It only displays cards for assessments that are both **globally enabled** AND **configured** (i.e., `jdt-config` or `sjt-config` exists). This ensures candidates don't see broken or unavailable tests.

3.  **Taking the Interview (`/interview` or `/sjt`):**
    *   The respective page loads the relevant configuration from `localStorage`.
    *   The **`Flashcard` component (`/components/flashcard.tsx`)** is the core UI. It displays one question at a time.
    *   The **`MediaCapture` component (`/components/audio-recorder.tsx`)** handles the recording logic based on the configured reply mode.
    *   When the candidate records an answer, the `MediaCapture` component returns a `data URI`.

### Phase 3: AI Backend Analysis

This is where the Genkit flows from `/src/ai/flows/` are invoked. These are server-side functions that run in the Next.js backend environment.

1.  **Transcription:**
    *   The `data URI` from the recording is sent to the `transcribeAudio` flow.
    *   **File:** `src/ai/flows/transcribe-audio.ts`
    *   **Logic:** This flow uses a simple prompt with a `{{media url=...}}` Handlebars helper to pass the audio data to the Gemini model, which is instructed to return only the raw text transcription.

2.  **Analysis (JDT):**
    *   After the interview is finished, the entire conversation history (all questions, answers, and the admin-provided guidance) is compiled.
    *   **File:** `src/ai/flows/analyze-conversation.ts`
    *   **Logic:** This flow receives the full context. The prompt instructs the AI to act as a hiring analyst. It iterates through each question-answer pair and evaluates the answer against the `preferredAnswer` guidance provided by the admin. It then generates a qualitative report (strengths, weaknesses, summary) and quantitative competency scores, returning it all as a structured JSON object.

3.  **Analysis (SJT):**
    *   After each SJT question, the candidate's answer is processed individually.
    *   **File:** `src/ai/flows/analyze-sjt-response.ts`
    *   **Logic:** This flow receives the situation, the question, the candidate's answer, and the admin-provided `bestResponseRationale` and `worstResponseRationale`. The AI's task is to compare the candidate's answer to these two rationales and produce a score from 0 to 10. This process is repeated for each scenario.

### Phase 4: Results and Storage

1.  **Displaying the Report:**
    *   The structured JSON from the analysis flow is passed to the **`ConversationSummary` component (`/components/conversation-summary.tsx`)**.
    *   This component uses the data to render charts for competency scores, display the qualitative feedback, and show the full conversation transcript.

2.  **Saving Submissions:**
    *   The final report and the entire conversation history (including media `data URI`s) are saved as a single `Submission` object.
    *   **File:** `src/contexts/auth-context.tsx`
    *   **Logic:** The `saveSubmission` function in the auth context adds the new submission to an array in `localStorage` under the `verbal-insights-submissions` key. This allows admins to later view all historical submissions.

---

## 5. Model Improvement & Feedback Loop

The platform is designed to improve over time by learning from administrator corrections. This is a crucial feature for increasing the accuracy and relevance of the AI's analysis.

**How it Works:**

1.  **Admin Correction:** An administrator reviews a completed interview report. They can edit the qualitative feedback (strengths, weaknesses) and adjust the quantitative competency scores.
2.  **Feedback Submission:** When the admin saves their changes, the frontend sends both the original AI output and the corrected version to a dedicated "feedback" API endpoint.
3.  **Data Curation:** This feedback data (original vs. corrected) is stored in a structured format in a database like Firestore or a data warehouse like BigQuery. This curated dataset becomes the "source of truth" for what a high-quality analysis looks like.
4.  **Fine-Tuning:** Periodically (e.g., monthly), a fine-tuning job is triggered. This job uses the curated dataset of human-corrected examples to train a new version of the base Gemini model.
5.  **Deployment:** The fine-tuned model is deployed as a new endpoint. The Genkit flows are then updated to call this new, more accurate model for future analyses.

This process creates a powerful **flywheel effect**: the more the platform is used and corrected by experts, the smarter and more reliable its AI becomes.

---

## 6. Data Portability

All data generated and stored by the platform is designed to be portable and accessible, preventing vendor lock-in.

*   **Video/Audio Storage:** Currently handled as `data URI`s for simplicity. In a production environment, video/audio files would be uploaded to a cloud storage bucket (like Google Cloud Storage or AWS S3). Files would be stored in standard formats (e.g., `.webm`, `.mp4`, `.mp3`).
*   **Structured Data (JSON):** All transcripts, analysis reports, and competency scores are structured as JSON. The schema for this JSON is well-defined in `/src/types/index.ts`.
*   **Export Functionality:** The "Download Center" on the admin submissions page (`/admin/submissions`) allows for bulk download of all data (media + text reports) associated with selected candidates into a ZIP file.
*   **API Access:** The results API endpoint (`/api/report/route.ts`) provides a direct way for other systems to programmatically retrieve assessment data in a standardized JSON format.
