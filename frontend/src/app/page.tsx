
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ProtectedRoute, useAuth } from '@/contexts/auth-context';
import Header from '@/components/header';
import Image from 'next/image';
import { ArrowRightCircle, Headphones, ListChecks, Info, FileText, Briefcase, X, Eye } from 'lucide-react';
import { configurationService } from '@/lib/config-service';

const Stepper = () => (
  <div className="w-full max-w-4xl mx-auto my-12">
    <div className="flex items-center">
      <Step number={1} title="Skills Gauge not an exam" isFirst />
      <Step number={2} title="Everyday scenarios" />
      <Step number={3} title="Total assessment 02" />
      <Step number={4} title="Get Report instantly" isLast />
    </div>
  </div>
);

const Step = ({ number, title, isFirst = false, isLast = false }: { number: number; title: string; isFirst?: boolean; isLast?: boolean }) => (
  <div className="flex-1 flex items-center">
    {!isFirst && <div className="flex-1 border-t-2 border-gray-300"></div>}
    <div className="flex flex-col items-center text-gray-500 relative">
      <div className="rounded-full transition duration-500 ease-in-out h-16 w-16 border-2 border-gray-300 flex items-center justify-center relative bg-white">
        <div className="absolute inset-0 rounded-full border-[6px] border-white"></div>
        <div className="font-bold text-red-600 text-4xl z-10">{number.toString().padStart(2, '0')}</div>
        <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-0 h-0 border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent border-r-[8px] border-r-red-500 transform rotate-180 z-20"></div>
        <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-0 h-0 border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent border-l-[8px] border-l-red-500 z-20"></div>
      </div>
      <div className="text-center w-32 text-base font-medium uppercase mt-4">{title}</div>
    </div>
    {!isLast && <div className="flex-1 border-t-2 border-gray-300"></div>}
  </div>
);


const AssessmentCard = ({ 
  title, 
  icon, 
  decide, 
  howItWorks, 
  remember, 
  questions, 
  attempts, 
  link, 
  isDisabled = false, 
  currentAttempts = 0,
  maxAttempts = 1,
  hasReport = false,
  onViewReport
}: { 
  title: string; 
  icon: React.ReactNode; 
  decide: string; 
  howItWorks: string; 
  remember: string; 
  questions: string; 
  attempts: string; 
  link: string; 
  isDisabled?: boolean; 
  currentAttempts?: number;
  maxAttempts?: number;
  hasReport?: boolean;
  onViewReport?: () => void;
}) => (
    <div className="border border-gray-200 flex flex-col rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-shadow duration-300">
        <div className={`p-4 flex-grow ${isDisabled ? 'opacity-50 bg-gray-50' : ''}`}>
            <h3 className="text-red-600 font-bold border-b-2 border-red-200 pb-1 mb-3 text-2xl flex items-center gap-2">{icon} {title}</h3>
            <div className="text-lg space-y-3 text-gray-700">
                <p><span className="font-bold">Decide:</span> {decide}</p>
                <p><span className="font-bold">How it works:</span> {howItWorks}</p>
                <p><span className="font-bold">Remember:</span> {remember}</p>
            </div>
        </div>
        <div className={`bg-gray-100 p-4 border-t border-b border-gray-200 ${isDisabled ? 'opacity-50' : ''}`}>
            <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                    <p className="text-base text-gray-500">No. of questions</p>
                    <p className="text-3xl font-bold text-gray-700">{questions}</p>
                </div>
                <div>
                    <p className="text-base text-gray-500">Attempts Used</p>
                    <p className={`text-3xl font-bold ${isDisabled ? 'text-red-600' : 'text-gray-700'}`}>
                      {currentAttempts}/{maxAttempts}
                    </p>
                </div>
            </div>
        </div>
        <div className={`bg-green-800 text-white p-2 text-sm ${isDisabled ? 'opacity-50' : ''}`}>
            <div className="flex justify-between items-center px-2">
                <span className="flex items-center gap-2"><Headphones className="h-4 w-4" /> Headphones needed</span>
                <span>Yes</span>
            </div>
             <div className="flex justify-between items-center px-2 mt-1">
                <span className="flex items-center gap-2"><ListChecks className="h-4 w-4" /> Complete all questions</span>
                <span>{maxAttempts} attempt{maxAttempts > 1 ? 's' : ''}</span>
            </div>
        </div>
        {isDisabled ? (
          <div className="bg-gray-50">
            <div className="w-full bg-gray-400 text-white font-bold py-3 flex items-center justify-center cursor-not-allowed">
              <X className="mr-2 h-5 w-5" />
              Maximum attempts reached
            </div>
            {hasReport && (
              <button 
                onClick={onViewReport}
                className="w-full bg-blue-500 text-white font-bold py-3 flex items-center justify-center hover:bg-blue-600 transition-all duration-200 border-t border-gray-300 shadow-md hover:shadow-lg"
              >
                <Eye className="mr-2 h-5 w-5" />
                View Report
              </button>
            )}
          </div>
        ) : (
          <div className="bg-gray-50">
            <Link href={link} className="block">
                <button className="w-full bg-green-600 text-white font-bold py-3 flex items-center justify-center hover:bg-green-700 transition-colors">
                    Start <ArrowRightCircle className="ml-3" />
                </button>
            </Link>
            {hasReport && (
              <button 
                onClick={onViewReport}
                className="w-full bg-blue-500 text-white font-bold py-3 flex items-center justify-center hover:bg-blue-600 transition-all duration-200 border-t border-gray-300 shadow-md hover:shadow-lg"
              >
                <Eye className="mr-2 h-5 w-5" />
                View Report
              </button>
            )}
          </div>
        )}
    </div>
);


