"use client";

import React from "react";

interface MergeToolbarProps {
  selectedCount: number;
  mergeName: string;
  setMergeName: (val: string) => void;
  onConfirmMerge: () => void;
  onCancelMerge: () => void;
}

export default function MergeToolbar({
  selectedCount,
  mergeName,
  setMergeName,
  onConfirmMerge,
  onCancelMerge,
}: MergeToolbarProps) {
  return (
    <div className="mb-4 rounded-2xl border border-blue-200 bg-blue-50 p-4">
      <p className="mb-3 text-sm font-bold text-blue-800">
        Pilih tabel yang ingin di-merge ({selectedCount} dipilih)
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={mergeName}
          onChange={(e) => setMergeName(e.target.value)}
          placeholder="Nama merge (opsional)"
          className="h-9 rounded-lg border border-blue-300 bg-white px-3 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-400"
        />
        <button
          onClick={onConfirmMerge}
          disabled={selectedCount < 2}
          className="h-9 rounded-lg bg-blue-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Merge ({selectedCount})
        </button>
        <button
          onClick={onCancelMerge}
          className="h-9 rounded-lg border border-slate-300 bg-white px-4 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
        >
          Batal
        </button>
      </div>
    </div>
  );
}
