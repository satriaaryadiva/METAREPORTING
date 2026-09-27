"use client";

import React from "react";

interface GeneralSettingsCardProps {
  period: string;
  setPeriod: (val: string) => void;
  fee: number;
  setFee: (val: number) => void;
  rate: number;
  setRate: (val: number) => void;
}

export default function GeneralSettingsCard({
  period,
  setPeriod,
  fee,
  setFee,
  rate,
  setRate,
}: GeneralSettingsCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="font-bold text-slate-800">02. SETTING</h2>
      <p className="mb-4 mt-1 text-xs text-slate-500">Periode, fee & kurs</p>

      <div className="grid gap-3">
        <label className="text-sm font-semibold text-slate-700">
          Periode Laporan
          <input
            type="text"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            placeholder="Contoh: 1 - 31 Juli 2025"
            className="mt-1 h-10 w-full rounded-xl border border-slate-300 px-3 text-sm text-slate-800 outline-none transition focus:border-blue-500"
          />
        </label>

        <div className="grid grid-cols-2 gap-2">
          <label className="text-sm font-semibold text-slate-700">
            Fee (%)
            <input
              type="number"
              step="0.01"
              value={fee}
              onChange={(e) => setFee(Number(e.target.value))}
              className="mt-1 h-10 w-full rounded-xl border border-slate-300 px-3 text-sm text-slate-800 outline-none transition focus:border-blue-500"
            />
          </label>

          <label className="text-sm font-semibold text-slate-700">
            Kurs (Rp)
            <input
              type="number"
              value={rate}
              onChange={(e) => setRate(Number(e.target.value))}
              className="mt-1 h-10 w-full rounded-xl border border-slate-300 px-3 text-sm text-slate-800 outline-none transition focus:border-blue-500"
            />
          </label>
        </div>
      </div>
    </div>
  );
}
