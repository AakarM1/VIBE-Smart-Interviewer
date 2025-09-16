
'use client';

import { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/contexts/auth-context';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FileCog, PlusCircle, Trash2, ArrowLeft, Settings, Clock, ListOrdered, BrainCircuit, TrendingDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import Header from '@/components/header';
import { configurationService } from '@/lib/config-service';

const getUniqueId = () => Date.now() + Math.random();

interface Scenario {
  id: number;
  situation: string;
  question: string;
  bestResponseRationale: string;
  worstResponseRationale: string;
  assessedCompetency: string;
}

interface TestSettings {
  timeLimit: number; // in minutes, 0 for no limit
  numberOfQuestions: number;
  questionTimeLimit: number; // per-question time limit in seconds
  aiGeneratedQuestions: number; // DEPRECATED: For backward compatibility only
  followUpCount: number; // Number of AI-generated follow-up questions (NEW)
  followUpPenalty: number; // Percentage penalty for follow-up questions (0-100)
}


const SJTConfigPage = () => {
  const { toast } = useToast();
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [settings, setSettings] = useState<TestSettings>({ 
    timeLimit: 0, 
    numberOfQuestions: 5, 
    questionTimeLimit: 120, 
    aiGeneratedQuestions: 0, // Keep for backward compatibility
    followUpCount: 1, // NEW: Default to 1 follow-up question
    followUpPenalty: 0 
  });


  useEffect(() => {
    const loadConfiguration = async () => {
      try {
        console.log('🔧 Loading SJT configuration from database...');
        const savedConfig = await configurationService.getSJTConfig();
        if (savedConfig) {
          const { scenarios: savedScenarios, settings: savedSettings } = savedConfig;
          if (savedScenarios && savedScenarios.length > 0) {
            setScenarios(savedScenarios);
          } else {
             setScenarios([{ id: getUniqueId(), situation: '', question: '', bestResponseRationale: '', worstResponseRationale: '', assessedCompetency: '' }]);
          }
          if (savedSettings) {
             setSettings({
                timeLimit: savedSettings.timeLimit || 0,
                numberOfQuestions: savedSettings.numberOfQuestions || 5,
                questionTimeLimit: savedSettings.questionTimeLimit || 120,
                aiGeneratedQuestions: savedSettings.aiGeneratedQuestions || 0, // Keep for backward compatibility
                followUpCount: savedSettings.followUpCount ?? savedSettings.aiGeneratedQuestions ?? 1, // Migration logic
                followUpPenalty: savedSettings.followUpPenalty || 0,
             });
          }
        } else {
          setScenarios([{ id: getUniqueId(), situation: '', question: '', bestResponseRationale: '', worstResponseRationale: '', assessedCompetency: '' }]);
        }
        console.log('✅ SJT configuration loaded from database');
      } catch (error) {
        console.error('❌ Error loading SJT configuration from database:', error);
        setScenarios([{ id: getUniqueId(), situation: '', question: '', bestResponseRationale: '', worstResponseRationale: '', assessedCompetency: '' }]);
      }
    };

    loadConfiguration();
  }, []);

  const handleScenarioChange = (id: number, field: keyof Omit<Scenario, 'id'>, value: string) => {
    setScenarios(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const addScenario = () => {
    setScenarios(prev => [...prev, { id: getUniqueId(), situation: '', question: '', bestResponseRationale: '', worstResponseRationale: '', assessedCompetency: '' }]);
  };

  const removeScenario = (id: number) => {
    setScenarios(prev => prev.filter(s => s.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (scenarios.some(s => !s.situation || !s.question || !s.bestResponseRationale || !s.worstResponseRationale || !s.assessedCompetency)) {
      toast({
        variant: 'destructive',
        title: 'Incomplete Form',
        description: 'Please fill out all fields for every scenario.',
      });
      return;
    }

    try {
      const configToSave = { scenarios, settings };
      const success = await configurationService.saveSJTConfig(configToSave);
      
      if (success) {
        toast({
          title: 'Configuration Saved!',
          description: 'The SJT scenarios and settings have been successfully saved to the database.',
        });
      } else {
        throw new Error('Failed to save configuration');
      }
    } catch (error) {
      console.error('Error saving SJT configuration:', error);
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: 'Failed to save SJT configuration to the database. Please try again.',
      });
    }
  };

  return (
    <>
      <Header />
      <div className="container mx-auto px-4 sm:px-8 py-8">
        <header className="mb-8">
          <h1 className="text-4xl font-headline text-primary flex items-center gap-4">
            <FileCog className="h-10 w-10" />
            Situational Judgement Test (SJT) Configuration
          </h1>
          <p className="text-muted-foreground">Create scenarios and manage global settings for the SJT.</p>
        </header>
        <main>
          <form onSubmit={handleSubmit}>
            <div className="space-y-8">
                <Card className="bg-card/60 backdrop-blur-xl">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Settings />Test Settings</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="time-limit" className="flex items-center gap-2"><Clock /> Total Test Time (minutes)</Label>
                            <Input
                                id="time-limit"
                                type="number"
                                value={settings.timeLimit}
                                onChange={(e) => setSettings(s => ({ ...s, timeLimit: parseInt(e.target.value, 10) || 0 }))}
                                placeholder="0 for no limit"
                            />
                            <p className="text-xs text-muted-foreground">Overall test time limit. Set to 0 for no limit.</p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="question-time-limit" className="flex items-center gap-2"><Clock /> Per Question Time (minutes)</Label>
                            <Input
                                id="question-time-limit"
                                type="number"
                                value={settings.questionTimeLimit || 0}
                                onChange={(e) => setSettings(s => ({ ...s, questionTimeLimit: parseInt(e.target.value, 10) || 0 }))}
                                placeholder="e.g., 2 for 2 minutes"
                            />
                            <p className="text-xs text-muted-foreground">Time limit per question. Set to 0 for no limit. Auto-submits when time expires.</p>
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="questions-number" className="flex items-center gap-2"><ListOrdered /> Number of Questions</Label>
                            <Input
                                id="questions-number"
                                type="number"
                                value={settings.numberOfQuestions}
                                onChange={(e) => setSettings(s => ({ ...s, numberOfQuestions: parseInt(e.target.value, 10) || 0 }))}
                                placeholder="e.g., 5"
                            />
                            <p className="text-xs text-muted-foreground">Set to 0 to use all created scenarios.</p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="follow-up-count" className="flex items-center gap-2"><BrainCircuit /> Follow-Up Questions</Label>
                            <Input
                                id="follow-up-count"
                                type="number"
                                min="0"
                                max="5"
                                value={settings.followUpCount}
                                onChange={(e) => setSettings(s => ({ 
                                  ...s, 
                                  followUpCount: Math.min(5, Math.max(0, parseInt(e.target.value, 10) || 0)),
                                  aiGeneratedQuestions: Math.min(5, Math.max(0, parseInt(e.target.value, 10) || 0)) // Keep synced
                                }))}
                                placeholder="e.g., 1"
                            />
                            <p className="text-xs text-muted-foreground">Number of AI-generated follow-up questions per scenario (0-5).</p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="follow-up-penalty" className="flex items-center gap-2"><TrendingDown /> Follow Up Penalty (%)</Label>
                            <Input
                                id="follow-up-penalty"
                                type="number"
                                min="0"
                                max="100"
                                value={settings.followUpPenalty}
                                onChange={(e) => setSettings(s => ({ ...s, followUpPenalty: Math.min(100, Math.max(0, parseInt(e.target.value, 10) || 0)) }))}
                                placeholder="e.g., 10"
                            />
                            <p className="text-xs text-muted-foreground">Percentage penalty applied when follow-up questions are generated.</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-card/60 backdrop-blur-xl">
                <CardHeader>
                    <CardTitle>SJT Scenarios</CardTitle>
                    <CardDescription>
                    Define the situations, questions, and rationale for best/worst responses to guide AI analysis. Each scenario can assess multiple competencies by listing them separated by commas. The number of scenarios you create here will be the number of questions in the test.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {scenarios.map((scenario, index) => (
                    <div key={scenario.id} className="p-4 border rounded-md space-y-4 relative bg-secondary/30">
                        <h3 className="font-semibold text-primary">Scenario {index + 1}</h3>
                        <div className="space-y-2">
                            <Label htmlFor={`situation-${scenario.id}`}>Situation Description</Label>
                            <Textarea id={`situation-${scenario.id}`} placeholder="e.g., A customer is very unhappy with a recent purchase..." value={scenario.situation} onChange={(e) => handleScenarioChange(scenario.id, 'situation', e.target.value)} required rows={3} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor={`question-${scenario.id}`}>Question for Candidate</Label>
                            <Input id={`question-${scenario.id}`} placeholder="e.g., What is your immediate plan of action?" value={scenario.question} onChange={(e) => handleScenarioChange(scenario.id, 'question', e.target.value)} required />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                            <Label htmlFor={`best-response-${scenario.id}`} className="text-green-400">Best Response Rationale</Label>
                            <Textarea id={`best-response-${scenario.id}`} placeholder="e.g., Acknowledge, empathize, and propose a solution..." value={scenario.bestResponseRationale} onChange={(e) => handleScenarioChange(scenario.id, 'bestResponseRationale', e.target.value)} required rows={4}/>
                            </div>
                            <div className="space-y-2">
                            <Label htmlFor={`worst-response-${scenario.id}`} className="text-red-400">Worst Response Rationale</Label>
                            <Textarea id={`worst-response-${scenario.id}`} placeholder="e.g., Become defensive, blame others, or ignore..." value={scenario.worstResponseRationale} onChange={(e) => handleScenarioChange(scenario.id, 'worstResponseRationale', e.target.value)} required rows={4}/>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor={`competency-${scenario.id}`}>Competencies Assessed</Label>
                            <Input 
                                id={`competency-${scenario.id}`} 
                                placeholder="e.g., Customer Focus, Problem Solving, Communication" 
                                value={scenario.assessedCompetency} 
                                onChange={(e) => handleScenarioChange(scenario.id, 'assessedCompetency', e.target.value)} 
                                required 
                            />
                            <p className="text-sm text-muted-foreground">
                                Enter multiple competencies separated by commas. Each competency will be analyzed separately in the report.
                            </p>
                        </div>
                        {scenarios.length > 1 && (
                        <Button variant="ghost" size="icon" onClick={() => removeScenario(scenario.id)} type="button" className="absolute top-2 right-2">
                            <Trash2 className="h-5 w-5 text-destructive" />
                        </Button>
                        )}
                    </div>
                    ))}
                    <Button variant="outline" onClick={addScenario} type="button">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Another Scenario
                    </Button>
                </CardContent>
                </Card>
            </div>
            
            <CardFooter className="flex justify-between mt-8">
                <Link href="/admin" passHref>
                    <Button variant="outline">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Dashboard
                    </Button>
                </Link>
                <Button type="submit">
                Save SJT Configuration
                </Button>
            </CardFooter>
          </form>
        </main>
      </div>
    </>
  );
};

const ProtectedSJTConfigPage = () => {
  return (
    <ProtectedRoute>
      <SJTConfigPage />
    </ProtectedRoute>
  )
}

export default ProtectedSJTConfigPage;

    