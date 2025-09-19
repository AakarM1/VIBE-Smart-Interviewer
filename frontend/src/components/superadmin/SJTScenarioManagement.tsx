'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Building2, FileText, Users, CheckSquare, Square, Eye, ChevronDown, ChevronUp, Loader2, Send } from 'lucide-react';
import { apiService, Tenant, User } from '@/lib/api-service';
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
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [tenantUsers, setTenantUsers] = useState<User[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [expandedScenario, setExpandedScenario] = useState<string | number | null>(null);
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newScenario, setNewScenario] = useState<{
    name?: string;
    situation: string;
    question: string;
    bestResponseRationale?: string;
    worstResponseRationale?: string;
    assessedCompetency?: string;
    prepTimeSeconds?: number;
    reRecordLimit?: number;
    ttsVoice?: string;
  }>({ situation: '', question: '' });

  useEffect(() => {
    // Load tenants list
    (async () => {
      const res = await apiService.getTenants({ is_active: true });
      if (res.data) setTenants(res.data.tenants);
    })();
  }, []);

  useEffect(() => {
    if (!selectedTenantId) return;
    // Load tenant SJT config and users
    (async () => {
      setLoading(true);
      try {
        const [cfgRes, usersRes] = await Promise.all([
          apiService.getConfigurationForTenant('sjt', selectedTenantId),
          apiService.listTenantUsers(selectedTenantId, { role: 'candidate', limit: 500 })
        ]);
  const cfg = cfgRes.data?.config_data || null;
  const scns = (cfg?.scenarios || []) as any[];
  setScenarios(scns.map(s => ({ id: s.id, name: s.name, situation: s.situation, question: s.question, assessedCompetency: s.assessedCompetency })));
        setTenantUsers(usersRes.data || []);
      } catch (e) {
        setScenarios([]);
        setTenantUsers([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedTenantId]);

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return tenantUsers;
    return tenantUsers.filter(u => (
      u.candidate_name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.candidate_id?.toLowerCase().includes(q)
    ));
  }, [tenantUsers, userSearch]);

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
    if (!selectedTenantId) {
      toast({ variant: 'destructive', title: 'Pick a company', description: 'Select a company first.' });
      return;
    }
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

  const openCreate = () => {
    if (!selectedTenantId) {
      toast({ variant: 'destructive', title: 'Pick a company', description: 'Select a company first.' });
      return;
    }
    setNewScenario({ situation: '', question: '' });
    setIsCreateOpen(true);
  };

  const saveNewScenario = async () => {
    if (!selectedTenantId) return;
    if (!newScenario.situation?.trim() || !newScenario.question?.trim()) {
      toast({ variant: 'destructive', title: 'Missing fields', description: 'Situation and Question are required.' });
      return;
    }
    setCreating(true);
    try {
      // Load existing config for tenant (if any)
      const cfgRes = await apiService.getConfigurationForTenant('sjt', selectedTenantId);
      const cfg = cfgRes.data?.config_data || null;
      const existingScenarios = Array.isArray(cfg?.scenarios) ? cfg.scenarios : [];
      const settings = cfg?.settings || { timeLimit: 0, numberOfQuestions: Math.max(1, existingScenarios.length + 1), questionTimeLimit: 2, aiGeneratedQuestions: 0, followUpCount: 1, followUpPenalty: 0 };
      const scenarioToAdd = { id: Date.now(), ...newScenario } as any;
      const payload = { scenarios: [...existingScenarios, scenarioToAdd], settings, tenant_id: selectedTenantId } as any;
      const res = await apiService.saveConfiguration('sjt', payload);
      if (res.data) {
        toast({ title: 'Scenario created', description: 'A new scenario has been added for this company.' });
        // Reload scenarios
        const cfgRes2 = await apiService.getConfigurationForTenant('sjt', selectedTenantId);
        const cfg2 = cfgRes2.data?.config_data || null;
        const sc2 = (cfg2?.scenarios || []) as any[];
        setScenarios(sc2.map(s => ({ id: s.id, name: s.name, situation: s.situation, question: s.question, assessedCompetency: s.assessedCompetency })));
        setIsCreateOpen(false);
      } else {
        toast({ variant: 'destructive', title: 'Failed', description: res.error || 'Could not save scenario.' });
      }
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2"><Building2 className="h-6 w-6"/>SJT Scenario Assignment</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Select Company</span>
            {selectedTenantId && (
              <Button size="sm" variant="outline" onClick={openCreate}>Add Scenario</Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <select
            value={selectedTenantId}
            onChange={(e) => { setSelectedTenantId(e.target.value); setSelectedUserIds(new Set()); setSelectedScenarioIds(new Set()); }}
            className="border border-gray-300 rounded-lg px-3 py-2 w-full max-w-md"
          >
            <option value="">-- Choose a company --</option>
            {tenants.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          {loading && <div className="flex items-center text-sm text-gray-500"><Loader2 className="h-4 w-4 mr-2 animate-spin"/>Loading scenarios and users…</div>}
        </CardContent>
      </Card>

      {selectedTenantId && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Scenarios */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5"/>Scenarios ({scenarios.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {scenarios.length === 0 ? (
                <div className="text-sm text-gray-500 space-y-3">
                  <div>No scenarios found for this company.</div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={openCreate}>Create First Question</Button>
                  </div>
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
              <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5"/>Candidates ({tenantUsers.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-3">
                <Input value={userSearch} onChange={(e) => setUserSearch(e.target.value)} placeholder="Search candidates…"/>
                <button className="text-sm text-blue-600 hover:underline" onClick={toggleAllUsers}>{allUsersSelected ? 'Unselect all' : 'Select all (filtered)'}</button>
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

              <div className="mt-4">
                <Button onClick={assign} disabled={assigning || selectedUserIds.size === 0 || selectedScenarioIds.size === 0} className="w-full">
                  {assigning ? 'Assigning…' : (<span className="flex items-center gap-2"><Send className="h-4 w-4"/>Assign SJT to {selectedUserIds.size} user(s)</span>)}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Create Scenario Modal */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create SJT Scenario</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Scenario Name (optional)</Label>
              <Input value={newScenario.name || ''} onChange={(e)=> setNewScenario(ns => ({ ...ns, name: e.target.value }))} placeholder="e.g., Handling a Difficult Customer" />
            </div>
            <div className="space-y-1">
              <Label>Situation</Label>
              <Textarea rows={3} value={newScenario.situation} onChange={(e)=> setNewScenario(ns => ({ ...ns, situation: e.target.value }))} placeholder="Describe the situation shown to the candidate" />
            </div>
            <div className="space-y-1">
              <Label>Question</Label>
              <Input value={newScenario.question} onChange={(e)=> setNewScenario(ns => ({ ...ns, question: e.target.value }))} placeholder="What would you do in this situation?" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Best Response Rationale</Label>
                <Textarea rows={4} value={newScenario.bestResponseRationale || ''} onChange={(e)=> setNewScenario(ns => ({ ...ns, bestResponseRationale: e.target.value }))} placeholder="What a strong answer demonstrates" />
              </div>
              <div className="space-y-1">
                <Label>Worst Response Rationale</Label>
                <Textarea rows={4} value={newScenario.worstResponseRationale || ''} onChange={(e)=> setNewScenario(ns => ({ ...ns, worstResponseRationale: e.target.value }))} placeholder="What a weak answer looks like" />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Competencies (comma-separated)</Label>
              <Input value={newScenario.assessedCompetency || ''} onChange={(e)=> setNewScenario(ns => ({ ...ns, assessedCompetency: e.target.value }))} placeholder="e.g., Customer Focus, Communication" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label>Prep Time (seconds)</Label>
                <Input type="number" min={0} value={newScenario.prepTimeSeconds ?? 0} onChange={(e)=> setNewScenario(ns => ({ ...ns, prepTimeSeconds: Math.max(0, parseInt(e.target.value||'0', 10)) }))} />
              </div>
              <div className="space-y-1">
                <Label>Re-record Limit</Label>
                <Input type="number" min={0} max={5} value={newScenario.reRecordLimit ?? 0} onChange={(e)=> setNewScenario(ns => ({ ...ns, reRecordLimit: Math.min(5, Math.max(0, parseInt(e.target.value||'0', 10))) }))} />
              </div>
              <div className="space-y-1">
                <Label>TTS Voice (id)</Label>
                <Input value={newScenario.ttsVoice || ''} onChange={(e)=> setNewScenario(ns => ({ ...ns, ttsVoice: e.target.value }))} placeholder="Optional e.g., en-US-Neural2-A" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=> setIsCreateOpen(false)} disabled={creating}>Cancel</Button>
            <Button onClick={saveNewScenario} disabled={creating}>{creating ? 'Saving…' : 'Save Scenario'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
