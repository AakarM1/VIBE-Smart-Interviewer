'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CheckSquare, Square, UserCog, Users } from 'lucide-react';
import { apiService, type User, type Tenant } from '@/lib/api-service';
import { useToast } from '@/hooks/use-toast';

export default function BulkAdminAssignment() {
  const { toast } = useToast();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [admins, setAdmins] = useState<User[]>([]);
  const [candidates, setCandidates] = useState<User[]>([]);
  const [selectedAdminId, setSelectedAdminId] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await apiService.getTenants({ is_active: true });
      if (res.data) setTenants(res.data.tenants);
    })();
  }, []);

  useEffect(() => {
    if (!selectedTenantId) { setAdmins([]); setCandidates([]); return; }
    (async () => {
      try {
        const [adminsRes, candRes] = await Promise.all([
          apiService.listTenantUsers(selectedTenantId, { role: 'admin', limit: 500 }),
          apiService.listTenantUsers(selectedTenantId, { role: 'candidate', limit: 1000 })
        ]);
        setAdmins(adminsRes.data || []);
        setCandidates(candRes.data || []);
      } catch {
        setAdmins([]); setCandidates([]);
      }
    })();
  }, [selectedTenantId]);

  const filteredCandidates = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return candidates;
    return candidates.filter(u => u.candidate_name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.candidate_id?.toLowerCase().includes(q));
  }, [candidates, search]);

  const toggleUser = (id: string) => {
    setSelectedUserIds(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  };

  const assign = async () => {
    if (!selectedTenantId) { toast({ variant: 'destructive', title: 'Pick company' }); return; }
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-sm font-medium">Company</label>
              <select value={selectedTenantId} onChange={(e)=>{ setSelectedTenantId(e.target.value); setSelectedAdminId(''); setSelectedUserIds(new Set()); }} className="border rounded px-3 py-2 w-full">
                <option value="">-- Choose --</option>
                {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Admin</label>
              <select value={selectedAdminId} onChange={(e)=> setSelectedAdminId(e.target.value)} className="border rounded px-3 py-2 w-full" disabled={!selectedTenantId}>
                <option value="">-- Pick admin --</option>
                {admins.map(a => <option key={a.id} value={a.id}>{a.candidate_name || a.email}</option>)}
              </select>
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
