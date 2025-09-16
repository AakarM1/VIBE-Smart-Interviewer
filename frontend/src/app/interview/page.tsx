
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ProtectedRoute, useAuth } from '@/contexts/auth-context';
import { useLanguage } from '@/contexts/language-context';
import type { ConversationEntry, AnalysisResult, PreInterviewDetails, InterviewMode, Submission } from '@/types';
import type { AnalyzeConversationInput } from '@/ai/flows/analyze-conversation';
import type { GenerateInterviewQuestionsInput } from '@/ai/flows/generate-follow-up-questions';
import Flashcard from '@/components/flashcard';
import ConversationSummary from '@/components/conversation-summary';
import { Loader2, PartyPopper } from 'lucide-react';
import Header from '@/components/header';
import { PreInterviewForm } from '@/components/interview/pre-interview-form';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { configurationService } from '@/lib/config-service';
import { useTranslation } from 'react-i18next';
// 🔒 MINIMAL IMPACT IMPORTS - New progressive functionality
import { ProgressiveProvider, useProgressive } from '@/contexts/progressive-context';
import { SessionRecoveryModal } from '@/components/session-recovery-modal';
import { featureFlags } from '@/lib/feature-flags';
import type { SessionRecovery } from '@/types/partial-submission';

const GLOBAL_SETTINGS_KEY = 'global-settings';


