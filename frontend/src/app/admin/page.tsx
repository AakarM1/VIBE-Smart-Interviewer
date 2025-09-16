
'use client';

import React, { ReactNode, useState, useEffect } from 'react';
import { useAuth, ProtectedRoute } from '@/contexts/auth-context';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Briefcase, LogOut, FileSearch, Users, BadgeCheck, Settings, MessageSquare, Mic, Type, Video, Eye, EyeOff, Languages, PlusCircle, Trash2 } from 'lucide-react';
import Link from 'next/link';
import Header from '@/components/header';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import type { InterviewMode } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { configurationService } from '@/lib/config-service';

interface GlobalSettings {
    replyMode: InterviewMode;
    showReport: boolean;
    isJdtEnabled: boolean;
    isSjtEnabled: boolean;
    languages: string[];
}

const AdminDashboard = () => {
    const { logout } = useAuth();
    const { toast } = useToast();
    const [settings, setSettings] = useState<GlobalSettings>({
        replyMode: 'video',
        showReport: true,
        isJdtEnabled: true,
        isSjtEnabled: true,
        languages: ['English'],
    });

    useEffect(() => {
        const loadSettings = async () => {
            try {
                console.log('🔧 Loading global settings from database...');
                const savedSettings = await configurationService.getGlobalSettings();
                if (savedSettings) {
                    setSettings(prev => ({ 
                        ...prev, 
                        ...savedSettings,
                        languages: savedSettings.languages && savedSettings.languages.length > 0 ? savedSettings.languages : ['English'],
                    }));
                }
                console.log('✅ Global settings loaded from database');
            } catch (error) {
                console.error('❌ Error loading global settings from database:', error);
            }
        };

        loadSettings();
    }, []);

    const handleSaveSettings = async () => {
        try {
            // Save global settings first
            const success = await configurationService.saveGlobalSettings(settings);
            if (!success) {
                throw new Error('Failed to save settings');
            }
            
            // Initialize translation catalogs for any new languages
            const initPromises = settings.languages.map(async (languageName) => {
                if (languageName === 'English') return; // Skip English
                
                try {
                    // Detect language code from name (basic mapping)
                    const detectLanguageCode = (name: string): string => {
                        const lowerName = name.toLowerCase();
                        const nameToCode: Record<string, string> = {
                            'spanish': 'es', 'español': 'es',
                            'french': 'fr', 'français': 'fr',
                            'german': 'de', 'deutsch': 'de',
                            'arabic': 'ar', 'العربية': 'ar',
                            'chinese': 'zh', '中文': 'zh',
                            'japanese': 'ja', '日本語': 'ja',
                            'korean': 'ko', '한국어': 'ko',
                            'portuguese': 'pt', 'português': 'pt',
                            'russian': 'ru', 'русский': 'ru',
                            'italian': 'it', 'italiano': 'it',
                            'dutch': 'nl', 'nederlands': 'nl',
                            'hindi': 'hi', 'हिन्दी': 'hi',
                            'urdu': 'ur', 'اردو': 'ur'
                        };
                        return nameToCode[lowerName] || 'auto';
                    };
                    
                    const languageCode = detectLanguageCode(languageName);
                    
                    // Call catalog initialization API
                    const response = await fetch('/api/i18n/init', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            language: languageName,
                            languageCode: languageCode
                        }),
                    });
                    
                    if (response.ok) {
                        const result = await response.json();
                        console.log(`✅ Initialized catalog for ${languageName}:`, result);
                    } else {
                        console.warn(`⚠️ Failed to initialize catalog for ${languageName}`);
                    }
                } catch (error) {
                    console.warn(`⚠️ Error initializing catalog for ${languageName}:`, error);
                }
            });
            
            // Wait for all catalog initializations (but don't fail if some fail)
            await Promise.allSettled(initPromises);
            
            toast({
                title: 'Settings Saved',
                description: 'Global settings have been updated and translation catalogs initialized.',
            });
        } catch (error) {
            console.error('Error saving global settings:', error);
            toast({
                variant: 'destructive',
                title: 'Save Failed',
                description: 'Failed to save global settings to the database. Please try again.',
            });
        }
    };
    
    const handleLanguageChange = (index: number, value: string) => {
        const newLanguages = [...settings.languages];
        newLanguages[index] = value;
        setSettings(s => ({ ...s, languages: newLanguages.filter(l => l.trim() !== '') }));
      };
    
      const addLanguage = () => {
        setSettings(s => ({ ...s, languages: [...s.languages, ''] }));
      };
      
      const removeLanguage = (index: number) => {
        if(settings.languages.length <= 1) return;
        const newLanguages = settings.languages.filter((_, i) => i !== index);
        setSettings(s => ({ ...s, languages: newLanguages }));
      };


    return (
      <>
        <Header />
        <div className="container mx-auto px-4 sm:px-8 py-8">
            <header className="mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-4xl font-headline text-gray-800">Admin Dashboard</h1>
                    <p className="text-muted-foreground">Configure interview types and manage the platform.</p>
                </div>
                <Button onClick={logout} variant="outline">
                    <LogOut className="mr-2 h-4 w-4" />
                    Admin Logout
                </Button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <Card className="md:col-span-2 lg:col-span-3 bg-card/60 backdrop-blur-xl">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Settings /> Global Settings</CardTitle>
                        <CardDescription>These settings apply to all assessments unless overridden.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                         <div className="space-y-6">
                            <div>
                                <Label className="flex items-center gap-2 mb-2"><MessageSquare /> Reply Mode</Label>
                                <RadioGroup
                                    value={settings.replyMode}
                                    onValueChange={(value: InterviewMode) => setSettings(s => ({...s, replyMode: value}))}
                                    className="flex flex-col gap-2 pt-2"
                                >
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="video" id="video" />
                                        <Label htmlFor="video" className="flex items-center gap-2"><Video/> Video + Audio</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="audio" id="audio" />
                                        <Label htmlFor="audio" className="flex items-center gap-2"><Mic/> Audio Only</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="text" id="text" />
                                        <Label htmlFor="text" className="flex items-center gap-2"><Type/> Text Only</Label>
                                    </div>
                                </RadioGroup>
                                 <p className="text-xs text-muted-foreground mt-2">Choose how candidates will submit answers for all tests.</p>
                            </div>
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">Report Visibility</Label>
                                <div className="flex items-center space-x-2 pt-2">
                                    <Switch
                                        id="show-report-switch"
                                        checked={settings.showReport}
                                        onCheckedChange={(checked) => setSettings(s => ({ ...s, showReport: checked }))}
                                    />
                                    <Label htmlFor="show-report-switch" className="flex items-center gap-2">
                                        {settings.showReport ? <Eye className="h-4 w-4"/> : <EyeOff className="h-4 w-4"/>}
                                        Show Report to Candidate
                                    </Label>
                                </div>
                                 <p className="text-xs text-muted-foreground mt-2">If off, candidate sees a thank you message instead of results.</p>
                            </div>
                         </div>

                         <div className="space-y-6">
                            <div className="space-y-2">
                                 <Label className="flex items-center gap-2"><Languages /> Available Languages</Label>
                                 <div className="space-y-2">
                                    {settings.languages.map((lang, index) => (
                                        <div key={index} className="flex items-center gap-2">
                                            <Input
                                                value={lang}
                                                onChange={(e) => handleLanguageChange(index, e.target.value)}
                                                placeholder="e.g., English"
                                            />
                                            {settings.languages.length > 1 && (
                                                <Button variant="ghost" size="icon" onClick={() => removeLanguage(index)} type="button">
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            )}
                                        </div>
                                    ))}
                                 </div>
                                <Button variant="outline" size="sm" onClick={addLanguage} type="button">
                                    <PlusCircle className="mr-2 h-4 w-4" /> Add Language
                                </Button>
                            </div>
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">Enabled Assessments</Label>
                                <div className="flex flex-col gap-2 pt-2">
                                    <div className="flex items-center space-x-2">
                                        <Switch
                                            id="enable-jdt-switch"
                                            checked={settings.isJdtEnabled}
                                            onCheckedChange={(checked) => setSettings(s => ({ ...s, isJdtEnabled: checked }))}
                                        />
                                        <Label htmlFor="enable-jdt-switch" className="flex items-center gap-2">
                                            <Briefcase className="h-4 w-4"/> Enable JDT
                                        </Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Switch
                                            id="enable-sjt-switch"
                                            checked={settings.isSjtEnabled}
                                            onCheckedChange={(checked) => setSettings(s => ({ ...s, isSjtEnabled: checked }))}
                                        />
                                        <Label htmlFor="enable-sjt-switch" className="flex items-center gap-2">
                                            <FileText className="h-4 w-4"/> Enable SJT
                                        </Label>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </CardContent>
                    <CardFooter>
                        <Button onClick={handleSaveSettings}>Save Global Settings</Button>
                    </CardFooter>
                </Card>

                <Link href="/admin/sjt" className="block hover:no-underline">
                    <AdminConfigCard
                        icon={<FileText className="h-8 w-8 text-primary" />}
                        title="Situational Judgement Test"
                        description="Configure situations with best/worst answers and assign competencies."
                    />
                </Link>
                <Link href="/admin/jd" className="block hover:no-underline">
                    <AdminConfigCard
                        icon={<Briefcase className="h-8 w-8 text-primary" />}
                        title="Job Description Based"
                        description="Paste a Job Description to generate relevant questions and assess skills."
                    />
                </Link>
                 <Link href="/admin/submissions" className="block hover:no-underline">
                    <AdminConfigCard
                        icon={<FileSearch className="h-8 w-8 text-primary" />}
                        title="View Submissions"
                        description="Review and analyze completed candidate interview reports."
                    />
                </Link>
                 <Link href="/admin/users" className="block hover:no-underline">
                    <AdminConfigCard
                        icon={<Users className="h-8 w-8 text-primary" />}
                        title="User Management"
                        description="Add, view, and manage candidate and admin user accounts."
                    />
                </Link>
                 <Link href="/admin/verdict" className="block hover:no-underline col-span-1 md:col-span-2 lg:col-span-1">
                    <AdminConfigCard
                        icon={<BadgeCheck className="h-8 w-8 text-primary" />}
                        title="Final Verdict"
                        description="Synthesize JDT and SJT results for a final hiring recommendation."
                    />
                </Link>
            </div>
        </div>
      </>
    );
};

interface AdminConfigCardProps {
    icon: ReactNode;
    title: string;
    description: string;
}

const AdminConfigCard = ({ icon, title, description }: AdminConfigCardProps) => (
    <Card className="bg-card border-border hover:border-primary/50 transition-colors h-full flex flex-col hover:shadow-lg">
        <CardHeader className="flex-grow">
            <div className="mb-4">{icon}</div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
             <Button className="w-full" variant="outline">
                Configure / View
            </Button>
        </CardContent>
    </Card>
);


const AdminPage = () => {
  return (
    <ProtectedRoute adminOnly>
      <AdminDashboard />
    </ProtectedRoute>
  );
};

export default AdminPage;
