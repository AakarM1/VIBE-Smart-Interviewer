



export interface Competency {
  name: string;
  score: number; // Score out of 10 (post-penalty for backward compatibility)
  prePenaltyScore?: number; // Pre-penalty score for SJT assessments
  postPenaltyScore?: number; // Post-penalty score for SJT assessments
  strengthSummary?: string; // 2-3 line summary of strengths for this competency
  weaknessSummary?: string; // 2-3 line summary of weaknesses for this competency
}

export interface MetaCompetency {
  name: string;
  competencies: Competency[];
}

export interface QuestionwiseDetail {
  questionNumber: number;
  question: string;
  candidateAnswer: string;
  competency: string;
  prePenaltyScore: number;
  postPenaltyScore: number;
  penaltyApplied: number;
  hasFollowUp: boolean;
  rationale: string;
  followUpQuestions?: string[];
  followUpAnswers?: string[];
}

export interface ConversationEntry {
  question: string;
  answer: string | null;
  videoDataUri?: string; // Can be video/audio data URI or Firebase Storage URL
  translatedAnswer?: string; // For future translation feature
  preferredAnswer?: string;
  competency?: string;
  _isStorageUrl?: boolean; // Flag to indicate if videoDataUri is a Firebase Storage URL
  // Multilingual support
  languageCode?: string; // ISO 639-1 code for this conversation entry
  answerNative?: string; // User's original answer in their language
  answerEn?: string; // English translation for AI processing
  questionTranslated?: string; // Question translated to user's language
  // SJT specific fields
  situation?: string;
  bestResponseRationale?: string;
  worstResponseRationale?: string;
  assessedCompetency?: string;
  // Follow-up tracking
  followUpGenerated?: boolean; // Flag to indicate if follow-up questions were generated for this scenario
}

export type AppStatus = 'INITIAL' | 'ASKING' | 'ANALYZING' | 'RESULTS' | 'ERROR';

export type InterviewMode = 'video' | 'audio' | 'text';

export interface PreInterviewDetails {
  name: string;
  roleCategory: string;
  language: string;
}

export interface AnalysisResult {
  strengths: string;
  weaknesses: string;
  summary: string;
  competencyAnalysis: MetaCompetency[];
  // New chunked analysis sections
  scoresSummary?: {
    overallPerformance: string;
    competencyScores: Competency[];
    penaltySummary: string;
  };
  competencyQualitativeSummary?: Competency[]; // Individual competency summaries
  questionwiseDetails?: QuestionwiseDetail[]; // Detailed question-wise breakdown
}

export interface SJTQuestion {
  id: number;
  text: string;
  options: {
    id: string;
    text: string;
  }[];
}

export interface Submission {
    id: string;
    candidateName: string;
    testType: 'JDT' | 'SJT';
    date: string;
    report: AnalysisResult;
    history: ConversationEntry[];
    candidateId?: string; // Track which user made this submission
    // Multilingual support
    candidateLanguage?: string; // ISO 639-1 code of candidate's chosen language
    uiLanguage?: string; // Language used for UI during test (may differ from answers)
}

    