function SelectionPage() {
  const router = useRouter();
  const { getUserAttempts, getLatestUserSubmission } = useAuth();
  const [isJdtEnabled, setIsJdtEnabled] = useState(true);
  const [isSjtEnabled, setIsSjtEnabled] = useState(true);
  const [isJdtConfigured, setIsJdtConfigured] = useState(false);
  const [isSjtConfigured, setIsSjtConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sjtAttempts, setSjtAttempts] = useState(0);
  const [jdtAttempts, setJdtAttempts] = useState(0);
  const [hasJdtReport, setHasJdtReport] = useState(false);
  const [hasSjtReport, setHasSjtReport] = useState(false);
  const [sjtQuestionCount, setSjtQuestionCount] = useState(5);
  const [jdtQuestionCount, setJdtQuestionCount] = useState(5);
  
  const MAX_ATTEMPTS = 1; // Maximum attempts per test

  useEffect(() => {
    const loadConfiguration = async () => {
      try {
        console.log('🔧 Loading configuration from database...');
        
        const globalSettings = await configurationService.getGlobalSettings();
        if (globalSettings) {
          setIsJdtEnabled(globalSettings.isJdtEnabled ?? true);
          setIsSjtEnabled(globalSettings.isSjtEnabled ?? true);
        }
        
        const jdtConfig = await configurationService.getJDTConfig();
        const sjtConfig = await configurationService.getSJTConfig();
        
        setIsJdtConfigured(!!jdtConfig);
        setIsSjtConfigured(!!sjtConfig);
        
        // Load question counts from configurations
        if (sjtConfig?.settings?.numberOfQuestions) {
          setSjtQuestionCount(sjtConfig.settings.numberOfQuestions);
        }
        if (jdtConfig?.settings?.numberOfQuestions) {
          const manualQuestions = jdtConfig.settings.numberOfQuestions || 0;
          const aiQuestions = jdtConfig.settings.aiGeneratedQuestions || 0;
          setJdtQuestionCount(manualQuestions + aiQuestions);
        }
        
        // Load attempt counts
        const sjtAttemptsCount = await getUserAttempts('SJT');
        const jdtAttemptsCount = await getUserAttempts('JDT');
        setSjtAttempts(sjtAttemptsCount);
        setJdtAttempts(jdtAttemptsCount);
        
        // Check for existing reports
        const sjtSubmission = await getLatestUserSubmission('SJT');
        const jdtSubmission = await getLatestUserSubmission('JDT');
        setHasSjtReport(!!sjtSubmission);
        setHasJdtReport(!!jdtSubmission);
        
        console.log('✅ Configuration loaded from database');
        console.log(`📊 Attempts - SJT: ${sjtAttemptsCount}/${MAX_ATTEMPTS}, JDT: ${jdtAttemptsCount}/${MAX_ATTEMPTS}`);
        console.log(`📄 Reports - SJT: ${!!sjtSubmission}, JDT: ${!!jdtSubmission}`);
      } catch (error) {
        console.error('❌ Error loading configuration from database:', error);
      } finally {
        setLoading(false);
      }
    };

    loadConfiguration();
  }, [getUserAttempts]);

  const showJDT = isJdtEnabled && isJdtConfigured;
  const showSJT = isSjtEnabled && isSjtConfigured;

  const handleViewSjtReport = () => {
    router.push('/report/SJT');
  };

  const handleViewJdtReport = () => {
    router.push('/report/JDT');
  };

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <Header />
      <main className="flex-grow flex flex-col items-center p-4">
        <div className="w-full max-w-5xl mx-auto">
            <div className="relative h-48 bg-gray-200 mb-12 rounded-lg overflow-hidden">
                <Image src="https://placehold.co/1200x250.png" layout="fill" objectFit="cover" alt="Skills Gauge Banner" data-ai-hint="professional banner" />
                <div className="absolute inset-0 bg-black/30 flex flex-col items-center justify-center text-white text-center p-4">
                    <h1 className="text-5xl font-bold">Skill Gauge</h1>
                    <p className="mt-2 text-lg">Skills Gauge is a combination of Assessments, which are predictive of future performance on the job.</p>
                </div>
            </div>
            
            <Stepper />

            <div className="mt-20 w-full">
                {!loading && !showJDT && !showSJT ? (
                    <div className="text-center py-10 px-6 bg-gray-50 rounded-lg">
                        <Info className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-xl font-medium text-gray-900">No Assessments Available</h3>
                        <p className="mt-1 text-base text-gray-500">
                            There are no assessments assigned to you at this time. Please contact your administrator.
                        </p>
                    </div>
                ) : (
                    <div className={`grid grid-cols-1 ${showJDT && showSJT ? 'md:grid-cols-2' : 'max-w-md mx-auto'} gap-8`}>
                        {showSJT && (
                            <AssessmentCard 
                                title="SITUATIONAL JUDGEMENT"
                                icon={<FileText />}
                                decide="Read each situation. Decide what you would do in that situation."
                                howItWorks="Each question is 1 situation with response choices. There is no right or wrong response, so choose a response based on what you would really do and not what sounds ideal."
                                remember="Finish all questions in 1 attempt. If get logged out you will need to reattempt all questions again."
                                questions={sjtQuestionCount.toString().padStart(2, '0')}
                                attempts={`${sjtAttempts}/${MAX_ATTEMPTS}`}
                                link="/sjt"
                                isDisabled={sjtAttempts >= MAX_ATTEMPTS}
                                currentAttempts={sjtAttempts}
                                maxAttempts={MAX_ATTEMPTS}
                                hasReport={hasSjtReport}
                                onViewReport={handleViewSjtReport}
                            />
                        )}
                        {showJDT && (
                             <AssessmentCard 
                                title="JOB DESCRIPTION TEST"
                                icon={<Briefcase />}
                                decide="Analyze the job description and respond to tailored questions."
                                howItWorks="Start by understanding the role requirements. Then respond to questions designed to assess your fit and skills for that role."
                                remember="Once you finish the analysis and start responding to questions, you need to finish all questions in 1 attempt."
                                questions={jdtQuestionCount.toString().padStart(2, '0')}
                                attempts={`${jdtAttempts}/${MAX_ATTEMPTS}`}
                                link="/interview"
                                isDisabled={jdtAttempts >= MAX_ATTEMPTS}
                                currentAttempts={jdtAttempts}
                                maxAttempts={MAX_ATTEMPTS}
                                hasReport={hasJdtReport}
                                onViewReport={handleViewJdtReport}
                            />
                        )}
                    </div>
                )}
            </div>
        </div>
      </main>
    </div>
  );
}

export default function Home() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [loading, isAuthenticated, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return <SelectionPage />;
}
