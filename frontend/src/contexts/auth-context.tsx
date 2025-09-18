/**
 * Authentication Context using FastAPI
 * Replaces Firebase authentication
 */
'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { apiService, User, LoginCredentials } from '@/lib/api-service';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: ((credentials: LoginCredentials) => Promise<boolean>) & ((email: string, password: string) => Promise<boolean>);
  logout: () => void;
  refreshUser: () => Promise<void>;
  register: (details: { email: string; password: string; candidate_name: string; candidate_id: string; client_name: string; }) => Promise<boolean>;
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isCandidate: boolean;
  getUserAttempts: (testType: 'SJT' | 'JDT') => Promise<number>;
  getLatestUserSubmission: (testType: 'SJT' | 'JDT') => Promise<any | null>;
  getUsers: () => Promise<User[]>;
  saveSubmission: (submission: any) => Promise<any>;
  getSubmissions: () => Promise<any[]>;
  getSubmissionById: (id: string) => Promise<any | null>;
  deleteSubmission: (id: string) => Promise<void>;
  canUserTakeTest: (testType: 'SJT' | 'JDT', maxAttempts: number) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if user is authenticated on app start
  useEffect(() => {
    const checkAuth = async () => {
      if (apiService.isAuthenticated()) {
        try {
          const result = await apiService.getCurrentUser();
          if (result.data) {
            setUser(result.data);
          } else {
            // Token might be invalid, clear it
            apiService.logout();
          }
        } catch (error) {
          console.error('Auth check failed:', error);
          apiService.logout();
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (arg1: LoginCredentials | string, arg2?: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const creds: LoginCredentials = typeof arg1 === 'string' ? { email: arg1, password: arg2 || '' } : arg1;
      const result = await apiService.login(creds);
      
      if (result.data) {
        setUser(result.data.user);
        setLoading(false);
        return true;
      } else {
        setError(result.error || 'Login failed');
        setLoading(false);
        return false;
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Login failed');
      setLoading(false);
      return false;
    }
  };

  const register = async (details: { email: string; password: string; candidate_name: string; candidate_id: string; client_name: string; }): Promise<boolean> => {
    // Normalize email client-side
    const payload = { ...details, email: details.email.trim().toLowerCase() };
    
    console.log('auth-context register() called with:', payload.email);
    
    if (loading) {
      console.log('Already loading, preventing duplicate submission');
      // Prevent duplicate submission while already processing
      return false;
    }
    setLoading(true);
    setError(null);
    try {
      console.log('Making POST request to /auth/register');
      const res = await fetch((process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000') + '/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      console.log('Response status:', res.status);
      
      if (res.ok) {
        console.log('Registration successful');
        setLoading(false);
        return true;
      }
      // Handle duplicate (treat as soft success so UI can message appropriately)
      if (res.status === 409) {
        console.log('Registration failed: duplicate email');
        setLoading(false);
        return false; // caller can distinguish via context error if needed
      }
      const err = await res.json().catch(() => ({}));
      console.log('Registration failed with error:', err);
      setError(err.detail || 'Registration failed');
      setLoading(false);
      return false;
    } catch (e) {
      console.error('Registration exception:', e);
      setError(e instanceof Error ? e.message : 'Registration failed');
      setLoading(false);
      return false;
    }
  };

  const logout = () => {
    apiService.logout();
    setUser(null);
    setError(null);
  };

  const refreshUser = async () => {
    if (apiService.isAuthenticated()) {
      try {
        const result = await apiService.getCurrentUser();
        if (result.data) {
          setUser(result.data);
        }
      } catch (error) {
        console.error('Failed to refresh user:', error);
      }
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    error,
    login,
    logout,
    refreshUser,
    register,
    isAuthenticated: !!user,
    isSuperAdmin: user?.role === 'superadmin',
    isAdmin: user?.role === 'admin',
    isCandidate: user?.role === 'candidate',
    getUserAttempts: async (testType: 'SJT' | 'JDT') => {
      try {
        if (!user) return 0;
        const res = await apiService.getSubmissions({ user_id: user.id, test_type: testType });
        if (res.data) return res.data.length;
        return 0;
      } catch (e) {
        console.error('Failed to get user attempts:', e);
        return 0;
      }
    },
    getLatestUserSubmission: async (testType: 'SJT' | 'JDT') => {
      try {
        if (!user) return null;
        const res = await apiService.getSubmissions({ user_id: user.id, test_type: testType });
        if (res.data && res.data.length > 0) {
          // Sort by created_at desc if available
          const sorted = [...res.data].sort((a, b) => {
            const ca = new Date(a.created_at || a.createdAt || 0).getTime();
            const cb = new Date(b.created_at || b.createdAt || 0).getTime();
            return cb - ca;
          });
          return sorted[0];
        }
        return null;
      } catch (e) {
        console.error('Failed to get latest submission:', e);
        return null;
      }
    },
    getUsers: async () => {
      try {
        const res = await apiService.getUsers();
        return res.data?.users || [];
      } catch (e) {
        console.error('Failed to get users:', e);
        return [];
      }
    },
    saveSubmission: async (submission: any) => {
      try {
        // Normalize payload to FastAPI SubmissionCreate schema
        // Accept both old shape ({ candidateName, testType, history, candidateLanguage, uiLanguage })
        // and new shape; map to snake_case used by backend.
        const payload = {
          candidate_name: submission.candidate_name || submission.candidateName || user?.candidate_name || 'Candidate',
          candidate_id: submission.candidate_id || submission.candidateId || user?.candidate_id,
          test_type: submission.test_type || submission.testType,
          candidate_language: submission.candidate_language || submission.candidateLanguage || (user as any)?.language_preference || 'en',
          ui_language: submission.ui_language || submission.uiLanguage || 'en',
          conversation_history: submission.conversation_history || submission.history || [],
        } as const;

        if (!payload.candidate_id) {
          throw new Error('Missing candidate_id for submission');
        }
        if (!payload.test_type) {
          throw new Error('Missing test_type for submission');
        }

        console.log('💾 Saving submission via FastAPI (normalized):', {
          ...payload,
          conversation_history: Array.isArray(payload.conversation_history)
            ? `entries=${payload.conversation_history.length}`
            : 'invalid',
        });
        const result = await apiService.createSubmission(payload);
        if (result.data) {
          console.log('✅ Submission saved successfully:', result.data.id);
          return result.data;
        }
        throw new Error(result.error || 'Failed to save submission');
      } catch (error) {
        console.error('❌ Error saving submission:', error);
        throw error;
      }
    },
    getSubmissions: async () => {
      try {
        console.log('📖 Fetching submissions via FastAPI');
        const result = await apiService.getSubmissions();
        const list = (result.data || []).map((s: any) => ({
          id: s.id,
          candidateName: s.candidate_name,
          testType: s.test_type,
          date: s.created_at,
          createdAt: s.created_at,
          report: s.analysis_result || null,
          history: s.conversation_history || [],
          status: s.status,
          candidateId: s.candidate_id,
          candidateLanguage: s.candidate_language,
          uiLanguage: s.ui_language,
        }));
        console.log(`✅ Fetched ${list.length} submissions`);
        return list;
      } catch (error) {
        console.error('❌ Error fetching submissions:', error);
        return [];
      }
    },
    getSubmissionById: async (id: string) => {
      try {
        console.log('📖 Fetching submission by ID via FastAPI:', id);
        const result = await apiService.getSubmission(id);
        if (!result.data) return null;
        const s = result.data as any;
        const mapped = {
          id: s.id,
          candidateName: s.candidate_name,
          testType: s.test_type,
          date: s.created_at,
          createdAt: s.created_at,
          report: s.analysis_result || null,
          history: s.conversation_history || [],
          status: s.status,
          candidateId: s.candidate_id,
          candidateLanguage: s.candidate_language,
          uiLanguage: s.ui_language,
        };
        console.log('✅ Submission fetched successfully');
        return mapped;
      } catch (error) {
        console.error('❌ Error fetching submission:', error);
        return null;
      }
    },
    deleteSubmission: async (id: string) => {
      try {
        console.log('🗑️ Deleting submission via FastAPI:', id);
        await apiService.deleteSubmission(id);
        console.log('✅ Submission deleted successfully');
      } catch (error) {
        console.error('❌ Error deleting submission:', error);
        throw error;
      }
    },
    canUserTakeTest: async (testType: 'SJT' | 'JDT', maxAttempts: number) => {
      try {
        if (!user) return false;
        const attempts = await apiService.getSubmissions({ 
          user_id: user.id, 
          test_type: testType 
        });
        const attemptCount = attempts.data?.length || 0;
        return attemptCount < maxAttempts;
      } catch (error) {
        console.error('Error checking test attempts:', error);
        return true; // Allow test if check fails
      }
    },
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Higher-order component for protecting routes
export function withAuth<P extends object>(Component: React.ComponentType<P>) {
  return function AuthenticatedComponent(props: P) {
    const { isAuthenticated, loading } = useAuth();

    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    if (!isAuthenticated) {
      // Redirect to login or show login form
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Authentication Required</h1>
            <p className="text-gray-600">Please log in to access this page.</p>
          </div>
        </div>
      );
    }

    return <Component {...props} />;
  };
}

// Higher-order component for superadmin-only routes
export function withSuperAdminAuth<P extends object>(Component: React.ComponentType<P>) {
  return function SuperAdminComponent(props: P) {
    const { isSuperAdmin, loading, isAuthenticated } = useAuth();

    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    if (!isAuthenticated || !isSuperAdmin) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
            <p className="text-gray-600">You need superadmin privileges to access this page.</p>
          </div>
        </div>
      );
    }

    return <Component {...props} />;
  };
}

// Protected Route component for role-based access control
interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: string[];
  requireAuth?: boolean;
}

export function ProtectedRoute({ 
  children, 
  allowedRoles = [], 
  requireAuth = true 
}: ProtectedRouteProps) {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && requireAuth && !isAuthenticated) {
      // Redirect to login page instead of showing message
      router.push('/login');
    }
  }, [loading, requireAuth, isAuthenticated, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (requireAuth && !isAuthenticated) {
    // Show loading while redirecting
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (allowedRoles.length > 0 && user && !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">
            You don't have permission to access this page. Required roles: {allowedRoles.join(', ')}
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}