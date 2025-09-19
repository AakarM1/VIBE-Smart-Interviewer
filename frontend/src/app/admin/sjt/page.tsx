
'use client';

import { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/contexts/auth-context';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileCog, PlusCircle, Trash2, ArrowLeft, Settings, Clock, ListOrdered, BrainCircuit, TrendingDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import Header from '@/components/header';
import { configurationService } from '@/lib/config-service';
import { apiService } from '@/lib/api-service';

const getUniqueId = () => Date.now() + Math.random();

interface Scenario {
  id: number;
  name?: string; // Optional display name/title for scenario
  situation: string;
  question: string;
  bestResponseRationale: string;
  worstResponseRationale: string;
  assessedCompetency: string;
  // Optional per-scenario overrides
  prepTimeSeconds?: number;
  answerTimeSeconds?: number;
  reRecordLimit?: number;
  ttsVoice?: string;
}

interface TestSettings {
  timeLimit: number; // in minutes, 0 for no limit
  numberOfQuestions: number;
  questionTimeLimit: number; // per-question time limit in seconds
  aiGeneratedQuestions: number; // DEPRECATED: For backward compatibility only
  followUpCount: number; // Number of AI-generated follow-up questions (NEW)
  followUpPenalty: number; // Percentage penalty for follow-up questions (0-100)
  // NEW: Advanced behavior controls
  prepTimeSeconds?: number;
  autoStartRecording?: boolean;
  answerTimeSeconds?: number;
  reRecordLimit?: number;
  ttsEnabled?: boolean;
  ttsVoice?: string;
}


const SJTConfigPage = () => {
  const { toast } = useToast();
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [competencyOptions, setCompetencyOptions] = useState<Array<{ name: string; code?: string }>>([]);
  const [settings, setSettings] = useState<TestSettings>({ 
    timeLimit: 0, 
    numberOfQuestions: 5, 
    questionTimeLimit: 120, 
    aiGeneratedQuestions: 0, // Keep for backward compatibility
    followUpCount: 1, // NEW: Default to 1 follow-up question
    followUpPenalty: 0,
    prepTimeSeconds: 10,
    autoStartRecording: true,
    answerTimeSeconds: 90,
    reRecordLimit: 1,
    ttsEnabled: true,
    ttsVoice: ''
  });


  useEffect(() => {
    const loadConfiguration = async () => {
      try {
        console.log('🔧 Loading SJT configuration from database...');
        const savedConfig = await configurationService.getSJTConfig();
        if (savedConfig) {
          const { scenarios: savedScenarios, settings: savedSettings } = savedConfig;
          if (savedScenarios && savedScenarios.length > 0) {
            // Normalize scenarios to include optional name
            setScenarios(savedScenarios.map((s: any) => ({
              id: s.id,
              name: s.name || '',
              situation: s.situation || '',
              question: s.question || '',
              bestResponseRationale: s.bestResponseRationale || '',
              worstResponseRationale: s.worstResponseRationale || '',
              assessedCompetency: s.assessedCompetency || ''
            })));
          } else {
             setScenarios([{ id: getUniqueId(), name: '', situation: '', question: '', bestResponseRationale: '', worstResponseRationale: '', assessedCompetency: '' }]);
          }
          if (savedSettings) {
             setSettings({
                timeLimit: savedSettings.timeLimit || 0,
                numberOfQuestions: savedSettings.numberOfQuestions || 5,
                questionTimeLimit: savedSettings.questionTimeLimit || 120,
                aiGeneratedQuestions: savedSettings.aiGeneratedQuestions || 0, // Keep for backward compatibility
                followUpCount: savedSettings.followUpCount ?? savedSettings.aiGeneratedQuestions ?? 1, // Migration logic
           followUpPenalty: savedSettings.followUpPenalty || 0,
           prepTimeSeconds: typeof savedSettings.prepTimeSeconds === 'number' ? savedSettings.prepTimeSeconds : 10,
           autoStartRecording: typeof savedSettings.autoStartRecording === 'boolean' ? savedSettings.autoStartRecording : true,
           answerTimeSeconds: typeof savedSettings.answerTimeSeconds === 'number' ? savedSettings.answerTimeSeconds : 90,
                reRecordLimit: typeof savedSettings.reRecordLimit === 'number' ? savedSettings.reRecordLimit : 1,
           ttsEnabled: typeof savedSettings.ttsEnabled === 'boolean' ? savedSettings.ttsEnabled : true,
           ttsVoice: typeof savedSettings.ttsVoice === 'string' ? savedSettings.ttsVoice : ''
             });
          }
        } else {
          setScenarios([{ id: getUniqueId(), name: '', situation: '', question: '', bestResponseRationale: '', worstResponseRationale: '', assessedCompetency: '' }]);
        }
        console.log('✅ SJT configuration loaded from database');
      } catch (error) {
        console.error('❌ Error loading SJT configuration from database:', error);
  setScenarios([{ id: getUniqueId(), name: '', situation: '', question: '', bestResponseRationale: '', worstResponseRationale: '', assessedCompetency: '' }]);
      }
    };

    const loadCompetencies = async () => {
      try {
        const res = await apiService.listCompetencies({ include_inactive: false });
        const items = (res.data || []) as any[];
        const opts = items
          .filter((c) => c && (c.competency_name || c.competency_code))
          .map((c) => ({ name: String(c.competency_name || c.competency_code), code: c.competency_code }));
        setCompetencyOptions(opts);
        console.log(`📚 Loaded ${opts.length} competencies for SJT selector`);
      } catch (e) {
        console.warn('⚠️ Failed to load competencies for SJT config; suggestions disabled');
      }
    };

    loadConfiguration();
    loadCompetencies();
  }, []);

  const handleScenarioChange = (id: number, field: keyof Omit<Scenario, 'id'>, value: string) => {
    setScenarios(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const addScenario = () => {
    setScenarios(prev => [...prev, { id: getUniqueId(), name: '', situation: '', question: '', bestResponseRationale: '', worstResponseRationale: '', assessedCompetency: '' }]);
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

  // Insert selected competency from dropdown into the comma-separated input, avoiding duplicates
  const insertCompetency = (id: number, picked: string) => {
    setScenarios(prev => prev.map(s => {
      if (s.id !== id) return s;
      const current = (s.assessedCompetency || '').split(',').map(x => x.trim()).filter(Boolean);
      if (!current.map(c => c.toLowerCase()).includes(picked.toLowerCase())) {
        current.push(picked);
      }
      return { ...s, assessedCompetency: current.join(', ') };
    }));
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
            <div className="space-y-2">
              <Label htmlFor="prep-time" className="flex items-center gap-2"><Clock /> Prep Time (seconds)</Label>
              <Input
                id="prep-time"
                type="number"
                min="0"
                value={settings.prepTimeSeconds ?? 0}
                onChange={(e) => setSettings(s => ({ ...s, prepTimeSeconds: Math.max(0, parseInt(e.target.value, 10) || 0) }))}
                placeholder="e.g., 10"
              />
              <p className="text-xs text-muted-foreground">Time to prepare before recording starts automatically.</p>
            </div>
            <div className="space-y-2 flex items-center gap-2">
              <input
                id="auto-start"
                type="checkbox"
                className="h-4 w-4"
                checked={!!settings.autoStartRecording}
                onChange={(e) => setSettings(s => ({ ...s, autoStartRecording: e.target.checked }))}
              />
              <Label htmlFor="auto-start">Auto-start Recording after Prep</Label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="answer-time" className="flex items-center gap-2"><Clock /> Answer Time (seconds)</Label>
              <Input
                id="answer-time"
                type="number"
                min="0"
                value={settings.answerTimeSeconds ?? 0}
                onChange={(e) => setSettings(s => ({ ...s, answerTimeSeconds: Math.max(0, parseInt(e.target.value, 10) || 0) }))}
                placeholder="e.g., 90"
              />
              <p className="text-xs text-muted-foreground">If set, recording will auto-stop and submit when time is up.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rerecord-limit">Re-record Limit</Label>
              <Input
                id="rerecord-limit"
                type="number"
                min="0"
                max="5"
                value={settings.reRecordLimit ?? 0}
                onChange={(e) => setSettings(s => ({ ...s, reRecordLimit: Math.min(5, Math.max(0, parseInt(e.target.value, 10) || 0)) }))}
                placeholder="e.g., 1"
              />
              <p className="text-xs text-muted-foreground">Number of times a candidate can re-record an answer (0 = unlimited).</p>
            </div>
            <div className="space-y-2 flex items-center gap-2">
              <input
                id="tts-enabled"
                type="checkbox"
                className="h-4 w-4"
                checked={!!settings.ttsEnabled}
                onChange={(e) => setSettings(s => ({ ...s, ttsEnabled: e.target.checked }))}
              />
              <Label htmlFor="tts-enabled">Enable Text-to-Speech (reads question)</Label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tts-voice">TTS Voice Hint</Label>
              <Input
                id="tts-voice"
                type="text"
                value={settings.ttsVoice || ''}
                onChange={(e) => setSettings(s => ({ ...s, ttsVoice: e.target.value }))}
                placeholder="e.g., Google US English"
              />
              <p className="text-xs text-muted-foreground">Optional: Voice name contains this text (browser voices vary).</p>
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
              <Label htmlFor={`name-${scenario.id}`}>Scenario Name (optional)</Label>
              <Input id={`name-${scenario.id}`} placeholder="e.g., Handling a Difficult Customer" value={scenario.name || ''} onChange={(e) => handleScenarioChange(scenario.id, 'name' as any, e.target.value)} />
            </div>
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
                            {/* Proper dropdown to add competencies without manual typing */}
                            <div className="flex items-center gap-2">
                              <Select onValueChange={(val) => insertCompetency(scenario.id, val)}>
                                <SelectTrigger className="w-[280px]">
                                  <SelectValue placeholder="Add from dictionary..." />
                                </SelectTrigger>
                                <SelectContent className="max-h-64 overflow-y-auto">
                                  {competencyOptions.map((opt, i) => (
                                    <SelectItem key={`${opt.code || opt.name}-${i}`} value={opt.name}>
                                      {opt.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <span className="text-xs text-muted-foreground">Pick to append</span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Enter multiple competencies separated by commas. Each competency will be analyzed separately in the report.
                            </p>
                        </div>
                        {/* Optional per-scenario overrides */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                          <div className="space-y-2">
                            <Label htmlFor={`ov-prep-${scenario.id}`}>Override: Prep Time (sec)</Label>
                            <Input
                              id={`ov-prep-${scenario.id}`}
                              type="number"
                              min="0"
                              value={scenario.prepTimeSeconds ?? ''}
                              onChange={(e) => handleScenarioChange(scenario.id, 'prepTimeSeconds' as any, e.target.value ? String(Math.max(0, parseInt(e.target.value, 10) || 0)) : '')}
                              placeholder="Leave blank to use default"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`ov-ans-${scenario.id}`}>Override: Answer Time (sec)</Label>
                            <Input
                              id={`ov-ans-${scenario.id}`}
                              type="number"
                              min="0"
                              value={scenario.answerTimeSeconds ?? ''}
                              onChange={(e) => handleScenarioChange(scenario.id, 'answerTimeSeconds' as any, e.target.value ? String(Math.max(0, parseInt(e.target.value, 10) || 0)) : '')}
                              placeholder="Leave blank to use default"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`ov-rr-${scenario.id}`}>Override: Re-record Limit</Label>
                            <Input
                              id={`ov-rr-${scenario.id}`}
                              type="number"
                              min="0"
                              max="5"
                              value={scenario.reRecordLimit ?? ''}
                              onChange={(e) => handleScenarioChange(scenario.id, 'reRecordLimit' as any, e.target.value ? String(Math.min(5, Math.max(0, parseInt(e.target.value, 10) || 0))) : '')}
                              placeholder="Leave blank to use default"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`ov-voice-${scenario.id}`}>Override: TTS Voice Hint</Label>
                            <Input
                              id={`ov-voice-${scenario.id}`}
                              type="text"
                              value={scenario.ttsVoice ?? ''}
                              onChange={(e) => handleScenarioChange(scenario.id, 'ttsVoice' as any, e.target.value)}
                              placeholder="e.g., Google US English"
                            />
                          </div>
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

    