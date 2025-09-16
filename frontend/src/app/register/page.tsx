
'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Loader2, UserPlus } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [candidateName, setCandidateName] = useState('');
  const [candidateId, setCandidateId] = useState('');
  const [clientName, setClientName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [submitted, setSubmitted] = useState(false);

  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault();
    console.log('handleRegister called, submitted:', submitted, 'isLoading:', isLoading);
    
    if (submitted || isLoading) {
      console.log('Blocking duplicate submission');
      return; // guard against double submit
    }
    
    setSubmitted(true);
    setIsLoading(true);
    
    console.log('Starting registration for:', email.trim().toLowerCase());
    
    try {
      const success = await register({
        email: email.trim().toLowerCase(),
        password,
        candidate_name: candidateName.trim(),
        candidate_id: candidateId.trim(),
        client_name: clientName.trim(),
      });

      console.log('Registration result:', success);

      if (success) {
        toast({
          title: 'Registration Successful',
          description: 'You can now log in with your new account.',
        });
        router.push('/login');
      } else {
        // Distinguish duplicate vs general failure using auth context error if desired later
        toast({
          variant: 'destructive',
          title: 'Registration Failed',
          description: 'Account may already exist or registration disabled.',
        });
        setSubmitted(false); // allow retry on failure
      }
    } catch (error) {
      console.error('Registration error:', error);
      toast({
        variant: 'destructive',
        title: 'Registration Error',
        description: 'An error occurred during registration. Please try again.',
      });
      setSubmitted(false);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
     <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md animate-fadeIn shadow-lg bg-card/60 backdrop-blur-xl border-border text-card-foreground">
            <CardHeader>
                <CardTitle className="text-2xl font-headline text-primary">Create an Account</CardTitle>
                <CardDescription>Fill out the details below to get started.</CardDescription>
            </CardHeader>
            <form onSubmit={handleRegister}>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="candidateName">Candidate Name</Label>
                        <Input id="candidateName" placeholder="Jane Doe" required value={candidateName} onChange={e => setCandidateName(e.target.value)} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" placeholder="you@example.com" required value={email} onChange={e => setEmail(e.target.value)} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="candidateId">Candidate ID</Label>
                        <Input id="candidateId" placeholder="E.g., Employee ID or Applicant #" required value={candidateId} onChange={e => setCandidateId(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <Input id="password" type="password" required value={password} onChange={e => setPassword(e.target.value)} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="clientName">Company / Client Name</Label>
                        <Input id="clientName" placeholder="TechCorp" required value={clientName} onChange={e => setClientName(e.target.value)} />
                    </div>
                    
                </CardContent>
                <CardFooter className="flex flex-col gap-4">
                    <Button type="submit" size="lg" className="w-full" disabled={isLoading}>
                        {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <UserPlus className="mr-2 h-5 w-5" />}
                        Register
                    </Button>
                     <p className="text-sm text-muted-foreground">
                        Already have an account?{' '}
                        <Link href="/login" className="text-primary hover:underline">
                            Login here
                        </Link>
                    </p>
                </CardFooter>
            </form>
        </Card>
     </div>
  );
}
