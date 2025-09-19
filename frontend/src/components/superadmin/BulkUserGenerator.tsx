"use client";

import React, { useEffect, useMemo, useState } from "react";
import { apiService, BulkUserGenerateRequest, BulkUserGenerateResponse, GeneratedCredential, Tenant } from "@/lib/api-service";
import { Building2, Download, Loader2, RefreshCcw, Copy } from "lucide-react";

export default function BulkUserGenerator() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loadingTenants, setLoadingTenants] = useState(true);
  const [selectedTenant, setSelectedTenant] = useState<string>("");

  const [count, setCount] = useState<number>(10);
  const [emailPrefix, setEmailPrefix] = useState<string>("");
  const [emailDomain, setEmailDomain] = useState<string>("gmail.com");
  const [namePrefix, setNamePrefix] = useState<string>("Candidate");
  const [startFrom, setStartFrom] = useState<number>(1);
  const [useFixedPassword, setUseFixedPassword] = useState<boolean>(false);
  const [fixedPassword, setFixedPassword] = useState<string>("");

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<BulkUserGenerateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedMsg, setCopiedMsg] = useState<string | null>(null);

  useEffect(() => {
    const loadTenants = async () => {
      setLoadingTenants(true);
      const res = await apiService.getTenants();
      if (res.data) {
        setTenants(res.data.tenants);
      }
      setLoadingTenants(false);
    };
    loadTenants();
  }, []);

  // Suggest a default email prefix when a tenant is chosen
  useEffect(() => {
    if (!emailPrefix && selectedTenant) {
      const t = tenants.find(t => t.id === selectedTenant);
      if (t) {
        const base = (t.name || "Company").replace(/[^a-zA-Z0-9]+/g, "").slice(0, 15);
        setEmailPrefix(base || "Company");
      }
    }
  }, [selectedTenant, tenants]);

  const samplePreview = useMemo(() => {
    if (!emailPrefix) return [] as string[];
    const start = startFrom || 1;
    return Array.from({ length: Math.min(5, Math.max(1, count || 1)) }, (_, i) => `${emailPrefix}${start + i}@${emailDomain}`);
  }, [emailPrefix, emailDomain, count, startFrom]);

  const downloadCSV = () => {
    if (!result) return;
    const rows = [["user_id","email","password"], ...result.credentials.map(c=>[c.user_id,c.email,c.password])];
    const csv = rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `generated_users_${selectedTenant || 'tenant'}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const copyAll = async () => {
    if (!result) return;
    const rows = [["user_id","email","password"], ...result.credentials.map(c=>[c.user_id,c.email,c.password])];
    const csv = rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
    try {
      await navigator.clipboard.writeText(csv);
      setCopiedMsg(`Copied ${result.credentials.length} credential${result.credentials.length === 1 ? '' : 's'} to clipboard`);
      setTimeout(() => setCopiedMsg(null), 2500);
    } catch (e) {
      setError('Failed to copy credentials to clipboard');
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);

    if (!selectedTenant) {
      setError("Please select a company (tenant)");
      return;
    }
    if (!emailPrefix) {
      setError("Please provide an email prefix");
      return;
    }
    if (useFixedPassword && !fixedPassword) {
      setError("Please provide the fixed password or turn off the toggle");
      return;
    }

    const payload: BulkUserGenerateRequest = {
      count: Math.max(1, Math.min(1000, count || 1)),
      email_prefix: emailPrefix,
      email_domain: emailDomain || "gmail.com",
      name_prefix: namePrefix || undefined,
      start_from: startFrom || 1,
      use_fixed_password: !!useFixedPassword,
      fixed_password: useFixedPassword ? fixedPassword : undefined,
    };

    setSubmitting(true);
    const res = await apiService.generateTenantUsers(selectedTenant, payload);
    setSubmitting(false);

    if (res.error) {
      setError(res.error);
    } else if (res.data) {
      setResult(res.data);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-gray-900">Bulk Generate Candidate Accounts</h3>
        <p className="text-gray-600">Create multiple candidate users for a company with predictable emails. Admins can assign tests as usual.</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Company (Tenant) *</label>
            <div className="relative">
              <select
                value={selectedTenant}
                onChange={(e) => setSelectedTenant(e.target.value)}
                disabled={loadingTenants}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {loadingTenants && <option value="">Loading companies...</option>}
                {!loadingTenants && <option value="">Select a company</option>}
                {!loadingTenants && tenants.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              <Building2 className="h-4 w-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Number of users *</label>
            <input
              type="number"
              min={1}
              max={1000}
              value={count}
              onChange={(e) => setCount(parseInt(e.target.value || '0', 10))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">Max 1000 per request</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email prefix *</label>
            <input
              type="text"
              value={emailPrefix}
              onChange={(e) => setEmailPrefix(e.target.value)}
              placeholder="e.g., CompanyA"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email domain *</label>
            <input
              type="text"
              value={emailDomain}
              onChange={(e) => setEmailDomain(e.target.value)}
              placeholder="e.g., gmail.com"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start from</label>
            <input
              type="number"
              min={1}
              value={startFrom}
              onChange={(e) => setStartFrom(parseInt(e.target.value || '1', 10))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name prefix</label>
            <input
              type="text"
              value={namePrefix}
              onChange={(e) => setNamePrefix(e.target.value)}
              placeholder="e.g., Trajectorie Candidate"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password options</label>
            <div className="flex items-center space-x-3">
              <label className="inline-flex items-center">
                <input type="checkbox" className="rounded border-gray-300 text-blue-600" checked={useFixedPassword} onChange={(e)=>setUseFixedPassword(e.target.checked)} />
                <span className="ml-2 text-sm text-gray-700">Use fixed password</span>
              </label>
              <input
                type="text"
                placeholder="Fixed password"
                value={fixedPassword}
                onChange={(e) => setFixedPassword(e.target.value)}
                disabled={!useFixedPassword}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">If not set, strong random passwords will be generated.</p>
          </div>
        </div>

        {emailPrefix && (
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <div className="text-sm text-gray-700 font-medium mb-2">Sample email preview</div>
            <div className="text-sm text-gray-600">{samplePreview.join(", ")}</div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 text-red-700 border border-red-200 px-4 py-2 rounded">{error}</div>
        )}

        <div className="flex items-center space-x-3">
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center"
          >
            {submitting ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin"/>Generating...</>) : "Generate Users"}
          </button>
          <button
            type="button"
            onClick={() => { setResult(null); setError(null); }}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center"
          >
            <RefreshCcw className="h-4 w-4 mr-2" /> Reset
          </button>
        </div>
      </form>

      {result && (
        <div className="mt-8">
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-semibold text-gray-900">Generated {result.created} users</h4>
            <div className="flex items-center space-x-2">
              <button onClick={copyAll} className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center">
                <Copy className="h-4 w-4 mr-2"/>
                Copy All
              </button>
              <button onClick={downloadCSV} className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center">
                <Download className="h-4 w-4 mr-2"/>
                Download CSV
              </button>
            </div>
          </div>
          {copiedMsg && (
            <div className="mt-2 text-sm text-green-700 bg-green-50 border border-green-200 px-3 py-2 rounded">{copiedMsg}</div>
          )}
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Password</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {result.credentials.slice(0, 20).map((c, idx) => (
                  <tr key={c.user_id}>
                    <td className="px-4 py-2 text-sm text-gray-700">{idx + 1}</td>
                    <td className="px-4 py-2 text-sm text-gray-900">{c.email}</td>
                    <td className="px-4 py-2 text-sm text-gray-700">{c.password}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {result.credentials.length > 20 && (
              <p className="text-xs text-gray-500 mt-2">Showing first 20 of {result.credentials.length}. Download CSV to view all.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
