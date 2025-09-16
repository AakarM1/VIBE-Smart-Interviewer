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

// 🔒 CRITICAL FIX: Remove duplicate declarations
const AuthContext = createContext<AuthContextType | undefined>(undefined);
const ADMIN_EMAIL = 'admin@gmail.com';

// Fallback keys for localStorage (when Firestore is unavailable)
const USERS_KEY = 'verbal-insights-users';
const SESSION_KEY = 'verbal-insights-session';
const SUBMISSIONS_KEY = 'verbal-insights-submissions';

// Check if we should use localStorage instead of Firestore
const useLocalStorage = () => {
  const { useFirestore } = getStorageConfig();
  const shouldUseLocal = !useFirestore;
  if (shouldUseLocal) {
    console.log('�️ Using LOCAL STORAGE mode');
  } else {
    console.log('� Using FIRESTORE mode');
  }
  return shouldUseLocal;
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
  // Always start with null to ensure server and client match
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Only access localStorage after component mounts (client-side only)
        const storedUser = getInitialUser();
        setUser(storedUser);
        
        // Seed default users with timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 5000)
        );
        
        await Promise.race([seedDefaultUsers(), timeoutPromise]);
      } catch (error) {
        console.error('Error initializing auth:', error);
        // Continue anyway - don't let seeding block the app
      } finally {
        setLoading(false);
      }
    };
    
    initializeAuth();
  }, []);

  const seedDefaultUsers = async () => {
    if (useLocalStorage()) {
      await seedUsersLocalStorage();
    } else {
      try {
        // Add a quick timeout for Firestore operations
        const firestoreTimeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Firestore timeout')), 3000)
        );
        
        const seedFirestore = async () => {
          // Check if admin already exists
          const adminUser = await userService.getByEmail(ADMIN_EMAIL);
          if (!adminUser) {
            // Create admin user
            await userService.create({
              email: ADMIN_EMAIL,
              passwordHash: 'admin@123', // In real app, this should be hashed
              candidateName: 'System Administrator',
              candidateId: 'ADMIN001',
              clientName: 'Trajectorie',
              role: 'Administrator',
            });

            // Create 10 test users
            const testUsers = [
              { email: 'test1@gmail.com', name: 'John Smith', id: 'T001', client: 'TechCorp Solutions', role: 'Software Engineer' },
              { email: 'test2@gmail.com', name: 'Sarah Johnson', id: 'T002', client: 'DataTech Inc', role: 'Data Analyst' },
              { email: 'test3@gmail.com', name: 'Michael Brown', id: 'T003', client: 'InnovateLabs', role: 'Product Manager' },
              { email: 'test4@gmail.com', name: 'Emily Davis', id: 'T004', client: 'FinanceFirst', role: 'Financial Analyst' },
              { email: 'test5@gmail.com', name: 'David Wilson', id: 'T005', client: 'MarketPro', role: 'Marketing Manager' },
              { email: 'test6@gmail.com', name: 'Lisa Anderson', id: 'T006', client: 'SalesForce Pro', role: 'Sales Representative' },
              { email: 'test7@gmail.com', name: 'Robert Taylor', id: 'T007', client: 'ConsultCorp', role: 'Business Consultant' },
              { email: 'test8@gmail.com', name: 'Jennifer Lee', id: 'T008', client: 'HRSolutions', role: 'HR Specialist' },
              { email: 'test9@gmail.com', name: 'Christopher Garcia', id: 'T009', client: 'OperationsHub', role: 'Operations Manager' },
              { email: 'test10@gmail.com', name: 'Amanda Martinez', id: 'T010', client: 'DesignStudio', role: 'UX Designer' },
            ];

            for (const user of testUsers) {
              await userService.create({
                email: user.email,
                passwordHash: 'test123', // In real app, this should be hashed
                candidateName: user.name,
                candidateId: user.id,
                clientName: user.client,
                role: user.role,
              });
            }
            
            console.log('✅ Seeded Firestore with 1 admin and 10 test users');
          }
        };
        
        await Promise.race([seedFirestore(), firestoreTimeout]);
      } catch (error) {
        console.error('Error seeding users in Firestore, falling back to localStorage:', error);
        await seedUsersLocalStorage();
      }
    }
  };

  const seedUsersLocalStorage = async () => {
    if (typeof window === 'undefined') return;
    
    let users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    
    // Check if seeding is already done
    const adminExists = users.some((u: any) => u.email === ADMIN_EMAIL);
    const hasTestUsers = users.some((u: any) => u.email.includes('test'));
    
    if (adminExists && hasTestUsers) {
      return; // Already seeded
    }
    
    // Clear existing users and seed fresh data
    users = [];
    
    // Add 1 Admin User
    users.push({
      id: 'admin-001',
      email: ADMIN_EMAIL,
      password: 'admin@123',
      candidateName: 'System Administrator',
      candidateId: 'ADMIN001',
      clientName: 'Trajectorie',
      role: 'Administrator',
    });
    
    // Add 10 Test Users with diverse profiles
    const testUsers = [
      {
        id: 'test-001',
        email: 'test1@gmail.com',
        password: 'test123',
        candidateName: 'John Smith',
        candidateId: 'T001',
        clientName: 'TechCorp Solutions',
        role: 'Software Engineer',
      },
      {
        id: 'test-002',
        email: 'test2@gmail.com',
        password: 'test123',
        candidateName: 'Sarah Johnson',
        candidateId: 'T002',
        clientName: 'DataTech Inc',
        role: 'Data Analyst',
      },
      {
        id: 'test-003',
        email: 'test3@gmail.com',
        password: 'test123',
        candidateName: 'Michael Brown',
        candidateId: 'T003',
        clientName: 'InnovateLabs',
        role: 'Product Manager',
      },
      {
        id: 'test-004',
        email: 'test4@gmail.com',
        password: 'test123',
        candidateName: 'Emily Davis',
        candidateId: 'T004',
        clientName: 'FinanceFirst',
        role: 'Financial Analyst',
      },
      {
        id: 'test-005',
        email: 'test5@gmail.com',
        password: 'test123',
        candidateName: 'David Wilson',
        candidateId: 'T005',
        clientName: 'MarketPro',
        role: 'Marketing Manager',
      },
      {
        id: 'test-006',
        email: 'test6@gmail.com',
        password: 'test123',
        candidateName: 'Lisa Anderson',
        candidateId: 'T006',
        clientName: 'SalesForce Pro',
        role: 'Sales Representative',
      },
      {
        id: 'test-007',
        email: 'test7@gmail.com',
        password: 'test123',
        candidateName: 'Robert Taylor',
        candidateId: 'T007',
        clientName: 'ConsultCorp',
        role: 'Business Consultant',
      },
      {
        id: 'test-008',
        email: 'test8@gmail.com',
        password: 'test123',
        candidateName: 'Jennifer Lee',
        candidateId: 'T008',
        clientName: 'HRSolutions',
        role: 'HR Specialist',
      },
      {
        id: 'test-009',
        email: 'test9@gmail.com',
        password: 'test123',
        candidateName: 'Christopher Garcia',
        candidateId: 'T009',
        clientName: 'OperationsHub',
        role: 'Operations Manager',
      },
      {
        id: 'test-010',
        email: 'test10@gmail.com',
        password: 'test123',
        candidateName: 'Amanda Martinez',
        candidateId: 'T010',
        clientName: 'DesignStudio',
        role: 'UX Designer',
      },
    ];
    
    // Add all test users
    users.push(...testUsers);
    
    // Save to localStorage
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    
    console.log('✅ Seeded localStorage with 1 admin and 10 test users');
  };

  const login = async (email: string, pass: string): Promise<boolean> => {
    if (useLocalStorage()) {
      return loginLocalStorage(email, pass);
    }

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
    if (useLocalStorage()) {
      return registerLocalStorage(details);
    }

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
    if (useLocalStorage()) {
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
      return;
    }

    try {
      await submissionService.create(submission);
    } catch (error) {
      console.error('Firestore saveSubmission error, falling back to localStorage:', error);
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
    }
  };

  const getSubmissions = async (): Promise<Submission[]> => {
    if (useLocalStorage()) {
      // Use localStorage
      if (typeof window === 'undefined') return [];
      const data = localStorage.getItem(SUBMISSIONS_KEY);
      return data ? JSON.parse(data) : [];
    }

    try {
      const firestoreSubmissions = await submissionService.getAll();
      return firestoreSubmissions.map(convertFirestoreSubmission);
    } catch (error) {
      console.error('Firestore getSubmissions error, falling back to localStorage:', error);
      // Fallback to localStorage
      if (typeof window === 'undefined') return [];
      const data = localStorage.getItem(SUBMISSIONS_KEY);
      return data ? JSON.parse(data) : [];
    }
  };

  const getSubmissionById = async (id: string): Promise<Submission | null> => {
    if (useLocalStorage()) {
      const submissions = await getSubmissions();
      return submissions.find(s => s.id === id) || null;
    }

    try {
      const firestoreSubmission = await submissionService.getById(id);
      return firestoreSubmission ? convertFirestoreSubmission(firestoreSubmission) : null;
    } catch (error) {
      console.error('Firestore getSubmissionById error, falling back to localStorage:', error);
      const submissions = await getSubmissions();
      return submissions.find(s => s.id === id) || null;
    }
  };

  const deleteSubmission = async (id: string) => {
    if (useLocalStorage()) {
      if (typeof window === 'undefined') return;
      const submissions = await getSubmissions();
      const filtered = submissions.filter(s => s.id !== id);
      localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(filtered));
      return;
    }

    try {
      await submissionService.delete(id);
    } catch (error) {
      console.error('Firestore deleteSubmission error, falling back to localStorage:', error);
      if (typeof window === 'undefined') return;
      const submissions = await getSubmissions();
      const filtered = submissions.filter(s => s.id !== id);
      localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(filtered));
    }
  };

  const clearAllSubmissions = async () => {
    if (useLocalStorage()) {
      if (typeof window === 'undefined') return;
      localStorage.removeItem(SUBMISSIONS_KEY);
      return;
    }

    try {
      const submissions = await submissionService.getAll();
      await Promise.all(submissions.map(s => submissionService.delete(s.id)));
    } catch (error) {
      console.error('Firestore clearAllSubmissions error, falling back to localStorage:', error);
      if (typeof window === 'undefined') return;
      localStorage.removeItem(SUBMISSIONS_KEY);
    }
  };

  const getUsers = async (): Promise<User[]> => {
    if (useLocalStorage()) {
      if (typeof window === 'undefined') return [];
      const data = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
      return data.map((u: any) => { const {password, ...user} = u; return user; });
    }

    try {
      const firestoreUsers = await userService.getAll();
      return firestoreUsers.map(convertFirestoreUser);
    } catch (error) {
      console.error('Firestore getUsers error, falling back to localStorage:', error);
      if (typeof window === 'undefined') return [];
      const data = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
      return data.map((u: any) => { const {password, ...user} = u; return user; });
    }
  };

  const deleteUser = async (userId: string) => {
    if (useLocalStorage()) {
      if (typeof window === 'undefined') return;
      let users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
      users = users.filter((u: User) => u.id !== userId);
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
      return;
    }

    try {
      await userService.delete(userId);
    } catch (error) {
      console.error('Firestore deleteUser error, falling back to localStorage:', error);
      if (typeof window === 'undefined') return;
      let users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
      users = users.filter((u: User) => u.id !== userId);
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
    }
  };

  const updateUser = async (userId: string, updates: Partial<User>) => {
    if (useLocalStorage()) {
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
      return;
    }

    try {
      await userService.update(userId, updates);
      
      // Update local session if it's the current user
      if (user && user.id === userId) {
        const updatedUser = { ...user, ...updates };
        setUser(updatedUser);
        localStorage.setItem(SESSION_KEY, JSON.stringify(updatedUser));
      }
    } catch (error) {
      console.error('Firestore updateUser error, falling back to localStorage:', error);
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
export const ProtectedRoute = ({ children, adminOnly = false }: { children: ReactNode; adminOnly?: boolean }) => {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user && pathname !== '/login' && pathname !== '/register') {
      router.push('/login');
    }
    
    // Check admin access if adminOnly is true
    if (!loading && user && adminOnly && user.role !== 'Administrator' && user.email !== 'admin@gmail.com') {
      router.push('/'); // Redirect non-admin users to home
    }
  }, [user, loading, pathname, router, adminOnly]);

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

  // Check admin access for admin-only routes
  if (user && adminOnly && user.role !== 'Administrator' && user.email !== 'admin@gmail.com') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p className="text-gray-600">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
