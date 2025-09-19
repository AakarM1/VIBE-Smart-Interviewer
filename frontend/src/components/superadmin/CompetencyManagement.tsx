"use client";
import React, { useEffect, useState } from "react";

type Competency = {
  id: string;
  tenant_id?: string;
  competency_code: string;
  competency_name: string;
  competency_description?: string;
  meta_competency?: string;
  translations?: Record<string, any>;
  category?: string;
  industry?: string;
  role_category?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export default function CompetencyManagement() {
  const [items, setItems] = useState<Competency[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [form, setForm] = useState<Partial<Competency>>({
    competency_code: "",
    competency_name: "",
    competency_description: "",
    category: "",
    is_active: true,
  });
  const [categoryQuery, setCategoryQuery] = useState("");
  const [showCategorySuggestions, setShowCategorySuggestions] = useState(false);

  const baseURL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

  // Always build headers at call time to pick up the latest per-tab token (stored in sessionStorage)
  const getHeaders = () => {
    const access = typeof window !== "undefined" ? (sessionStorage.getItem("access_token") || localStorage.getItem("access_token")) : null;
    return {
      "Content-Type": "application/json",
      ...(access ? { Authorization: `Bearer ${access}` } : {}),
    } as Record<string, string>;
  };

  async function load() {
    setLoading(true);
    setError(null);
    try {
  const res = await fetch(`${baseURL}/api/v1/competencies` , { headers: getHeaders() });
      if (!res.ok) {
        const body = await res.json().catch(() => ({} as any));
        throw new Error(body?.detail || `Failed to list (${res.status})`);
      }
      const data = await res.json();
      setItems(data);
    } catch (e: any) {
      setError(e.message || "Failed to load competencies");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch(`${baseURL}/api/v1/competencies`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({} as any));
        throw new Error(body?.detail || `Create failed (${res.status})`);
      }
    await load();
    setForm({ competency_code: "", competency_name: "", competency_description: "", category: "", is_active: true });
    setCategoryQuery("");
    } catch (e: any) {
      setError(e.message || "Failed to create");
    }
  }

  async function remove(code: string) {
    if (!confirm(`Delete competency ${code}? This cannot be undone.`)) return;
    setError(null);
    try {
  const res = await fetch(`${baseURL}/api/v1/competencies/${encodeURIComponent(code)}?hard=true`, { method: "DELETE", headers: getHeaders() });
      if (!res.ok) {
        const body = await res.json().catch(() => ({} as any));
        throw new Error(body?.detail || `Delete failed (${res.status})`);
      }
      await load();
    } catch (e: any) {
      setError(e.message || "Failed to delete");
    }
  }

  const filtered = items.filter((i) => {
    const q = search.toLowerCase();
    return (
      i.competency_code.toLowerCase().includes(q) ||
      i.competency_name.toLowerCase().includes(q) ||
      (i.category || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Create Competency</h3>
        {error && (
          <div className="mb-3 bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded">{error}</div>
        )}
  <form onSubmit={create} className="grid grid-cols-1 md:grid-cols-2 gap-4 relative">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Code</label>
            <input className="w-full border rounded px-3 py-2" value={form.competency_code || ''} onChange={e=>setForm(f=>({...f, competency_code:e.target.value}))} required/>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Name</label>
            <input className="w-full border rounded px-3 py-2" value={form.competency_name || ''} onChange={e=>setForm(f=>({...f, competency_name:e.target.value}))} required/>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm text-gray-600 mb-1">Description</label>
            <textarea className="w-full border rounded px-3 py-2" value={form.competency_description || ''} onChange={e=>setForm(f=>({...f, competency_description:e.target.value}))} />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Category</label>
            <div className="relative">
              <input
                className="w-full border rounded px-3 py-2"
                value={form.category || ''}
                onChange={e => {
                  const val = e.target.value;
                  setForm(f => ({ ...f, category: val }));
                  setCategoryQuery(val);
                  setShowCategorySuggestions(true);
                }}
                onFocus={() => setShowCategorySuggestions(true)}
                onBlur={() => setTimeout(() => setShowCategorySuggestions(false), 150)}
                placeholder="Type to search or create"
              />
              {showCategorySuggestions && (categoryQuery.trim() !== '' || items.some(i=>i.category)) && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded shadow max-h-48 overflow-y-auto">
                  {Array.from(new Set(items
                    .map(i => i.category)
                    .filter(c => !!c && c.toLowerCase().includes(categoryQuery.toLowerCase()))
                  )).slice(0,25).map(c => (
                    <button
                      type="button"
                      key={c}
                      onClick={() => {
                        setForm(f => ({ ...f, category: c }));
                        setCategoryQuery(c || '');
                        setShowCategorySuggestions(false);
                      }}
                      className="block w-full text-left px-3 py-2 hover:bg-blue-50 text-sm"
                    >
                      {c}
                    </button>
                  ))}
                  {categoryQuery && !items.some(i => i.category && i.category.toLowerCase() === categoryQuery.toLowerCase()) && (
                    <div className="px-3 py-2 text-xs text-gray-500 border-t">New category will be created</div>
                  )}
                </div>
              )}
            </div>
          </div>
          {/* Removed Max Score and Weight fields as requested */}
          <div className="flex items-center space-x-2">
            <input id="active" type="checkbox" checked={!!form.is_active} onChange={e=>setForm(f=>({...f, is_active:e.target.checked}))} />
            <label htmlFor="active" className="text-sm text-gray-700">Active</label>
          </div>
          <div className="md:col-span-2">
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Create</button>
          </div>
        </form>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Competencies</h3>
          <input placeholder="Search" value={search} onChange={e=>setSearch(e.target.value)} className="border rounded px-3 py-2" />
        </div>
        {loading ? (
          <div>Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-600">
                  <th className="py-2 pr-4">Code</th>
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Category</th>
                  <th className="py-2 pr-4">Active</th>
                  <th className="py-2 pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className="border-t">
                    <td className="py-2 pr-4 font-mono">{c.competency_code}</td>
                    <td className="py-2 pr-4">{c.competency_name}</td>
                    <td className="py-2 pr-4">{c.category || '-'}</td>
                    <td className="py-2 pr-4">{c.is_active ? 'Yes' : 'No'}</td>
                    <td className="py-2 pr-4">
                      <button onClick={()=>remove(c.competency_code)} className="text-red-600 hover:underline">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
