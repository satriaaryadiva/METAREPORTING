"use client";

import React, { useMemo, useState } from "react";
import { AdAccount } from "@/types/ad-rules";

/** Default working set: USD accounts only (matches the green/amber badge convention). */
export function usdAccountIds(accounts: AdAccount[]): string[] {
  return accounts.filter((a) => a.currency === "USD").map((a) => a.id);
}

interface AccountPickerProps {
  accounts: AdAccount[];
  selected: string[];
  onChange: (ids: string[]) => void;
  /** Smaller row height / no shadow — for use inside the Rule modal. */
  compact?: boolean;
}

export default function AccountPicker({
  accounts,
  selected,
  onChange,
  compact = false,
}: AccountPickerProps) {
  const [query, setQuery] = useState("");
  const [currencyFilter, setCurrencyFilter] = useState<string>("ALL");

  const currencies = useMemo(
    () => Array.from(new Set(accounts.map((a) => a.currency))).sort(),
    [accounts]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return accounts.filter((a) => {
      const matchesQuery =
        !q || a.name.toLowerCase().includes(q) || a.id.toLowerCase().includes(q);
      const matchesCurrency = currencyFilter === "ALL" || a.currency === currencyFilter;
      return matchesQuery && matchesCurrency;
    });
  }, [accounts, query, currencyFilter]);

  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  };

  const selectAllFiltered = () => {
    const ids = new Set(selected);
    filtered.forEach((a) => ids.add(a.id));
    onChange(Array.from(ids));
  };

  const clearAllFiltered = () => {
    const filteredIds = new Set(filtered.map((a) => a.id));
    onChange(selected.filter((id) => !filteredIds.has(id)));
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari akun…"
          className="h-8 flex-1 min-w-0 rounded-lg border border-slate-300 px-2.5 text-xs text-slate-800 outline-none focus:border-blue-500 transition"
        />
        <select
          value={currencyFilter}
          onChange={(e) => setCurrencyFilter(e.target.value)}
          className="h-8 rounded-lg border border-slate-300 bg-white px-2 text-xs font-bold text-slate-700 outline-none focus:border-blue-500"
        >
          <option value="ALL">Semua</option>
          {currencies.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center justify-between mb-1.5">
        <p className="text-[11px] text-slate-400">
          {selected.length} dari {accounts.length} dipilih
        </p>
        <div className="flex gap-2">
          <button
            onClick={selectAllFiltered}
            className="text-[11px] font-bold text-blue-600 hover:underline"
          >
            Pilih Semua
          </button>
          <span className="text-slate-300">|</span>
          <button
            onClick={clearAllFiltered}
            className="text-[11px] font-bold text-slate-500 hover:underline"
          >
            Hapus
          </button>
        </div>
      </div>

      <div
        className={`space-y-1 overflow-y-auto rounded-xl border border-slate-200 p-2 ${
          compact ? "max-h-40" : "max-h-72"
        }`}
      >
        {filtered.length === 0 && (
          <p className="py-6 text-center text-xs text-slate-400">Tidak ada akun cocok.</p>
        )}
        {filtered.map((acc) => {
          const isSelected = selected.includes(acc.id);
          const isUsd = acc.currency === "USD";
          return (
            <button
              key={acc.id}
              onClick={() => toggle(acc.id)}
              className={`flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition ${
                isSelected
                  ? "border-blue-300 bg-blue-50"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <div
                className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border-2 transition ${
                  isSelected ? "border-blue-600 bg-blue-600" : "border-slate-300 bg-white"
                }`}
              >
                {isSelected && (
                  <svg className="h-2.5 w-2.5 text-white" viewBox="0 0 12 12" fill="none">
                    <polyline
                      points="1.5,6 4.5,9 10.5,3"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </div>
              <span className="min-w-0 flex-1 truncate text-xs font-bold text-slate-800">
                {acc.name}
              </span>
              <span
                className={`flex-shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-black ${
                  isUsd ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                }`}
              >
                {acc.currency}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
