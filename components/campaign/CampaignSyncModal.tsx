"use client";

import React, { useState, useEffect, useCallback } from "react";
import { AutoSyncSettings } from "@/types/sync";
import { CampaignRawRow, CrmRawRow } from "@/types/campaign-report";

interface CampaignSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataSynced: (metaRows: CampaignRawRow[], crmRows: CrmRawRow[], sourceInfo: string) => void;
  autoSyncSettings: AutoSyncSettings;
  onUpdateSettings: (settings: Partial<AutoSyncSettings>) => void;
}

interface DetectedMetaAccount {
  id: string; // e.g. "act_123456789"
  accountId: string;
  name: string;
  currency: string;
  status: string;
}

export default function CampaignSyncModal({
  isOpen,
  onClose,
  onDataSynced,
  autoSyncSettings,
  onUpdateSettings,
}: CampaignSyncModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Meta State
  const [metaToken, setMetaToken] = useState(autoSyncSettings?.meta?.accessToken || "");
  const [metaAccounts, setMetaAccounts] = useState<string[]>(autoSyncSettings?.meta?.adAccountIds || []);
  const [metaDatePreset, setMetaDatePreset] = useState<
    "today" | "yesterday" | "last_3d" | "last_7d" | "this_month" | "last_month" | "maximum"
  >(autoSyncSettings?.meta?.datePreset || "today");
  const [metaEnabled, setMetaEnabled] = useState(autoSyncSettings?.meta?.enabled ?? true);
  const [detectedAccounts, setDetectedAccounts] = useState<DetectedMetaAccount[]>([]);
  const [isDetectingAccounts, setIsDetectingAccounts] = useState(false);

  // iRev State
  const [irevUrl, setIrevUrl] = useState(autoSyncSettings?.irev?.endpointUrl || "");
  const [irevKey, setIrevKey] = useState(autoSyncSettings?.irev?.apiKey || "");
  const [irevPartnerId, setIrevPartnerId] = useState(autoSyncSettings?.irev?.partnerId || "");
  const [irevEnabled, setIrevEnabled] = useState(autoSyncSettings?.irev?.enabled ?? true);
  const [isTestingIrev, setIsTestingIrev] = useState(false);
  const [irevConnected, setIrevConnected] = useState(Boolean(autoSyncSettings?.irev?.endpointUrl));

  // Sync Settings
  const [intervalMinutes, setIntervalMinutes] = useState(autoSyncSettings?.intervalMinutes || 10);
  const [isAutoSyncActive, setIsAutoSyncActive] = useState(autoSyncSettings?.isAutoSyncActive || false);
  const [isSyncingAll, setIsSyncingAll] = useState(false);

  // Notifications
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<"success" | "error" | "info" | null>(null);

  // Countdown timer in seconds
  const [countdown, setCountdown] = useState<number>(intervalMinutes * 60);

  // Automatically detect Meta Ad Accounts when token is available or user clicks
  const handleDetectMetaAccounts = async () => {
    if (!metaToken.trim()) {
      setStatusMessage("Masukkan Meta Access Token terlebih dahulu.");
      setStatusType("error");
      return;
    }

    setIsDetectingAccounts(true);
    setStatusMessage("Mendeteksi akun iklan Meta Anda...");
    setStatusType("info");

    try {
      const res = await fetch("/api/sync/meta/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken: metaToken.trim() }),
      });
      const data = await res.json();
      setIsDetectingAccounts(false);

      if (data.success && Array.isArray(data.data)) {
        setDetectedAccounts(data.data);
        const allIds = data.data.map((acc: DetectedMetaAccount) => acc.id);
        setMetaAccounts(allIds);
        setStatusMessage(`✅ Ditemukan ${data.count} Ad Account aktif! Semua akun terpilih.`);
        setStatusType("success");
      } else {
        setStatusMessage(`❌ ${data.error || "Gagal mendeteksi akun Meta."}`);
        setStatusType("error");
      }
    } catch (err: unknown) {
      setIsDetectingAccounts(false);
      setStatusMessage(`❌ Error: ${err instanceof Error ? err.message : String(err)}`);
      setStatusType("error");
    }
  };

  // Toggle Account selection
  const handleToggleAccount = (id: string) => {
    setMetaAccounts((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  // Select / Deselect All Accounts
  const handleSelectAllAccounts = () => {
    if (metaAccounts.length === detectedAccounts.length) {
      setMetaAccounts([]);
    } else {
      setMetaAccounts(detectedAccounts.map((a) => a.id));
    }
  };

  const handleTestIrev = async () => {
    if (!irevUrl.trim()) {
      setStatusMessage("Masukkan URL Endpoint iRev terlebih dahulu.");
      setStatusType("error");
      return;
    }

    setIsTestingIrev(true);
    setStatusMessage("Menguji koneksi ke iRev API...");
    setStatusType("info");

    try {
      const res = await fetch("/api/sync/irev", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpointUrl: irevUrl.trim(),
          apiKey: irevKey.trim(),
          partnerId: irevPartnerId.trim(),
        }),
      });
      const data = await res.json();
      setIsTestingIrev(false);

      if (data.success && data.count > 0) {
        setIrevConnected(true);
        setStatusMessage(`✅ Koneksi iRev Berhasil! Terdeteksi ${data.count} kode afiliasi.`);
        setStatusType("success");
      } else if (data.success && data.count === 0 && data._debug) {
        // Show debug info so user can share it
        setIrevConnected(false);
        const dbg = data._debug;
        const debugLines = [
          `⚠️ Koneksi Berhasil tapi 0 data terparsing.`,
          `📦 Struktur Response: ${JSON.stringify(dbg.topLevelKeys || {}).slice(0, 300)}`,
          dbg.arraysFound?.length > 0
            ? `📋 Array ditemukan: ${dbg.arraysFound.map((a: any) => `${a.path}(${a.length} items)`).join(", ")}`
            : `📋 Tidak ada array ditemukan dalam response.`,
          dbg.firstRawItem
            ? `📄 Sample item: ${dbg.firstRawItem.slice(0, 400)}`
            : dbg.rawSnippet
            ? `📄 Raw response: ${dbg.rawSnippet.slice(0, 400)}`
            : "",
        ].filter(Boolean);
        setStatusMessage(debugLines.join("\n\n"));
        setStatusType("error");
      } else {
        setStatusMessage(`❌ Gagal: ${data.error || "Tidak ada data."}`);
        setStatusType("error");
      }
    } catch (err: unknown) {
      setIsTestingIrev(false);
      setStatusMessage(`❌ Error: ${err instanceof Error ? err.message : String(err)}`);
      setStatusType("error");
    }
  };

  // Full Synchronization
  const executeSync = useCallback(async () => {
    setIsSyncingAll(true);
    setStatusMessage("Sedang menarik data terbaru dari Meta Ads & iRev...");
    setStatusType("info");

    let fetchedMetaRows: CampaignRawRow[] = [];
    let fetchedCrmRows: CrmRawRow[] = [];
    const errors: string[] = [];

    // 1. Meta Ads
    if (metaEnabled && metaToken && metaAccounts.length > 0) {
      try {
        const res = await fetch("/api/sync/meta", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accessToken: metaToken,
            adAccountIds: metaAccounts,
            datePreset: metaDatePreset,
          }),
        });
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          fetchedMetaRows = data.data;
        } else {
          errors.push(data.error || "Gagal menarik data Meta");
        }
      } catch (err: unknown) {
        errors.push(err instanceof Error ? err.message : "Koneksi Meta gagal");
      }
    }

    // 2. iRev / CRM
    if (irevEnabled && irevUrl) {
      try {
        const res = await fetch("/api/sync/irev", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            endpointUrl: irevUrl,
            apiKey: irevKey,
            partnerId: irevPartnerId,
          }),
        });
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          fetchedCrmRows = data.data;
        } else {
          errors.push(data.error || "Gagal menarik data iRev");
        }
      } catch (err: unknown) {
        errors.push(err instanceof Error ? err.message : "Koneksi iRev gagal");
      }
    }

    setIsSyncingAll(false);

    if (fetchedMetaRows.length > 0 || fetchedCrmRows.length > 0) {
      const timeStr = new Date().toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      });
      onDataSynced(
        fetchedMetaRows,
        fetchedCrmRows,
        `Live Sync (${fetchedMetaRows.length} Meta, ${fetchedCrmRows.length} iRev) @ ${timeStr}`
      );

      onUpdateSettings({
        meta: {
          enabled: metaEnabled,
          accessToken: metaToken,
          adAccountIds: metaAccounts,
          datePreset: metaDatePreset,
        },
        irev: {
          enabled: irevEnabled,
          endpointUrl: irevUrl,
          apiKey: irevKey,
          partnerId: irevPartnerId,
        },
        intervalMinutes,
        isAutoSyncActive,
        lastSyncedAt: new Date().toISOString(),
        syncStatus: "success",
        lastError: errors.length > 0 ? errors.join("; ") : null,
        lastMetaCount: fetchedMetaRows.length,
        lastIrevCount: fetchedCrmRows.length,
      });

      setStatusMessage(
        `✅ Sukses! ${fetchedMetaRows.length} Campaign Meta & ${fetchedCrmRows.length} Data iRev telah disinkronkan.`
      );
      setStatusType("success");
      setCountdown(intervalMinutes * 60);
    } else {
      setStatusMessage(`❌ Gagal: ${errors.join("; ") || "Tidak ada data yang ditarik."}`);
      setStatusType("error");
    }
  }, [
    metaEnabled,
    metaToken,
    metaAccounts,
    metaDatePreset,
    irevEnabled,
    irevUrl,
    irevKey,
    irevPartnerId,
    intervalMinutes,
    isAutoSyncActive,
    onDataSynced,
    onUpdateSettings,
  ]);

  const handleSaveAndSync = async () => {
    onUpdateSettings({
      meta: {
        enabled: metaEnabled,
        accessToken: metaToken,
        adAccountIds: metaAccounts,
        datePreset: metaDatePreset,
      },
      irev: {
        enabled: irevEnabled,
        endpointUrl: irevUrl,
        apiKey: irevKey,
        partnerId: irevPartnerId,
      },
      intervalMinutes,
      isAutoSyncActive,
    });
    await executeSync();
  };

  // Auto-Sync Periodic Timer
  useEffect(() => {
    if (!isAutoSyncActive) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          executeSync();
          return intervalMinutes * 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isAutoSyncActive, intervalMinutes, executeSync]);

  if (!isOpen) return null;

  const minutesLeft = Math.floor(countdown / 60);
  const secondsLeft = countdown % 60;
  const timeFormatted = `${String(minutesLeft).padStart(2, "0")}:${String(secondsLeft).padStart(2, "0")}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs font-sans animate-fadeIn">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-900 px-6 py-4 text-white">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold text-base shadow-sm">
              ⚡
            </span>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-white">
                Hubungkan Meta Ads & iRev CRM
              </h3>
              <p className="text-[11px] text-slate-300">
                Setup gampang 3 langkah: Tarik otomatis live tiap {intervalMinutes} menit
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-xs font-bold text-slate-300 hover:bg-white/20 hover:text-white transition"
          >
            ✕
          </button>
        </div>

        {/* Wizard Step Indicator */}
        <div className="grid grid-cols-3 border-b border-slate-200 bg-slate-50 text-xs font-bold">
          <button
            onClick={() => setStep(1)}
            className={`flex items-center justify-center gap-2 py-3 border-b-2 transition ${
              step === 1
                ? "border-blue-600 bg-white text-blue-600 font-black"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${
                metaAccounts.length > 0 ? "bg-emerald-500 text-white" : "bg-blue-600 text-white"
              }`}
            >
              {metaAccounts.length > 0 ? "✓" : "1"}
            </span>
            <span>1. Meta Ads</span>
          </button>

          <button
            onClick={() => setStep(2)}
            className={`flex items-center justify-center gap-2 py-3 border-b-2 transition ${
              step === 2
                ? "border-purple-600 bg-white text-purple-600 font-black"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${
                irevConnected ? "bg-emerald-500 text-white" : "bg-purple-600 text-white"
              }`}
            >
              {irevConnected ? "✓" : "2"}
            </span>
            <span>2. iRev CRM</span>
          </button>

          <button
            onClick={() => setStep(3)}
            className={`flex items-center justify-center gap-2 py-3 border-b-2 transition ${
              step === 3
                ? "border-emerald-600 bg-white text-emerald-600 font-black"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white text-[10px]">
              3
            </span>
            <span>3. Jadwal (10m)</span>
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Status Message */}
          {statusMessage && (
            <div
              className={`rounded-xl p-3 text-xs font-bold border max-h-52 overflow-y-auto whitespace-pre-wrap break-all ${
                statusType === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : statusType === "error"
                  ? "border-rose-200 bg-rose-50 text-rose-800"
                  : "border-blue-200 bg-blue-50 text-blue-800"
              }`}
            >
              {statusMessage}
            </div>
          )}

          {/* ━━ STEP 1: META ADS ━━ */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="rounded-xl bg-blue-50/70 border border-blue-100 p-3.5 text-xs text-blue-900">
                <p className="font-black text-blue-950 mb-1">💡 Cara Paling Gampang Hubungkan Meta:</p>
                <ol className="list-decimal list-inside space-y-0.5 text-[11px] text-blue-800">
                  <li>Paste <b>Access Token</b> Anda di kolom bawah.</li>
                  <li>Klik tombol <b>"⚡ Deteksi Akun Otomatis"</b> — sistem akan menemukan semua Ad Account Anda.</li>
                </ol>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-black uppercase text-slate-800">
                    Meta Access Token
                  </label>
                  <a
                    href="https://developers.facebook.com/tools/explorer/"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] font-bold text-blue-600 hover:underline"
                  >
                    Buka Graph Explorer ↗
                  </a>
                </div>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={metaToken}
                    onChange={(e) => setMetaToken(e.target.value)}
                    placeholder="Tempel EAABw... di sini"
                    className="h-10 flex-1 rounded-xl border border-slate-300 px-3 text-xs font-mono outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                  />
                  <button
                    type="button"
                    onClick={handleDetectMetaAccounts}
                    disabled={isDetectingAccounts || !metaToken.trim()}
                    className="rounded-xl bg-blue-600 px-4 text-xs font-black text-white hover:bg-blue-700 disabled:opacity-50 transition shadow-xs whitespace-nowrap"
                  >
                    {isDetectingAccounts ? "Mendeteksi..." : "⚡ Deteksi Akun"}
                  </button>
                </div>
              </div>

              {/* Detected Accounts List */}
              {detectedAccounts.length > 0 ? (
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">
                      Pilih Ad Account ({metaAccounts.length}/{detectedAccounts.length} Terpilih):
                    </span>
                    <button
                      type="button"
                      onClick={handleSelectAllAccounts}
                      className="text-[11px] font-bold text-blue-600 hover:underline"
                    >
                      {metaAccounts.length === detectedAccounts.length ? "Hapus Semua" : "Pilih Semua"}
                    </button>
                  </div>
                  <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/50 p-2 space-y-1.5">
                    {detectedAccounts.map((acc) => {
                      const isChecked = metaAccounts.includes(acc.id);
                      return (
                        <label
                          key={acc.id}
                          className={`flex cursor-pointer items-center justify-between rounded-lg p-2 text-xs transition border ${
                            isChecked
                              ? "bg-white border-blue-300 shadow-2xs font-bold text-slate-900"
                              : "border-transparent text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleAccount(acc.id)}
                              className="h-4 w-4 rounded accent-blue-600"
                            />
                            <span>{acc.name}</span>
                          </div>
                          <span className="font-mono text-[10px] text-slate-400">{acc.id}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ) : metaAccounts.length > 0 ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
                  <span className="font-bold text-slate-700">
                    Akun tersimpan: {metaAccounts.length} Ad Account ({metaAccounts.join(", ")})
                  </span>
                </div>
              ) : null}

              <div>
                <label className="block text-xs font-black uppercase text-slate-800 mb-1">
                  Periode Data Meta Ads
                </label>
                <select
                  value={metaDatePreset}
                  onChange={(e) => setMetaDatePreset(e.target.value as any)}
                  className="h-9 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 outline-none focus:border-blue-500"
                >
                  <option value="today">Hari Ini (Today)</option>
                  <option value="yesterday">Kemarin (Yesterday)</option>
                  <option value="last_3d">3 Hari Terakhir</option>
                  <option value="last_7d">7 Hari Terakhir</option>
                  <option value="this_month">Bulan Ini</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-black text-white hover:bg-slate-800 transition"
                >
                  Lanjut ke Langkah 2: iRev CRM ➔
                </button>
              </div>
            </div>
          )}

          {/* ━━ STEP 2: IREV CRM ━━ */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="rounded-xl bg-purple-50/70 border border-purple-100 p-3.5 text-xs text-purple-900">
                <p className="font-black text-purple-950 mb-1">💡 Hubungkan API iRev CRM / Afiliasi:</p>
                <p className="text-[11px] text-purple-800">
                  Cukup masukkan URL API report iRev Anda dan klik <b>"Tes Koneksi"</b>.
                </p>
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-slate-800 mb-1">
                  URL Endpoint iRev Report API
                </label>
                <input
                  type="url"
                  value={irevUrl}
                  onChange={(e) => setIrevUrl(e.target.value)}
                  placeholder="https://api.irev.domain.com/v1/reports/affiliates"
                  className="h-10 w-full rounded-xl border border-slate-300 px-3 text-xs font-mono outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-slate-800 mb-1">
                  API Key / Token (Opsional)
                </label>
                <input
                  type="password"
                  value={irevKey}
                  onChange={(e) => setIrevKey(e.target.value)}
                  placeholder="Bearer token / API Key (Kosongkan jika IP Whitelist)"
                  className="h-9 w-full rounded-xl border border-slate-300 px-3 text-xs font-mono outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-slate-800 mb-1">
                  Filter Partner / Brand ID (Opsional)
                </label>
                <input
                  type="text"
                  value={irevPartnerId}
                  onChange={(e) => setIrevPartnerId(e.target.value)}
                  placeholder="Contoh: HWGASPOL"
                  className="h-9 w-full rounded-xl border border-slate-300 px-3 text-xs font-semibold outline-none focus:border-purple-500 transition"
                />
              </div>

              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleTestIrev}
                  disabled={isTestingIrev || !irevUrl.trim()}
                  className="rounded-xl border border-purple-200 bg-purple-50 px-4 py-2 text-xs font-black text-purple-700 hover:bg-purple-100 disabled:opacity-50 transition"
                >
                  {isTestingIrev ? "Menguji..." : "🔍 Tes Koneksi iRev"}
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                  >
                    Kembali
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-black text-white hover:bg-slate-800 transition"
                  >
                    Lanjut ke Langkah 3 ➔
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ━━ STEP 3: JADWAL & AKTIVASI ━━ */}
          {step === 3 && (
            <div className="space-y-4">
              {/* Ready Status Card */}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">🎉</span>
                  <h4 className="text-xs font-black text-emerald-950 uppercase">
                    Koneksi Siap Digunakan
                  </h4>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] font-semibold text-emerald-900">
                  <div className="flex items-center gap-1.5">
                    <span>{metaAccounts.length > 0 ? "✅" : "⚠️"}</span>
                    <span>Meta Ads: {metaAccounts.length} Ad Account</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span>{irevUrl ? "✅" : "⚠️"}</span>
                    <span>iRev CRM: {irevUrl ? "URL Terhubung" : "Belum diisi"}</span>
                  </div>
                </div>
              </div>

              {/* Auto Sync Toggle */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-black text-slate-900 uppercase">
                      Aktifkan Penarikan Otomatis Berkala
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Tarik data secara otomatis setiap {intervalMinutes} menit tanpa upload manual
                    </p>
                  </div>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={isAutoSyncActive}
                      onChange={(e) => setIsAutoSyncActive(e.target.checked)}
                      className="peer sr-only"
                    />
                    <div className="peer h-6 w-11 rounded-full bg-slate-200 after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-emerald-600 peer-checked:after:translate-x-full peer-focus:outline-none" />
                  </label>
                </div>

                {isAutoSyncActive && (
                  <div className="mt-3 flex items-center justify-between rounded-lg bg-emerald-50 border border-emerald-200 p-2 text-xs font-bold text-emerald-900">
                    <span>🟢 Auto-Sync Aktif</span>
                    <span className="font-mono tabular-nums bg-white px-2 py-0.5 rounded border border-emerald-200 text-xs">
                      Tarik otomatis berikutnya: {timeFormatted}
                    </span>
                  </div>
                )}
              </div>

              {/* Interval Selection */}
              <div>
                <label className="block text-xs font-black uppercase text-slate-800 mb-1.5">
                  Pilih Frekuensi Tarik Data:
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[5, 10, 15, 30].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => {
                        setIntervalMinutes(mins);
                        setCountdown(mins * 60);
                      }}
                      className={`rounded-xl border py-2 text-xs font-bold transition ${
                        intervalMinutes === mins
                          ? "border-emerald-600 bg-emerald-50 text-emerald-800 font-black shadow-2xs"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {mins} Menit {mins === 10 ? "⭐" : ""}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleSaveAndSync}
                  disabled={isSyncingAll}
                  className="w-full rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 py-3.5 text-xs font-black uppercase tracking-wider text-white shadow-md hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 transition"
                >
                  {isSyncingAll
                    ? "Sedang Menarik Data Live..."
                    : "🚀 Simpan & Tarik Data Sekarang"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-6 py-3">
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            Tutup
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={executeSync}
              disabled={isSyncingAll}
              className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-black text-white hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {isSyncingAll ? "Syncing..." : "Sync Sekarang ⚡"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
