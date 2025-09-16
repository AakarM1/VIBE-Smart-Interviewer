
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import type { Submission } from '@/types';

// Define the user type
interface User {
  id: string;
  email: string;
  candidateName: string;
  candidateId: string;
  clientName: string;
  role: string;
  password?: string; // only for creation, not stored in state
}

// Define the auth context type
interface AuthContextType {
  user: User | null;
  login: (email: string, pass: string) => boolean;
  logout: () => void;
  register: (details: Omit<User, 'id'> & {password: string}) => boolean;
  loading: boolean;
  saveSubmission: (submission: Omit<Submission, 'id' | 'date'>) => void;
  getSubmissions: () => Submission[];
  getSubmissionById: (id: string) => Submission | null;
  deleteSubmission: (id: string) => void;
  clearAllSubmissions: () => void;
  getUsers: () => User[];
  deleteUser: (userId: string) => void;
  updateUser: (userId: string, updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Dummy user data in localStorage for prototyping
const USERS_KEY = 'verbal-insights-users';
const SESSION_KEY = 'verbal-insights-session';
const SUBMISSIONS_KEY = 'verbal-insights-submissions';
const ADMIN_EMAIL = 'admin@gmail.com';

const getInitialUser = (): User | null => {
  if (typeof window === 'undefined') return null;
  const session = localStorage.getItem(SESSION_KEY);
  return session ? JSON.parse(session) : null;
};


export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(getInitialUser);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const storedUser = getInitialUser();
    setUser(storedUser);
    // Seed default users if they don't exist for easier testing
    if (typeof window !== 'undefined') {
        let users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
        
        const candidateEmail = 'p1@gmail.com';

        const adminExists = users.some((u: any) => u.email === ADMIN_EMAIL);
        const candidateExists = users.some((u: any) => u.email === candidateEmail);

        let updated = false;

        if (!adminExists) {
            users.push({
                id: 'admin-user-seeded',
                email: ADMIN_EMAIL,
                password: 'admin@123',
                candidateName: 'Admin User',
                candidateId: 'ADMIN001',
                clientName: 'Trajectorie',
                role: 'Administrator',
            });
            updated = true;
        }
        
        if (!candidateExists) {
            users.push({
                id: 'candidate-user-seeded',
                email: candidateEmail,
                password: 'p1@123',
                candidateName: 'Test Candidate One',
                candidateId: 'P1-001',
                clientName: 'TVS Credit',
                role: 'Territory Manager',
            });
            updated = true;
        }

        if (updated) {
            localStorage.setItem(USERS_KEY, JSON.stringify(users));
        }
    }
    setLoading(false);
  }, []);
  
  const login = (email: string, pass: string): boolean => {
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    const foundUser = users.find((u: any) => u.email === email && u.password === pass); // Insecure, for demo only
    
    if (foundUser) {
      const { password, ...userToStore } = foundUser;
      localStorage.setItem(SESSION_KEY, JSON.stringify(userToStore));
      setUser(userToStore);
      if (userToStore.email === ADMIN_EMAIL) {
        router.push('/admin');
      } else {
        router.push('/');
      }
      return true;
    }
    return false;
  };

  const register = (details: Omit<User, 'id'> & {password: string}): boolean => {
    const users = getUsersWithPasswords();
    const existing = users.find((u: any) => u.email === details.email);
    if (existing) {
      return false; // User already exists
    }
    const newUser = { ...details, id: new Date().toISOString() };
    users.push(newUser);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    return true;
  };

  const logout = () => {
    localStorage.removeItem(SESSION_KEY);
    setUser(null);
    router.push('/login');
  };

  const saveSubmission = (submission: Omit<Submission, 'id' | 'date'>) => {
    if (typeof window === 'undefined') return;
    try {
        const submissions = getSubmissions();
        const newSubmission: Submission = {
          ...submission,
          id: `sub_${new Date().getTime()}_${Math.random().toString(36).substring(2, 9)}`,
          date: new Date().toISOString(),
        };
        submissions.push(newSubmission);
        localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(submissions));
    } catch (error) {
        console.error("Failed to save submission:", error);
        alert("Could not save submission. Your browser's local storage may be full. Please contact an administrator.");
    }
  }

  const getSubmissions = (): Submission[] => {
      if (typeof window === 'undefined') return [];
      const data = localStorage.getItem(SUBMISSIONS_KEY);
      return data ? JSON.parse(data) : [];
  }

  const getSubmissionById = (id: string): Submission | null => {
      if (typeof window === 'undefined') return null;
      const submissions = getSubmissions();
      return submissions.find(s => s.id === id) || null;
  }
  
  const deleteSubmission = (id: string) => {
      if (typeof window === 'undefined') return;
      let submissions = getSubmissions();
      submissions = submissions.filter(s => s.id !== id);
      localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(submissions));
  };
  
  const clearAllSubmissions = () => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(SUBMISSIONS_KEY);
  };

  const getUsersWithPasswords = (): User[] => {
     if (typeof window === 'undefined') return [];
     const data = localStorage.getItem(USERS_KEY);
     return data ? JSON.parse(data) : [];
  }

  const getUsers = (): User[] => {
      if (typeof window === 'undefined') return [];
      const data = getUsersWithPasswords();
      return data.map((u: any) => { const {password, ...user} = u; return user; });
  }
  
  const deleteUser = (userId: string) => {
      if (typeof window === 'undefined') return;
      let users = getUsersWithPasswords();
      users = users.filter((u: User) => u.id !== userId);
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  const updateUser = (userId: string, updates: Partial<User>) => {
    if (typeof window === 'undefined') return;
    let users = getUsersWithPasswords();
    users = users.map(u => (u.id === userId ? { ...u, ...updates } : u));
    localStorage.setItem(USERS_KEY, JSON.stringify(users));

    // If the updated user is the current user, update the session
    if (user?.id === userId) {
      const { password, ...userToStore } = users.find(u => u.id === userId)!;
      localStorage.setItem(SESSION_KEY, JSON.stringify(userToStore));
      setUser(userToStore);
    }
  };


  const contextValue = {
    user,
    login,
    logout,
    register,
    loading,
    saveSubmission,
    getSubmissions,
    getSubmissionById,
    deleteSubmission,
    clearAllSubmissions,
    getUsers,
    deleteUser,
    updateUser,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Component to protect routes
export const ProtectedRoute = ({ children, adminOnly = false }: { children: ReactNode, adminOnly?: boolean }) => {
    const { user, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (loading) return;

        if (!user) {
            if (pathname !== '/login' && pathname !== '/register') {
                router.push('/login');
            }
            return;
        }

        if (adminOnly && user.email !== ADMIN_EMAIL) {
            router.push('/');
            return;
        }

        if (user.email === ADMIN_EMAIL && !pathname.startsWith('/admin')) {
             router.push('/admin');
             return;
        }

        if(user.email !== ADMIN_EMAIL && pathname.startsWith('/admin')) {
            router.push('/');
            return;
        }

    }, [user, loading, router, adminOnly, pathname]);

    if (loading || !user) {
        return (
          <div className="flex h-screen w-full items-center justify-center">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
          </div>
        );
    }
    
    if (adminOnly && user.email !== ADMIN_EMAIL) {
       return (
          <div className="flex h-screen w-full items-center justify-center">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
          </div>
        );
    }

    return <>{children}</>;
};