function VerbalInterviewPage() {
  const { user, saveSubmission, canUserTakeTest, getSubmissions } = useAuth();
  const { currentLanguage, translate, isMultilingualEnabled } = useLanguage();
  const { toast } = useToast();
  const router = useRouter();
  const { t } = useTranslation();
  
  // 🔒 MINIMAL IMPACT PROGRESSIVE HOOKS - Only used if feature enabled
  const progressive = useProgressive();

  const [status, setStatus] = useState<'PRE_INTERVIEW' | 'INTERVIEW' | 'RESULTS' | 'UPLOADING' | 'COMPLETED'>('PRE_INTERVIEW');
  const [interviewMode, setInterviewMode] = useState<InterviewMode>('video');
  const [preInterviewDetails, setPreInterviewDetails] = useState<PreInterviewDetails | null>(null);
  const [conversationHistory, setConversationHistory] = useState<ConversationEntry[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSavingAnswer, setIsSavingAnswer] = useState(false);
  const [jobDescription, setJobDescription] = useState('');
  const [timeLimit, setTimeLimit] = useState(0); // in minutes
  const [showReport, setShowReport] = useState(true);
  const [questionTimes, setQuestionTimes] = useState<number[]>([]); // Track time per question
  const [canTakeTest, setCanTakeTest] = useState(true);
  const [checkingAttempts, setCheckingAttempts] = useState(true);
  
  // 🔒 MINIMAL IMPACT RECOVERY STATE - Only used if feature enabled
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [recoveryData, setRecoveryData] = useState<SessionRecovery | null>(null);
  
  const MAX_ATTEMPTS = 1;

  // Check if user can take the test
  useEffect(() => {
    const checkAttempts = async () => {
      try {
        const canTake = await canUserTakeTest('JDT', MAX_ATTEMPTS);
        setCanTakeTest(canTake);
        if (!canTake) {
          toast({
            variant: 'destructive',
            title: 'Maximum Attempts Reached',
            description: `You have already completed the maximum number of attempts (${MAX_ATTEMPTS}) for this test.`,
          });
        }
      } catch (error) {
        console.error('Error checking attempts:', error);
        setCanTakeTest(true); // Allow test if check fails
      } finally {
        setCheckingAttempts(false);
      }
    };

    checkAttempts();
  }, [canUserTakeTest, toast]);

  const startInterview = useCallback(async (details: PreInterviewDetails) => {
    setPreInterviewDetails(details);
    setStatus('INTERVIEW');
    setIsProcessing(true);
    try {
      let questionsToUse: ConversationEntry[] = [];
      let jd = 'A standard role description.';
      
      try {
        // Get global settings from database
        const globalSettings = await configurationService.getGlobalSettings();
        if (globalSettings) {
          if (globalSettings.replyMode) setInterviewMode(globalSettings.replyMode);
          if (globalSettings.showReport !== undefined) setShowReport(globalSettings.showReport);
        }

        // Get JDT configuration from database
        const savedConfig = await configurationService.getJDTConfig();
        if (savedConfig) {
          const { roles, settings } = savedConfig;
          const selectedRole = roles.find((r: any) => r.roleName === details.roleCategory);

          if (selectedRole) {
            jd = selectedRole.jobDescription;
            let manualQuestions = selectedRole.questions;
            const numManualQuestionsToUse = settings?.numberOfQuestions > 0 ? settings.numberOfQuestions : manualQuestions.length;

            if (numManualQuestionsToUse < manualQuestions.length) {
                manualQuestions.sort(() => 0.5 - Math.random()); // Shuffle questions
            }
            questionsToUse = manualQuestions.slice(0, numManualQuestionsToUse).map((q: any) => ({
                question: q.text,
                preferredAnswer: q.preferredAnswer,
                competency: q.competency,
                answer: null,
                videoDataUri: undefined,
            }));

            // Generate AI questions if configured
            const numAiQuestions = settings?.aiGeneratedQuestions || 0;
            if (numAiQuestions > 0) {
                toast({ title: `Generating ${numAiQuestions} AI interview questions...` });
                const aiQuestionsInput: GenerateInterviewQuestionsInput = {
                    roleCategory: details.roleCategory,
                    jobDescription: jd,
                    numberOfQuestions: numAiQuestions,
                    isFollowUp: true, // ensures no "hello" questions
                };
                const aiQuestionsResult = await fetch('/api/ai/generate-questions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(aiQuestionsInput)
                }).then(res => res.json());
                const aiGeneratedQuestions = aiQuestionsResult.questions.map((q: string) => ({
                    question: q,
                    preferredAnswer: "Evaluate for clarity, relevance, and depth.", // Generic guidance
                    competency: "AI-Assessed", // Generic competency
                    answer: null,
                    videoDataUri: undefined,
                }));
                questionsToUse = [...questionsToUse, ...aiGeneratedQuestions];
            }
          }

          // Translate all questions if language is not English
          if (details.language && details.language.toLowerCase() !== 'english' && questionsToUse.length > 0) {
              toast({ title: `Translating questions to ${details.language}...` });
              const translationPromises = questionsToUse.map(async (q) => {
                  const result = await fetch('/api/ai/translate', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ textToTranslate: q.question, targetLanguage: details.language })
                  }).then(res => res.json());
                  return result.translatedText;
              });
              const translatedResults = await Promise.all(translationPromises);
              questionsToUse = questionsToUse.map((q, index) => ({
                  ...q,
                  question: translatedResults[index],
              }));
          }

          if (settings?.timeLimit) {
            setTimeLimit(settings.timeLimit);
          }
        }
      } catch (error) {
        console.error('Error loading configuration from database:', error);
        toast({
          variant: 'destructive',
          title: 'Configuration Error',
          description: 'Failed to load configuration from database. Using default settings.',
        });
      }
      
      if (questionsToUse.length === 0) {
        toast({
            variant: 'destructive',
            title: 'No Questions Found',
            description: 'This role has no questions configured. Please contact an admin.',
        });
        setStatus('PRE_INTERVIEW');
        return;
      }
      setJobDescription(jd);
      setConversationHistory(questionsToUse);
      
      // Initialize question times array
      setQuestionTimes(new Array(questionsToUse.length).fill(0));
      
      // 🔒 MINIMAL IMPACT PROGRESSIVE SESSION - Only if feature enabled
      if (progressive.isProgressiveSaveEnabled) {
        try {
          console.log('🚀 [Interview] Starting progressive session...');
          const sessionId = progressive.startNewSession('JDT');
          console.log('✅ [Interview] Progressive session started:', sessionId);
        } catch (progressiveError) {
          console.error('❌ [Interview] Progressive session error:', progressiveError);
          // Don't block interview start, just log the error
        }
      }
    } catch (error) {
      console.error("Error starting interview:", error);
      toast({
        variant: 'destructive',
        title: 'Failed to Start Interview',
        description: 'Could not set up interview questions. Please try again.',
      });
      setStatus('PRE_INTERVIEW');
    } finally {
      setIsProcessing(false);
    }
  }, [toast]);

  const handleFinishInterview = useCallback(async () => {
      console.log('🏁 Interview finish button clicked');
      
      const answeredHistory = conversationHistory.filter(e => e.answer);
      if (answeredHistory.length === 0) {
          toast({
              variant: 'destructive',
              title: 'No Answers Recorded',
              description: 'Please answer at least one question before finishing.',
          });
          return;
      }
      
      console.log(`📊 Processing ${answeredHistory.length} answers`);
      setStatus('UPLOADING'); // 🔒 NEW: Show upload progress instead of immediate completion
      setIsProcessing(true);
      
      try {
        // First, save the submission to database immediately
        console.log('💾 Saving interview submission to database...');
        
        // Create a basic result structure
        const basicResult: AnalysisResult = {
            strengths: `Candidate completed ${answeredHistory.length} out of ${conversationHistory.length} interview questions. Responses demonstrate engagement with the interview process.`,
            weaknesses: "Detailed analysis pending. Please review individual responses for comprehensive feedback.",
            summary: `JDT Interview completed on ${new Date().toLocaleDateString()}. ${answeredHistory.length} questions answered out of ${conversationHistory.length} total questions.`,
            competencyAnalysis: [{
                name: "Interview Completion",
                competencies: [{
                    name: "Participation",
                    score: Math.round((answeredHistory.length / conversationHistory.length) * 10)
                }]
            }]
        };

        // Save submission immediately with basic analysis
        await saveSubmission({
            candidateName: preInterviewDetails!.name,
            testType: 'JDT',
            report: basicResult,
            history: conversationHistory,
        });

        console.log('✅ Interview submission saved successfully');
        
        // 🔒 MINIMAL IMPACT UPLOAD MONITORING - Wait for progressive upload completion
        if (progressive.isProgressiveSaveEnabled && progressive.currentSessionId) {
          console.log('💾 [Interview] Monitoring upload completion...');
          try {
            await progressive.markSessionComplete();
            console.log('✅ [Interview] Progressive upload completed');
          } catch (error) {
            console.warn('⚠️ [Interview] Progressive completion failed, but main submission saved:', error);
          }
        }

        // Transition to completion state
        setStatus('COMPLETED');

        // Remove the toast from here since it will be shown in COMPLETED state

      } catch (error) {
        console.error("❌ Error in finish interview:", error);
        toast({
          variant: 'destructive',
          title: 'Submission Failed',
          description: 'There was an error saving your responses. Please try again.',
        });
        setStatus('INTERVIEW');
      } finally {
        setIsProcessing(false);
      }
  }, [conversationHistory, preInterviewDetails, jobDescription, toast, saveSubmission, showReport, router]);


  const handleAnswerSubmit = async (answer: string, videoDataUri?: string) => {
    setIsSavingAnswer(true);
    
    try {
      // Always update local state first (backward compatibility)
      const updatedHistory = [...conversationHistory];
      updatedHistory[currentQuestionIndex] = {
        ...updatedHistory[currentQuestionIndex],
        answer,
        videoDataUri,
      };
      setConversationHistory(updatedHistory);
      
      // 🔒 MINIMAL IMPACT PROGRESSIVE SAVE - Only if feature enabled
      if (progressive.isProgressiveSaveEnabled && progressive.currentSessionId) {
        try {
          console.log('💾 [Interview] Progressive save enabled, saving question...');
          
          // 🔒 ENHANCEMENT - Use upload method if available and enabled
          const saveMethod = progressive.isProgressiveUploadEnabled && progressive.saveQuestionWithUpload
            ? progressive.saveQuestionWithUpload
            : progressive.saveQuestionProgress;
          
          const saveResult = await saveMethod(
            currentQuestionIndex,
            updatedHistory[currentQuestionIndex],
            'JDT',
            conversationHistory.length,
            // Optional upload progress callback for enhanced method
            progressive.isProgressiveUploadEnabled ? (progress, type) => {
              console.log(`📤 [Interview] Upload progress: ${progress}% (${type})`);
            } : undefined
          );
          
          if (saveResult.success) {
            const message = progressive.isProgressiveUploadEnabled 
              ? "Answer saved and uploaded!" 
              : "Answer saved!";
            toast({
              title: message,
              description: "Your answer has been saved automatically.",
            });
          } else {
            // Show warning but don't block user
            toast({
              variant: 'destructive',
              title: "Save Warning",
              description: "Answer saved locally but upload failed. Will retry automatically.",
            });
          }
        } catch (progressiveError) {
          console.error('❌ [Interview] Progressive save error:', progressiveError);
          // Don't block the user, just log the error
        }
      } else {
        // Traditional mode - just show local save confirmation
        toast({
          title: "Answer Saved!",
          description: "You can move to the next question or review your answer.",
        });
      }
      
      // Move to next question automatically (existing behavior)
      if (currentQuestionIndex < conversationHistory.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
      }
      
    } catch (error) {
      console.error('❌ [Interview] Error in handleAnswerSubmit:', error);
      toast({
        variant: 'destructive',
        title: "Error",
        description: "There was an issue saving your answer. Please try again.",
      });
    } finally {
      setIsSavingAnswer(false);
    }
  };
  
  useEffect(() => {
    if (user && !preInterviewDetails) {
        setPreInterviewDetails({ name: user.candidateName, roleCategory: user.role, language: 'English' });
    }
  }, [user, preInterviewDetails]);

  // 🔒 MINIMAL IMPACT COMPLETION TOAST - Show success message when upload completes
  useEffect(() => {
    if (status === 'COMPLETED') {
      toast({
        title: 'Thank you for waiting!',
        description: 'Your submission has been successfully uploaded.',
      });
    }
  }, [status, toast]);

  const handleReattempt = () => {
    router.push('/');
  };

  // 🔒 MINIMAL IMPACT RECOVERY HANDLERS - Only used if feature enabled
  const handleResumeSession = async (sessionId: string) => {
    try {
      console.log('🔄 [Interview] Resuming session:', sessionId);
      
      const success = await progressive.resumeSession(sessionId);
      if (success && recoveryData) {
        // 🔒 CRITICAL FIX: Map PartialSubmission to ConversationEntry with correct types
        setConversationHistory(recoveryData.partialSubmissions.map(p => ({
          question: p.question,
          answer: p.answer,
          // Convert string | null to string | undefined for ConversationEntry
          videoDataUri: p.videoDataUri || undefined,
          preferredAnswer: p.preferredAnswer || undefined,
          competency: p.competency || undefined,
          situation: p.situation || undefined,
          bestResponseRationale: p.bestResponseRationale || undefined,
          worstResponseRationale: p.worstResponseRationale || undefined,
          assessedCompetency: p.assessedCompetency || undefined
        })));
        
        setCurrentQuestionIndex(recoveryData.lastQuestionIndex + 1);
        setStatus('INTERVIEW');
        setShowRecoveryModal(false);
        
        toast({
          title: 'Session Resumed!',
          description: `Continuing from question ${recoveryData.lastQuestionIndex + 2} of ${recoveryData.totalQuestions}`,
        });
        
        console.log('✅ [Interview] Session resumed successfully');
      } else {
        throw new Error('Failed to resume session');
      }
    } catch (error) {
      console.error('❌ [Interview] Error resuming session:', error);
      toast({
        variant: 'destructive',
        title: 'Resume Failed',
        description: 'Could not resume your previous session. Starting a new interview.',
      });
      setShowRecoveryModal(false);
    }
  };

  const handleStartNewSession = () => {
    console.log('🚀 [Interview] Starting new session (skipping recovery)');
    setShowRecoveryModal(false);
    // Continue with normal flow - user will go through pre-interview form
  };


  const currentEntry = conversationHistory[currentQuestionIndex];
  const answeredQuestionsCount = conversationHistory.filter(entry => entry.answer !== null).length;


  const renderContent = () => {
    switch (status) {
      case 'PRE_INTERVIEW':
        return <PreInterviewForm onFormSubmit={startInterview} defaultName={user?.candidateName} defaultRole={user?.role} />;
      case 'INTERVIEW':
        if (isProcessing || !currentEntry) {
           return (
              <div className="flex flex-col items-center justify-center text-center p-8 bg-card/60 backdrop-blur-xl rounded-lg shadow-lg">
                <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
                <h2 className="text-2xl font-headline text-primary">Preparing your interview...</h2>
                <p className="text-muted-foreground mt-2">This may take a moment.</p>
              </div>
           );
        }
        return (
          <div className="w-full max-w-6xl flex flex-col items-center">
            <Flashcard
              key={currentQuestionIndex}
              question={currentEntry.question}
              questionNumber={currentQuestionIndex + 1}
              totalQuestions={conversationHistory.length}
              onAnswerSubmit={handleAnswerSubmit}
              isProcessing={isSavingAnswer}
              isVisible={true}
              mode={interviewMode}
              isAnswered={currentEntry.answer !== null}
              onFinishInterview={handleFinishInterview}
              answeredQuestionsCount={answeredQuestionsCount}
              timeLimitInMinutes={timeLimit}
              onTimeUp={handleFinishInterview}
              currentQuestionIndex={currentQuestionIndex}
              setCurrentQuestionIndex={setCurrentQuestionIndex}
              conversationHistory={conversationHistory}
              questionTimes={questionTimes}
              setQuestionTimes={setQuestionTimes}
            />
          </div>
        );
      case 'RESULTS':
        return analysisResult && (
          <ConversationSummary
            analysisResult={analysisResult}
            history={conversationHistory}
            onReattempt={handleReattempt}
            reattemptText="Back to Dashboard"
          />
        );
      case 'UPLOADING':
        return (
            <Card className="w-full max-w-lg text-center animate-fadeIn shadow-lg">
                <CardContent className="p-8">
                    <div className="h-16 w-16 text-blue-500 mx-auto mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="animate-spin">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-headline text-primary mb-2">Uploading Your Response</h2>
                    <p className="text-muted-foreground mb-4">
                        Please do not refresh the page or close this window.
                    </p>
                    <p className="text-sm text-blue-600">
                        Your interview responses are being securely uploaded...
                    </p>
                </CardContent>
            </Card>
        );
       case 'COMPLETED':
        return (
            <Card className="w-full max-w-lg text-center animate-fadeIn shadow-lg">
                <CardContent className="p-8">
                    <div className="h-16 w-16 text-green-500 mx-auto mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-headline text-primary mb-2">Thank you for your submission!</h2>
                    <p className="text-muted-foreground mb-6">
                        The hiring team will get back to you with the next steps.
                    </p>
                    <Button onClick={() => router.push('/')}>
                        Back to Dashboard
                    </Button>
                </CardContent>
            </Card>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
        {checkingAttempts ? (
          <div className="flex flex-col items-center justify-center text-center p-8">
            <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
            <h2 className="text-2xl font-headline text-primary">Checking access...</h2>
          </div>
        ) : (
          <div className={!canTakeTest ? "relative" : ""}>
            {/* Greyed out overlay when attempts exceeded */}
            {!canTakeTest && (
              <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center">
                <Card className="w-full max-w-lg text-center shadow-lg border-red-200 bg-white">
                  <CardContent className="p-8">
                    <div className="h-16 w-16 text-red-500 mx-auto mb-4">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                      </svg>
                    </div>
                    <h2 className="text-2xl font-headline text-red-600 mb-2">Access Restricted</h2>
                    <p className="text-muted-foreground mb-6">
                      You have reached the maximum number of attempts ({MAX_ATTEMPTS}) for this test. 
                      Please contact your administrator if you need additional attempts.
                    </p>
                    <Button onClick={() => router.push('/')} variant="outline">
                      Back to Dashboard
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}
            {/* Main content - always rendered but disabled when attempts exceeded */}
            <div className={!canTakeTest ? "opacity-30 pointer-events-none" : ""}>
              {renderContent()}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function ProtectedVerbalInterviewPage() {
    return (
        <ProtectedRoute>
            {/* 🔒 MINIMAL IMPACT PROGRESSIVE PROVIDER - Wraps existing functionality */}
            <ProgressiveProvider>
                <VerbalInterviewPage />
            </ProgressiveProvider>
        </ProtectedRoute>
    )
}

    