"use client";

import React from "react";
import { Merge, Row } from "@/types/report";
import { usd, rupiah } from "@/lib/utils";

interface MergeReportCardProps {
  merge: Merge;
  items: Row[];
  sortBySpent: boolean;
  fee: number;
  rate: number;
  subtitleList: string;
  index: number;
  totalCards: number;
  isEditingName: boolean;
  editingNameValue: string;
  onStartEditName: (key: string, currentName: string) => void;
  onCommitEditName: (key: string) => void;
  onSetEditingNameValue: (val: string) => void;
  onCancelEditName: () => void;
  onMoveCard: (index: number, direction: -1 | 1) => void;
  onDeleteMerge: (id: string) => void;
}

export default function MergeReportCard({
  merge,
  items,
  sortBySpent,
  fee,
  rate,
  subtitleList,
  index,
  totalCards,
  isEditingName,
  editingNameValue,
  onStartEditName,
  onCommitEditName,
  onSetEditingNameValue,
  onCancelEditName,
  onMoveCard,
  onDeleteMerge,
}: MergeReportCardProps) {
  const rawVisible = items.filter((item) => item.spent !== 0);
  const visibleMergeItems = sortBySpent
    ? [...rawVisible].sort((a, b) => b.spent - a.spent)
    : rawVisible;

  const mergeTotal = items.reduce((sum, row) => sum + row.spent, 0);
  const mergeFee = mergeTotal * (fee / 100);
  const mergeGroupTotal = mergeTotal + mergeFee;
  const mergeRP = mergeGroupTotal * rate;

  return (
    <section className="w-full overflow-hidden rounded-2xl border border-purple-400 bg-white shadow-sm flex flex-col uppercase">
      {/* MERGE HEADER */}
      <div className="flex min-h-[64px] items-center justify-between gap-3 bg-purple-600 px-4 py-3 text-white">
        <div className="min-w-0 flex-1">
          <div className="mb-0.5 inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-black">
            MERGE
          </div>
          {isEditingName ? (
            <input
              autoFocus
              value={editingNameValue}
              onChange={(e) => onSetEditingNameValue(e.target.value)}
              onBlur={() => onCommitEditName(merge.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onCommitEditName(merge.id);
                if (e.key === "Escape") onCancelEditName();
              }}
              className="w-full rounded bg-white/20 px-1 text-base font-black uppercase leading-tight text-white outline-none"
            />
          ) : (
            <h3 className="group/mname flex items-center gap-1 truncate text-base font-black uppercase leading-tight">
              <span className="truncate">{merge.name}</span>
              <button
                onClick={() => onStartEditName(merge.id, merge.name)}
                title="Edit nama merge"
                className="shrink-0 opacity-0 transition group-hover/mname:opacity-100 text-white/70 hover:text-white"
              >
                <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor">
                  <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z" />
                </svg>
              </button>
            </h3>
          )}
          <p className="mt-0.5 text-[10px] font-bold text-white/70">
            {subtitleList}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-black">
            {visibleMergeItems.length} ACC
          </span>
          <div className="flex items-center rounded-lg bg-white/10 p-0.5">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMoveCard(index, -1);
              }}
              disabled={index === 0}
              title="Pindahkan tabel ke kiri"
              className="flex h-5 w-5 items-center justify-center rounded text-xs font-bold text-white transition hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-transparent"
            >
              ←
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMoveCard(index, 1);
              }}
              disabled={index === totalCards - 1}
              title="Pindahkan tabel ke kanan"
              className="flex h-5 w-5 items-center justify-center rounded text-xs font-bold text-white transition hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-transparent"
            >
              →
            </button>
          </div>
          <button
            onClick={() => onDeleteMerge(merge.id)}
            title="Hapus merge ini"
            className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-white transition hover:bg-red-500 text-xs"
          >
            ×
          </button>
        </div>
      </div>

      {/* COLUMN HEADER */}
      <div className="grid grid-cols-[minmax(0,1fr)_115px] border-b border-slate-300 bg-[#f3eefe] text-[11px] font-black uppercase tracking-wide text-purple-700">
        <div className="px-3 py-2.5">Account Name</div>
        <div className="px-3 py-2.5 text-right">Spent</div>
      </div>

      {/* ACCOUNTS LIST */}
      <div>
        {visibleMergeItems.map((item, idx) => (
          <div
            key={`${item.account}-${idx}`}
            className="grid grid-cols-[minmax(0,1fr)_115px] border-b border-slate-200 bg-white text-[13px] leading-snug"
          >
            <div className="min-w-0 break-words px-3 py-2 font-semibold text-slate-700">
              {item.account}
            </div>
            <div className="whitespace-nowrap px-3 py-2 text-right font-bold tabular-nums text-slate-800">
              {usd(item.spent)}
            </div>
          </div>
        ))}
      </div>

      {/* FOOTER */}
      <footer className="border-t-2 border-purple-300">
        <div className="grid grid-cols-[minmax(0,1fr)_115px] bg-[#1e293b] text-xs font-black text-white">
          <div className="px-3 py-2.5">TOTAL SPENDING</div>
          <div className="px-3 py-2.5 text-right tabular-nums">{usd(mergeTotal)}</div>
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_115px] border-b border-slate-200 bg-white text-xs">
          <div className="px-3 py-2 text-slate-500">Fee {fee}%</div>
          <div className="px-3 py-2 text-right font-semibold tabular-nums">
            {usd(mergeFee)}
          </div>
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_115px] border-b border-slate-200 bg-white text-xs">
          <div className="px-3 py-2 text-slate-500">Total + Fee</div>
          <div className="px-3 py-2 text-right font-bold tabular-nums">
            {usd(mergeGroupTotal)}
          </div>
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_115px] bg-[#f3eefe] text-xs font-black text-purple-700">
          <div className="px-3 py-2.5">TOTAL RUPIAH</div>
          <div className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums">
            {rupiah(mergeRP)}
          </div>
        </div>
      </footer>
    </section>
  );
}
