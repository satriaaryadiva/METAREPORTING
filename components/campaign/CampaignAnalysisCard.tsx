"use client";

import React, { useMemo, useState } from "react";
import { CampaignAccountGroup, MergedCampaignRow } from "@/types/campaign-report";
import { formatRp, formatUsd } from "@/lib/campaign-exporter";

interface CampaignAnalysisCardProps {
  groups: CampaignAccountGroup[];
  onApplyFilterPreset?: (preset: "SCALE" | "CHEAPEST" | "EXPENSIVE" | "ZERO_NDP" | "ALL") => void;
  onSelectCampaign?: (campaignName: string) => void;
}

export default function CampaignAnalysisCard({
  groups,
  onApplyFilterPreset,
  onSelectCampaign,
}: CampaignAnalysisCardProps) {
  const [activeTab, setActiveTab] = useState<"SCALE" | "CHEAPEST" | "EXPENSIVE">("SCALE");
  const [isExpanded, setIsExpanded] = useState(true);

  // Flatten all campaign rows
  const allRows = useMemo<MergedCampaignRow[]>(() => {
    return groups.flatMap((g) => g.items);
  }, [groups]);

  // Overall Benchmarks & Aggregates
  const stats = useMemo(() => {
    const totalSpentTax = allRows.reduce((acc, r) => acc + r.spentTaxRp, 0);
    const totalRegis = allRows.reduce((acc, r) => acc + r.regis, 0);
    const totalNdp = allRows.reduce((acc, r) => acc + r.ndp, 0);

    const avgCpr = totalRegis > 0 ? totalSpentTax / totalRegis : 0;
    const avgCpd = totalNdp > 0 ? totalSpentTax / totalNdp : 0;

    // Campaigns with 0 NDP but spent > 0 (Burn budget)
    const zeroNdpRows = allRows.filter((r) => r.ndp === 0 && r.spent > 0);
    const zeroNdpSpentUsd = zeroNdpRows.reduce((acc, r) => acc + r.spent, 0);
    const zeroNdpSpentRp = zeroNdpRows.reduce((acc, r) => acc + r.spentTaxRp, 0);

    // Lowest CPD found in dataset
    const cpdList = allRows.map((r) => r.cpdRefRp).filter((c): c is number => typeof c === "number" && c > 0);
    const lowestCpd = cpdList.length > 0 ? Math.min(...cpdList) : null;

    return {
      avgCpr,
      avgCpd,
      lowestCpd,
      zeroNdpCount: zeroNdpRows.length,
      zeroNdpSpentUsd,
      zeroNdpSpentRp,
    };
  }, [allRows]);

  // 1. TOP SCALEABLE CAMPAIGNS (Winner / High Scalability Potential)
  const scaleableCampaigns = useMemo(() => {
    return allRows
      .filter((r) => r.ndp > 0 && r.spent > 0)
      .map((r) => {
        let score = 50;
        if (r.ndp >= 5) score += 25;
        else if (r.ndp >= 2) score += 15;
        else score += 8;

        if (r.regis >= 20) score += 15;
        else if (r.regis >= 5) score += 10;

        // Bonus if CPD is low / below avg
        const isLowCpd = stats.avgCpd > 0 && r.cpdRefRp && r.cpdRefRp < stats.avgCpd;
        if (isLowCpd) score += 15;

        if (r.status === "Active") score += 10;
        score = Math.min(100, Math.max(10, score));

        let badge = "🚀 Siap Scale";
        let badgeStyle = "bg-emerald-600 text-white";
        let recommendation = "Naikkan Budget 20-30%";

        if (score >= 85) {
          badge = "🔥 SUPER WINNER";
          badgeStyle = "bg-emerald-700 text-white";
          recommendation = "Scale Aggressive! (CPD Rendah)";
        } else if (score >= 70) {
          badge = "🚀 HIGH POTENTIAL";
          badgeStyle = "bg-emerald-600 text-white";
          recommendation = "Scale Budget Bertahap";
        }

        return {
          ...r,
          score,
          badge,
          badgeStyle,
          isLowCpd,
          recommendation,
        };
      })
      .sort((a, b) => b.score - a.score || b.ndp - a.ndp)
      .slice(0, 4);
  }, [allRows, stats.avgCpd]);

  // 2. TERMURAH (Lowest CPR & CPD)
  const cheapestCampaigns = useMemo(() => {
    const validRows = allRows.filter((r) => (r.regis > 0 || r.ndp > 0 || r.results > 0) && r.spent > 0);

    return [...validRows]
      .sort((a, b) => {
        const cpdA = a.cpdRefRp ?? (a.cprRefRp ?? (a.cphTaxRp ?? Infinity));
        const cpdB = b.cpdRefRp ?? (b.cprRefRp ?? (b.cphTaxRp ?? Infinity));
        return cpdA - cpdB;
      })
      .slice(0, 4);
  }, [allRows]);

  // 3. TERMAHAL / BURNING BUDGET (High Spend or 0 NDP)
  const expensiveCampaigns = useMemo(() => {
    return [...allRows]
      .filter((r) => r.spent > 0)
      .sort((a, b) => {
        if (a.ndp === 0 && b.ndp > 0) return -1;
        if (b.ndp === 0 && a.ndp > 0) return 1;
        return b.spent - a.spent;
      })
      .slice(0, 4);
  }, [allRows]);

  if (allRows.length === 0) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden transition font-sans">
      {/* Sleek Compact Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-900 px-4 py-2.5 text-white">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-400/20 text-amber-300 font-black text-xs">
            ⚡
          </span>
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-white">
              Insight & Scale Analyzer
            </h3>
          </div>
        </div>

        {/* Tab Segment Controls */}
        <div className="flex items-center gap-1.5">
          <div className="flex rounded-lg bg-white/10 p-0.5 backdrop-blur-xs text-xs">
            <button
              onClick={() => {
                setActiveTab("SCALE");
                setIsExpanded(true);
              }}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 font-bold transition ${
                activeTab === "SCALE"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              <span>🚀 Siap Scale</span>
              {scaleableCampaigns.length > 0 && (
                <span className="rounded bg-black/25 px-1 py-0.2 text-[10px]">
                  {scaleableCampaigns.length}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setActiveTab("CHEAPEST");
                setIsExpanded(true);
              }}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 font-bold transition ${
                activeTab === "CHEAPEST"
                  ? "bg-cyan-600 text-white shadow-xs"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              <span>💎 Termurah (CPD Rendah)</span>
            </button>

            <button
              onClick={() => {
                setActiveTab("EXPENSIVE");
                setIsExpanded(true);
              }}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 font-bold transition ${
                activeTab === "EXPENSIVE"
                  ? "bg-rose-600 text-white shadow-xs"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              <span>⚠️ Termahal / Boros</span>
              {stats.zeroNdpCount > 0 && (
                <span className="rounded bg-black/25 px-1 py-0.2 text-[10px]">
                  {stats.zeroNdpCount}
                </span>
              )}
            </button>
          </div>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex h-6 w-6 items-center justify-center rounded-md bg-white/10 text-[10px] font-bold text-slate-300 hover:text-white hover:bg-white/20 transition"
            title={isExpanded ? "Sembunyikan" : "Tampilkan"}
          >
            {isExpanded ? "▲" : "▼"}
          </button>
        </div>
      </div>

      {/* Content Body */}
      {isExpanded && (
        <div className="p-3 bg-slate-50/60">
          {/* 1. SIAP SCALE VIEW */}
          {activeTab === "SCALE" && (
            <div>
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="font-bold text-emerald-900">
                  🎯 Rekomendasi Scale Up (Konversi NDP Tinggi & Efisiensi Biaya Bagus)
                </span>
                {onApplyFilterPreset && (
                  <button
                    onClick={() => onApplyFilterPreset("SCALE")}
                    className="rounded-md bg-emerald-100 px-2 py-0.5 text-[11px] font-black text-emerald-800 hover:bg-emerald-200 transition"
                  >
                    Filter di Tabel ⚡
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                {scaleableCampaigns.length === 0 ? (
                  <div className="col-span-full py-4 text-center text-xs text-slate-400">
                    Belum ada campaign dengan konversi NDP untuk di-scale.
                  </div>
                ) : (
                  scaleableCampaigns.map((row) => (
                    <div
                      key={row.id}
                      onClick={() => onSelectCampaign?.(row.campaignName)}
                      className="cursor-pointer rounded-xl border border-emerald-200 bg-white p-3 shadow-2xs hover:border-emerald-400 hover:shadow-xs transition"
                    >
                      <div className="flex items-start justify-between gap-1">
                        <div className="truncate">
                          <div className="truncate text-xs font-black text-slate-900 tracking-tight" title={row.campaignName}>
                            {row.campaignName}
                          </div>
                          <div className="truncate text-[10px] text-slate-500 font-medium">{row.account}</div>
                        </div>
                        <span className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-black tracking-wide ${row.badgeStyle}`}>
                          {row.badge}
                        </span>
                      </div>

                      <div className="mt-2 grid grid-cols-3 gap-1 rounded-lg bg-emerald-50/70 p-1.5 text-center text-[10px]">
                        <div>
                          <span className="block text-slate-400 font-semibold">Spent</span>
                          <span className="font-bold text-slate-900 tabular-nums">{formatUsd(row.spent)}</span>
                        </div>
                        <div>
                          <span className="block text-slate-400 font-semibold">Regis</span>
                          <span className="font-black text-amber-700 tabular-nums">{row.regis}</span>
                        </div>
                        <div>
                          <span className="block text-slate-400 font-semibold">NDP</span>
                          <span className="font-black text-emerald-700 tabular-nums">{row.ndp}</span>
                        </div>
                      </div>

                      <div className="mt-2 flex items-center justify-between text-[10px]">
                        <span className="text-slate-500 font-semibold">
                          CPD:{" "}
                          <span className="font-black text-emerald-800 bg-emerald-100 px-1 py-0.2 rounded tabular-nums">
                            {row.cpdRefRp ? formatRp(row.cpdRefRp) : "-"}
                          </span>
                        </span>
                        <span className="font-bold text-emerald-700">{row.recommendation}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* 2. TERMURAH VIEW (CPD & CPR Rendah) */}
          {activeTab === "CHEAPEST" && (
            <div>
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="font-bold text-cyan-900">
                  💎 CPD & CPR Termurah (Biaya Akuisisi Paling Efisien / Low Cost)
                </span>
                {onApplyFilterPreset && (
                  <button
                    onClick={() => onApplyFilterPreset("CHEAPEST")}
                    className="rounded-md bg-cyan-100 px-2 py-0.5 text-[11px] font-black text-cyan-800 hover:bg-cyan-200 transition"
                  >
                    Filter di Tabel ⚡
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                {cheapestCampaigns.length === 0 ? (
                  <div className="col-span-full py-4 text-center text-xs text-slate-400">
                    Belum ada data campaign termurah.
                  </div>
                ) : (
                  cheapestCampaigns.map((row) => (
                    <div
                      key={row.id}
                      onClick={() => onSelectCampaign?.(row.campaignName)}
                      className="cursor-pointer rounded-xl border border-cyan-200 bg-white p-3 shadow-2xs hover:border-cyan-400 hover:shadow-xs transition"
                    >
                      <div className="flex items-start justify-between gap-1">
                        <div className="truncate">
                          <div className="truncate text-xs font-black text-slate-900 tracking-tight" title={row.campaignName}>
                            {row.campaignName}
                          </div>
                          <div className="truncate text-[10px] text-slate-500 font-medium">{row.account}</div>
                        </div>
                        <span className="shrink-0 rounded bg-cyan-100 px-1.5 py-0.5 text-[9px] font-black text-cyan-800">
                          {row.cprRefRp ? `CPR ${formatRp(row.cprRefRp)}` : "Low Cost"}
                        </span>
                      </div>

                      <div className="mt-2 grid grid-cols-3 gap-1 rounded-lg bg-cyan-50/70 p-1.5 text-center text-[10px]">
                        <div>
                          <span className="block text-slate-400 font-semibold">Spent</span>
                          <span className="font-bold text-slate-900 tabular-nums">{formatUsd(row.spent)}</span>
                        </div>
                        <div>
                          <span className="block text-slate-400 font-semibold">Regis</span>
                          <span className="font-black text-amber-700 tabular-nums">{row.regis}</span>
                        </div>
                        <div>
                          <span className="block text-slate-400 font-semibold">NDP</span>
                          <span className="font-black text-emerald-700 tabular-nums">{row.ndp}</span>
                        </div>
                      </div>

                      <div className="mt-2 flex items-center justify-between text-[10px]">
                        <span className="text-slate-500 font-semibold">
                          CPD:{" "}
                          <span className="font-black text-emerald-800 bg-emerald-100 px-1 py-0.2 rounded tabular-nums">
                            {row.cpdRefRp ? formatRp(row.cpdRefRp) : "-"}
                          </span>
                        </span>
                        <span className="font-bold text-cyan-800">✨ Biaya Rendah</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* 3. TERMAHAL / BOROS VIEW */}
          {activeTab === "EXPENSIVE" && (
            <div>
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="font-bold text-rose-900">
                  ⚠️ Spent Tertinggi & 0 NDP (Perlu Tindakan / Evaluasi)
                </span>
                {onApplyFilterPreset && (
                  <button
                    onClick={() => onApplyFilterPreset("EXPENSIVE")}
                    className="rounded-md bg-rose-100 px-2 py-0.5 text-[11px] font-black text-rose-800 hover:bg-rose-200 transition"
                  >
                    Filter di Tabel ⚡
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                {expensiveCampaigns.length === 0 ? (
                  <div className="col-span-full py-4 text-center text-xs text-slate-400">
                    Tidak ada campaign boros yang ditemukan.
                  </div>
                ) : (
                  expensiveCampaigns.map((row) => {
                    const isZeroNdp = row.ndp === 0 && row.spent > 0;
                    return (
                      <div
                        key={row.id}
                        onClick={() => onSelectCampaign?.(row.campaignName)}
                        className={`cursor-pointer rounded-xl border p-3 shadow-2xs transition hover:shadow-xs ${
                          isZeroNdp
                            ? "border-rose-300 bg-white hover:border-rose-400"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <div className="truncate">
                            <div className="truncate text-xs font-black text-slate-900 tracking-tight" title={row.campaignName}>
                              {row.campaignName}
                            </div>
                            <div className="truncate text-[10px] text-slate-500 font-medium">{row.account}</div>
                          </div>
                          {isZeroNdp ? (
                            <span className="shrink-0 rounded bg-rose-600 px-1.5 py-0.5 text-[9px] font-black text-white">
                              0 NDP
                            </span>
                          ) : (
                            <span className="shrink-0 rounded bg-slate-200 px-1.5 py-0.5 text-[9px] font-bold text-slate-700">
                              Spent Besar
                            </span>
                          )}
                        </div>

                        <div className="mt-2 grid grid-cols-3 gap-1 rounded-lg bg-rose-50/70 p-1.5 text-center text-[10px]">
                          <div>
                            <span className="block text-slate-400 font-semibold">Spent</span>
                            <span className="font-black text-rose-700 tabular-nums">{formatUsd(row.spent)}</span>
                          </div>
                          <div>
                            <span className="block text-slate-400 font-semibold">Regis</span>
                            <span className="font-black text-slate-800 tabular-nums">{row.regis}</span>
                          </div>
                          <div>
                            <span className="block text-slate-400 font-semibold">NDP</span>
                            <span className="font-black text-slate-800 tabular-nums">{row.ndp}</span>
                          </div>
                        </div>

                        <div className="mt-2 flex items-center justify-between text-[10px]">
                          <span className="text-slate-500 font-semibold">
                            Spent: <span className="font-bold text-slate-800 tabular-nums">{formatRp(row.spentTaxRp)}</span>
                          </span>
                          <span className="font-bold text-rose-600">
                            {isZeroNdp ? "🛑 Matikan / Ganti Iklan" : "🔍 Evaluasi Funnel"}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
