"use client";

import React, { useState } from "react";

interface ConnectionCardProps {
  accessToken: string;
  setAccessToken: (v: string) => void;
  businessId: string;
  setBusinessId: (v: string) => void;
  onFetch: () => void;
  isFetching: boolean;
  error: string;
  connectedCount: number;
}

/**
 * Token + Business ID card. Once accounts have been fetched successfully it
 * collapses to a single green status row (token hidden) so it stops eating
 * space in step 2+ — click "Ubah" to re-expand and change credentials.
 */
export default function ConnectionCard({
  accessToken,
  setAccessToken,
  businessId,
  setBusinessId,
  onFetch,
  isFetching,
  error,
  connectedCount,
}: ConnectionCardProps) {
  const [forceExpanded, setForceExpanded] = useState(false);
  const isConnected = connectedCount > 0;
  const expanded = !isConnected || forceExpanded;

  if (!expanded) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 shadow-sm">
        <span className="h-2 w-2 flex-shrink-0 rounded-full bg-emerald-500" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-black text-emerald-800">Terhubung</p>
          <p className="text-[11px] text-emerald-600">{connectedCount} akun dimuat</p>
        </div>
        <button
          onClick={() => setForceExpanded(true)}
          className="flex-shrink-0 rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100 transition"
        >
          Ubah
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-sm">
            🔑
          </span>
          <div>
            <h2 className="text-sm font-black text-slate-900">Meta Access Token</h2>
            <p className="text-xs text-slate-500">Untuk fetch Ad Account aktif</p>
          </div>
        </div>
        {isConnected && (
          <button
            onClick={() => setForceExpanded(false)}
            className="text-xs font-bold text-slate-400 hover:text-slate-600"
          >
            Tutup
          </button>
        )}
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-[11px] font-bold text-slate-600 mb-1">
            Meta Access Token
          </label>
          <textarea
            value={accessToken}
            onChange={(e) => setAccessToken(e.target.value)}
            placeholder="EAAxxxxxxxxxxxxxxx..."
            rows={3}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-mono text-slate-800 outline-none focus:border-blue-500 transition resize-none"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-600 mb-1">
            Business Manager (BM) ID <span className="text-slate-400 font-normal">(Opsional)</span>
          </label>
          <input
            type="text"
            value={businessId}
            onChange={(e) => setBusinessId(e.target.value)}
            placeholder="Contoh: 123456789012345"
            className="w-full h-9 rounded-xl border border-slate-300 px-3 text-xs font-mono text-slate-800 outline-none focus:border-blue-500 transition"
          />
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
            ❌ {error}
          </div>
        )}

        <button
          onClick={onFetch}
          disabled={isFetching}
          className="w-full h-10 rounded-xl bg-blue-600 text-sm font-bold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
        >
          {isFetching ? (
            <>
              <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              Memuat Akun…
            </>
          ) : (
            "🔍 Fetch Ad Accounts Aktif"
          )}
        </button>
      </div>
    </div>
  );
}
