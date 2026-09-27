"use client";

import React from "react";

interface ReportControlsProps {
  period?: string;
  sortBySpent: boolean;
  onToggleSort: () => void;
  tableCount: number;
  mergeMode: boolean;
  onEnterMergeMode: () => void;
}

export default function ReportControls({
  period,
  sortBySpent,
  onToggleSort,
  tableCount,
  mergeMode,
  onEnterMergeMode,
}: ReportControlsProps) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-blue-600">
          REPORT
        </p>
        <h2 className="mt-1 text-xl font-black text-slate-900">
          Spending by Mapping
        </h2>
        {period ? (
          <div className="mt-1 inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
            <span>📅 Periode: {period}</span>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={onToggleSort}
          className={`h-8 rounded-full border px-3 text-xs font-bold transition ${
            sortBySpent
              ? "border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100"
              : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
          }`}
          title="Urutkan account dari spent tertinggi ke terendah"
        >
          {sortBySpent ? "↓ Spent: Tertinggi" : "↕ Spent: Normal"}
        </button>

        <div className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-slate-500 shadow-sm border border-slate-200">
          {tableCount} Tabel
        </div>

        {!mergeMode && (
          <button
            onClick={onEnterMergeMode}
            className="h-8 rounded-full border border-blue-300 bg-blue-50 px-3 text-xs font-bold text-blue-700 transition hover:bg-blue-100"
          >
            ⊕ Merge Tabel
          </button>
        )}
      </div>
    </div>
  );
}
