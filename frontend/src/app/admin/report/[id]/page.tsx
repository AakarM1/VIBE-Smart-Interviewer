
'use client';

import React, { useState, useEffect } from 'react';
import { ProtectedRoute, useAuth } from '@/contexts/auth-context';
import { useParams, useRouter } from 'next/navigation';
import type { Submission } from '@/types';
import ConversationSummary from '@/components/conversation-summary';
import { Loader2, ArrowLeft, RefreshCw } from 'lucide-react';
import Header from '@/components/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Link from 'next/link';

const ReportDetailPage = () => {
    const { getSubmissionById } = useAuth();
    const router = useRouter();
    const params = useParams();
    const id = Array.isArray(params.id) ? params.id[0] : params.id as string;

    const [submission, setSubmission] = useState<Submission | null>(null);
    const [loading, setLoading] = useState(true);
    const [generatingAnalysis, setGeneratingAnalysis] = useState(false);
    const [analysisError, setAnalysisError] = useState<string | null>(null);

    const fetchSubmission = async () => {
        if (id) {
            try {
                const data = await getSubmissionById(id);
                setSubmission(data);
            } catch (error) {
                console.error('Error fetching submission:', error);
                setSubmission(null);
            } finally {
                setLoading(false);
            }
        } else {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSubmission();
    }, [id, getSubmissionById]);

    // Check if submission needs AI analysis (basic analysis has limited content)
    const needsAiAnalysis = (submission: Submission) => {
        if (!submission.report) return true;
        const report = submission.report;
        
        // Check if this looks like a basic analysis (contains "pending" or very short content)
        const hasBasicAnalysis = (
            report.weaknesses?.includes('pending') || 
            report.strengths?.length < 100 ||
            report.summary?.includes('Detailed analysis pending') ||
            report.competencyAnalysis?.length === 1 && 
            report.competencyAnalysis[0]?.competencies?.length === 1 &&
            report.competencyAnalysis[0]?.competencies[0]?.name === 'Participation'
        );
        
        return hasBasicAnalysis;
    };

    const generateAiAnalysis = async (forceRegenerate = false) => {
        if (!submission) return;
        
        setGeneratingAnalysis(true);
        setAnalysisError(null);
        
        try {
            console.log(`🤖 ${forceRegenerate ? 'Regenerating' : 'Generating'} AI analysis for submission:`, submission.id);
            
            const response = await fetch('/api/background-analysis', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    submissionId: submission.id,
                    type: submission.testType.toLowerCase() === 'jdt' ? 'interview' : 'sjt',
                    forceRegenerate
                }),
            });
            
            if (!response.ok) {
                throw new Error(`Analysis ${forceRegenerate ? 'regeneration' : 'generation'} failed: ${response.status}`);
            }
            
            console.log(`✅ AI analysis ${forceRegenerate ? 'regeneration' : 'generation'} triggered`);
            
            // Poll for updates every 3 seconds, but with more lenient success detection
            const pollForUpdates = async () => {
                for (let i = 0; i < 20; i++) { // Poll for up to 1 minute
                    await new Promise(resolve => setTimeout(resolve, 3000));
                    
                    try {
                        const updatedSubmission = await getSubmissionById(submission.id);
                        if (updatedSubmission) {
                            // Check if the submission was updated recently (within last 2 minutes)
                            const now = new Date();
                            const submissionDate = new Date(updatedSubmission.date);
                            const timeDiff = now.getTime() - submissionDate.getTime();
                            const twoMinutesInMs = 2 * 60 * 1000;
                            
                            // If submission is recent or has different content than before, consider it updated
                            const isRecentlyUpdated = timeDiff < twoMinutesInMs;
                            const hasNewContent = JSON.stringify(updatedSubmission.report) !== JSON.stringify(submission.report);
                            
                            if (isRecentlyUpdated || hasNewContent || !needsAiAnalysis(updatedSubmission)) {
                                setSubmission(updatedSubmission);
                                setGeneratingAnalysis(false);
                                console.log('✅ AI analysis completed and updated');
                                return;
                            }
                        }
                    } catch (error) {
                        console.warn('Error polling for updates:', error);
                    }
                }
                
                // If we get here, polling timed out - but provide a helpful message
                setGeneratingAnalysis(false);
                setAnalysisError('Analysis may have completed. Please refresh the page to see the latest results.');
            };
            
            pollForUpdates();
            
        } catch (error) {
            console.error(`Error ${forceRegenerate ? 'regenerating' : 'generating'} AI analysis:`, error);
            setGeneratingAnalysis(false);
            setAnalysisError(error instanceof Error ? error.message : `Failed to ${forceRegenerate ? 'regenerate' : 'generate'} analysis`);
        }
    };

    const handleBack = () => {
        router.push('/admin/submissions');
    };

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </div>
        );
    }

    if (!submission) {
        return (
            <div className="flex h-screen w-full flex-col items-center justify-center">
                <p className="text-xl text-destructive mb-4">Report not found.</p>
                <Button onClick={handleBack}>
                     <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Submissions
                </Button>
            </div>
        );
    }

    // Check if we need to generate AI analysis
    const showAnalysisGeneration = needsAiAnalysis(submission);

    return (
        <div className="flex flex-col min-h-screen">
            <Header />
            <main className="flex-grow flex flex-col items-center p-4 sm:p-6 lg:p-8">
                <div className="w-full max-w-4xl mb-4">
                     <Link href="/admin/submissions" passHref>
                        <Button variant="outline">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to All Submissions
                        </Button>
                    </Link>
                </div>
                
                {showAnalysisGeneration && !generatingAnalysis && (
                    <Card className="w-full max-w-4xl mb-6 border-yellow-200 bg-yellow-50">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-semibold text-yellow-800 mb-2">
                                        Enhanced AI Analysis Available
                                    </h3>
                                    <p className="text-yellow-700">
                                        This submission contains basic analysis only. Generate detailed AI analysis for comprehensive insights.
                                    </p>
                                </div>
                                <Button 
                                    onClick={() => generateAiAnalysis(false)}
                                    className="ml-4"
                                    disabled={generatingAnalysis}
                                >
                                    Generate AI Analysis
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}
                
                {!showAnalysisGeneration && !generatingAnalysis && submission.report && (
                    <Card className="w-full max-w-4xl mb-6 border-blue-200 bg-blue-50">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-semibold text-blue-800 mb-2">
                                        AI Analysis Complete
                                    </h3>
                                    <p className="text-blue-700">
                                        This submission has comprehensive AI analysis. You can regenerate the analysis to get fresh insights with updated AI models.
                                    </p>
                                </div>
                                <Button 
                                    onClick={() => generateAiAnalysis(true)}
                                    variant="outline"
                                    className="ml-4 border-blue-300 text-blue-700 hover:bg-blue-100"
                                    disabled={generatingAnalysis}
                                >
                                    <RefreshCw className="mr-2 h-4 w-4" />
                                    Regenerate Analysis
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}
                
                {generatingAnalysis && (
                    <Card className="w-full max-w-4xl mb-6 border-blue-200 bg-blue-50">
                        <CardContent className="p-6">
                            <div className="flex items-center">
                                <Loader2 className="h-6 w-6 animate-spin text-blue-600 mr-3" />
                                <div>
                                    <h3 className="text-lg font-semibold text-blue-800 mb-1">
                                        Generating AI Analysis...
                                    </h3>
                                    <p className="text-blue-700">
                                        This may take 1-2 minutes. The page will update automatically when complete.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}
                
                {analysisError && (
                    <Card className="w-full max-w-4xl mb-6 border-red-200 bg-red-50">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-semibold text-red-800 mb-2">
                                        Analysis Update
                                    </h3>
                                    <p className="text-red-700">{analysisError}</p>
                                </div>
                                <div className="flex gap-2 ml-4">
                                    <Button 
                                        onClick={() => window.location.reload()}
                                        variant="outline"
                                        className="border-red-300 text-red-700 hover:bg-red-100"
                                    >
                                        <RefreshCw className="mr-2 h-4 w-4" />
                                        Refresh Page
                                    </Button>
                                    <Button 
                                        onClick={() => generateAiAnalysis(false)}
                                        variant="outline"
                                        className="border-red-300 text-red-700 hover:bg-red-100"
                                    >
                                        Retry Analysis
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}
                
                <ConversationSummary
                    analysisResult={submission.report}
                    history={submission.history}
                    onReattempt={handleBack}
                    reattemptText="Back to Submissions"
                />
            </main>
        </div>
    );
};


const ProtectedReportDetailPage = () => (
    <ProtectedRoute adminOnly>
        <ReportDetailPage />
    </ProtectedRoute>
);

export default ProtectedReportDetailPage;
