'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Users, UserCheck, ArrowRight } from 'lucide-react';

interface User {
  id: string;
  email: string;
  candidate_name: string;
  candidate_id: string;
  client_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

interface UserAssignment {
  id: string;
  user_id: string;
  admin_id: string;
  assigned_by: string;
  is_active: boolean;
  notes?: string;
  created_at: string;
}

export default function UserAssignmentManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [admins, setAdmins] = useState<User[]>([]);
  const [assignments, setAssignments] = useState<UserAssignment[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [selectedAdmin, setSelectedAdmin] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

  useEffect(() => {
    fetchUsers();
    fetchAdmins();
    fetchAssignments();
  }, []);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE}/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        // Filter to show only candidates
        setUsers(data.filter((user: User) => user.role === 'candidate'));
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const fetchAdmins = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE}/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        // Filter to show only admins
        setAdmins(data.filter((user: User) => user.role === 'admin'));
      }
    } catch (error) {
      console.error('Failed to fetch admins:', error);
    }
  };

  const fetchAssignments = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE}/api/v1/assignments/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setAssignments(data);
      }
    } catch (error) {
      console.error('Failed to fetch assignments:', error);
    }
  };

  const handleUserSelection = (userId: string, checked: boolean) => {
    const newSelection = new Set(selectedUsers);
    if (checked) {
      newSelection.add(userId);
    } else {
      newSelection.delete(userId);
    }
    setSelectedUsers(newSelection);
  };

  const handleAssignUsers = async () => {
    if (selectedUsers.size === 0 || !selectedAdmin) {
      toast({
        variant: 'destructive',
        title: 'Invalid Selection',
        description: 'Please select users and an admin to assign them to.',
      });
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE}/api/v1/assignments/users/bulk`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_ids: Array.from(selectedUsers),
          admin_id: selectedAdmin,
          notes: notes.trim() || undefined,
        }),
      });

      if (response.ok) {
        const newAssignments = await response.json();
        toast({
          title: 'Assignment Successful',
          description: `${newAssignments.length} users assigned to admin successfully.`,
        });
        
        // Reset form
        setSelectedUsers(new Set());
        setSelectedAdmin('');
        setNotes('');
        
        // Refresh data
        fetchAssignments();
      } else {
        const error = await response.json();
        toast({
          variant: 'destructive',
          title: 'Assignment Failed',
          description: error.detail || 'Failed to assign users to admin.',
        });
      }
    } catch (error) {
      console.error('Assignment error:', error);
      toast({
        variant: 'destructive',
        title: 'Assignment Error',
        description: 'An error occurred during assignment.',
      });
    } finally {
      setLoading(false);
    }
  };

  const getAssignedAdmin = (userId: string): User | undefined => {
    const assignment = assignments.find(a => a.user_id === userId && a.is_active);
    if (!assignment) return undefined;
    return admins.find(admin => admin.id === assignment.admin_id);
  };

  const unassignedUsers = users.filter(user => !getAssignedAdmin(user.id));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Users className="h-6 w-6" />
        <h2 className="text-2xl font-bold">User Assignment Management</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assignment Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              Assign Users to Admin
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Admin Selection */}
            <div>
              <label className="text-sm font-medium mb-2 block">Select Admin</label>
              <Select value={selectedAdmin} onValueChange={setSelectedAdmin}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an admin" />
                </SelectTrigger>
                <SelectContent>
                  {admins.map((admin) => (
                    <SelectItem key={admin.id} value={admin.id}>
                      {admin.candidate_name} ({admin.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* User Selection */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                Select Users ({selectedUsers.size} selected)
              </label>
              <div className="max-h-64 overflow-y-auto space-y-2 border rounded p-2">
                {unassignedUsers.length === 0 ? (
                  <p className="text-muted-foreground text-sm">All users are already assigned</p>
                ) : (
                  unassignedUsers.map((user) => (
                    <div key={user.id} className="flex items-center space-x-2 p-2 hover:bg-muted rounded">
                      <Checkbox
                        id={user.id}
                        checked={selectedUsers.has(user.id)}
                        onCheckedChange={(checked) => handleUserSelection(user.id, checked as boolean)}
                      />
                      <label htmlFor={user.id} className="flex-1 cursor-pointer">
                        <div className="font-medium">{user.candidate_name}</div>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                      </label>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="text-sm font-medium mb-2 block">Notes (Optional)</label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes about this assignment..."
                rows={3}
              />
            </div>

            {/* Assign Button */}
            <Button
              onClick={handleAssignUsers}
              disabled={loading || selectedUsers.size === 0 || !selectedAdmin}
              className="w-full"
            >
              {loading ? (
                'Assigning...'
              ) : (
                <>
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Assign {selectedUsers.size} User{selectedUsers.size !== 1 ? 's' : ''} to Admin
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Current Assignments */}
        <Card>
          <CardHeader>
            <CardTitle>Current User Assignments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {users.map((user) => {
                const assignedAdmin = getAssignedAdmin(user.id);
                return (
                  <div key={user.id} className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <div className="font-medium">{user.candidate_name}</div>
                      <div className="text-sm text-muted-foreground">{user.email}</div>
                    </div>
                    <div className="text-right">
                      {assignedAdmin ? (
                        <Badge variant="secondary">
                          {assignedAdmin.candidate_name}
                        </Badge>
                      ) : (
                        <Badge variant="outline">Unassigned</Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{users.length}</div>
            <div className="text-sm text-muted-foreground">Total Candidates</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{admins.length}</div>
            <div className="text-sm text-muted-foreground">Total Admins</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{assignments.filter(a => a.is_active).length}</div>
            <div className="text-sm text-muted-foreground">Active Assignments</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}