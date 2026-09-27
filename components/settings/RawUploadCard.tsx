"use client";

import React from "react";

interface RawUploadCardProps {
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileName: string;
  rowCount: number;
  error: string;
}

export default function RawUploadCard({
  onUpload,
  fileName,
  rowCount,
  error,
}: RawUploadCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="font-bold text-slate-800">01. RAW DATA</h2>
      <p className="mb-4 mt-1 text-xs text-slate-500">Upload file Meta Ads</p>

      <label className="flex min-h-[115px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 transition hover:border-blue-400 hover:bg-blue-50">
        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={onUpload}
          className="hidden"
        />

        <span className="font-bold text-slate-700">Klik untuk upload RAW</span>
        <span className="mt-1 text-xs text-slate-400">XLSX / XLS / CSV</span>
      </label>

      {fileName && (
        <div className="mt-3 rounded-xl bg-slate-50 p-3">
          <p className="truncate text-sm font-bold text-slate-800">{fileName}</p>
          <p className="mt-1 text-xs text-slate-500">{rowCount} account terbaca</p>
        </div>
      )}

      {error && (
        <div className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}
    </div>
  );
}
