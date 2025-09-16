'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import type { Submission } from '@/types';
import { 
  userService, 
  submissionService, 
  convertFirestoreSubmission,
  type FirestoreUser 
} from '@/lib/database';
import { getStorageConfig } from '@/lib/storage-config';

// 🔒 CRITICAL FIX: Add missing isFirestoreAvailable function
const isFirestoreAvailable = (): boolean => {
  const config = getStorageConfig();
  return config.useFirestore;
};

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
  login: (email: string, pass: string) => Promise<boolean>;
  logout: () => void;
  register: (details: Omit<User, 'id'> & {password: string}) => Promise<boolean>;
  loading: boolean;
  saveSubmission: (submission: Omit<Submission, 'id' | 'date'>) => Promise<void>;
  getSubmissions: () => Promise<Submission[]>;
  getSubmissionById: (id: string) => Promise<Submission | null>;
  deleteSubmission: (id: string) => Promise<void>;
  clearAllSubmissions: () => Promise<void>;
  getUsers: () => Promise<User[]>;
  deleteUser: (userId: string) => Promise<void>;
  updateUser: (userId: string, updates: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Fallback keys for localStorage (when Firestore is unavailable)
const USERS_KEY = 'verbal-insights-users';
const SESSION_KEY = 'verbal-insights-session';
const SUBMISSIONS_KEY = 'verbal-insights-submissions';
const ADMIN_EMAIL = 'admin@gmail.com';

// Check if we should use Firestore (now primary) or fallback to localStorage
const useFirestore = () => {
  // Always try to use Firestore unless explicitly disabled
  return typeof window !== 'undefined' && 
         process.env.NEXT_PUBLIC_USE_LOCALSTORAGE !== 'true';
};

const getInitialUser = (): User | null => {
  if (typeof window === 'undefined') return null;
  const session = localStorage.getItem(SESSION_KEY);
  return session ? JSON.parse(session) : null;
};

// Convert Firestore user to regular user
const convertFirestoreUser = (fsUser: FirestoreUser): User => {
  return {
    id: fsUser.id,
    email: fsUser.email,
    candidateName: fsUser.candidateName,
    candidateId: fsUser.candidateId,
    clientName: fsUser.clientName,
    role: fsUser.role
  };
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(getInitialUser);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const initializeAuth = async () => {
      const storedUser = getInitialUser();
      setUser(storedUser);
      
      // Seed default users for testing
      await seedDefaultUsers();
      setLoading(false);
    };
    
    initializeAuth();
  }, []);

  const seedDefaultUsers = async () => {
    const candidateEmail = 'p1@gmail.com';
    
    if (useFirestore()) {
      try {
        // Check and create admin user
        const adminUser = await userService.getByEmail(ADMIN_EMAIL);
        if (!adminUser) {
          await userService.create({
            email: ADMIN_EMAIL,
            passwordHash: 'admin@123', // In real app, this should be hashed
            candidateName: 'Admin User',
            candidateId: 'ADMIN001',
            clientName: 'Trajectorie',
            role: 'Administrator',
          });
        }

        // Check and create test candidate
        const candidateUser = await userService.getByEmail(candidateEmail);
        if (!candidateUser) {
          await userService.create({
            email: candidateEmail,
            passwordHash: 'p1@123', // In real app, this should be hashed
            candidateName: 'Test Candidate One',
            candidateId: 'P1-001',
            clientName: 'TVS Credit',
            role: 'Territory Manager',
          });
        }
      } catch (error) {
        console.error('Error seeding users in Firestore:', error);
        // Fall back to localStorage
        await seedUsersLocalStorage();
      }
    } else {
      await seedUsersLocalStorage();
    }
  };

  const seedUsersLocalStorage = async () => {
    if (typeof window === 'undefined') return;
    
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
  };

  const login = async (email: string, pass: string): Promise<boolean> => {
    if (isFirestoreAvailable()) {
      try {
        const foundUser = await userService.getByEmail(email);
        if (foundUser && foundUser.passwordHash === pass) { // In real app, compare hashed passwords
          const userToStore = convertFirestoreUser(foundUser);
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
      } catch (error) {
        console.error('Firestore login error, falling back to localStorage:', error);
        return loginLocalStorage(email, pass);
      }
    } else {
      return loginLocalStorage(email, pass);
    }
  };

  const loginLocalStorage = (email: string, pass: string): boolean => {
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    const foundUser = users.find((u: any) => u.email === email && u.password === pass);
    
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

  const register = async (details: Omit<User, 'id'> & {password: string}): Promise<boolean> => {
    if (isFirestoreAvailable()) {
      try {
        const existing = await userService.getByEmail(details.email);
        if (existing) return false;
        
        const userId = await userService.create({
          email: details.email,
          passwordHash: details.password, // In real app, hash this
          candidateName: details.candidateName,
          candidateId: details.candidateId,
          clientName: details.clientName,
          role: details.role
        });
        
        return userId !== null;
      } catch (error) {
        console.error('Firestore register error, falling back to localStorage:', error);
        return registerLocalStorage(details);
      }
    } else {
      return registerLocalStorage(details);
    }
  };

  const registerLocalStorage = (details: Omit<User, 'id'> & {password: string}): boolean => {
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    const existing = users.find((u: any) => u.email === details.email);
    if (existing) return false;
    
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

  const saveSubmission = async (submission: Omit<Submission, 'id' | 'date'>) => {
    if (isFirestoreAvailable()) {
      try {
        await submissionService.create(submission);
        return;
      } catch (error) {
        console.error('Firestore saveSubmission error, falling back to localStorage:', error);
      }
    }
    
    // Fallback to localStorage
    if (typeof window === 'undefined') return;
    try {
      const submissions = JSON.parse(localStorage.getItem(SUBMISSIONS_KEY) || '[]');
      const newSubmission: Submission = {
        ...submission,
        id: `sub_${new Date().getTime()}_${Math.random().toString(36).substring(2, 9)}`,
        date: new Date().toISOString(),
      };
      submissions.push(newSubmission);
      localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(submissions));
    } catch (error) {
      console.error('Error saving submission to localStorage:', error);
    }
  };

  const getSubmissions = async (): Promise<Submission[]> => {
    if (isFirestoreAvailable()) {
      try {
        const firestoreSubmissions = await submissionService.getAll();
        return firestoreSubmissions.map(convertFirestoreSubmission);
      } catch (error) {
        console.error('Firestore getSubmissions error, falling back to localStorage:', error);
      }
    }
    
    // Fallback to localStorage
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(SUBMISSIONS_KEY);
    return data ? JSON.parse(data) : [];
  };

  const getSubmissionById = async (id: string): Promise<Submission | null> => {
    if (isFirestoreAvailable()) {
      try {
        const firestoreSubmission = await submissionService.getById(id);
        return firestoreSubmission ? convertFirestoreSubmission(firestoreSubmission) : null;
      } catch (error) {
        console.error('Firestore getSubmissionById error, falling back to localStorage:', error);
      }
    }
    
    // Fallback to localStorage
    const submissions = await getSubmissions();
    return submissions.find(s => s.id === id) || null;
  };

  const deleteSubmission = async (id: string) => {
    if (isFirestoreAvailable()) {
      try {
        await submissionService.delete(id);
        return;
      } catch (error) {
        console.error('Firestore deleteSubmission error, falling back to localStorage:', error);
      }
    }
    
    // Fallback to localStorage
    if (typeof window === 'undefined') return;
    const submissions = await getSubmissions();
    const filtered = submissions.filter(s => s.id !== id);
    localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(filtered));
  };

  const clearAllSubmissions = async () => {
    if (isFirestoreAvailable()) {
      try {
        const submissions = await submissionService.getAll();
        await Promise.all(submissions.map(s => submissionService.delete(s.id)));
        return;
      } catch (error) {
        console.error('Firestore clearAllSubmissions error, falling back to localStorage:', error);
      }
    }
    
    // Fallback to localStorage
    if (typeof window === 'undefined') return;
    localStorage.removeItem(SUBMISSIONS_KEY);
  };

  const getUsers = async (): Promise<User[]> => {
    if (isFirestoreAvailable()) {
      try {
        const firestoreUsers = await userService.getAll();
        return firestoreUsers.map(convertFirestoreUser);
      } catch (error) {
        console.error('Firestore getUsers error, falling back to localStorage:', error);
      }
    }
    
    // Fallback to localStorage
    if (typeof window === 'undefined') return [];
    const data = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    return data.map((u: any) => { const {password, ...user} = u; return user; });
  };

  const deleteUser = async (userId: string) => {
    if (isFirestoreAvailable()) {
      try {
        await userService.delete(userId);
        return;
      } catch (error) {
        console.error('Firestore deleteUser error, falling back to localStorage:', error);
      }
    }
    
    // Fallback to localStorage
    if (typeof window === 'undefined') return;
    let users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    users = users.filter((u: User) => u.id !== userId);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  };

  const updateUser = async (userId: string, updates: Partial<User>) => {
    if (isFirestoreAvailable()) {
      try {
        await userService.update(userId, updates);
        
        // Update local session if it's the current user
        if (user && user.id === userId) {
          const updatedUser = { ...user, ...updates };
          setUser(updatedUser);
          localStorage.setItem(SESSION_KEY, JSON.stringify(updatedUser));
        }
        return;
      } catch (error) {
        console.error('Firestore updateUser error, falling back to localStorage:', error);
      }
    }
    
    // Fallback to localStorage
    if (typeof window === 'undefined') return;
    let users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    users = users.map((u: User) => u.id === userId ? { ...u, ...updates } : u);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    
    // Update local session if it's the current user
    if (user && user.id === userId) {
      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
      localStorage.setItem(SESSION_KEY, JSON.stringify(updatedUser));
    }
  };

  return (
    <AuthContext.Provider value={{
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
      updateUser
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Protected route component
export const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user && pathname !== '/login' && pathname !== '/register') {
      router.push('/login');
    }
  }, [user, loading, pathname, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user && pathname !== '/login' && pathname !== '/register') {
    return null;
  }

  return <>{children}</>;
};
