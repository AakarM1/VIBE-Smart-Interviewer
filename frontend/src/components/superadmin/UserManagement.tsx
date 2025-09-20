'use client';

import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Users, 
  Settings, 
  Shield,
  UserCheck,
  UserX,
  Calendar,
  Check,
  X,
  Eye,
  Download,
  Upload,
  Mail,
  Phone,
  Building2,
  Key,
  Clock,
  AlertCircle
} from 'lucide-react';
import { apiService, User } from '@/lib/api-service';

interface UserManagementProps {
  onBack?: () => void;
}

export default function UserManagement({ onBack }: UserManagementProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterActive, setFilterActive] = useState<boolean | 'all'>('all');
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());

  // Load users
  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const result = await apiService.getUsers();
      if (result.data) {
        setUsers(result.data.users);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
    setLoading(false);
  };

  // Filter users based on search and filter criteria
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.candidate_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.candidate_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.client_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    const matchesActive = filterActive === 'all' || user.is_active === filterActive;
    
    return matchesSearch && matchesRole && matchesActive;
  });

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const pageItems = filteredUsers.slice((page - 1) * pageSize, page * pageSize);

  const exportCSV = () => {
    const headers = [
      'ID','Name','Email','CandidateID','Company','Role','Active','Language','LastLogin','CreatedAt'
    ];
    const rows = filteredUsers.map(u => [
      u.id,
      u.candidate_name,
      u.email,
      u.candidate_id,
      u.client_name,
      u.role,
      u.is_active ? 'Yes' : 'No',
      u.language_preference,
      u.last_login ? new Date(u.last_login).toISOString() : '',
      u.created_at ? new Date(u.created_at).toISOString() : ''
    ]);
    const csv = [headers, ...rows]
      .map(r => r.map(v => `"${(v ?? '').toString().replace(/"/g,'""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCreateUser = async (userData: Partial<User> & { password: string }) => {
    try {
      const result = await apiService.createUser(userData);
      if (result.data) {
        await loadUsers();
        setShowCreateModal(false);
      }
    } catch (error) {
      console.error('Error creating user:', error);
    }
  };

  const handleUpdateUser = async (userData: Partial<User>) => {
    if (!selectedUser) return;
    
    try {
      const result = await apiService.updateUser(selectedUser.id, userData);
      if (result.data) {
        await loadUsers();
        setShowEditModal(false);
        setSelectedUser(null);
      }
    } catch (error) {
      console.error('Error updating user:', error);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      const result = await apiService.deleteUser(userId);
      if (result.data) {
        await loadUsers();
      }
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  const handleBulkAction = async (action: string) => {
    if (selectedUsers.size === 0) return;

    const userIds = Array.from(selectedUsers);
    
    if (action === 'delete') {
      if (!confirm(`Are you sure you want to delete ${userIds.length} users? This action cannot be undone.`)) {
        return;
      }
      
      for (const userId of userIds) {
        try {
          await apiService.deleteUser(userId);
        } catch (error) {
          console.error(`Error deleting user ${userId}:`, error);
        }
      }
    } else if (action === 'activate' || action === 'deactivate') {
      const isActive = action === 'activate';
      for (const userId of userIds) {
        try {
          await apiService.updateUser(userId, { is_active: isActive });
        } catch (error) {
          console.error(`Error updating user ${userId}:`, error);
        }
      }
    }

    await loadUsers();
    setSelectedUsers(new Set());
    setShowBulkActions(false);
  };

  const handleSelectUser = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedUsers.size === filteredUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(filteredUsers.map(user => user.id)));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
          <p className="text-gray-600 mt-1">Manage users across all tenant organizations</p>
        </div>
        <div className="flex items-center space-x-3">
          {selectedUsers.size > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowBulkActions(!showBulkActions)}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center space-x-2"
              >
                <span>Bulk Actions ({selectedUsers.size})</span>
                <MoreVertical className="h-4 w-4" />
              </button>
              
              {showBulkActions && (
                <div className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-48">
                  <button
                    onClick={() => handleBulkAction('activate')}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center space-x-2"
                  >
                    <UserCheck className="h-4 w-4 text-green-600" />
                    <span>Activate Users</span>
                  </button>
                  <button
                    onClick={() => handleBulkAction('deactivate')}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center space-x-2"
                  >
                    <UserX className="h-4 w-4 text-orange-600" />
                    <span>Deactivate Users</span>
                  </button>
                  <button
                    onClick={() => handleBulkAction('delete')}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 text-red-600 flex items-center space-x-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Delete Users</span>
                  </button>
                </div>
              )}
            </div>
          )}
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Add User</span>
          </button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center justify-between space-x-4">
          <div className="flex items-center space-x-4 flex-1">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Role Filter */}
            <select
              value={filterRole}
              onChange={(e) => { setFilterRole(e.target.value); setPage(1); }}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Roles</option>
              <option value="superadmin">Super Admin</option>
              <option value="admin">Admin</option>
              <option value="candidate">Candidate</option>
            </select>

            {/* Status Filter */}
            <select
              value={filterActive === 'all' ? 'all' : filterActive.toString()}
              onChange={(e) => { setFilterActive(e.target.value === 'all' ? 'all' : e.target.value === 'true'); setPage(1); }}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <button onClick={exportCSV} className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors" title="Download CSV">
              <Download className="h-4 w-4" />
            </button>
            <button className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <Upload className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Users List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedUsers.size === filteredUsers.length && filteredUsers.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Company
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Login
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {pageItems.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedUsers.has(user.id)}
                      onChange={() => handleSelectUser(user.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center text-white font-medium ${
                          user.role === 'superadmin' ? 'bg-purple-600' :
                          user.role === 'admin' ? 'bg-blue-600' : 'bg-green-600'
                        }`}>
                          {user.candidate_name.charAt(0).toUpperCase()}
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{user.candidate_name}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                        <div className="text-xs text-gray-400">ID: {user.candidate_id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      user.role === 'superadmin' ? 'bg-purple-100 text-purple-800' :
                      user.role === 'admin' ? 'bg-blue-100 text-blue-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {user.role === 'superadmin' && <Shield className="h-3 w-3 mr-1" />}
                      {user.role === 'admin' && <Settings className="h-3 w-3 mr-1" />}
                      {user.role === 'candidate' && <Users className="h-3 w-3 mr-1" />}
                      {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Building2 className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-900">{user.client_name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      user.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {user.is_active ? (
                        <>
                          <Check className="h-3 w-3 mr-1" />
                          Active
                        </>
                      ) : (
                        <>
                          <X className="h-3 w-3 mr-1" />
                          Inactive
                        </>
                      )}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-900">
                      <Clock className="h-4 w-4 text-gray-400 mr-2" />
                      {user.last_login 
                        ? new Date(user.last_login).toLocaleDateString()
                        : 'Never'
                      }
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => {
                          setSelectedUser(user);
                          setShowDetailsModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedUser(user);
                          setShowEditModal(true);
                        }}
                        className="text-green-600 hover:text-green-900 p-1 rounded"
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="text-red-600 hover:text-red-900 p-1 rounded"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between p-4 text-sm text-gray-600">
          <div>
            Showing {(filteredUsers.length === 0) ? 0 : ((page - 1) * pageSize + 1)}–{Math.min(page * pageSize, filteredUsers.length)} of {filteredUsers.length}
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className={`px-3 py-1 border rounded ${page <= 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}`}
            >Prev</button>
            <span>Page {page} / {totalPages}</span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              className={`px-3 py-1 border rounded ${page >= totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}`}
            >Next</button>
          </div>
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No users found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || filterRole !== 'all' || filterActive !== 'all' 
                ? 'Try adjusting your search or filters.' 
                : 'Get started by creating a new user.'
              }
            </p>
          </div>
        )}
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <CreateUserModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateUser}
        />
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <EditUserModal
          user={selectedUser}
          onClose={() => {
            setShowEditModal(false);
            setSelectedUser(null);
          }}
          onSubmit={handleUpdateUser}
        />
      )}

      {/* User Details Modal */}
      {showDetailsModal && selectedUser && (
        <UserDetailsModal
          user={selectedUser}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedUser(null);
          }}
        />
      )}
    </div>
  );
}

