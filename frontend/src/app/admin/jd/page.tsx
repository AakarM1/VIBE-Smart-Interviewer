
'use client';

import { useState, useEffect, useMemo } from 'react';
import { ProtectedRoute } from '@/contexts/auth-context';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Briefcase, PlusCircle, Trash2, ArrowLeft, Settings, Clock, ListOrdered, BrainCircuit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import Header from '@/components/header';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { configurationService } from '@/lib/config-service';

const getUniqueId = () => Date.now() + Math.random();


interface QuestionConfig {
  id: number;
  text: string;
  preferredAnswer: string;
  competency: string;
}

interface RoleConfig {
  id: number;
  roleName: string;
  jobDescription: string;
  questions: QuestionConfig[];
}

interface TestSettings {
  timeLimit: number; // in minutes, 0 for no limit
  numberOfQuestions: number;
  aiGeneratedQuestions: number;
}

const JDConfigPage = () => {
  const { toast } = useToast();
  const [roles, setRoles] = useState<RoleConfig[]>([]);
  const [currentRoleId, setCurrentRoleId] = useState<number | null>(null);
  const [settings, setSettings] = useState<TestSettings>({ timeLimit: 0, numberOfQuestions: 5, aiGeneratedQuestions: 0 });

  const addRole = () => {
    const newId = getUniqueId();
    const newRole: RoleConfig = {
      id: newId,
      roleName: 'New Role',
      jobDescription: '',
      questions: [{ id: getUniqueId(), text: '', preferredAnswer: '', competency: '' }]
    };
    setRoles(prev => [...prev, newRole]);
    setCurrentRoleId(newId);
  };


  useEffect(() => {
    const loadConfiguration = async () => {
      try {
        console.log('🔧 Loading JDT configuration from database...');
        const savedConfig = await configurationService.getJDTConfig();
        if (savedConfig) {
          const { roles: savedRoles, settings: savedSettings } = savedConfig;
          if (savedRoles && savedRoles.length > 0) {
            setRoles(savedRoles);
            setCurrentRoleId(savedRoles[0].id);
          } else {
            addRole();
          }
          if (savedSettings) {
            setSettings({
                timeLimit: savedSettings.timeLimit || 0,
                numberOfQuestions: savedSettings.numberOfQuestions || 5,
                aiGeneratedQuestions: savedSettings.aiGeneratedQuestions || 0,
            });
          }
        } else {
          addRole();
        }
        console.log('✅ JDT configuration loaded from database');
      } catch (error) {
        console.error('❌ Error loading JDT configuration from database:', error);
        addRole();
      }
    };

    loadConfiguration();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentRole = useMemo(() => roles.find(r => r.id === currentRoleId), [roles, currentRoleId]);
  const currentQuestions = currentRole?.questions || [];

  const updateRoleField = (id: number, field: keyof Omit<RoleConfig, 'id' | 'questions'>, value: string) => {
    setRoles(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };
  
  const updateRoleJobDescription = (id: number, value: string) => {
    setRoles(prev => prev.map(r => r.id === id ? { ...r, jobDescription: value } : r));
  };

  const handleQuestionChange = (roleId: number, qId: number, field: keyof QuestionConfig, value: string) => {
    setRoles(prev => prev.map(r => {
      if (r.id === roleId) {
        const updatedQuestions = r.questions.map(q => q.id === qId ? { ...q, [field]: value } : q);
        return { ...r, questions: updatedQuestions };
      }
      return r;
    }));
  };

  const addQuestion = (roleId: number) => {
    setRoles(prev => prev.map(r => {
      if (r.id === roleId) {
        const newQuestion: QuestionConfig = { id: getUniqueId(), text: '', preferredAnswer: '', competency: '' };
        return { ...r, questions: [...r.questions, newQuestion] };
      }
      return r;
    }));
  };

  const removeQuestion = (roleId: number, qId: number) => {
    setRoles(prev => prev.map(r => {
      if (r.id === roleId) {
        return { ...r, questions: r.questions.filter(q => q.id !== qId) };
      }
      return r;
    }));
  };

  
  const removeRole = (id: number) => {
    setRoles(prev => {
        const newRoles = prev.filter(r => r.id !== id);
        if (currentRoleId === id) {
            setCurrentRoleId(newRoles.length > 0 ? newRoles[0].id : null);
        }
        return newRoles;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (roles.some(r => !r.roleName || !r.jobDescription || r.questions.some(q => !q.text || !q.preferredAnswer || !q.competency))) {
      toast({
        variant: 'destructive',
        title: 'Incomplete Form',
        description: 'Please fill out all fields for every role and question.',
      });
      return;
    }

    try {
      const configToSave = { roles, settings };
      const success = await configurationService.saveJDTConfig(configToSave);
      
      if (success) {
        toast({
          title: 'Configuration Saved!',
          description: 'The Job Description Based interview configuration has been successfully saved to the database.',
        });
      } else {
        throw new Error('Failed to save configuration');
      }
    } catch (error) {
      console.error('Error saving JDT configuration:', error);
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: 'Failed to save JDT configuration to the database. Please try again.',
      });
    }
  };

  return (
    <>
      <Header />
      <div className="container mx-auto px-4 sm:px-8 py-8">
        <header className="mb-8">
          <h1 className="text-4xl font-headline text-primary flex items-center gap-4">
            <Briefcase className="h-10 w-10" />
            Job Description Based (JDB) Configuration
          </h1>
          <p className="text-muted-foreground">Define roles, questions, and test settings for JDB interviews.</p>
        </header>
        <main>
          <form onSubmit={handleSubmit}>
            <div className="space-y-8">
                <Card className="bg-card/60 backdrop-blur-xl">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Settings />Test Settings</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="time-limit" className="flex items-center gap-2"><Clock /> Time Limit (minutes)</Label>
                            <Input
                                id="time-limit"
                                type="number"
                                value={settings.timeLimit}
                                onChange={(e) => setSettings(s => ({ ...s, timeLimit: parseInt(e.target.value, 10) || 0 }))}
                                placeholder="0 for no limit"
                            />
                            <p className="text-xs text-muted-foreground">Set to 0 for no time limit.</p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="questions-number" className="flex items-center gap-2"><ListOrdered /> Manual Questions</Label>
                            <Input
                                id="questions-number"
                                type="number"
                                value={settings.numberOfQuestions}
                                onChange={(e) => setSettings(s => ({ ...s, numberOfQuestions: parseInt(e.target.value, 10) || 0 }))}
                                placeholder="e.g., 5"
                            />
                            <p className="text-xs text-muted-foreground">Number of questions to use from the list below. 0 for all.</p>
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="ai-questions-number" className="flex items-center gap-2"><BrainCircuit /> AI-Generated Questions</Label>
                            <Input
                                id="ai-questions-number"
                                type="number"
                                value={settings.aiGeneratedQuestions}
                                onChange={(e) => setSettings(s => ({ ...s, aiGeneratedQuestions: parseInt(e.target.value, 10) || 0 }))}
                                placeholder="e.g., 2"
                            />
                            <p className="text-xs text-muted-foreground">Number of questions to generate using AI. 0 for none.</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-card/60 backdrop-blur-xl">
                <CardHeader>
                    <CardTitle>Role Definitions</CardTitle>
                    <CardDescription>
                    Select a role to edit its job description and questions. Each role will be an option for candidates.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center gap-4">
                    <Label htmlFor="role-select" className="flex-shrink-0">Editing Role:</Label>
                    <div className="flex-grow">
                        <Select value={currentRoleId?.toString()} onValueChange={(val) => setCurrentRoleId(Number(val))}>
                            <SelectTrigger id="role-select">
                                <SelectValue placeholder="Select a role..." />
                            </SelectTrigger>
                            <SelectContent>
                                {roles.map(r => (
                                    <SelectItem key={r.id} value={r.id.toString()}>{r.roleName}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <Button variant="outline" onClick={addRole} type="button">
                        <PlusCircle className="mr-2 h-4 w-4" /> New Role
                    </Button>
                    </div>

                    {currentRole && (
                    <div className="space-y-4 p-4 border rounded-md" key={currentRole.id}>
                         <div className="flex justify-between items-center">
                            <h3 className="text-xl font-semibold text-primary">{currentRole.roleName}</h3>
                             {roles.length > 1 && (
                                <Button variant="destructive" size="sm" onClick={() => removeRole(currentRole.id)} type="button">
                                  <Trash2 className="mr-2 h-4 w-4" /> Delete This Role
                                </Button>
                              )}
                         </div>

                        <div className="space-y-2">
                            <Label htmlFor={`role-name-${currentRole.id}`}>Role Name</Label>
                            <Input
                            id={`role-name-${currentRole.id}`}
                            placeholder="e.g., Sales Manager"
                            value={currentRole.roleName}
                            onChange={(e) => updateRoleField(currentRole.id, 'roleName', e.target.value)}
                            required
                            />
                        </div>

                        <div className="space-y-2">
                        <Label htmlFor={`job-description-${currentRole.id}`}>Paste Job Description</Label>
                        <Textarea
                            id={`job-description-${currentRole.id}`}
                            placeholder="Paste the full job description here..."
                            value={currentRole.jobDescription}
                            onChange={(e) => updateRoleJobDescription(currentRole.id, e.target.value)}
                            required
                            rows={8}
                        />
                        </div>

                        <div className="space-y-4 pt-4 border-t">
                        <Label>Custom Questions & AI Guidance for {currentRole.roleName}</Label>
                        {currentQuestions.map((q, index) => (
                            <div key={q.id} className="flex flex-col md:flex-row items-start gap-4 p-4 border rounded-md bg-secondary/30">
                            <div className="flex-grow w-full space-y-4">
                                <div>
                                    <Label htmlFor={`question-text-${q.id}`} className="text-sm font-medium">Question {index + 1}</Label>
                                    <Textarea
                                    id={`question-text-${q.id}`}
                                    placeholder={`Enter the interview question here...`}
                                    value={q.text}
                                    onChange={(e) => handleQuestionChange(currentRole.id, q.id, 'text', e.target.value)}
                                    required
                                    rows={2}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor={`preferred-answer-${q.id}`} className="text-sm font-medium">Preferred Answer Characteristics</Label>
                                    <Textarea
                                    id={`preferred-answer-${q.id}`}
                                    placeholder={`Describe the ideal answer structure, e.g., "The candidate should mention specific metrics..."`}
                                    value={q.preferredAnswer}
                                    onChange={(e) => handleQuestionChange(currentRole.id, q.id, 'preferredAnswer', e.target.value)}
                                    required
                                    rows={3}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor={`competency-${q.id}`} className="text-sm font-medium">Competency Assessed</Label>
                                    <Input
                                    id={`competency-${q.id}`}
                                    placeholder={`e.g., "Strategic Thinking"`}
                                    value={q.competency}
                                    onChange={(e) => handleQuestionChange(currentRole.id, q.id, 'competency', e.target.value)}
                                    required
                                    />
                                </div>
                            </div>
                            {currentQuestions.length > 1 && (
                                <Button variant="ghost" size="icon" onClick={() => removeQuestion(currentRole.id, q.id)} type="button" className="mt-6">
                                <Trash2 className="h-5 w-5 text-destructive" />
                                </Button>
                            )}
                            </div>
                        ))}
                        <Button variant="outline" onClick={() => addQuestion(currentRole.id)} type="button">
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add Question
                        </Button>
                        </div>
                    </div>
                    )}
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
                    Save JDB Configuration
                </Button>
            </CardFooter>
          </form>
        </main>
      </div>
    </>
  );
};

const ProtectedJDConfigPage = () => {
  return (
    <ProtectedRoute>
      <JDConfigPage />
    </ProtectedRoute>
  )
}

export default ProtectedJDConfigPage;

    