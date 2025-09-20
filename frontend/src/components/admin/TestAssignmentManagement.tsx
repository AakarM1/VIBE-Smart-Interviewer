'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Calendar, ClipboardList, Target, Users, ListChecks, Trash2 } from 'lucide-react';
import { configurationService } from '@/lib/config-service';

interface User {
  id: string;
  email: string;
  candidate_name: string;
  candidate_id: string;
  role: string;
}

interface TestAssignment {
  id: string;
  user_id: string;
  test_type: string;
  status: string;
  due_date?: string;
  max_attempts: number;
  assigned_at: string;
  notes?: string;
}

export default function TestAssignmentManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [assignments, setAssignments] = useState<TestAssignment[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [selectedTests, setSelectedTests] = useState<Set<string>>(new Set());
  const [dueDate, setDueDate] = useState<string>('');
  const [maxAttempts, setMaxAttempts] = useState<number>(3);
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [sjtScenarios, setSjtScenarios] = useState<Array<{ id: string | number; name?: string; question: string }>>([]);
  const [selectedScenarioIds, setSelectedScenarioIds] = useState<Set<string | number>>(new Set());
  const { toast } = useToast();

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
  const testTypes = ['SJT', 'JDT'];

  useEffect(() => {
    fetchAssignedUsers();
    fetchTestAssignments();
    // Load SJT scenarios from tenant config for scenario assignment
    (async () => {
      try {
  const cfg = await configurationService.getSJTConfig();
  const sc = ((cfg?.scenarios || []) as any[]).map(s => ({ id: s.id, name: s.name, question: s.question }));
        setSjtScenarios(sc);
      } catch (e) {
        setSjtScenarios([]);
      }
    })();
  }, []);

  const fetchAssignedUsers = async () => {
    try {
      const token = (typeof window !== 'undefined' ? sessionStorage.getItem('access_token') : null) || localStorage.getItem('access_token');
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

  const fetchTestAssignments = async () => {
    try {
      const token = (typeof window !== 'undefined' ? sessionStorage.getItem('access_token') : null) || localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE}/api/v1/assignments/tests`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setAssignments(data);
      }
    } catch (error) {
      console.error('Failed to fetch test assignments:', error);
    }
  };

  const handleDeleteAssignment = async (assignmentId: string) => {
    try {
      const token = (typeof window !== 'undefined' ? sessionStorage.getItem('access_token') : null) || localStorage.getItem('access_token');
      const res = await fetch(`${API_BASE}/api/v1/assignments/tests/${assignmentId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        const err = await res.json().catch(()=>({}));
        throw new Error(err.detail || `Failed to delete assignment (${res.status})`);
      }
      toast({ title: 'Assignment removed', description: 'The test assignment has been deleted.' });
      // Optimistically update without refetch
      setAssignments(prev => prev.filter(a => a.id !== assignmentId));
    } catch (e:any) {
      toast({ variant: 'destructive', title: 'Delete failed', description: e.message || 'Could not delete assignment.' });
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

  const handleTestSelection = (testType: string, checked: boolean) => {
    const newSelection = new Set(selectedTests);
    if (checked) {
      newSelection.add(testType);
    } else {
      newSelection.delete(testType);
    }
    setSelectedTests(newSelection);
  };

  const handleAssignTests = async () => {
    if (selectedUsers.size === 0 || selectedTests.size === 0) {
      toast({
        variant: 'destructive',
        title: 'Invalid Selection',
        description: 'Please select users and tests to assign.',
      });
      return;
    }

    setLoading(true);
    try {
      const token = (typeof window !== 'undefined' ? sessionStorage.getItem('access_token') : null) || localStorage.getItem('access_token');
      // Build payload with proper normalization to match backend schema
      const payload = {
        user_ids: Array.from(selectedUsers),
        test_types: Array.from(selectedTests).map(t => String(t).toUpperCase()),
        due_date: (dueDate && !Number.isNaN(Date.parse(dueDate))) ? new Date(dueDate).toISOString() : undefined,
        max_attempts: maxAttempts,
        notes: notes.trim() || undefined,
        sjt_scenario_ids: selectedTests.has('SJT') && selectedScenarioIds.size > 0
          ? Array.from(selectedScenarioIds).map(id => String(id))
          : undefined,
      };

      const response = await fetch(`${API_BASE}/api/v1/assignments/tests/bulk`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const newAssignments = await response.json();
        toast({
          title: 'Assignment Successful',
          description: `${newAssignments.length} test assignments created successfully.`,
        });
        
        // Reset form
        setSelectedUsers(new Set());
        setSelectedTests(new Set());
        setDueDate('');
        setMaxAttempts(3);
  setNotes('');
  setSelectedScenarioIds(new Set());
        
        // Refresh data
        fetchTestAssignments();
      } else {
        let error: any = {};
        try { error = await response.json(); } catch {}
        const detail = error?.detail
          || (Array.isArray(error) && error.length && error[0]?.msg)
          || `Failed to assign tests to users. (${response.status})`;
        toast({
          variant: 'destructive',
          title: 'Assignment Failed',
          description: typeof detail === 'string' ? detail : 'Failed to assign tests to users.',
        });
      }
    } catch (error) {
      console.error('Assignment error:', error);
      toast({
        variant: 'destructive',
        title: 'Assignment Error',
        description: 'An error occurred during test assignment.',
      });
    } finally {
      setLoading(false);
    }
  };

  const getUserAssignments = (userId: string): TestAssignment[] => {
    return assignments.filter(assignment => assignment.user_id === userId);
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'assigned': return 'bg-blue-100 text-blue-800';
      case 'started': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <ClipboardList className="h-6 w-6" />
        <h2 className="text-2xl font-bold">Test Assignment Management</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assignment Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Assign Tests to Users
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* User Selection */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                Select Users ({selectedUsers.size} selected)
              </label>
              <div className="max-h-48 overflow-y-auto space-y-2 border rounded p-2">
                {users.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No users assigned to you</p>
                ) : (
                  users.map((user) => (
                    <div key={user.id} className="flex items-center space-x-2 p-2 hover:bg-muted rounded">
                      <Checkbox
                        id={`user-${user.id}`}
                        checked={selectedUsers.has(user.id)}
                        onCheckedChange={(checked) => handleUserSelection(user.id, checked as boolean)}
                      />
                      <label htmlFor={`user-${user.id}`} className="flex-1 cursor-pointer">
                        <div className="font-medium">{user.candidate_name}</div>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                      </label>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Test Type Selection */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                Select Test Types ({selectedTests.size} selected)
              </label>
              <div className="flex gap-2">
                {testTypes.map((testType) => (
                  <div key={testType} className="flex items-center space-x-2">
                    <Checkbox
                      id={`test-${testType}`}
                      checked={selectedTests.has(testType)}
                      onCheckedChange={(checked) => handleTestSelection(testType, checked as boolean)}
                    />
                    <label htmlFor={`test-${testType}`} className="cursor-pointer font-medium">
                      {testType}
                    </label>
                  </div>
                ))}
              </div>
              {selectedTests.has('SJT') && (
                <div className="mt-3 p-3 border rounded">
                  <div className="flex items-center gap-2 mb-2"><ListChecks className="h-4 w-4"/><span className="font-medium text-sm">Select SJT Scenarios (optional)</span></div>
                  {sjtScenarios.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No scenarios configured. Use Admin → SJT to add scenarios. If left empty, the default number of questions from settings will be used.</p>
                  ) : (
                    <div className="max-h-40 overflow-auto grid grid-cols-1 gap-2">
                      {sjtScenarios.map(s => (
                        <label key={String(s.id)} className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={selectedScenarioIds.has(s.id)}
                            onCheckedChange={(c)=>{
                              const next = new Set(selectedScenarioIds);
                              if (c) next.add(s.id); else next.delete(s.id);
                              setSelectedScenarioIds(next);
                            }}
                          />
                          <span className="truncate">{s.name ? `${s.name}` : `#${String(s.id)}`} • {s.question}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Due Date */}
            <div>
              <Label htmlFor="due-date">Due Date (Optional)</Label>
              <Input
                id="due-date"
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>

            {/* Max Attempts */}
            <div>
              <Label htmlFor="max-attempts">Maximum Attempts</Label>
              <Input
                id="max-attempts"
                type="number"
                min="1"
                max="10"
                value={maxAttempts}
                onChange={(e) => setMaxAttempts(parseInt(e.target.value) || 3)}
              />
            </div>

            {/* Notes */}
            <div>
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes about this test assignment..."
                rows={3}
              />
            </div>

            {/* Assign Button */}
            <Button
              onClick={handleAssignTests}
              disabled={loading || selectedUsers.size === 0 || selectedTests.size === 0}
              className="w-full"
            >
              {loading ? (
                'Assigning...'
              ) : (
                <>
                  <Target className="h-4 w-4 mr-2" />
                  Assign {selectedTests.size} Test{selectedTests.size !== 1 ? 's' : ''} to {selectedUsers.size} User{selectedUsers.size !== 1 ? 's' : ''}
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Current Test Assignments */}
        <Card>
          <CardHeader>
            <CardTitle>Current Test Assignments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {users.map((user) => {
                const userAssignments = getUserAssignments(user.id);
                return (
                  <div key={user.id} className="border rounded p-3">
                    <div className="font-medium mb-2">{user.candidate_name}</div>
                    <div className="text-sm text-muted-foreground mb-2">{user.email}</div>
                    <div className="flex flex-wrap gap-2">
                      {userAssignments.length === 0 ? (
                        <Badge variant="outline">No tests assigned</Badge>
                      ) : (
                        userAssignments.map((assignment) => (
                          <div key={assignment.id} className="flex items-center gap-1">
                            <Badge className={getStatusColor(assignment.status)}>
                              {assignment.test_type} - {assignment.status}
                            </Badge>
                            <button
                              title="Delete assignment"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => handleDeleteAssignment(assignment.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{users.length}</div>
            <div className="text-sm text-muted-foreground">Assigned Users</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{assignments.length}</div>
            <div className="text-sm text-muted-foreground">Total Test Assignments</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{assignments.filter(a => a.status === 'completed').length}</div>
            <div className="text-sm text-muted-foreground">Completed Tests</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{assignments.filter(a => a.status === 'assigned').length}</div>
            <div className="text-sm text-muted-foreground">Pending Tests</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}