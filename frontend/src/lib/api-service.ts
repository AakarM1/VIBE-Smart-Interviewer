/**
 * FastAPI Service Layer
 * Replaces Firebase with FastAPI backend communication
 */

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface User {
  id: string;
  email: string;
  candidate_name: string;
  candidate_id: string;
  client_name: string;
  role: 'superadmin' | 'admin' | 'candidate';
  language_preference: string;
  tenant_id: string;
  is_active: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

export interface Tenant {
  id: string;
  name: string;
  logo_url?: string;
  custom_branding?: any;
  max_test_attempts: number;
  allowed_test_types: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

class FastAPIService {
  private baseURL: string;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
    
    // Load tokens from sessionStorage (per-tab). Migrate from localStorage if found.
    if (typeof window !== 'undefined') {
      const ss = window.sessionStorage;
      const ls = window.localStorage;

      // Prefer sessionStorage
      this.accessToken = ss.getItem('access_token');
      this.refreshToken = ss.getItem('refresh_token');

      // Migrate from localStorage if sessionStorage empty but localStorage has tokens
      const lsAccess = ls.getItem('access_token');
      const lsRefresh = ls.getItem('refresh_token');
      if (!this.accessToken && lsAccess) {
        this.accessToken = lsAccess;
        ss.setItem('access_token', lsAccess);
      }
      if (!this.refreshToken && lsRefresh) {
        this.refreshToken = lsRefresh;
        ss.setItem('refresh_token', lsRefresh);
      }

      // Clear localStorage tokens to prevent cross-tab auth leakage
      if (lsAccess || lsRefresh) {
        ls.removeItem('access_token');
        ls.removeItem('refresh_token');
      }
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string,string> || {}),
    };

    // Add authorization header if token exists
    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (response.status === 401 && this.refreshToken) {
        // Try to refresh token
        const refreshResult = await this.refreshAccessToken();
        if (refreshResult.data) {
          // Retry original request with new token
          headers['Authorization'] = `Bearer ${this.accessToken}`;
          const retryResponse = await fetch(url, {
            ...options,
            headers,
          });
          
          if (!retryResponse.ok) {
            throw new Error(`HTTP error! status: ${retryResponse.status}`);
          }
          
          const data = await retryResponse.json();
          return { data };
        } else {
          // Refresh failed, redirect to login
          this.logout();
          throw new Error('Session expired');
        }
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        return { error: errorData.detail || errorData.error || 'Request failed' };
      }

      const data = await response.json();
      return { data };
    } catch (error) {
      console.error('API request failed:', error);
      return { error: error instanceof Error ? error.message : 'Network error' };
    }
  }

  // SERVER-ONLY: Set and clear access token for server-side routes (no window/sessionStorage)
  // Use these in Next.js API routes to forward the user's Authorization header.
  public setAccessTokenForServer(token: string) {
    this.accessToken = token;
  }
  public clearAccessTokenForServer() {
    this.accessToken = null;
  }

  // Authentication methods
  async login(credentials: LoginCredentials): Promise<ApiResponse<AuthTokens & { user: User }>> {
    const result = await this.request<AuthTokens & { user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: credentials.email,
        password: credentials.password
      }),
    });

    if (result.data) {
      this.setTokens(result.data.access_token, result.data.refresh_token);
    }

    return result;
  }

  async refreshAccessToken(): Promise<ApiResponse<AuthTokens>> {
    if (!this.refreshToken) {
      return { error: 'No refresh token available' };
    }

    const result = await this.request<AuthTokens>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: this.refreshToken }),
    });

    if (result.data) {
      this.setTokens(result.data.access_token, result.data.refresh_token);
    }

    return result;
  }

  async getCurrentUser(): Promise<ApiResponse<User>> {
    return this.request<User>('/auth/me');
  }

  logout(): void {
    this.accessToken = null;
    this.refreshToken = null;
    
    if (typeof window !== 'undefined') {
      // Clear from both storages defensively
      sessionStorage.removeItem('access_token');
      sessionStorage.removeItem('refresh_token');
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    }
  }

  private setTokens(accessToken: string, refreshToken: string): void {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    
    if (typeof window !== 'undefined') {
      // Store in sessionStorage for per-tab isolation
      sessionStorage.setItem('access_token', accessToken);
      sessionStorage.setItem('refresh_token', refreshToken);
      // Ensure localStorage copies are removed
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    }
  }

  // User management
  async getUsers(params?: {
    tenant_id?: string;
    role?: string;
    is_active?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<{ users: User[]; total: number; page: number; limit: number }>> {
    const queryString = params ? '?' + new URLSearchParams(
      Object.entries(params).reduce((acc, [key, value]) => {
        if (value !== undefined) {
          acc[key] = String(value);
        }
        return acc;
      }, {} as Record<string, string>)
    ).toString() : '';
    // Backend returns a plain list at GET /users. Normalize to { users, total, page, limit }
    const res = await this.request<User[] | { users: User[]; total: number; page: number; limit: number }>(`/users${queryString}`);
    if (res.data) {
      if (Array.isArray(res.data)) {
        return { data: { users: res.data, total: res.data.length, page: 1, limit: res.data.length } };
      }
      return { data: res.data as { users: User[]; total: number; page: number; limit: number } };
    }
    return { error: res.error };
  }

  async createUser(userData: Partial<User>): Promise<ApiResponse<User>> {
    return this.request<User>('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async updateUser(userId: string, userData: Partial<User>): Promise<ApiResponse<User>> {
    return this.request<User>(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  async deleteUser(userId: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>(`/users/${userId}`, {
      method: 'DELETE',
    });
  }

  // Tenant management
  async getTenants(params?: {
    is_active?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<{ tenants: Tenant[]; total: number; page: number; limit: number }>> {
    const queryString = params ? '?' + new URLSearchParams(
      Object.entries(params).reduce((acc, [key, value]) => {
        if (value !== undefined) {
          acc[key] = String(value);
        }
        return acc;
      }, {} as Record<string, string>)
    ).toString() : '';
    // Tenants API is under /api/v1 and returns a plain list. Normalize to { tenants, total, page, limit }
    const res = await this.request<Tenant[] | { tenants: Tenant[]; total: number; page: number; limit: number }>(`/api/v1/tenants${queryString}`);
    if (res.data) {
      const normalizeTenant = (t: any): Tenant => ({
        ...t,
        allowed_test_types: Array.isArray(t.allowed_test_types)
          ? t.allowed_test_types
          : (typeof t.allowed_test_types === 'string' ? (()=>{ try { return JSON.parse(t.allowed_test_types); } catch { return ['JDT','SJT']; } })() : ['JDT','SJT'])
      });
      if (Array.isArray(res.data)) {
        const tenants = (res.data as any[]).map(normalizeTenant) as Tenant[];
        return { data: { tenants, total: tenants.length, page: 1, limit: tenants.length } };
      }
      const payload = res.data as { tenants: Tenant[]; total: number; page: number; limit: number };
      payload.tenants = payload.tenants.map(normalizeTenant);
      return { data: payload };
    }
    return { error: res.error };
  }

  async createTenant(tenantData: Partial<Tenant>): Promise<ApiResponse<Tenant>> {
    return this.request<Tenant>('/api/v1/tenants', {
      method: 'POST',
      body: JSON.stringify(tenantData),
    });
  }

  async updateTenant(tenantId: string, tenantData: Partial<Tenant>): Promise<ApiResponse<Tenant>> {
    return this.request<Tenant>(`/api/v1/tenants/${tenantId}`, {
      method: 'PUT',
      body: JSON.stringify(tenantData),
    });
  }

  async deleteTenant(tenantId: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>(`/api/v1/tenants/${tenantId}`, {
      method: 'DELETE',
    });
  }

  // User lookup methods
  async getUserByEmail(email: string): Promise<ApiResponse<User>> {
    return this.request<User>(`/users/by-email/${encodeURIComponent(email)}`);
  }

  // Submission management
  async getSubmissions(params?: {
    tenant_id?: string;
    user_id?: string;
    test_type?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<any[]>> {
    const queryString = params ? '?' + new URLSearchParams(
      Object.entries(params).reduce((acc, [key, value]) => {
        if (value !== undefined) {
          acc[key] = String(value);
        }
        return acc;
      }, {} as Record<string, string>)
    ).toString() : '';
    // Submissions API is under /api/v1
    return this.request<any[]>(`/api/v1/submissions${queryString}`);
  }

  async getSubmission(submissionId: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/api/v1/submissions/${submissionId}`);
  }

  async createSubmission(submissionData: any): Promise<ApiResponse<{ id: string }>> {
    return this.request<{ id: string }>('/api/v1/submissions', {
      method: 'POST',
      body: JSON.stringify(submissionData),
    });
  }

  async updateSubmission(submissionId: string, updates: any): Promise<ApiResponse<any>> {
    return this.request<any>(`/api/v1/submissions/${submissionId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteSubmission(submissionId: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>(`/api/v1/submissions/${submissionId}`, {
      method: 'DELETE',
    });
  }

  // Media listing for a submission
  async listSubmissionMedia(submissionId: string): Promise<ApiResponse<any[]>> {
    return this.request<any[]>(`/api/v1/submissions/${submissionId}/media`);
  }

  // Configuration management
  async getConfiguration(type: string): Promise<ApiResponse<any>> {
    // Use explicit type route to avoid UUID/id route collision
    return this.request<any>(`/api/v1/configurations/type/${type}`);
  }

  async saveConfiguration(type: string, configData: any): Promise<ApiResponse<any>> {
    // Backend exposes dedicated endpoints /configurations/{type} for POST (sjt, jdt, global)
    return this.request<any>(`/api/v1/configurations/${type}`, {
      method: 'POST',
      body: JSON.stringify(configData),
    });
  }

  // Platform health
  async getHealth(): Promise<ApiResponse<{ status: string; timestamp: string }>> {
    return this.request<{ status: string; timestamp: string }>('/health');
  }

  // Statistics
  async getOverviewStats(): Promise<ApiResponse<any>> {
    return this.request<any>('/api/v1/statistics/overview');
  }

  // Competencies
  async listCompetencies(params?: { include_inactive?: boolean; tenant_id?: string }): Promise<ApiResponse<any[]>> {
    const query = params ? '?' + new URLSearchParams(Object.entries(params).reduce((a,[k,v])=>{ if(v!==undefined) a[k]=String(v); return a; }, {} as Record<string,string>)).toString() : '';
    return this.request<any[]>(`/api/v1/competencies${query}`);
  }
  async createCompetency(payload: any): Promise<ApiResponse<any>> {
    return this.request<any>(`/api/v1/competencies`, { method: 'POST', body: JSON.stringify(payload) });
  }
  async getCompetency(code: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/api/v1/competencies/${encodeURIComponent(code)}`);
  }
  async updateCompetency(code: string, payload: any): Promise<ApiResponse<any>> {
    return this.request<any>(`/api/v1/competencies/${encodeURIComponent(code)}`, { method: 'PUT', body: JSON.stringify(payload) });
    }
  async deleteCompetency(code: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>(`/api/v1/competencies/${encodeURIComponent(code)}`, { method: 'DELETE' });
  }

  // Check if authenticated
  isAuthenticated(): boolean {
    return !!this.accessToken;
  }
}

// Export singleton instance
export const apiService = new FastAPIService();
export default apiService;