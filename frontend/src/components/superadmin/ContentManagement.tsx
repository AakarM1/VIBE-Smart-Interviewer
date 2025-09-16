"use client";
import React, { useEffect, useMemo, useState } from "react";

import apiService from "@/lib/api-service";

export default function ContentManagement() {
  const [sjt, setSjt] = useState<any | null>(null);
  const [jdt, setJdt] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    const [sjtRes, jdtRes] = await Promise.all([
      apiService.getConfiguration("sjt"),
      apiService.getConfiguration("jdt"),
    ]);
    if (sjtRes.data) setSjt(sjtRes.data.config_data || sjtRes.data);
    if (jdtRes.data) setJdt(jdtRes.data.config_data || jdtRes.data);
  }

  useEffect(() => { load(); }, []);

  async function save(type: "sjt" | "jdt") {
    setSaving(true);
    setError(null);
    try {
      const payload = type === "sjt" ? sjt : jdt;
      const res = await apiService.saveConfiguration(type, payload || {});
      if (!res.data) throw new Error(res.error || "Save failed");
      await load();
    } catch (e: any) {
      setError(e.message || "Failed to save configuration");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">SJT Configuration</h3>
          <button onClick={() => save("sjt")} disabled={saving} className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">Save</button>
        </div>
        <textarea className="w-full h-48 border rounded p-3 font-mono text-sm" value={JSON.stringify(sjt || {}, null, 2)} onChange={e=>{ try { setSjt(JSON.parse(e.target.value)); } catch { /* ignore */ } }} />
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">JDT Configuration</h3>
          <button onClick={() => save("jdt")} disabled={saving} className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">Save</button>
        </div>
        <textarea className="w-full h-48 border rounded p-3 font-mono text-sm" value={JSON.stringify(jdt || {}, null, 2)} onChange={e=>{ try { setJdt(JSON.parse(e.target.value)); } catch { /* ignore */ } }} />
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded">{error}</div>}
    </div>
  );
}
