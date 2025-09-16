
'use client';

import { useAuth } from '@/contexts/auth-context';
import type { PreInterviewDetails } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronRight, Info, Lightbulb, Languages, CheckCircle } from 'lucide-react';
import React, {useState, useEffect} from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from '../ui/label';
import { configurationService } from '@/lib/config-service';

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
  const [language, setLanguage] = useState('');
  const [availableLanguages, setAvailableLanguages] = useState<string[]>(['English']);
  const [settings, setSettings] = useState({ timeLimit: 0, numberOfQuestions: 5 });

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
          });
        }
      } catch (error) {
        console.error('Error loading SJT configuration:', error);
        // Set defaults if there's an error
        setAvailableLanguages(['English']);
        setLanguage('English');
        setSettings({ timeLimit: 0, numberOfQuestions: 5 });
      }
    };

    loadConfig();
  }, []);
  
  const handleProceed = () => {
    const details: PreInterviewDetails = {
        name: user?.candidateName || 'Candidate',
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
                            <p className="font-bold text-lg leading-tight">TOTAL</p>
                            <p className="text-sm">Questions</p>
                            <p className="text-5xl font-bold">{settings.numberOfQuestions || 'All'}</p>
                        </div>
                        <div className="w-full border-t border-white/50 my-4"></div>
                        <div className="w-full">
                           <p className="text-sm">Test Time</p>
                           <p className="font-bold text-lg -mt-1">{settings.timeLimit > 0 ? `${settings.timeLimit}:00` : 'Untimed'}</p>
                        </div>
                    </div>
                    <div className="bg-accent text-accent-foreground p-6 flex flex-col justify-between items-center text-center w-full md:w-1/4 border-x border-border">
                        <div className="w-full">
                            <h3 className="font-bold text-lg mb-2">QUESTIONS</h3>
                            <div className="space-y-2 self-start text-left">
                                <QuestionDetailItem>Situation based questions</QuestionDetailItem>
                                <QuestionDetailItem>Record video/audio answers with real-time transcription</QuestionDetailItem>
                                <QuestionDetailItem>Choose your response</QuestionDetailItem>
                            </div>
                        </div>
                         <div className="w-full border-t border-white/50 my-4"></div>
                        <div className="w-full">
                           <p className="text-sm">Question Time</p>
                           <p className="font-bold text-lg -mt-1">No time limit</p>
                        </div>
                    </div>

                    <div className="p-6 w-full md:w-2/4 flex items-center relative">
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 h-4/5 w-px bg-border"></div>
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 bg-background p-1.5 rounded-full border-2 border-red-500">
                            <Info className="h-6 w-6 text-red-500" />
                        </div>
                        
                        <div className="pl-8 space-y-3">
                            <InstructionItem>Answer all questions in one attempt, so start when you are really ready.</InstructionItem>
                            <InstructionItem>"Submit" every response and "Finish Test" when you have responded to all.</InstructionItem>
                            <InstructionItem>For audio/video responses, your speech will be transcribed in real-time as you speak.</InstructionItem>
                             <InstructionItem>If no option matches your real life response to a question, choose one that is closest.</InstructionItem>
                            <InstructionItem>Keep it real life, stay spontaneous. <span className="font-bold">Do not overthink</span> a response.</InstructionItem>
                        </div>
                    </div>
                </CardContent>
            </Card>
      
       <div className="max-w-md mx-auto mb-6">
          <Label htmlFor="language" className="flex items-center gap-2 mb-2"><Languages className="h-4 w-4" /> Preferred Language</Label>
          <Select value={language} onValueChange={setLanguage} required>
              <SelectTrigger id="language">
                  <SelectValue placeholder="Select language" />
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
          Proceed
          <ChevronRight className="ml-2 h-5 w-5" />
        </Button>
      </div>

      <Card className="bg-green-50 border-green-200">
        <CardContent className="p-6 flex gap-4 items-start">
            <div className="p-2 bg-green-100 rounded-full h-fit mt-1">
                <Lightbulb className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-grow space-y-2">
                <InstructionItem>Try not to refresh the page, you will lose the answers you've worked hard to complete.</InstructionItem>
                <InstructionItem><span className="font-bold">Caution...</span> Don't shut the browser, and avoid power-outs if you can. That'll lock you out for an hour and you'll restart your test all over again when relogin.</InstructionItem>
                <InstructionItem>Of course, restarting the test too often will not improve your score, but it will lock down your ID for longer.</InstructionItem>
                <InstructionItem>And of course..."Submit" every answer and Click "Finish" test when you've answered all!</InstructionItem>
            </div>
        </CardContent>
      </Card>

    </div>
  );
}

    