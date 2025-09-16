'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ProtectedRoute, useAuth } from '@/contexts/auth-context';
import Header from '@/components/header';
import ConversationSummary from '@/components/conversation-summary';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import type { Submission } from '@/types';

function ReportPage() {
  const params = useParams();
  const router = useRouter();
  const { getLatestUserSubmission } = useAuth();
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const testType = params.type as 'JDT' | 'SJT';

  useEffect(() => {
    const loadReport = async () => {
      try {
        if (!testType || (testType !== 'JDT' && testType !== 'SJT')) {
          setError('Invalid test type');
          return;
        }

        const latestSubmission = await getLatestUserSubmission(testType);
        if (!latestSubmission) {
          setError('No report found for this test');
          return;
        }

        setSubmission(latestSubmission);
      } catch (err) {
        console.error('Error loading report:', err);
        setError('Failed to load report');
      } finally {
        setLoading(false);
      }
    };

    loadReport();
  }, [testType, getLatestUserSubmission]);

  const handleBackToDashboard = () => {
    router.push('/');
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center text-center p-8">
          <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
          <h2 className="text-2xl font-headline text-primary">Loading your report...</h2>
        </div>
      );
    }

    if (error) {
      return (
        <Card className="w-full max-w-lg text-center shadow-lg border-red-200">
          <CardContent className="p-8">
            <div className="h-16 w-16 text-red-500 mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <h2 className="text-2xl font-headline text-red-600 mb-2">Report Not Found</h2>
            <p className="text-muted-foreground mb-6">
              {error}
            </p>
            <button 
              onClick={handleBackToDashboard}
              className="bg-blue-600 text-white font-bold py-2 px-4 rounded hover:bg-blue-700 transition-colors"
            >
              Back to Dashboard
            </button>
          </CardContent>
        </Card>
      );
    }

    if (submission) {
      return (
        <ConversationSummary
          analysisResult={submission.report}
          history={submission.history}
          onReattempt={handleBackToDashboard}
          reattemptText="Back to Dashboard"
        />
      );
    }

    return null;
  };

  return (
    <ProtectedRoute>
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
          <div className="w-full max-w-4xl">
            <div className="text-center mb-6">
              <h1 className="text-3xl font-bold text-gray-800">
                {testType === 'JDT' ? 'Job Description Test' : 'Situational Judgement Test'} Report
              </h1>
              <p className="text-gray-600 mt-2">
                Review your assessment results and performance analysis
              </p>
            </div>
            {renderContent()}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}

export default ReportPage;
