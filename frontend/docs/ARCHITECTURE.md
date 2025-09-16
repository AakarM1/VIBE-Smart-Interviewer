# Verbal Insights - System Architecture

This document outlines the high-level architecture of the Verbal Insights application, including the data flow, model training loop, and data portability strategy.

## 1. High-Level System Flow

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

## 2. Model Improvement & Feedback Loop

The platform is designed to improve over time by learning from administrator corrections. This is a crucial feature for increasing the accuracy and relevance of the AI's analysis.

**How it Works:**

1.  **Admin Correction:** An administrator reviews a completed interview report. They can edit the qualitative feedback (strengths, weaknesses) and adjust the quantitative competency scores.
2.  **Feedback Submission:** When the admin saves their changes, the frontend sends both the original AI output and the corrected version to a dedicated "feedback" API endpoint.
3.  **Data Curation:** This feedback data (original vs. corrected) is stored in a structured format in a database like Firestore or a data warehouse like BigQuery. This curated dataset becomes the "source of truth" for what a high-quality analysis looks like.
4.  **Fine-Tuning:** Periodically (e.g., monthly), a fine-tuning job is triggered. This job uses the curated dataset of human-corrected examples to train a new version of the base Gemini model.
5.  **Deployment:** The fine-tuned model is deployed as a new endpoint. The Genkit flows are then updated to call this new, more accurate model for future analyses.

This process creates a powerful **flywheel effect**: the more the platform is used and corrected by experts, the smarter and more reliable its AI becomes.

## 3. Data Portability

All data generated and stored by the platform is designed to be portable and accessible, preventing vendor lock-in.

**Strategies:**

*   **Video/Audio Storage:** While currently handled as `data URI`s for simplicity, in a production environment, video/audio files would be uploaded to a cloud storage bucket (like Google Cloud Storage or AWS S3). Files would be stored in standard formats (e.g., `.webm`, `.mp4`, `.mp3`).
*   **Structured Data (JSON):** All transcripts, analysis reports, and competency scores are structured as JSON. The schema for this JSON is well-defined and can be easily exported.
*   **Export Functionality:** An "Export Data" feature can be added to the admin panel to allow for bulk download of all data associated with candidates or time periods.
*   **API Access:** The results API endpoint (e.g., `/api/report/:id`) provides a direct way for other systems to programmatically retrieve assessment data in a standardized JSON format.

This ensures that the valuable data your platform generates can be used for other purposes, such as feeding into other HR systems, long-term analytics platforms, or training different AI models in the future.

## 4. AI Backend Details

The AI backend is powered by **Google's Gemini model** orchestrated through **Genkit AI Flows**. The core functionality revolves around processing candidate audio/video responses to provide valuable insights.

**Genkit AI Flows:**

Genkit flows are designed to handle the multi-step logic required for AI processing. Each flow is a sequence of steps that interact with the Gemini model or other tools to achieve a specific task. The primary Genkit flows in this project are located in the `src/ai/flows/` directory and include:

*   `analyze-conversation.ts`: This flow is responsible for analyzing the transcribed text of a candidate's conversation, considering the context to identify key points, strengths, weaknesses, and other relevant information.
*   `analyze-sjt-response.ts`: This flow is specifically tailored to process and analyze candidate responses to Situational Judgement Tests (SJTs), evaluating their suitability based on predefined criteria.
*   `generate-final-verdict.ts`: This flow takes the results from various analyses (conversation, SJT, etc.) and synthesizes them to generate a comprehensive final verdict or overall assessment of the candidate's performance.
*   `generate-follow-up-questions.ts`: Based on the ongoing conversation and the candidate's responses, this flow dynamically generates relevant and insightful follow-up questions to delve deeper into specific areas.
*   `send-interview-report.ts`: This flow compiles all the gathered information and analysis into a structured interview report and utilizes the email tool to send it to the relevant stakeholders.
*   `transcribe-audio.ts`: This is a fundamental flow that sends the raw audio data from the candidate's responses to the Gemini model for accurate transcription into text.
*   `translate-text.ts`: This flow provides text translation capabilities, which can be used for handling multilingual responses or generating reports in different languages.

**Folders and Files:**

Here's a breakdown of the key folders and files in the project and their roles:

*   `.idx`: Contains development environment configuration files like `dev.nix` and integration settings in `integrations.json`.
*   `.vscode`: Contains configuration files specific to the Visual Studio Code editor, such as `settings.json`.
*   `docs`: This directory holds project documentation.
    *   `ARCHITECTURE.md`: Details the system's architecture, data flow, and AI implementation.
    *   `README.md`: The main introduction and setup guide for the project.
    *   `blueprint.md`: Likely contains a more detailed technical blueprint or design specification.
