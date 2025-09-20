
'use client';

import { useAuth } from '@/contexts/auth-context';
import type { PreInterviewDetails } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronRight, Info, Lightbulb, Languages, CheckCircle } from 'lucide-react';
import React, {useState, useEffect} from 'react';
import { useTranslation } from 'react-i18next';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from '../ui/label';
import { configurationService, getSjtFollowUpCount } from '@/lib/config-service';

interface SJTInstructionsProps {
  onProceed: (details: PreInterviewDetails) => void;
}

const InstructionItem: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="flex items-start gap-3">
        <ChevronRight className="h-4 w-4 text-red-500 mt-1 shrink-0" />
        <span className="text-gray-600 text-sm">{children}</span>
    </div>
);

const QuestionDetailItem: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex items-center gap-2">
    <CheckCircle className="h-4 w-4 text-white" />
    <span className="text-white text-sm font-medium">{children}</span>
  </div>
);


export function SJTInstructions({ onProceed }: SJTInstructionsProps) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [language, setLanguage] = useState('');
  const [availableLanguages, setAvailableLanguages] = useState<string[]>(['English']);
  const [settings, setSettings] = useState({ timeLimit: 0, numberOfQuestions: 5, answerTimeSeconds: 0 });
  const [hasFollowUps, setHasFollowUps] = useState(false);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        // Load global settings from Firestore
        const globalSettings = await configurationService.getGlobalSettings();
        if (globalSettings) {
          setAvailableLanguages(globalSettings.languages || ['English']);
          setLanguage(globalSettings.languages?.[0] || 'English');
        }

        // Load SJT config from Firestore
        const savedConfig = await configurationService.getSJTConfig();
        if (savedConfig && savedConfig.settings) {
          setSettings({
            timeLimit: savedConfig.settings.timeLimit || 0,
            numberOfQuestions: savedConfig.settings.numberOfQuestions || 5,
            answerTimeSeconds: savedConfig.settings.answerTimeSeconds || 0,
          });
          const fu = getSjtFollowUpCount(savedConfig.settings);
          setHasFollowUps(!!fu && fu > 0);
        }
      } catch (error) {
        console.error('Error loading SJT configuration:', error);
        // Set defaults if there's an error
        setAvailableLanguages(['English']);
        setLanguage('English');
  setSettings({ timeLimit: 0, numberOfQuestions: 5 });
  setHasFollowUps(false);
      }
    };

    loadConfig();
  }, []);
  
  const handleProceed = () => {
  const details: PreInterviewDetails = {
    name: user?.candidate_name || 'Candidate',
        roleCategory: "Situational Judgement Test",
        language: language || 'English'
    };
    onProceed(details);
  };
  
  return (
    <div className="w-full max-w-5xl mx-auto animate-fadeIn p-4">
      <div className="text-center mb-6">
  <h1 className="text-3xl font-semibold text-foreground">Welcome to</h1>
  <h2 className="text-4xl font-bold text-gray-800 mt-1">Situational Judgement</h2>
  <p className="text-gray-600 mt-2 text-base">No ideal answers! Be yourself.</p>
  <p className="text-gray-600 font-semibold text-base">Choose what you would <span className="text-red-600">really</span> do, not what you should ideally do.</p>
      </div>
      
        <Card className="bg-card border-border mb-6 shadow-lg overflow-hidden">
                <CardContent className="p-0 flex flex-col md:flex-row">
                    <div className="bg-primary text-primary-foreground p-6 flex flex-col justify-between items-center text-center w-full md:w-1/4">
                        <div className="w-full">
                            <p className="font-bold text-lg leading-tight">{t('common.total')}</p>
                            <p className="text-sm">{t('common.questions')}</p>
                            <p className="text-5xl font-bold">{settings.numberOfQuestions || 'All'}{hasFollowUps ? '+' : ''}</p>
                        </div>
                        <div className="w-full border-t border-white/50 my-4"></div>
                        <div className="w-full">
              <p className="text-sm">{t('common.testTime')}</p>
                           <p className="font-bold text-lg -mt-1">{settings.timeLimit > 0 ? `${settings.timeLimit}:00` : t('common.untimed')}</p>
                        </div>
                    </div>
                    <div className="bg-accent text-accent-foreground p-6 flex flex-col justify-between items-center text-center w-full md:w-1/4 border-x border-border">
                        <div className="w-full">
                            <h3 className="font-bold text-lg mb-2">{t('common.questions').toUpperCase()}</h3>
                            <div className="space-y-2 self-start text-left">
                                <QuestionDetailItem>Situation based questions</QuestionDetailItem>
                                <QuestionDetailItem>Record video/audio answers with real-time transcription</QuestionDetailItem>
                                <QuestionDetailItem>{t('assessment.selectResponse')}</QuestionDetailItem>
                            </div>
                        </div>
                         <div className="w-full border-t border-white/50 my-4"></div>
                        <div className="w-full">
               <p className="text-sm">Per Question Time</p>
               <p className="font-bold text-lg -mt-1">
               {`Reading 1:00 + Answering ${settings.answerTimeSeconds ? `${Math.floor(settings.answerTimeSeconds/60)}:${(settings.answerTimeSeconds%60).toString().padStart(2,'0')}` : 'no limit'}`}
               </p>
                        </div>
                    </div>

                    <div className="p-6 w-full md:w-2/4 flex items-center relative">
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 h-4/5 w-px bg-border"></div>
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 bg-background p-1.5 rounded-full border-2 border-red-500">
                            <Info className="h-6 w-6 text-red-500" />
                        </div>
                        
                        <div className="pl-8 space-y-3">
                            <InstructionItem>{t('flashcard.instructions.g1')}</InstructionItem>
                            <InstructionItem>{t('flashcard.instructions.g2')}</InstructionItem>
                            <InstructionItem>For audio/video responses, your speech will be transcribed in real-time as you speak.</InstructionItem>
                             <InstructionItem>{t('flashcard.instructions.g3')}</InstructionItem>
                            <InstructionItem>{t('flashcard.instructions.g4')}</InstructionItem>
                        </div>
                    </div>
                </CardContent>
            </Card>
      
       <div className="max-w-md mx-auto mb-6">
          <Label htmlFor="language" className="flex items-center gap-2 mb-2"><Languages className="h-4 w-4" /> {t('form.selectLanguage')}</Label>
          <Select value={language} onValueChange={setLanguage} required>
              <SelectTrigger id="language">
                  <SelectValue placeholder={t('form.selectLanguage')} />
              </SelectTrigger>
              <SelectContent>
                  {availableLanguages.map(lang => (
                      <SelectItem key={lang} value={lang}>{lang}</SelectItem>
                  ))}
              </SelectContent>
          </Select>
      </div>

      <div className="flex justify-center my-6">
        <Button onClick={handleProceed} size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg rounded-full px-8">
          {t('common.next')}
          <ChevronRight className="ml-2 h-5 w-5" />
        </Button>
      </div>

      <Card className="bg-green-50 border-green-200">
        <CardContent className="p-6 flex gap-4 items-start">
            <div className="p-2 bg-green-100 rounded-full h-fit mt-1">
                <Lightbulb className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-grow space-y-2">
                <InstructionItem>{t('flashcard.instructions.r1')}</InstructionItem>
                <InstructionItem>{t('flashcard.instructions.r2')}</InstructionItem>
                <InstructionItem>{t('flashcard.instructions.r3')}</InstructionItem>
                <InstructionItem>{t('flashcard.instructions.r4')}</InstructionItem>
            </div>
        </CardContent>
      </Card>

    </div>
  );
}

    