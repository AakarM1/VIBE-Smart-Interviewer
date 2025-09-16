
'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Loader2, LogIn, BrainCircuit } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';


export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [shouldRedirect, setShouldRedirect] = useState(false);
  const { login, user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  // Watch for user changes after login and redirect accordingly
  useEffect(() => {
    if (shouldRedirect && user) {
      console.log('👤 User context updated after login:', user);
      console.log('🔑 User role:', user.role);
      
      if (user.role === 'superadmin') {
        console.log('🔑 SuperAdmin user detected, redirecting to superadmin dashboard');
        router.push('/superadmin');
      } else if (user.role === 'admin') {
        console.log('🔑 Admin user detected, redirecting to admin dashboard');
        router.push('/admin');
      } else {
        console.log('👤 Regular user detected, redirecting to user dashboard');
        router.push('/');
      }
      setShouldRedirect(false);
    }
  }, [user, shouldRedirect, router]);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    
    try {
  const success = await login(email, password);
      if (success) {
        toast({
          title: 'Login Successful',
          description: 'Welcome back! Redirecting to dashboard...',
        });
        setShouldRedirect(true); // Trigger redirect when user context updates
      } else {
        toast({
          variant: 'destructive',
          title: 'Login Failed',
          description: 'Invalid email or password. Please try again.',
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      toast({
        variant: 'destructive',
        title: 'Login Error',
        description: 'An error occurred during login. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
     <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50">
        <div className="text-center mb-8">
             <Image src="/logo.jpg" alt="Trajectorie Logo" width={200} height={43} priority />
        </div>

        <Card className="w-full max-w-md animate-fadeIn shadow-lg bg-card border-border text-card-foreground">
            <CardHeader>
                <CardTitle className="text-2xl font-headline text-gray-800">Welcome Back</CardTitle>
                <CardDescription>Enter your credentials to access your account.</CardDescription>
            </CardHeader>
            <form onSubmit={handleLogin}>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" placeholder="you@example.com" required value={email} onChange={e => setEmail(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <Input id="password" type="password" required value={password} onChange={e => setPassword(e.target.value)} />
                    </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-4">
                    <Button type="submit" size="lg" className="w-full" disabled={isLoading}>
                        {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <LogIn className="mr-2 h-5 w-5" />}
                        Login
                    </Button>
                    <p className="text-sm text-muted-foreground">
                        Don't have an account?{' '}
                        <Link href="/register" className="text-primary hover:underline">
                            Register here
                        </Link>
                    </p>
                </CardFooter>
            </form>
        </Card>
     </div>
  );
}
