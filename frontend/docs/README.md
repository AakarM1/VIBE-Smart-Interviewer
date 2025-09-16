# Verbal Insights - AI-Powered Interview Platform

Verbal Insights is a modern, AI-driven platform designed to automate and enhance the candidate screening process. It uses generative AI to conduct structured interviews, analyze responses, and provide detailed, actionable reports for hiring managers. This application is built with Next.js, Genkit, and ShadCN UI.

## Table of Contents

- [System Architecture](#system-architecture)
- [Prerequisites](#prerequisites)
- [Setup and Installation](#setup-and-installation)
- [Running the Application](#running-the-application)
- [How to Use the Application](#how-to-use-the-application)
- [Building for Production](#building-for-production)
- [Key Technologies](#key-technologies)

## System Architecture

The application is architected with a separation of concerns between the frontend user interface and the backend AI processing.

-   **Frontend**: A Next.js/React application handles all user interactions, from admin configuration to the candidate interview experience.
-   **Backend AI**: [Genkit](https://firebase.google.com/docs/genkit) flows, running as server-side functions within Next.js, manage all AI-related tasks, including audio transcription, response analysis, and report generation.
-   **Data Storage**: For this prototype, all user data, configurations, and submissions are stored in the browser's `localStorage`. This simplifies setup and removes the need for a dedicated database.

For a more detailed breakdown of the system's logic and data flow, please refer to the `ARCHITECTURE.md` file.

## Prerequisites

Before you begin, ensure you have the following installed on your system:

-   **Node.js**: Version 18.x or later.
-   **npm** (or yarn/pnpm): The package manager for Node.js.
-   **Firebase CLI**: To work with Firebase services. Install it globally: `npm install -g firebase-tools`.
-   **Genkit CLI**: To run and manage Genkit flows. Install it globally: `npm install -g genkit`.

## Setup and Installation

Follow these steps to get the project running on your local machine.

### 1. Clone the Repository

Clone this repository to your local machine using Git.

```bash
git clone <repository-url>
cd <project-directory>
```

### 2. Configure Environment Variables

The application uses Google's Gemini models for its AI capabilities. You need to provide an API key for these services.

-   Create a new file named `.env` in the root of the project.
-   Add your Google AI API key to this file:

```env
# Get your API key from Google AI Studio: https://aistudio.google.com/app/apikey
GEMINI_API_KEY="your_google_ai_api_key_here"
```

### 3. Install Dependencies

Install all the required npm packages using the following command:

```bash
npm install
```

This will download all dependencies listed in `package.json`, including Next.js, React, Genkit, and all UI components.

## Running the Application

For local development, you need to run two processes simultaneously: the Next.js web server and the Genkit development server for the AI flows.

### 1. Run the Genkit AI Flows

In a new terminal window, start the Genkit development server. This will make your AI flows available for the Next.js application to call.

```bash
npm run genkit:watch
```

This command uses `tsx` to watch for changes in your AI flow files and automatically restarts the server.

### 2. Run the Next.js Frontend

In another terminal window, start the Next.js development server:

```bash
npm run dev
```

This will launch the main application. You can now access it in your browser at `http://localhost:3000`.

## How to Use the Application

### Admin Experience

1.  **Login as Admin**: Navigate to `http://localhost:3000/login` and use the default admin credentials:
    -   **Email**: `admin@gmail.com`
    -   **Password**: `admin@123`
2.  **Configure Assessments**: From the Admin Dashboard, you can:
    -   **Global Settings**: Set the `Reply Mode` (video, audio, or text), enable/disable assessments, and set report visibility for candidates.
    -   **JDT Config**: Define roles, paste job descriptions, and write custom interview questions with AI analysis guidance.
    -   **SJT Config**: Create situational scenarios with best/worst response rationales.
    -   **User Management**: Create new candidate accounts.

### Candidate Experience

1.  **Login as Candidate**: Use the default candidate credentials or one you created:
    -   **Email**: `p1@gmail.com`
    -   **Password**: `p1@123`
2.  **Select an Assessment**: On the main dashboard, the candidate will see cards for the assessments that have been enabled and configured by the admin.
3.  **Take the Test**: The candidate follows the on-screen instructions to record or type their answers for each question.
4.  **View Results**: Upon completion, if the "Show Report" setting is enabled, the candidate will receive a detailed analysis of their performance.

## Building for Production

To build and run the application in a production environment, follow these steps.

1.  **Build the Application**: This command compiles and optimizes the Next.js application for production.

    ```bash
    npm run build
    ```

2.  **Start the Production Server**: This starts the server to serve the built application.

    ```bash
    npm start
    ```

The application will be available at `http://localhost:3000`.

## Key Technologies

-   **Next.js**: React framework for building the user interface.
-   **Genkit**: Firebase's toolkit for building production-ready AI-powered features.
-   **ShadCN UI**: A collection of reusable UI components.
-   **Tailwind CSS**: A utility-first CSS framework for styling.
-   **TypeScript**: For static typing and improved code quality.
