
'use client';

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, ChevronRight, Info, Lightbulb, Languages, CheckCircle } from "lucide-react";
import type { PreInterviewDetails } from "@/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { configurationService } from '@/lib/config-service';


interface PreInterviewFormProps {
    onFormSubmit: (details: PreInterviewDetails) => void;
    defaultName?: string;
    defaultRole?: string;
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


export function PreInterviewForm({ onFormSubmit, defaultName = '', defaultRole = '' }: PreInterviewFormProps) {
    const [name, setName] = useState(defaultName);
    const [roleCategory, setRoleCategory] = useState('');
    const [language, setLanguage] = useState('');
    const [availableRoles, setAvailableRoles] = useState<string[]>([]);
    const [availableLanguages, setAvailableLanguages] = useState<string[]>(['English']);
    const [settings, setSettings] = useState({ timeLimit: 0, numberOfQuestions: 5, aiGeneratedQuestions: 0 });

    useEffect(() => {
        const loadConfig = async () => {
            try {
                // Load global settings from Firestore
                const globalSettings = await configurationService.getGlobalSettings();
                if (globalSettings) {
                    setAvailableLanguages(globalSettings.languages || ['English']);
                    setLanguage(globalSettings.languages?.[0] || 'English');
                }

                // Load JDT config from Firestore
                const savedConfig = await configurationService.getJDTConfig();
                if (savedConfig) {
                    if (savedConfig.roles && savedConfig.roles.length > 0) {
                        setAvailableRoles(savedConfig.roles.map((r: any) => r.roleName));
                        setRoleCategory(savedConfig.roles[0].roleName);
                    }
                    if (savedConfig.settings) {
                        setSettings({
                            timeLimit: savedConfig.settings.timeLimit || 0,
                            numberOfQuestions: savedConfig.settings.numberOfQuestions || 5,
                            aiGeneratedQuestions: savedConfig.settings.aiGeneratedQuestions || 0
                        });
                    }
                }
            } catch (error) {
                console.error('Error loading JDT configuration:', error);
                // Set defaults if there's an error
                setAvailableLanguages(['English']);
                setLanguage('English');
                setSettings({ timeLimit: 0, numberOfQuestions: 5, aiGeneratedQuestions: 0 });
            }
        };

        loadConfig();
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (name && roleCategory) {
            onFormSubmit({ name, roleCategory, language: language || 'English' });
        }
    };
    
    const totalQuestions = (settings.numberOfQuestions || 0) + (settings.aiGeneratedQuestions || 0);

    return (
        <div className="w-full max-w-5xl mx-auto animate-fadeIn p-4">
            <div className="text-center mb-6">
                <h1 className="text-3xl font-semibold text-foreground">Welcome to</h1>
                <h2 className="text-4xl font-bold text-gray-800 mt-1">Job Description Test</h2>
                <p className="text-gray-600 mt-2 text-base">Demonstrate your skills against a real-world job description.</p>
            </div>
            
             <Card className="bg-card/60 backdrop-blur-xl border border-border mb-6 shadow-lg overflow-hidden">
                <CardContent className="p-0 flex flex-col md:flex-row">
                    <div className="bg-primary text-primary-foreground p-6 flex flex-col justify-between items-center text-center w-full md:w-1/4">
                        <div className="w-full">
                            <p className="font-bold text-lg leading-tight">TOTAL</p>
                            <p className="text-sm">Questions</p>
                            <p className="text-5xl font-bold">{totalQuestions}</p>
                        </div>
                        <div className="w-full border-t border-white/50 my-4"></div>
                        <div className="w-full">
                           <p className="text-sm">Test Time</p>
                           <p className="font-bold text-lg -mt-1">{settings.timeLimit > 0 ? `${settings.timeLimit}:00` : 'Untimed'}</p>
                        </div>
                    </div>
                    <div className="bg-accent text-accent-foreground p-6 flex flex-col justify-between items-center text-center w-full md:w-1/4">
                        <div className="w-full">
                            <h3 className="font-bold text-lg mb-2">QUESTIONS</h3>
                            <div className="space-y-2 self-start text-left">
                                <QuestionDetailItem>Job Description based questions</QuestionDetailItem>
                                <QuestionDetailItem>Record video/audio answers</QuestionDetailItem>
                                <QuestionDetailItem>AI-powered analysis</QuestionDetailItem>
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
                            <InstructionItem>Ensure your camera and microphone are enabled and working.</InstructionItem>
                            <InstructionItem>"Record" your answer, then "Stop" when finished. Your speech will be transcribed in real-time as you speak.</InstructionItem>
                            <InstructionItem>Review your transcribed answer and then "Submit" to save it.</InstructionItem>
                            <InstructionItem>You can navigate between questions before finishing the test.</InstructionItem>
                            <InstructionItem>Keep it real life, stay spontaneous. <span className="font-bold">Do not overthink</span> a response.</InstructionItem>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <form onSubmit={handleSubmit}>
                <div className="grid md:grid-cols-2 gap-6 items-start mb-6">
                    <div className="space-y-4">
                        <Label htmlFor="name">Your Name</Label>
                        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Jane Doe" required />
                    </div>
                    <div className="space-y-4">
                        <Label htmlFor="role">Role / Position Being Assessed</Label>
                        <Select value={roleCategory} onValueChange={setRoleCategory} required>
                            <SelectTrigger id="role">
                                <SelectValue placeholder="Select a role..." />
                            </SelectTrigger>
                            <SelectContent>
                                {availableRoles.length > 0 ? (
                                     availableRoles.map(role => (
                                        <SelectItem key={role} value={role}>{role}</SelectItem>
                                     ))
                                ) : (
                                    <SelectItem value="Not Found" disabled>No roles configured</SelectItem>
                                )}
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="space-y-4">
                        <Label htmlFor="language" className="flex items-center gap-2"><Languages className="h-4 w-4" /> Preferred Language</Label>
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
                </div>

                <div className="flex justify-center my-6">
                    <Button type="submit" size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg rounded-full px-8" disabled={!name || !roleCategory || availableRoles.length === 0}>
                        Proceed <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                </div>
            </form>

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

    