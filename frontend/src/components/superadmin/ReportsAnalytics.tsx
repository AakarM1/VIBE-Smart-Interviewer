"use client";
import React, { useEffect, useMemo, useState } from "react";
import apiService from "@/lib/api-service";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export default function ReportsAnalytics() {
  const [stats, setStats] = useState<any | null>(null);
  const [reports, setReports] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [res, reportsRes] = await Promise.all([
          apiService.getOverviewStats(),
          fetch((process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000') + '/api/v1/reports/generated', {
            headers: {
              'Content-Type': 'application/json',
              ...(typeof window !== 'undefined' && ((sessionStorage.getItem('access_token') || localStorage.getItem('access_token'))) ? { 'Authorization': `Bearer ${(sessionStorage.getItem('access_token') || localStorage.getItem('access_token'))}` } : {}),
            }
          })
        ]);
        const reportsJson = reportsRes.ok ? await reportsRes.json() : await reportsRes.json().then(b=>{ throw new Error(b?.detail || 'Failed to load reports'); });
        if (res.data && mounted) setStats(res.data);
        if (reportsJson && mounted) setReports(reportsJson.reports || []);
        if (res.error && mounted) setError(res.error);
      } catch (e:any) {
        if (mounted) setError(e.message || 'Failed to load');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  const chartData = useMemo(() => ([
    { name: "Companies", value: stats?.companies?.total ?? 0 },
    { name: "Users", value: stats?.users?.active_total ?? 0 },
    { name: "Submissions", value: stats?.submissions?.total ?? 0 },
  ]), [stats]);

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Overview</h3>
        {loading ? (
          <div>Loading...</div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded">{error}</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="text-sm text-gray-600">Companies</div>
              <div className="text-3xl font-bold">{stats?.companies?.total ?? 0}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Active Users</div>
              <div className="text-3xl font-bold">{stats?.users?.active_total ?? 0}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Submissions</div>
              <div className="text-3xl font-bold">{stats?.submissions?.total ?? 0}</div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">At a Glance</h3>
        <div style={{ width: "100%", height: 320 }}>
          <ResponsiveContainer>
            <BarChart data={chartData}>
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" fill="#2563eb" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">AI Generated Reports</h3>
          <div className="text-sm text-gray-500">Total: {reports?.length ?? 0}</div>
        </div>
        {loading ? (
          <div>Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-600">
                  <th className="py-2 pr-4">Report ID</th>
                  <th className="py-2 pr-4">Tenant</th>
                  <th className="py-2 pr-4">User</th>
                  <th className="py-2 pr-4">Type</th>
                  <th className="py-2 pr-4">Created</th>
                  <th className="py-2 pr-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {(reports || []).map((r:any) => (
                  <tr key={r.report_id} className="border-t">
                    <td className="py-2 pr-4 font-mono">{String(r.report_id).substring(0,8)}...</td>
                    <td className="py-2 pr-4">{r.tenant_id || '-'}</td>
                    <td className="py-2 pr-4">{r.user_id || '-'}</td>
                    <td className="py-2 pr-4">{r.test_type}</td>
                    <td className="py-2 pr-4">{r.created_at ? new Date(r.created_at).toLocaleString() : '-'}</td>
                    <td className="py-2 pr-4">{r.status}{r.analysis_completed ? ' (Analyzed)' : ''}</td>
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
