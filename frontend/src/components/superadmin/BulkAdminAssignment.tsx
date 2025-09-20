'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CheckSquare, Square, UserCog, Users } from 'lucide-react';
import { apiService, type User } from '@/lib/api-service';
import { useToast } from '@/hooks/use-toast';

export default function BulkAdminAssignment() {
  const { toast } = useToast();
  // Simplified UI: remove company selector; work across all tenants
  const [admins, setAdmins] = useState<User[]>([]);
  const [candidates, setCandidates] = useState<User[]>([]);
  const [selectedAdminId, setSelectedAdminId] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [adminSearch, setAdminSearch] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    (async () => {
      setLoadingUsers(true);
      try {
        // Always load global admins and candidates
        const [adminsRes, usersRes] = await Promise.all([
          apiService.getUsers({ role: 'admin', is_active: true, limit: 5000 }),
          apiService.getUsers({ role: 'candidate', is_active: true, limit: 20000 })
        ]);
        const globalAdmins = (adminsRes.data?.users || []).filter(u => (u.role || '').toLowerCase() === 'admin');
        const globalCandidates = (usersRes.data?.users || []).filter(u => (u.role || '').toLowerCase() === 'candidate');
        setAdmins(globalAdmins);
        setCandidates(globalCandidates);
      } catch {
        setAdmins([]); setCandidates([]);
      } finally {
        setLoadingUsers(false);
      }
    })();
  }, []);

  const filteredCandidates = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return candidates;
    return candidates.filter(u => u.candidate_name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.candidate_id?.toLowerCase().includes(q));
  }, [candidates, search]);

  const filteredAdmins = useMemo(() => {
    const q = adminSearch.trim().toLowerCase();
    if (!q) return admins;
    return admins.filter(u => u.candidate_name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q));
  }, [admins, adminSearch]);

  const toggleUser = (id: string) => {
    setSelectedUserIds(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  };
  const toggleAllUsers = () => {
    setSelectedUserIds(prev => {
      const next = new Set(prev);
      const ids = filteredCandidates.map(u => u.id);
      const every = ids.every(id => next.has(id));
      if (every) ids.forEach(id => next.delete(id)); else ids.forEach(id => next.add(id));
      return next;
    });
  };
  const clearAllUsers = () => setSelectedUserIds(new Set());

  const assign = async () => {
    if (!selectedAdminId) { toast({ variant: 'destructive', title: 'Pick admin' }); return; }
    if (selectedUserIds.size === 0) { toast({ variant: 'destructive', title: 'Pick users' }); return; }
    setAssigning(true);
    try {
      // Use deprecated endpoint retained on backend
      const base = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
      const token = (typeof window !== 'undefined' ? sessionStorage.getItem('access_token') : null) || localStorage.getItem('access_token');
      const res = await fetch(`${base}/api/v1/assignments/users/bulk`, {
        method: 'POST', headers: { 'Content-Type':'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ admin_id: selectedAdminId, user_ids: Array.from(selectedUserIds) })
      });
      if (!res.ok) {
        const err = await res.json().catch(()=>({}));
        throw new Error(err.detail || `Failed (${res.status})`);
      }
      const created = await res.json();
      toast({ title: 'Assigned', description: `Created ${created.length} user assignments.` });
      setSelectedUserIds(new Set());
    } catch (e:any) {
      toast({ variant: 'destructive', title: 'Failed', description: e.message || 'Could not assign users.' });
    } finally { setAssigning(false); }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><UserCog className="h-5 w-5"/>Assign Users to Admin</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Admin</label>
              <div className="space-y-2">
                <Input value={adminSearch} onChange={(e)=> setAdminSearch(e.target.value)} placeholder="Search admins…" />
                <select value={selectedAdminId} onChange={(e)=> setSelectedAdminId(e.target.value)} className="border rounded px-3 py-2 w-full">
                  <option value="">-- Pick admin --</option>
                  {filteredAdmins.map(a => <option key={a.id} value={a.id}>{a.candidate_name || a.email}</option>)}
                </select>
                <div className="text-xs text-gray-600">Showing all admins across companies.</div>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Search Candidates</label>
              <Input value={search} onChange={(e)=> setSearch(e.target.value)} placeholder="Name, email, or ID" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border rounded p-3">
              <div className="flex items-center gap-2 mb-2"><Users className="h-4 w-4"/><span className="font-medium text-sm">Candidates ({filteredCandidates.length})</span></div>
              <div className="max-h-80 overflow-auto divide-y">
                {filteredCandidates.map(u => (
                  <div key={u.id} className="py-2 flex items-center gap-2">
                    <button onClick={()=> toggleUser(u.id)}>
                      {selectedUserIds.has(u.id) ? <CheckSquare className="h-5 w-5 text-green-600"/> : <Square className="h-5 w-5 text-gray-400"/>}
                    </button>
                    <div className="flex-1">
                      <div className="font-medium">{u.candidate_name} <span className="text-xs text-gray-500">({u.candidate_id})</span></div>
                      <div className="text-sm text-gray-600">{u.email}</div>
                    </div>
                  </div>
                ))}
                {filteredCandidates.length === 0 && (
                  <div className="text-sm text-gray-500">No candidates</div>
                )}
              </div>
              <div className="flex items-center gap-3 mt-2 text-sm">
                <button className="text-blue-600 hover:underline" onClick={toggleAllUsers}>Select all (filtered)</button>
                {selectedUserIds.size > 0 && (
                  <button className="text-gray-600 hover:underline" onClick={clearAllUsers}>Clear selection</button>
                )}
                {loadingUsers && <span className="text-gray-500">Loading…</span>}
              </div>
            </div>
            <div className="flex items-end">
              <Button className="w-full" disabled={assigning || !selectedAdminId || selectedUserIds.size===0} onClick={assign}>
                {assigning ? 'Assigning…' : `Assign ${selectedUserIds.size} user(s) to admin`}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
