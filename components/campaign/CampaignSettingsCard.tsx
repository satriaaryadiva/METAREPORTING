"use client";

import React from "react";
import { CampaignReportSettings } from "@/types/campaign-report";

interface CampaignSettingsCardProps {
  settings: CampaignReportSettings;
  onChange: (updated: Partial<CampaignReportSettings>) => void;
}

export default function CampaignSettingsCard({
  settings,
  onChange,
}: CampaignSettingsCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-black text-slate-900">02. SETTING LAPORAN</h2>
      <p className="mb-4 text-xs text-slate-500">
        Sesuaikan judul banner, tanggal, kurs & pajak
      </p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <label className="text-xs font-bold text-slate-700">
          Judul Laporan
          <input
            type="text"
            value={settings.reportTitle}
            onChange={(e) => onChange({ reportTitle: e.target.value })}
            placeholder="REPORT HWGASPOL"
            className="mt-1 h-10 w-full rounded-xl border border-slate-300 px-3 text-xs font-bold text-slate-800 outline-none focus:border-blue-500"
          />
        </label>

        <label className="text-xs font-bold text-slate-700">
          Tanggal / Periode
          <input
            type="text"
            value={settings.reportDate}
            onChange={(e) => onChange({ reportDate: e.target.value })}
            placeholder="3 september 2026"
            className="mt-1 h-10 w-full rounded-xl border border-slate-300 px-3 text-xs font-bold text-slate-800 outline-none focus:border-blue-500"
          />
        </label>

        <label className="text-xs font-bold text-slate-700">
          Kurs (Rp/USD)
          <input
            type="number"
            value={settings.rate}
            onChange={(e) => onChange({ rate: Number(e.target.value) || 18000 })}
            placeholder="18000"
            className="mt-1 h-10 w-full rounded-xl border border-slate-300 px-3 text-xs font-bold text-slate-800 outline-none focus:border-blue-500"
          />
        </label>

        <label className="text-xs font-bold text-slate-700">
          Tax / Fee (%)
          <input
            type="number"
            step="0.1"
            value={settings.taxFeePercent}
            onChange={(e) =>
              onChange({ taxFeePercent: Number(e.target.value) || 0 })
            }
            placeholder="4"
            className="mt-1 h-10 w-full rounded-xl border border-slate-300 px-3 text-xs font-bold text-slate-800 outline-none focus:border-blue-500"
          />
        </label>

        <label className="text-xs font-bold text-slate-700">
          Default Budget ($)
          <input
            type="number"
            value={settings.defaultBudget}
            onChange={(e) =>
              onChange({ defaultBudget: Number(e.target.value) || 1000 })
            }
            placeholder="1000"
            className="mt-1 h-10 w-full rounded-xl border border-slate-300 px-3 text-xs font-bold text-slate-800 outline-none focus:border-blue-500"
          />
        </label>
      </div>
    </div>
  );
}