// Create User Modal Component
function CreateUserModal({ onClose, onSubmit }: {
  onClose: () => void;
  onSubmit: (data: Partial<User> & { password: string }) => void;
}) {
  const [formData, setFormData] = useState({
    candidate_name: '',
    email: '',
    candidate_id: '',
    client_name: '',
    role: 'candidate' as 'superadmin' | 'admin' | 'candidate',
    language_preference: 'en',
    is_active: true,
    password: ''
  });

  const [companies, setCompanies] = useState<any[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);

  // Load companies when modal opens
  useEffect(() => {
    const loadCompanies = async () => {
      setLoadingCompanies(true);
      try {
        const result = await apiService.getTenants();
        if (result.data && result.data.tenants) {
          setCompanies(result.data.tenants);
        }
      } catch (error) {
        console.error('Failed to load companies:', error);
      } finally {
        setLoadingCompanies(false);
      }
    };
    loadCompanies();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full m-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Create New User</h3>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={formData.candidate_name}
                onChange={(e) => setFormData({ ...formData, candidate_name: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email *
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Candidate ID *
              </label>
              <input
                type="text"
                required
                value={formData.candidate_id}
                onChange={(e) => setFormData({ ...formData, candidate_id: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Company *
              </label>
              {/* Replaced text input with dropdown select populated from companies */}
              <select
                required
                value={formData.client_name}
                onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                disabled={loadingCompanies || companies.length === 0}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
              >
                {loadingCompanies && <option value="">Loading companies...</option>}
                {!loadingCompanies && companies.length === 0 && <option value="">No companies available</option>}
                {!loadingCompanies && companies.length > 0 && <option value="">Select a company</option>}
                {!loadingCompanies && companies.map((c: any) => (
                  <option key={c.id} value={c.name || c.tenant_name || c.company_name}>{c.name || c.tenant_name || c.company_name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Role *
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="candidate">Candidate</option>
                <option value="admin">Admin</option>
                <option value="superadmin">Super Admin</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Language
              </label>
              <select
                value={formData.language_preference}
                onChange={(e) => setFormData({ ...formData, language_preference: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password *
            </label>
            <input
              type="password"
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Minimum 8 characters"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">
              Active
            </label>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create User
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Edit User Modal Component
function EditUserModal({ user, onClose, onSubmit }: {
  user: User;
  onClose: () => void;
  onSubmit: (data: Partial<User>) => void;
}) {
  const [formData, setFormData] = useState({
    candidate_name: user.candidate_name,
    email: user.email,
    candidate_id: user.candidate_id,
    client_name: user.client_name,
    role: user.role,
    language_preference: user.language_preference,
    is_active: user.is_active
  });

  const [companies, setCompanies] = useState<any[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);

  useEffect(() => {
    const loadCompanies = async () => {
      setLoadingCompanies(true);
      try {
        const result = await apiService.getTenants();
        if (result.data && result.data.tenants) {
          setCompanies(result.data.tenants);
        }
      } catch (error) {
        console.error('Failed to load companies:', error);
      } finally {
        setLoadingCompanies(false);
      }
    };
    loadCompanies();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full m-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Edit User</h3>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={formData.candidate_name}
                onChange={(e) => setFormData({ ...formData, candidate_name: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email *
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Candidate ID *
              </label>
              <input
                type="text"
                required
                value={formData.candidate_id}
                onChange={(e) => setFormData({ ...formData, candidate_id: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Company *
              </label>
              <select
                required
                value={formData.client_name}
                onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                disabled={loadingCompanies || companies.length === 0}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
              >
                {loadingCompanies && <option value="">Loading companies...</option>}
                {!loadingCompanies && companies.length === 0 && <option value="">No companies available</option>}
                {!loadingCompanies && companies.length > 0 && <option value="">Select a company</option>}
                {!loadingCompanies && companies.map((c: any) => (
                  <option key={c.id} value={c.name || c.tenant_name || c.company_name}>{c.name || c.tenant_name || c.company_name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Role *
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="candidate">Candidate</option>
                <option value="admin">Admin</option>
                <option value="superadmin">Super Admin</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Language
              </label>
              <select
                value={formData.language_preference}
                onChange={(e) => setFormData({ ...formData, language_preference: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
              </select>
            </div>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_active_edit"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="is_active_edit" className="ml-2 text-sm text-gray-700">
              Active
            </label>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Update User
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// User Details Modal Component
function UserDetailsModal({ user, onClose }: {
  user: User;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full m-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">User Details</h3>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="flex items-center space-x-4">
            <div className={`h-16 w-16 rounded-full flex items-center justify-center text-white font-bold text-xl ${
              user.role === 'superadmin' ? 'bg-purple-600' :
              user.role === 'admin' ? 'bg-blue-600' : 'bg-green-600'
            }`}>
              {user.candidate_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h4 className="text-xl font-semibold text-gray-900">{user.candidate_name}</h4>
              <p className="text-gray-600">{user.email}</p>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${
                user.role === 'superadmin' ? 'bg-purple-100 text-purple-800' :
                user.role === 'admin' ? 'bg-blue-100 text-blue-800' :
                'bg-green-100 text-green-800'
              }`}>
                {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">
                Personal Information
              </h4>
              <div className="space-y-3">
                <div>
                  <span className="block text-sm text-gray-600">Candidate ID</span>
                  <span className="text-sm font-medium text-gray-900">{user.candidate_id}</span>
                </div>
                <div>
                  <span className="block text-sm text-gray-600">Email</span>
                  <span className="text-sm font-medium text-gray-900">{user.email}</span>
                </div>
                <div>
                  <span className="block text-sm text-gray-600">Language</span>
                  <span className="text-sm font-medium text-gray-900">{user.language_preference}</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">
                Organization
              </h4>
              <div className="space-y-3">
                <div>
                  <span className="block text-sm text-gray-600">Company</span>
                  <span className="text-sm font-medium text-gray-900">{user.client_name}</span>
                </div>
                <div>
                  <span className="block text-sm text-gray-600">Tenant ID</span>
                  <span className="text-sm font-medium text-gray-900">{user.tenant_id}</span>
                </div>
                <div>
                  <span className="block text-sm text-gray-600">Status</span>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    user.is_active 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {user.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">
              Account Information
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="block text-sm text-gray-600">Last Login</span>
                <span className="text-sm font-medium text-gray-900">
                  {user.last_login ? new Date(user.last_login).toLocaleString() : 'Never'}
                </span>
              </div>
              <div>
                <span className="block text-sm text-gray-600">Created At</span>
                <span className="text-sm font-medium text-gray-900">
                  {new Date(user.created_at).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}