*   `public`: Contains static assets like images (`logo.jpg`) that are served directly.
*   `src`: The main source code directory.
    *   `ai`: Houses AI-related code.
        *   `dev.ts`: Development-specific AI configurations or scripts.
        *   `genkit.ts`: Core configuration and setup for Genkit.
        *   `flows`: Contains the implementations of the various Genkit AI flows (as described above).
        *   `tools`: Contains implementations of tools used by the AI flows.
            *   `email-tool.ts`: Implements the functionality to send emails.
    *   `app`: Contains the Next.js application's pages and layouts.
        *   `favicon.ico`: The website's favicon.
        *   `globals.css`: Global CSS styles for the application.
        *   `layout.tsx`: The main layout component wrapping the application pages.
        *   `page.tsx`: The root index page of the application.
        *   `admin`: Contains pages for the administrative dashboard.
            *   `page.tsx`: The main admin dashboard landing page.
            *   `jd/page.tsx`: Page for managing job descriptions.
            *   `pdf/page.tsx`: Page for handling PDF reports or data.
            *   `sjt/page.tsx`: Page for managing SJT questions and tests.
            *   `submissions/page.tsx`: Page to view candidate submissions and their results.
            *   `users/page.tsx`: Page for managing user accounts.
            *   `verdict/page.tsx`: Page to review and potentially edit the AI-generated verdicts.
            *   `report/[id]/page.tsx`: Dynamic route to display a specific candidate's interview report.
        *   `api`: Contains Next.js API routes.
            *   `report/route.ts`: The API endpoint for fetching and potentially updating reports.
        *   `interview`: Contains pages related to the candidate interview process.
            *   `page.tsx`: The main interview page.
        *   `login`: Contains the user login page.
            *   `page.tsx`: The login form and logic.
        *   `register`: Contains the user registration page.
            *   `page.tsx`: The registration form and logic.
        *   `sjt`: Contains pages related to the SJT process for candidates.
            *   `page.tsx`: The main SJT test page.
    *   `components`: Contains reusable React components.
        *   `audio-recorder.tsx`: Component for recording audio input from the user.
        *   `conversation-summary.tsx`: Component to display a summary of the interview conversation.
        *   `flashcard.tsx`: A reusable flashcard component.
        *   `header.tsx`: The application's header component.
        *   `logo.jpg`: Logo image used within components.
        *   `interview`: Components specific to the interview pages.
            *   `mode-selector.tsx`: Component to select the interview mode (e.g., practice, timed).
            *   `pre-interview-form.tsx`: Form displayed before the interview starts to gather information.
        *   `sjt`: Components specific to the SJT pages.
            *   `finish-modal.tsx`: Modal displayed upon completion of an SJT.
            *   `instructions-panel.tsx`: Component displaying brief SJT instructions.
            *   `question-card.tsx`: Component to render a single SJT question.
            *   `sjt-header.tsx`: Header component for SJT pages.
            *   `sjt-instructions.tsx`: Component displaying detailed SJT instructions.
            *   `test-header.tsx`: Header for the active SJT test.
            *   `test-intro-screen.tsx`: The introductory screen before an SJT begins.
            *   `timer-bar.tsx`: Component to visually represent the remaining time in a test.
        *   `ui`: Contains generic, reusable UI components (likely from a library like Shadcn UI).
            *   `accordion.tsx`, `alert-dialog.tsx`, `alert.tsx`, `avatar.tsx`, `badge.tsx`, `button.tsx`, `calendar.tsx`, `card.tsx`, `chart.tsx`, `checkbox.tsx`, `dialog.tsx`, `dropdown-menu.tsx`, `form.tsx`, `input.tsx`, `label.tsx`, `menubar.tsx`, `popover.tsx`, `progress.tsx`, `radio-group.tsx`, `scroll-area.tsx`, `select.tsx`, `separator.tsx`, `sheet.tsx`, `sidebar.tsx`, `skeleton.tsx`, `slider.tsx`, `switch.tsx`, `table.tsx`, `tabs.tsx`, `textarea.tsx`, `toast.tsx`, `toaster.tsx`, `tooltip.tsx`: These are standard UI components like buttons, inputs, dialogs, etc.
    *   `contexts`: Contains React context providers for managing global state.
        *   `auth-context.tsx`: Provides authentication context to the application.
    *   `hooks`: Contains custom React hooks for reusable logic.
        *   `use-mobile.tsx`: Custom hook to detect if the user is on a mobile device.
        *   `use-toast.ts`: Custom hook for easily displaying toast notifications.
    *   `lib`: Contains utility functions and helper classes.
        *   `utils.ts`: General utility functions.
    *   `types`: Contains TypeScript type definitions.
        *   `index.ts`: Exports various type definitions used across the project.
    *   `ARCHITECTURE.md`: A duplicate of the architecture document (consider removing one to avoid confusion).
    *   `tailwind.config.ts`: Configuration file for the Tailwind CSS framework.

This detailed breakdown should provide a clear understanding of the project's structure and the role of each component in the Verbal Insights application.
