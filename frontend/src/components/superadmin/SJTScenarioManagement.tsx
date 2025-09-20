'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { FileText, Users, CheckSquare, Square, ChevronDown, ChevronUp, Loader2, Send } from 'lucide-react';
import { apiService, User } from '@/lib/api-service';
import { configurationService } from '@/lib/config-service';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

type Scenario = { id: string | number; name?: string; situation: string; question: string; assessedCompetency?: string };

export default function SJTScenarioManagement() {
  const { toast } = useToast();
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [globalLoading, setGlobalLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [expandedScenario, setExpandedScenario] = useState<string | number | null>(null);
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);
  // Superadmin now works directly with global scenarios (no company filter)

  useEffect(() => {
    // Load global scenarios from configuration (no tenant filter)
    (async () => {
      setLoading(true);
      try {
        const cfg = await configurationService.getSJTConfig();
        const sc = ((cfg?.scenarios || []) as any[]).map(s => ({ id: s.id, name: s.name, situation: s.situation, question: s.question, assessedCompetency: s.assessedCompetency }));
        setScenarios(sc);
      } catch {
        setScenarios([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    // Load ALL candidates across companies
    (async () => {
      setGlobalLoading(true);
      try {
        const res = await apiService.getUsers({ role: 'candidate', is_active: true, limit: 2000 });
        const list = res.data?.users || [];
        setAllUsers(list);
      } catch {
        setAllUsers([]);
      } finally {
        setGlobalLoading(false);
      }
    })();
  }, []);

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    const onlyCandidates = allUsers.filter(u => (u.role || '').toLowerCase() === 'candidate');
    if (!q) return onlyCandidates;
    return onlyCandidates.filter(u => (
      u.candidate_name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.candidate_id?.toLowerCase().includes(q)
    ));
  }, [allUsers, userSearch]);

  const allUsersSelected = selectedUserIds.size > 0 && filteredUsers.every(u => selectedUserIds.has(u.id));

  const toggleUser = (id: string) => {
    setSelectedUserIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAllUsers = () => {
    setSelectedUserIds(prev => {
      const next = new Set(prev);
      const ids = filteredUsers.map(u => u.id);
      const every = ids.every(id => next.has(id));
      if (every) ids.forEach(id => next.delete(id)); else ids.forEach(id => next.add(id));
      return next;
    });
  };
  const clearAllUsers = () => setSelectedUserIds(new Set());

  const [selectedScenarioIds, setSelectedScenarioIds] = useState<Set<string | number>>(new Set());
  const allScenariosSelected = scenarios.length > 0 && selectedScenarioIds.size === scenarios.length;
  const toggleScenario = (sid: string | number) => {
    setSelectedScenarioIds(prev => {
      const next = new Set(prev);
      if (next.has(sid)) next.delete(sid); else next.add(sid);
      return next;
    });
  };
  const toggleAllScenarios = () => {
    setSelectedScenarioIds(prev => {
      const next = new Set(prev);
      if (scenarios.length > 0 && next.size === scenarios.length) return new Set();
      return new Set(scenarios.map(s => s.id));
    });
  };

  const assign = async () => {
    if (selectedUserIds.size === 0) {
      toast({ variant: 'destructive', title: 'Pick candidates', description: 'Select one or more users to assign.' });
      return;
    }
    if (selectedScenarioIds.size === 0) {
      toast({ variant: 'destructive', title: 'Pick scenarios', description: 'Select one or more scenarios to assign.' });
      return;
    }
    setAssigning(true);
    try {
      const payload = {
        user_ids: Array.from(selectedUserIds),
        test_types: ['SJT'],
        max_attempts: 1,
        sjt_scenario_ids: Array.from(selectedScenarioIds),
      };
      const res = await apiService.bulkAssignTests(payload);
      if (res.data) {
        toast({ title: 'Assigned', description: `Created ${res.data.length} test assignments.` });
        setSelectedUserIds(new Set());
      } else {
        toast({ variant: 'destructive', title: 'Failed', description: res.error || 'Could not assign tests.' });
      }
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">SJT Scenario Assignment</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Scenarios */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5"/>Scenarios ({scenarios.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {scenarios.length === 0 ? (
                <div className="text-sm text-gray-500 space-y-3">
                  <div>No scenarios found. Configure scenarios under Admin → SJT.</div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between mb-2">
                    <button className="text-sm text-blue-600 hover:underline" onClick={toggleAllScenarios}>{allScenariosSelected ? 'Unselect all' : 'Select all'}</button>
                  </div>
                  <ul className="divide-y">
                    {scenarios.map(s => (
                      <li key={s.id} className="py-2">
                        <div className="flex items-start gap-3">
                          <button onClick={() => toggleScenario(s.id)} className="mt-1">
                            {selectedScenarioIds.has(s.id) ? <CheckSquare className="h-5 w-5 text-green-600"/> : <Square className="h-5 w-5 text-gray-400"/>}
                          </button>
                          <div className="flex-1">
                            <div className="font-medium">{s.name ? s.name : `#${String(s.id)}`} • {s.question}</div>
                            <div className="text-sm text-gray-600 line-clamp-2">{s.situation}</div>
                            <button className="text-xs text-blue-600 flex items-center gap-1 mt-1" onClick={() => setExpandedScenario(expandedScenario === s.id ? null : s.id)}>
                              {expandedScenario === s.id ? <><ChevronUp className="h-3 w-3"/>Hide</> : <><ChevronDown className="h-3 w-3"/>Preview</>}
                            </button>
                            {expandedScenario === s.id && (
                              <div className="mt-2 p-2 bg-gray-50 rounded border text-sm">
                                <div className="font-semibold">Situation</div>
                                <p className="whitespace-pre-wrap">{s.situation}</p>
                                <div className="mt-2 text-xs text-gray-500">Competencies: {s.assessedCompetency || '—'}</div>
                              </div>
                            )}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Users */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5"/>Candidates ({allUsers.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-3">
                <Input value={userSearch} onChange={(e) => setUserSearch(e.target.value)} placeholder="Search candidates…"/>
              </div>
              <div className="flex items-center gap-3 mb-2 text-sm">
                <button className="text-blue-600 hover:underline" onClick={toggleAllUsers}>{allUsersSelected ? 'Unselect all' : 'Select all (filtered)'}</button>
                {selectedUserIds.size > 0 && (
                  <button className="text-gray-600 hover:underline" onClick={clearAllUsers}>Clear selection</button>
                )}
              </div>
              <div className="max-h-80 overflow-auto divide-y">
                {filteredUsers.map(u => (
                  <div key={u.id} className="py-2 flex items-center gap-3">
                    <button onClick={() => toggleUser(u.id)}>
                      {selectedUserIds.has(u.id) ? <CheckSquare className="h-5 w-5 text-green-600"/> : <Square className="h-5 w-5 text-gray-400"/>}
                    </button>
                    <div className="flex-1">
                      <div className="font-medium">{u.candidate_name} <span className="text-xs text-gray-500">({u.candidate_id})</span></div>
                      <div className="text-sm text-gray-600">{u.email}</div>
                    </div>
                  </div>
                ))}
                {filteredUsers.length === 0 && (
                  <div className="text-sm text-gray-500">No users match your search.</div>
                )}
              </div>
              {globalLoading && (
                <div className="flex items-center text-sm text-gray-500 mt-2"><Loader2 className="h-4 w-4 mr-2 animate-spin"/>Loading all candidates…</div>
              )}
              <div className="mt-4">
                <Button onClick={assign} disabled={assigning || selectedUserIds.size === 0 || selectedScenarioIds.size === 0} className="w-full">
                  {assigning ? 'Assigning…' : (<span className="flex items-center gap-2"><Send className="h-4 w-4"/>Assign SJT to {selectedUserIds.size} user(s)</span>)}
                </Button>
              </div>
            </CardContent>
          </Card>
      </div>
    </div>
  );
}
