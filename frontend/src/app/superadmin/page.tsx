'use client';

import React, { useEffect, useState } from 'react';
import { 
  Building2, 
  Users, 
  FileText, 
  Award, 
  BarChart3, 
  Settings, 
  Shield, 
  Menu,
  Bell,
  User,
  LogOut,
  Search,
  Home,
  Database,
  Target,
  UserCheck,
  ChevronDown
} from 'lucide-react';
import { useAuth, ProtectedRoute } from '@/contexts/auth-context';
import CompanyManagement from '@/components/superadmin/CompanyManagement';
import UserManagement from '@/components/superadmin/UserManagement';
import CompetencyManagement from '@/components/superadmin/CompetencyManagement';
import BulkUserGenerator from '@/components/superadmin/BulkUserGenerator';

// Define navigation items for the sidebar
const navigationItems = [
  {
    id: 'overview',
    label: 'Overview',
    icon: Home,
    description: 'Platform overview and key metrics'
  },
  {
    id: 'companies',
    label: 'Companies',
    icon: Building2,
    description: 'Manage tenant organizations and their settings'
  },
  {
    id: 'users',
    label: 'User Management',
    icon: Users,
    description: 'Manage user accounts and permissions'
  },
  {
    id: 'bulk-generate',
    label: 'Bulk Generate Users',
    icon: UserCheck,
    description: 'Create multiple candidate accounts for a company'
  },
  {
    id: 'competencies',
    label: 'Competencies',
    icon: Award,
    description: 'Define and manage skill competencies'
  },
  {
    id: 'settings',
    label: 'System Settings',
    icon: Settings,
    description: 'Configure platform-wide settings'
  }
];

function SuperAdminDashboard() {
  const { user, logout } = useAuth();
  const [activeSection, setActiveSection] = useState('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const activeSectionData = navigationItems.find(item => item.id === activeSection);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className={`bg-white shadow-lg transition-all duration-300 ${sidebarCollapsed ? 'w-16' : 'w-64'} flex flex-col`}>
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            {!sidebarCollapsed && (
              <div>
                <h1 className="text-xl font-bold text-gray-900">SuperAdmin</h1>
                <p className="text-sm text-gray-500">Control Room</p>
              </div>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Menu className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center p-3 rounded-lg transition-all duration-200 group ${
                  isActive 
                    ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                }`}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <Icon className={`h-5 w-5 ${isActive ? 'text-blue-600' : 'text-gray-500 group-hover:text-gray-700'}`} />
                {!sidebarCollapsed && (
                  <span className="ml-3 font-medium">{item.label}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User section */}
        <div className="p-4 border-t border-gray-200">
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="w-full flex items-center p-3 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded-full">
                <User className="h-4 w-4" />
              </div>
              {!sidebarCollapsed && (
                <>
                  <div className="ml-3 flex-1 text-left">
                    <p className="text-sm font-medium text-gray-900">{user?.candidate_name}</p>
                    <p className="text-xs text-gray-500">Super Administrator</p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                </>
              )}
            </button>

            {userMenuOpen && !sidebarCollapsed && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg">
                <button
                  onClick={logout}
                  className="w-full flex items-center p-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="ml-3">Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{activeSectionData?.label}</h2>
              <p className="text-gray-600 mt-1">{activeSectionData?.description}</p>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Notifications */}
              <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors relative">
                <Bell className="h-5 w-5 text-gray-600" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></div>
              </button>

            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 p-6 overflow-auto">
          {activeSection === 'overview' && <OverviewSection />}
          {activeSection === 'companies' && <CompaniesSection />}
          {activeSection === 'users' && <UsersSection />}
          {activeSection === 'bulk-generate' && <BulkGenerateSection />}
          {activeSection === 'competencies' && <CompetenciesSection />}
          {activeSection === 'settings' && <SettingsSection />}
        </main>
      </div>
    </div>
  );
}

// Placeholder sections - to be implemented
function OverviewSection() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<any | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function fetchStats() {
      setLoading(true);
      setError(null);
      try {
        const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
  const access = typeof window !== 'undefined' ? (sessionStorage.getItem('access_token') || localStorage.getItem('access_token')) : null;
        const res = await fetch(`${baseURL}/api/v1/statistics/overview`, {
          headers: {
            'Content-Type': 'application/json',
            ...(access ? { 'Authorization': `Bearer ${access}` } : {}),
          },
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({} as any));
          throw new Error(body?.detail || `Failed to load stats (${res.status})`);
        }
        const data = await res.json();
        if (isMounted) setStats(data);
      } catch (e: any) {
        if (isMounted) setError(e.message || 'Failed to load statistics');
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchStats();
    return () => { isMounted = false; };
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Key Metrics Cards */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Companies</p>
              <p className="text-3xl font-bold text-gray-900">{loading ? '—' : (stats?.companies?.total ?? 0)}</p>
            </div>
            <Building2 className="h-8 w-8 text-blue-600" />
          </div>
          <p className="text-sm text-green-600 mt-2">{loading ? '—' : `+${stats?.companies?.added_last_7_days ?? 0} last 7 days`}</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Users</p>
              <p className="text-3xl font-bold text-gray-900">{loading ? '—' : (stats?.users?.active_total ?? 0)}</p>
            </div>
            <Users className="h-8 w-8 text-green-600" />
          </div>
          <p className="text-sm text-green-600 mt-2">{loading ? '—' : `+${stats?.users?.added_last_7_days ?? 0} last 7 days`}</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Tests Completed</p>
              <p className="text-3xl font-bold text-gray-900">{loading ? '—' : (stats?.submissions?.total ?? 0)}</p>
            </div>
            <FileText className="h-8 w-8 text-purple-600" />
          </div>
          <p className="text-sm text-green-600 mt-2">{loading ? '—' : `+${stats?.submissions?.last_24_hours ?? 0} last 24h`}</p>
        </div>

        {/* System Health card removed until a meaningful metric is implemented */}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
        <div className="space-y-4">
          <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm text-gray-700">Dashboard updated {loading ? '...' : `at ${new Date(stats?.generated_at || Date.now()).toLocaleTimeString()}`}</span>
            <span className="text-xs text-gray-500 ml-auto">{loading ? '' : 'just now'}</span>
          </div>
          <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span className="text-sm text-gray-700">Users and companies reflect live data</span>
            <span className="text-xs text-gray-500 ml-auto">auto</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function CompaniesSection() {
  return <CompanyManagement />;
}

function UsersSection() {
  return <UserManagement />;
}

function BulkGenerateSection() {
  return <BulkUserGenerator />;
}

function CompetenciesSection() {
  return <CompetencyManagement />;
}

function SettingsSection() {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Platform Settings</h3>
      <p className="text-gray-600">Platform settings interface will be implemented here.</p>
    </div>
  );
}

export default function Page() {
  return (
    <ProtectedRoute allowedRoles={["superadmin"]}>
      <SuperAdminDashboard />
    </ProtectedRoute>
  );
}