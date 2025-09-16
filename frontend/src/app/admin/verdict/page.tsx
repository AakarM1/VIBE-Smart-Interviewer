
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ProtectedRoute, useAuth } from '@/contexts/auth-context';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { BadgeCheck, ArrowLeft, Loader2, AlertTriangle, CheckCircle, XCircle, User } from 'lucide-react';
import Link from 'next/link';
import Header from '@/components/header';
import { useToast } from '@/hooks/use-toast';
import type { Submission } from '@/types';
import type { GenerateFinalVerdictOutput } from '@/ai/flows/generate-final-verdict';

type CandidateWithReports = {
    name: string;
    jdtReport: Submission;
    sjtReport: Submission;
};

const FinalVerdictPage = () => {
    const { getSubmissions } = useAuth();
    const { toast } = useToast();

    const [candidates, setCandidates] = useState<CandidateWithReports[]>([]);
    const [selectedCandidate, setSelectedCandidate] = useState<CandidateWithReports | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [verdict, setVerdict] = useState<GenerateFinalVerdictOutput | null>(null);

    useEffect(() => {
        const loadData = async () => {
            const allSubmissions = await getSubmissions();
            const submissionsByName = allSubmissions.reduce((acc: Record<string, Submission[]>, sub: Submission) => {
                if (!acc[sub.candidateName]) {
                    acc[sub.candidateName] = [];
                }
                acc[sub.candidateName].push(sub);
                return acc;
            }, {} as Record<string, Submission[]>);

            const eligibleCandidates: CandidateWithReports[] = [];
            for (const name in submissionsByName) {
                const latestJDT = submissionsByName[name]
                    .filter((s: Submission) => s.testType === 'JDT')
                    .sort((a: Submission, b: Submission) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
                
                const latestSJT = submissionsByName[name]
                    .filter((s: Submission) => s.testType === 'SJT')
                    .sort((a: Submission, b: Submission) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

                if (latestJDT && latestSJT) {
                    eligibleCandidates.push({
                        name,
                        jdtReport: latestJDT,
                        sjtReport: latestSJT
                    });
                }
            }
            setCandidates(eligibleCandidates);
        };
        
        loadData();
    }, [getSubmissions]);

    const handleSelectCandidate = (candidateName: string) => {
        const candidate = candidates.find(c => c.name === candidateName);
        setSelectedCandidate(candidate || null);
        setVerdict(null); // Reset verdict when changing candidate
    };

    const handleGenerateVerdict = async () => {
        if (!selectedCandidate) return;

        setIsLoading(true);
        setVerdict(null);

        try {
            const result = await fetch('/api/ai/generate-verdict', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    candidateName: selectedCandidate.name,
                    roleCategory: selectedCandidate.jdtReport.report.competencyAnalysis[0]?.competencies[0]?.name || 'General Role', // A bit of a guess for role
                    jobDescriptionTestReport: selectedCandidate.jdtReport.report,
                    situationalJudgementTestReport: selectedCandidate.sjtReport.report,
                })
            }).then(res => res.json());
            setVerdict(result);
            toast({
                title: 'Verdict Generated',
                description: `Final hiring recommendation for ${selectedCandidate.name} is ready.`,
            });
        } catch (error) {
            console.error("Error generating final verdict:", error);
            toast({
                variant: 'destructive',
                title: 'Verdict Generation Failed',
                description: 'Could not generate a final verdict. Please try again.',
            });
        } finally {
            setIsLoading(false);
        }
    };
    
    const recommendationIcon = useMemo(() => {
        if (!verdict) return null;
        switch (verdict.recommendation) {
            case 'Strong Hire': return <CheckCircle className="h-6 w-6 text-green-500" />;
            case 'Hire': return <CheckCircle className="h-6 w-6 text-green-400" />;
            case 'Hire with Reservations': return <AlertTriangle className="h-6 w-6 text-yellow-500" />;
            case 'No Hire': return <XCircle className="h-6 w-6 text-red-500" />;
            default: return null;
        }
    }, [verdict]);

    return (
        <>
            <Header />
            <div className="container mx-auto px-4 sm:px-8 py-8">
                <header className="mb-8 flex justify-between items-center">
                    <div>
                        <h1 className="text-4xl font-headline text-primary flex items-center gap-4">
                            <BadgeCheck className="h-10 w-10" />
                            Final Verdict
                        </h1>
                        <p className="text-muted-foreground">Synthesize JDT and SJT results for a final hiring recommendation.</p>
                    </div>
                     <Link href="/admin" passHref>
                        <Button variant="outline">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Dashboard
                        </Button>
                    </Link>
                </header>
                <main>
                    <Card className="bg-card/60 backdrop-blur-xl">
                        <CardHeader>
                            <CardTitle>Select a Candidate</CardTitle>
                            <CardDescription>
                                Choose a candidate who has completed both the JDT and SJT assessments to generate a final verdict.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center gap-4">
                               <Label htmlFor="candidate-select" className="flex items-center gap-2"><User /> Candidate:</Label>
                                <Select onValueChange={handleSelectCandidate} disabled={candidates.length === 0}>
                                    <SelectTrigger id="candidate-select" className="max-w-xs">
                                        <SelectValue placeholder="Select a candidate..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {candidates.map(c => (
                                            <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            {candidates.length === 0 && (
                                <p className="text-sm text-muted-foreground">No candidates have completed both test types yet.</p>
                            )}
                        </CardContent>
                        <CardFooter>
                            <Button onClick={handleGenerateVerdict} disabled={!selectedCandidate || isLoading}>
                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BadgeCheck className="mr-2 h-4 w-4" />}
                                {isLoading ? 'Generating...' : 'Generate Final Verdict'}
                            </Button>
                        </CardFooter>
                    </Card>

                    {verdict && (
                        <Card className="mt-8 bg-card/60 backdrop-blur-xl animate-fadeIn">
                            <CardHeader>
                                <CardTitle className="text-2xl text-primary">Verdict for {selectedCandidate?.name}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="p-4 border rounded-lg bg-secondary/30">
                                    <h3 className="text-lg font-semibold mb-2 flex items-center gap-3">
                                        {recommendationIcon}
                                        Recommendation: <span className="text-primary">{verdict.recommendation}</span>
                                    </h3>
                                    <p className="text-muted-foreground whitespace-pre-wrap">{verdict.justification}</p>
                                </div>
                                 <div className="p-4 border rounded-lg bg-secondary/30">
                                    <h3 className="text-lg font-semibold mb-2">Final Summary</h3>
                                    <p className="text-muted-foreground whitespace-pre-wrap">{verdict.finalVerdict}</p>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </main>
            </div>
        </>
    );
};


const ProtectedFinalVerdictPage = () => (
    <ProtectedRoute adminOnly>
        <FinalVerdictPage />
    </ProtectedRoute>
);

export default ProtectedFinalVerdictPage;
