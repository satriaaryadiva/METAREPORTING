"use client";

import React, { useRef, useState, useCallback } from "react";
import { CampaignRawRow, CrmRawRow } from "@/types/campaign-report";
import {
  cleanRefKey,
  parseCrmFromText,
  parseCrmRefFile,
  parseMetaCampaignFile,
} from "@/lib/campaign-parser";

interface CampaignUploadSectionProps {
  metaFileNames: string[];
  crmFileName: string;
  metaRows: CampaignRawRow[];
  crmRows: CrmRawRow[];
  onMetaAppend: (rows: CampaignRawRow[], fileName: string) => void;
  onMetaReplace: (rows: CampaignRawRow[], fileName: string) => void;
  onCrmLoaded: (rows: CrmRawRow[], fileName: string) => void;
  onClearData: () => void;
  onLoadSample: () => void;
  onOpenSyncModal?: () => void;
  error: string;
  setError: (err: string) => void;
}

export default function CampaignUploadSection({
  metaFileNames,
  crmFileName,
  metaRows,
  crmRows,
  onMetaAppend,
  onMetaReplace,
  onCrmLoaded,
  onClearData,
  onLoadSample,
  onOpenSyncModal,
  error,
  setError,
}: CampaignUploadSectionProps) {
  const metaInputRef = useRef<HTMLInputElement>(null);
  const crmInputRef = useRef<HTMLInputElement>(null);

  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [metaDragging, setMetaDragging] = useState(false);
  const [crmDragging, setCrmDragging] = useState(false);
  const [metaLoading, setMetaLoading] = useState(false);
  const [crmLoading, setCrmLoading] = useState(false);
  const [metaLoadingFiles, setMetaLoadingFiles] = useState<string[]>([]);

  // ── Meta Ads: supports multiple files ─────────────────────────────────────
  const handleMetaFiles = async (files: FileList | File[]) => {
    const fileArr = Array.from(files);
    if (!fileArr.length) return;
    setMetaLoading(true);
    setMetaLoadingFiles(fileArr.map((f) => f.name));
    setError("");

    const isFirstLoad = metaRows.length === 0;

    for (const file of fileArr) {
      try {
        const rows = await parseMetaCampaignFile(file);
        if (isFirstLoad && fileArr.indexOf(file) === 0 && metaRows.length === 0) {
          onMetaReplace(rows, file.name);
        } else {
          onMetaAppend(rows, file.name);
        }
      } catch (err: any) {
        setError(`Gagal membaca "${file.name}": ${err?.message}`);
      }
    }

    setMetaLoading(false);
    setMetaLoadingFiles([]);
  };

  // ── CRM: single file ───────────────────────────────────────────────────────
  const handleCrmFile = async (file: File) => {
    setCrmLoading(true);
    try {
      setError("");
      const rows = await parseCrmRefFile(file);
      onCrmLoaded(rows, file.name);
    } catch (err: any) {
      setError(err?.message || "Gagal membaca file CRM / Ref RAW.");
    } finally {
      setCrmLoading(false);
    }
  };

  // ── Drag & Drop ─────────────────────────────────────────────────────────────
  const handleMetaDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setMetaDragging(false);
    const files = e.dataTransfer.files;
    if (files?.length) handleMetaFiles(files);
  }, [metaRows]);

  const handleCrmDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setCrmDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleCrmFile(file);
  }, []);

  // ── Paste CRM ───────────────────────────────────────────────────────────────
  const handleProcessPastedCrm = () => {
    if (!pasteText.trim()) {
      setError("Silakan tempel teks tabel CRM terlebih dahulu.");
      return;
    }
    try {
      setError("");
      const rows = parseCrmFromText(pasteText);
      onCrmLoaded(rows, "Data CRM (Ditempel dari Clipboard)");
      setIsPasteModalOpen(false);
      setPasteText("");
    } catch (err: any) {
      setError(err?.message || "Format teks CRM tidak valid.");
    }
  };

  // ── Match calculation ────────────────────────────────────────────────────────
  const crmKeys = new Set(crmRows.map((r) => cleanRefKey(r.groupCode)));
  const matchedCount = metaRows.filter((m) =>
    crmKeys.has(cleanRefKey(m.extractedRef))
  ).length;

  const step1Done = metaRows.length > 0;
  const step2Done = crmRows.length > 0;
  const bothDone = step1Done && step2Done;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* ── Header Bar ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-5 py-3">
        <div>
          <h2 className="text-sm font-black text-slate-900 tracking-tight">
            📂 01. UPLOAD DATA LAPORAN
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Upload 2 file lalu data akan otomatis digabungkan lewat <b>Kode Referensi</b>
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {onOpenSyncModal && (
            <button
              onClick={onOpenSyncModal}
              className="flex items-center gap-1.5 rounded-lg border border-blue-300 bg-blue-50 px-3 py-1.5 text-[11px] font-bold text-blue-700 transition hover:bg-blue-100 shadow-2xs"
            >
              🔄 Auto-Sync API (10m)
            </button>
          )}
          <button
            onClick={onLoadSample}
            className="flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-[11px] font-bold text-amber-800 transition hover:bg-amber-100"
          >
            ⚡ Contoh
          </button>
          {(metaRows.length > 0 || crmRows.length > 0) && (
            <button
              onClick={onClearData}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-[11px] font-bold text-slate-600 transition hover:bg-slate-100"
            >
              🗑 Reset
            </button>
          )}
        </div>
      </div>

      {/* ── Step Progress Bar ───────────────────────────────────────── */}
      <div className="flex items-center gap-0 border-b border-slate-100 bg-white px-5 py-3">
        {/* Step 1 */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div
            className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-black transition-all ${
              step1Done
                ? "bg-emerald-500 text-white shadow shadow-emerald-200"
                : "bg-blue-600 text-white shadow shadow-blue-200 animate-pulse"
            }`}
          >
            {step1Done ? "✓" : "1"}
          </div>
          <div className="min-w-0">
            <p className={`text-[11px] font-black truncate ${step1Done ? "text-emerald-700" : "text-blue-700"}`}>
              Upload Meta Ads
            </p>
            <p className="text-[10px] text-slate-400 truncate">
              {step1Done
                ? metaFileNames.length === 1
                  ? metaFileNames[0]
                  : `${metaFileNames.length} file · ${metaRows.length} campaign`
                : "Bisa multi-file Excel sekaligus"}
            </p>
          </div>
        </div>

        {/* Connector */}
        <div className={`h-0.5 w-8 flex-shrink-0 mx-1 rounded-full transition-all ${step1Done ? "bg-emerald-400" : "bg-slate-200"}`} />

        {/* Step 2 */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div
            className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-black transition-all ${
              step2Done
                ? "bg-emerald-500 text-white shadow shadow-emerald-200"
                : step1Done
                ? "bg-purple-600 text-white shadow shadow-purple-200 animate-pulse"
                : "bg-slate-200 text-slate-500"
            }`}
          >
            {step2Done ? "✓" : "2"}
          </div>
          <div className="min-w-0">
            <p className={`text-[11px] font-black truncate ${step2Done ? "text-emerald-700" : step1Done ? "text-purple-700" : "text-slate-400"}`}>
              Upload CRM / Ref
            </p>
            <p className="text-[10px] text-slate-400 truncate">
              {step2Done ? crmFileName || "Terbaca" : "File Group + Registrations + QFTDs"}
            </p>
          </div>
        </div>

        {/* Connector */}
        <div className={`h-0.5 w-8 flex-shrink-0 mx-1 rounded-full transition-all ${bothDone ? "bg-emerald-400" : "bg-slate-200"}`} />

        {/* Step 3 */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div
            className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-black transition-all ${
              bothDone
                ? "bg-emerald-500 text-white shadow shadow-emerald-200"
                : "bg-slate-200 text-slate-400"
            }`}
          >
            {bothDone ? "✓" : "3"}
          </div>
          <div className="min-w-0">
            <p className={`text-[11px] font-black truncate ${bothDone ? "text-emerald-700" : "text-slate-400"}`}>
              Laporan Otomatis
            </p>
            <p className="text-[10px] text-slate-400 truncate">
              {bothDone
                ? `${matchedCount}/${metaRows.length} campaign cocok`
                : "REGIS, NDP, CPR REF, CPD REF terisi"}
            </p>
          </div>
        </div>
      </div>

      {/* ── Error Banner ────────────────────────────────────────────── */}
      {error && (
        <div className="mx-5 mt-3 rounded-xl bg-red-50 border border-red-200 p-3 text-xs font-semibold text-red-700">
          ⚠️ {error}
        </div>
      )}

      {/* ── Match Success Banner ─────────────────────────────────────── */}
      {bothDone && (
        <div className="mx-5 mt-3 flex items-center justify-between rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs font-bold text-emerald-800">
          <span>
            ✅ Digabungkan: <b>{metaRows.length} Campaign</b> ↔ <b>{crmRows.length} Ref Codes</b>
          </span>
          <span className="rounded-full bg-emerald-600 text-white px-3 py-0.5 text-[10px] font-black">
            {matchedCount}/{metaRows.length} Cocok
          </span>
        </div>
      )}

      {/* ── Upload Drop Zones ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">

        {/* ━━ ZONE 1: Meta Ads (Multi-file) ━━ */}
        <div
          onDragOver={(e) => { e.preventDefault(); setMetaDragging(true); }}
          onDragLeave={() => setMetaDragging(false)}
          onDrop={handleMetaDrop}
          className={`group relative flex flex-col rounded-2xl border-2 border-dashed p-5 transition-all select-none ${
            metaDragging
              ? "border-blue-500 bg-blue-100 scale-[1.01]"
              : step1Done
              ? "border-emerald-400 bg-emerald-50/60"
              : "border-blue-300 bg-gradient-to-br from-blue-50 to-white"
          }`}
        >
          {/* Hidden multi-file input */}
          <input
            ref={metaInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            multiple
            onChange={(e) => {
              const files = e.target.files;
              if (files?.length) handleMetaFiles(files);
              e.target.value = "";
            }}
            className="hidden"
          />

          {/* Label */}
          <div className="flex items-center justify-between mb-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-1 text-[10px] font-black text-blue-800 uppercase tracking-wider">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
              STEP 1 — Meta Ads Campaign
            </span>
            {step1Done && (
              <span className="rounded-full bg-emerald-500 text-white px-2.5 py-0.5 text-[10px] font-black">
                ✓ {metaRows.length} Campaign
              </span>
            )}
          </div>

          {/* File list badge row */}
          {metaFileNames.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {metaFileNames.map((name, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 rounded-full bg-emerald-100 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-800 max-w-[180px] truncate"
                  title={name}
                >
                  📄 {name}
                </span>
              ))}
            </div>
          )}

          {/* Loading state */}
          {metaLoading ? (
            <div className="flex flex-col items-center justify-center py-6 gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
              <div className="text-center">
                <p className="text-xs font-bold text-blue-700">Memproses {metaLoadingFiles.length} file...</p>
                {metaLoadingFiles.slice(0, 2).map((f, i) => (
                  <p key={i} className="text-[10px] text-slate-400 truncate max-w-[200px]">{f}</p>
                ))}
              </div>
            </div>
          ) : step1Done ? (
            <div className="flex flex-col items-center justify-center py-3 text-center gap-2">
              <p className="text-[11px] text-slate-500">
                {metaFileNames.length} file · {metaRows.length} kampanye terbaca
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                <button
                  onClick={() => metaInputRef.current?.click()}
                  className="rounded-lg bg-blue-600 text-white px-3 py-1.5 text-[11px] font-bold hover:bg-blue-700 transition"
                >
                  + Tambah File Lagi
                </button>
                <button
                  onClick={() => {
                    onClearData();
                    setTimeout(() => metaInputRef.current?.click(), 100);
                  }}
                  className="rounded-lg border border-slate-300 text-slate-600 px-3 py-1.5 text-[11px] font-bold hover:bg-slate-50 transition"
                >
                  Ganti Semua
                </button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => metaInputRef.current?.click()}
              className="flex flex-col items-center justify-center py-5 text-center cursor-pointer"
            >
              <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">📊</div>
              <p className="text-sm font-bold text-slate-700">
                {metaDragging ? "Lepas file di sini!" : "Seret & lepas, atau klik untuk pilih"}
              </p>
              <p className="mt-1 text-[11px] text-slate-400">
                Bisa pilih <b>beberapa file</b> sekaligus — semua akan digabung
              </p>
              <p className="mt-0.5 text-[10px] text-slate-400">Format: .xlsx, .xls, .csv</p>
              <div className="mt-3 rounded-lg bg-blue-100 px-3 py-1.5 text-[10px] text-blue-700 font-semibold">
                Kolom: Account name · Campaign name · Amount spent · Results
              </div>
            </div>
          )}
        </div>

        {/* ━━ ZONE 2: CRM / Ref ━━ */}
        <div className="flex flex-col gap-2">
          <div
            onClick={() => crmInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setCrmDragging(true); }}
            onDragLeave={() => setCrmDragging(false)}
            onDrop={handleCrmDrop}
            className={`group relative flex flex-1 cursor-pointer flex-col rounded-2xl border-2 border-dashed p-5 transition-all select-none ${
              crmDragging
                ? "border-purple-500 bg-purple-100 scale-[1.01]"
                : step2Done
                ? "border-emerald-400 bg-emerald-50/60"
                : "border-purple-300 bg-gradient-to-br from-purple-50 to-white hover:border-purple-500 hover:bg-purple-50"
            }`}
          >
            <input
              ref={crmInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCrmFile(f); e.target.value = ""; }}
              className="hidden"
            />

            {/* Label */}
            <div className="flex items-center justify-between mb-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-100 px-2.5 py-1 text-[10px] font-black text-purple-800 uppercase tracking-wider">
                <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                STEP 2 — CRM / Ref & Deposit
              </span>
              {step2Done ? (
                <span className="rounded-full bg-emerald-500 text-white px-2.5 py-0.5 text-[10px] font-black">
                  ✓ {crmRows.length} Ref Codes
                </span>
              ) : (
                <span className="rounded-full bg-amber-100 text-amber-800 px-2.5 py-0.5 text-[10px] font-bold animate-pulse">
                  Wajib untuk CPR &amp; CPD
                </span>
              )}
            </div>

            {/* Icon + Text */}
            <div className="flex flex-col items-center justify-center py-4 text-center">
              {crmLoading ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-500 border-t-transparent" />
                  <span className="text-xs text-purple-600 font-bold">Memproses...</span>
                </div>
              ) : step2Done ? (
                <>
                  <div className="text-3xl mb-2">✅</div>
                  <p className="text-sm font-bold text-emerald-800 max-w-[200px] truncate">{crmFileName}</p>
                  <p className="text-[11px] text-slate-500 mt-1">{crmRows.length} ref codes terbaca · Klik untuk ganti</p>
                </>
              ) : (
                <>
                  <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">📋</div>
                  <p className="text-sm font-bold text-slate-700">
                    {crmDragging ? "Lepas file di sini!" : "Seret & lepas, atau klik untuk pilih"}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-400">Format: .xlsx, .xls, .csv</p>
                  <div className="mt-3 rounded-lg bg-purple-100 px-3 py-1.5 text-[10px] text-purple-700 font-semibold">
                    Kolom: Group (Ref) · Registrations → REGIS · Total QFTDs → NDP
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Paste from clipboard button */}
          <button
            onClick={() => setIsPasteModalOpen(true)}
            className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-purple-200 bg-purple-50 py-2.5 text-xs font-bold text-purple-700 transition hover:border-purple-400 hover:bg-purple-100"
          >
            📋 Atau tempel data CRM dari clipboard
          </button>
        </div>
      </div>

      {/* ── Quick Format Guide ───────────────────────────────────────── */}
      {!bothDone && (
        <div className="mx-5 mb-5 grid grid-cols-1 gap-2 md:grid-cols-2">
          <div className="rounded-xl bg-blue-50 border border-blue-100 p-3">
            <p className="text-[10px] font-black text-blue-800 uppercase tracking-wider mb-1.5">📊 Format File 1 (Meta Ads) — bisa multi-file</p>
            <div className="font-mono text-[10px] text-blue-700 space-y-0.5">
              <div className="grid grid-cols-4 gap-1 font-bold text-blue-500 border-b border-blue-200 pb-1">
                <span>Account</span><span>Campaign</span><span>Spent</span><span>Results</span>
              </div>
              <div className="grid grid-cols-4 gap-1 text-blue-600">
                <span>JANJI33</span><span>2/kfc/R10</span><span>131.32</span><span>48</span>
              </div>
              <div className="grid grid-cols-4 gap-1 text-blue-600">
                <span>JANJI33</span><span>2/kfc/R11</span><span>55.28</span><span>12</span>
              </div>
            </div>
          </div>
          <div className="rounded-xl bg-purple-50 border border-purple-100 p-3">
            <p className="text-[10px] font-black text-purple-800 uppercase tracking-wider mb-1.5">📋 Format File 2 (CRM)</p>
            <div className="font-mono text-[10px] text-purple-700 space-y-0.5">
              <div className="grid grid-cols-3 gap-1 font-bold text-purple-500 border-b border-purple-200 pb-1">
                <span>Group</span><span>Registrations</span><span>Total QFTDs</span>
              </div>
              <div className="grid grid-cols-3 gap-1 text-purple-600">
                <span>R10</span><span>23</span><span>5</span>
              </div>
              <div className="grid grid-cols-3 gap-1 text-purple-600">
                <span>R11</span><span>7</span><span>4</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Paste CRM Modal ──────────────────────────────────────────── */}
      {isPasteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-4">
              <div>
                <h3 className="text-sm font-black text-white">📋 Tempel Data CRM dari Clipboard</h3>
                <p className="mt-0.5 text-[11px] text-purple-200">
                  Copy tabel dari portal CRM lalu paste di bawah
                </p>
              </div>
              <button
                onClick={() => { setIsPasteModalOpen(false); setPasteText(""); }}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 text-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-6">
              <div className="mb-3 rounded-xl bg-purple-50 border border-purple-100 p-3 font-mono text-[10px] text-purple-700">
                <p className="font-bold text-purple-600 mb-1">Contoh format yang diterima:</p>
                <p>Group&nbsp;&nbsp;&nbsp;&nbsp;Registrations&nbsp;&nbsp;&nbsp;Total QFTDs</p>
                <p>R10&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;23&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;5</p>
                <p>R11&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;7&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;4</p>
              </div>

              <textarea
                rows={8}
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder="Paste tabel CRM di sini (Tab, koma, atau titik koma sebagai pemisah)..."
                autoFocus
                className="w-full rounded-xl border border-slate-300 bg-slate-50 p-3 font-mono text-xs outline-none focus:border-purple-500 focus:bg-white focus:ring-2 focus:ring-purple-200 transition"
              />

              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  onClick={() => { setIsPasteModalOpen(false); setPasteText(""); }}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  onClick={handleProcessPastedCrm}
                  disabled={!pasteText.trim()}
                  className="rounded-xl bg-purple-600 px-6 py-2 text-xs font-bold text-white shadow-sm hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  🔗 Proses & Gabungkan Data
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
