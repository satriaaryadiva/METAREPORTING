"use client";

import React, { useMemo, useState } from "react";
import {
  CampaignAccountGroup,
  CampaignReportSettings,
  CampaignStatus,
  MergedCampaignRow,
} from "@/types/campaign-report";
import { formatRp, formatUsd } from "@/lib/campaign-exporter";
import CampaignAnalysisCard from "./CampaignAnalysisCard";

interface CampaignReportTableProps {
  groups: CampaignAccountGroup[];
  settings: CampaignReportSettings;
  onUpdateRow: (rowId: string, updates: Partial<MergedCampaignRow>) => void;
  reportRef: React.RefObject<HTMLDivElement | null>;
}

type SortField =
  | "campaignName"
  | "budget"
  | "spent"
  | "spentTaxRp"
  | "results"
  | "cphUsd"
  | "cphTaxRp"
  | "regis"
  | "ndp"
  | "cprRefRp"
  | "cpdRefRp"
  | "status"
  | "refCode";

type FilterPreset =
  | "ALL"
  | "ACTIVE"
  | "OFF"
  | "SCALE"
  | "CHEAPEST"
  | "EXPENSIVE"
  | "ZERO_NDP";

function DivZero() {
  return (
    <span className="inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 italic">
      —
    </span>
  );
}

function NumBadge({
  value,
  color = "slate",
}: {
  value: number;
  color?: "slate" | "green" | "blue" | "amber" | "purple";
}) {
  const styles: Record<string, string> = {
    slate: "bg-slate-100 text-slate-700",
    green: "bg-emerald-50 text-emerald-800 border border-emerald-200",
    blue: "bg-blue-50 text-blue-800 border border-blue-200",
    amber: "bg-amber-50 text-amber-800 border border-amber-200",
    purple: "bg-purple-50 text-purple-800 border border-purple-200",
  };
  return (
    <span
      className={`inline-block rounded px-2 py-0.5 text-xs font-black tabular-nums ${styles[color]}`}
    >
      {value}
    </span>
  );
}

function normalizeStatus(status?: string): string {
  if (!status) return "OFF";
  const lower = status.toLowerCase();
  if (lower === "inactive" || lower === "off" || lower === "paused") return "OFF";
  if (lower === "active") return "Active";
  if (lower === "disable" || lower === "disabled" || lower === "archived") return "DISABLE";
  if (lower === "not delivering" || lower === "not_delivering") return "Not delivering";
  if (lower === "not approved" || lower === "not_approved") return "Not approved";
  if (lower === "deleted") return "Deleted";
  if (lower === "completed") return "Completed";
  if (lower === "scheduled") return "Scheduled";
  if (lower === "in draft" || lower === "draft") return "In draft";
  return status;
}

export default function CampaignReportTable({
  groups,
  settings,
  onUpdateRow,
  reportRef,
}: CampaignReportTableProps) {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [filterAccount, setFilterAccount] = useState<string>("ALL");
  const [filterPreset, setFilterPreset] = useState<FilterPreset>("ALL");
  const [hideOff, setHideOff] = useState(false);
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Overall Totals
  const totalSpent = useMemo(() => groups.reduce((acc, g) => acc + g.totalSpent, 0), [groups]);
  const totalSpentTax = useMemo(() => groups.reduce((acc, g) => acc + g.totalSpentTaxRp, 0), [groups]);
  const totalResults = useMemo(() => groups.reduce((acc, g) => acc + g.totalResults, 0), [groups]);
  const totalRegis = useMemo(() => groups.reduce((acc, g) => acc + g.totalRegis, 0), [groups]);
  const totalNdp = useMemo(() => groups.reduce((acc, g) => acc + g.totalNdp, 0), [groups]);
  const totalCampaigns = useMemo(() => groups.reduce((acc, g) => acc + g.items.length, 0), [groups]);

  // Status counts
  const statusSummary = useMemo(() => {
    const counts: Record<string, number> = {};
    groups.forEach((g) => {
      g.items.forEach((item) => {
        const s = normalizeStatus(item.status);
        counts[s] = (counts[s] || 0) + 1;
      });
    });
    return counts;
  }, [groups]);

  const accountList = useMemo(() => groups.map((g) => g.account), [groups]);

  // Averages for benchmark
  const avgCphUsd = totalResults > 0 ? totalSpent / totalResults : null;
  const avgCphTaxRp = totalResults > 0 ? Math.round(totalSpentTax / totalResults) : null;
  const avgCprRp = totalRegis > 0 ? Math.round(totalSpentTax / totalRegis) : null;
  const avgCpdRp = totalNdp > 0 ? Math.round(totalSpentTax / totalNdp) : null;

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else {
        setSortField(null);
      }
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const handleApplyPreset = (preset: FilterPreset) => {
    setFilterPreset(preset);
    if (preset === "ACTIVE") {
      setFilterStatus("Active");
      setHideOff(false);
    } else if (preset === "OFF") {
      setFilterStatus("OFF");
      setHideOff(false);
    } else if (preset === "ALL") {
      setFilterStatus("ALL");
      setFilterAccount("ALL");
      setHideOff(false);
    }
  };

  const handleResetFilters = () => {
    setSearch("");
    setFilterStatus("ALL");
    setFilterAccount("ALL");
    setFilterPreset("ALL");
    setHideOff(false);
    setSortField(null);
  };

  const isAnyFilterActive =
    Boolean(search) ||
    filterStatus !== "ALL" ||
    filterAccount !== "ALL" ||
    filterPreset !== "ALL" ||
    hideOff ||
    sortField !== null;

  // Filter & Sort Groups
  const filteredGroups = useMemo(() => {
    return groups
      .filter((g) => {
        if (filterAccount !== "ALL" && g.account !== filterAccount) return false;
        return true;
      })
      .map((g) => {
        let items = g.items.filter((item) => {
          const itemStatus = normalizeStatus(item.status);

          const matchesSearch =
            !search ||
            item.account.toLowerCase().includes(search.toLowerCase()) ||
            (item.accountId && item.accountId.toLowerCase().includes(search.toLowerCase())) ||
            item.campaignName.toLowerCase().includes(search.toLowerCase()) ||
            item.refCode.toLowerCase().includes(search.toLowerCase());

          if (!matchesSearch) return false;

          if (hideOff && (itemStatus === "OFF" || itemStatus === "Inactive")) {
            return false;
          }

          if (filterStatus !== "ALL") {
            if (filterStatus === "OFF") {
              if (itemStatus !== "OFF" && itemStatus !== "Inactive") return false;
            } else if (itemStatus !== filterStatus) {
              return false;
            }
          }

          if (filterPreset === "ACTIVE") {
            if (itemStatus !== "Active") return false;
          } else if (filterPreset === "OFF") {
            if (itemStatus !== "OFF" && itemStatus !== "Inactive") return false;
          } else if (filterPreset === "SCALE") {
            if (item.ndp <= 0 || item.spent <= 0) return false;
          } else if (filterPreset === "CHEAPEST") {
            if ((item.regis <= 0 && item.ndp <= 0 && item.results <= 0) || item.spent <= 0) {
              return false;
            }
          } else if (filterPreset === "EXPENSIVE") {
            if (item.spent <= 0) return false;
          } else if (filterPreset === "ZERO_NDP") {
            if (item.spent <= 0 || item.ndp > 0) return false;
          }

          return true;
        });

        if (sortField) {
          items = [...items].sort((a, b) => {
            let valA = a[sortField];
            let valB = b[sortField];

            if (valA === null || valA === undefined) valA = -Infinity;
            if (valB === null || valB === undefined) valB = -Infinity;

            if (typeof valA === "string" && typeof valB === "string") {
              return sortDirection === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
            }

            return sortDirection === "asc" ? Number(valA) - Number(valB) : Number(valB) - Number(valA);
          });
        } else if (filterPreset === "EXPENSIVE") {
          items = [...items].sort((a, b) => b.spent - a.spent);
        } else if (filterPreset === "CHEAPEST") {
          items = [...items].sort((a, b) => {
            const valA = a.cpdRefRp ?? (a.cprRefRp ?? Infinity);
            const valB = b.cpdRefRp ?? (b.cprRefRp ?? Infinity);
            return valA - valB;
          });
        }

        return { ...g, items };
      })
      .filter((g) => g.items.length > 0);
  }, [groups, search, filterStatus, filterAccount, filterPreset, hideOff, sortField, sortDirection]);

  // Filtered totals
  const filteredSpent = useMemo(
    () => filteredGroups.reduce((acc, g) => acc + g.items.reduce((s, i) => s + i.spent, 0), 0),
    [filteredGroups]
  );
  const filteredSpentTax = useMemo(
    () => filteredGroups.reduce((acc, g) => acc + g.items.reduce((s, i) => s + i.spentTaxRp, 0), 0),
    [filteredGroups]
  );
  const filteredResults = useMemo(
    () => filteredGroups.reduce((acc, g) => acc + g.items.reduce((s, i) => s + i.results, 0), 0),
    [filteredGroups]
  );
  const filteredRegis = useMemo(
    () => filteredGroups.reduce((acc, g) => acc + g.items.reduce((s, i) => s + i.regis, 0), 0),
    [filteredGroups]
  );
  const filteredNdp = useMemo(
    () => filteredGroups.reduce((acc, g) => acc + g.items.reduce((s, i) => s + i.ndp, 0), 0),
    [filteredGroups]
  );
  const filteredCampaignsCount = useMemo(
    () => filteredGroups.reduce((acc, g) => acc + g.items.length, 0),
    [filteredGroups]
  );

  // Column definitions with clear descriptive notes for crystal clear meaning
  const COLS: {
    label: string;
    field?: SortField;
    align: "left" | "center" | "right";
    width: string;
    note: string;
  }[] = [
    { label: "ACCOUNT", align: "center", width: "min-w-[130px]", note: "Ad Account & ID" },
    { label: "CAMPAIGN NAME", field: "campaignName", align: "left", width: "min-w-[180px]", note: "Nama Kampanye" },
    { label: "BUDGET", field: "budget", align: "center", width: "min-w-[85px]", note: "Target ($)" },
    { label: "SPENT", field: "spent", align: "right", width: "min-w-[80px]", note: "Biaya ($)" },
    { label: "SPENT + TAX", field: "spentTaxRp", align: "right", width: "min-w-[105px]", note: "Total Biaya (Rp)" },
    { label: "RESULT", field: "results", align: "center", width: "min-w-[65px]", note: "Hasil Web" },
    { label: "CPH ($)", field: "cphUsd", align: "center", width: "min-w-[75px]", note: "Biaya/Hasil ($)" },
    { label: "CPH + TAX", field: "cphTaxRp", align: "center", width: "min-w-[95px]", note: "Biaya/Hasil (Rp)" },
    { label: "REGIS", field: "regis", align: "center", width: "min-w-[60px]", note: "Registrasi" },
    { label: "NDP", field: "ndp", align: "center", width: "min-w-[55px]", note: "Deposit (QFTD)" },
    { label: "CPR REF", field: "cprRefRp", align: "center", width: "min-w-[95px]", note: "Biaya / Regis" },
    { label: "CPD REF", field: "cpdRefRp", align: "center", width: "min-w-[105px]", note: "Biaya / NDP" },
    { label: "STATUS", field: "status", align: "center", width: "min-w-[130px]", note: "Status Iklan" },
    { label: "KODE REF", field: "refCode", align: "center", width: "min-w-[75px]", note: "Kode Referensi" },
  ];

  return (
    <div className="space-y-3.5 font-sans">
      {/* ── Minimalist KPI Metric Strip ────────────────────────────────────── */}
      {groups.length > 0 && (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Spent</div>
            <div className="mt-0.5 text-base font-black text-blue-700 tabular-nums">{formatUsd(totalSpent)}</div>
            <div className="text-[10px] text-slate-500 font-medium tabular-nums">{formatRp(totalSpentTax)}</div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Hasil Web</div>
            <div className="mt-0.5 text-base font-black text-indigo-700 tabular-nums">{totalResults.toLocaleString()}</div>
            <div className="text-[10px] text-slate-500 font-medium">{totalCampaigns} Campaign</div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Registrasi CRM</div>
            <div className="mt-0.5 text-base font-black text-amber-700 tabular-nums">{totalRegis.toLocaleString()}</div>
            <div className="text-[10px] text-slate-500 font-medium tabular-nums">
              CPR: {avgCprRp !== null ? formatRp(avgCprRp) : "—"}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total NDP (Deposit)</div>
            <div className="mt-0.5 text-base font-black text-emerald-700 tabular-nums">{totalNdp.toLocaleString()}</div>
            <div className="text-[10px] text-slate-500 font-medium tabular-nums">
              Avg CPD: {avgCpdRp !== null ? formatRp(avgCpdRp) : "—"}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Avg CPH (Biaya/Hasil)</div>
            <div className="mt-0.5 text-base font-black text-teal-700 tabular-nums">{avgCphUsd !== null ? formatUsd(avgCphUsd) : "—"}</div>
            <div className="text-[10px] text-slate-500 font-medium tabular-nums">{avgCphTaxRp !== null ? formatRp(avgCphTaxRp) : "—"}</div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status Akun</div>
            <div className="mt-1 flex items-center gap-1.5 text-xs font-black">
              <span className="text-emerald-700">{statusSummary["Active"] || 0} Active</span>
              <span className="text-slate-300">•</span>
              <span className="text-slate-600">{statusSummary["OFF"] || 0} OFF</span>
            </div>
            <div className="text-[10px] text-slate-400 font-medium">{groups.length} Ad Account</div>
          </div>
        </div>
      )}

      {/* ── Compact Analyzer Card ─────────────────────────────────────────── */}
      {groups.length > 0 && (
        <CampaignAnalysisCard
          groups={groups}
          onApplyFilterPreset={handleApplyPreset}
          onSelectCampaign={(name) => setSearch(name)}
        />
      )}

      {/* ── Clean & Simple Filter Toolbar ─────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {/* Left Controls: Search, Selectors, Toggles */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">🔍</span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari Account, ID, Campaign..."
                className="h-8 w-56 sm:w-64 rounded-lg border border-slate-200 bg-slate-50/50 pl-7 pr-6 text-xs font-semibold outline-none focus:border-blue-500 focus:bg-white transition"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Account Selector */}
            <select
              value={filterAccount}
              onChange={(e) => setFilterAccount(e.target.value)}
              className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-700 outline-none focus:border-blue-500 transition"
            >
              <option value="ALL">Semua Account</option>
              {accountList.map((acc) => (
                <option key={acc} value={acc}>
                  {acc}
                </option>
              ))}
            </select>

            {/* Status Selector */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-700 outline-none focus:border-blue-500 transition"
            >
              <option value="ALL">Semua Status</option>
              <option value="Active">Active ({statusSummary["Active"] || 0})</option>
              <option value="OFF">OFF ({statusSummary["OFF"] || 0})</option>
              <option value="DISABLE">DISABLE</option>
              <option value="Not delivering">Not delivering</option>
              <option value="Not approved">Not approved</option>
              <option value="Deleted">Deleted</option>
            </select>

            {/* Hide OFF Toggle */}
            <button
              onClick={() => setHideOff(!hideOff)}
              className={`h-8 rounded-lg border px-2.5 text-xs font-bold transition flex items-center gap-1 ${
                hideOff
                  ? "border-slate-800 bg-slate-900 text-white"
                  : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              <span>{hideOff ? "✓" : ""}</span>
              <span>Hide OFF</span>
            </button>

            {/* Reset Button */}
            {isAnyFilterActive && (
              <button
                onClick={handleResetFilters}
                className="h-8 rounded-lg bg-rose-50 px-2.5 text-xs font-bold text-rose-700 hover:bg-rose-100 transition"
              >
                Reset ✕
              </button>
            )}
          </div>

          {/* Right Counter Summary */}
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
            <span className="rounded bg-slate-100 px-2 py-0.5 text-slate-700">
              {filteredGroups.length} Acc
            </span>
            <span className="rounded bg-slate-100 px-2 py-0.5 text-slate-700">
              {filteredCampaignsCount} Camp
            </span>
            {filteredSpent > 0 && (
              <span className="rounded bg-emerald-50 px-2 py-0.5 text-emerald-800 font-black tabular-nums">
                {formatUsd(filteredSpent)}
              </span>
            )}
          </div>
        </div>

        {/* Quick Filter Presets Strip */}
        <div className="mt-2 flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 text-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">Filter Cepat:</span>
          
          <button
            onClick={() => handleApplyPreset("ALL")}
            className={`rounded-md px-2 py-0.5 font-bold transition ${
              filterPreset === "ALL" && filterStatus === "ALL" && !hideOff
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Semua
          </button>

          <button
            onClick={() => handleApplyPreset("ACTIVE")}
            className={`rounded-md px-2 py-0.5 font-bold transition ${
              filterPreset === "ACTIVE" || filterStatus === "Active"
                ? "bg-emerald-600 text-white"
                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            }`}
          >
            Active Only
          </button>

          <button
            onClick={() => handleApplyPreset("OFF")}
            className={`rounded-md px-2 py-0.5 font-bold transition ${
              filterPreset === "OFF" || filterStatus === "OFF"
                ? "bg-slate-700 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            OFF Only
          </button>

          <button
            onClick={() => handleApplyPreset("SCALE")}
            className={`rounded-md px-2 py-0.5 font-bold transition ${
              filterPreset === "SCALE"
                ? "bg-emerald-700 text-white"
                : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
            }`}
          >
            🚀 Siap Scale
          </button>

          <button
            onClick={() => handleApplyPreset("CHEAPEST")}
            className={`rounded-md px-2 py-0.5 font-bold transition ${
              filterPreset === "CHEAPEST"
                ? "bg-cyan-600 text-white"
                : "bg-cyan-50 text-cyan-800 hover:bg-cyan-100"
            }`}
          >
            💎 Termurah (Low CPD)
          </button>

          <button
            onClick={() => handleApplyPreset("EXPENSIVE")}
            className={`rounded-md px-2 py-0.5 font-bold transition ${
              filterPreset === "EXPENSIVE"
                ? "bg-indigo-600 text-white"
                : "bg-indigo-50 text-indigo-800 hover:bg-indigo-100"
            }`}
          >
            🔥 Termahal
          </button>

          <button
            onClick={() => handleApplyPreset("ZERO_NDP")}
            className={`rounded-md px-2 py-0.5 font-bold transition ${
              filterPreset === "ZERO_NDP"
                ? "bg-rose-600 text-white"
                : "bg-rose-50 text-rose-800 hover:bg-rose-100"
            }`}
          >
            ⚠️ 0 NDP
          </button>
        </div>
      </div>

      {/* ── Main Report Table ─────────────────────────────────────────────── */}
      <div
        ref={reportRef}
        className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm"
      >
        {/* Title Banner */}
        <div className="bg-slate-900 border-b border-slate-800 py-2.5 text-center text-xs font-black tracking-[0.15em] text-white uppercase">
          {settings.reportTitle} {settings.reportDate}
        </div>

        {/* Table */}
        <table className="w-full border-collapse text-left uppercase text-xs">
          {/* Header */}
          <thead>
            <tr className="bg-slate-800 text-white">
              {COLS.map((col, i) => {
                const isSorted = col.field && sortField === col.field;
                return (
                  <th
                    key={i}
                    onClick={() => col.field && handleSort(col.field)}
                    className={`border border-slate-700 px-2.5 py-2 text-[10px] font-black uppercase tracking-wider text-white ${
                      col.field ? "cursor-pointer hover:bg-slate-700 select-none" : ""
                    } ${
                      col.align === "right"
                        ? "text-right"
                        : col.align === "center"
                        ? "text-center"
                        : "text-left"
                    } ${col.width}`}
                  >
                    <div className="flex items-center justify-center gap-1 leading-tight">
                      <span>{col.label}</span>
                      {col.field && (
                        <span className="text-[9px] text-slate-300">
                          {isSorted ? (sortDirection === "asc" ? "▲" : "▼") : "⇅"}
                        </span>
                      )}
                    </div>
                    {col.note && (
                      <div className="mt-0.5 text-[8px] font-normal text-slate-300/90 normal-case tracking-normal">
                        {col.note}
                      </div>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {filteredGroups.length === 0 ? (
              <tr>
                <td colSpan={14} className="py-12 text-center text-xs font-semibold text-slate-400">
                  <div className="flex flex-col items-center gap-1.5">
                    <span className="text-2xl">📭</span>
                    <span>
                      {groups.length === 0
                        ? "Belum ada data. Upload file Meta Ads & CRM di atas."
                        : "Tidak ada data campaign yang cocok dengan filter."}
                    </span>
                  </div>
                </td>
              </tr>
            ) : (
              filteredGroups.map((group, gIdx) =>
                group.items.map((item, rowIdx) => {
                  const isFirstRow = rowIdx === 0;
                  const isEvenGroup = gIdx % 2 === 0;
                  const rowBg = isEvenGroup ? "bg-white" : "bg-slate-50/50";
                  const normalizedItemStatus = normalizeStatus(item.status);

                  // Check if CPD REF is LOW (Low CPD = Great conversion / Winner efficiency)
                  const isLowCpd =
                    item.cpdRefRp !== null &&
                    item.ndp > 0 &&
                    (avgCpdRp ? item.cpdRefRp <= avgCpdRp : item.cpdRefRp <= 200000);

                  // Check if CPR REF is LOW (Low cost per registration)
                  const isLowCpr =
                    item.cprRefRp !== null &&
                    item.regis > 0 &&
                    (avgCprRp ? item.cprRefRp <= avgCprRp : item.cprRefRp <= 30000);

                  return (
                    <tr
                      key={item.id}
                      className={`border-b border-slate-100 transition-colors hover:bg-blue-50/30 ${rowBg}`}
                    >
                      {/* Account Cell */}
                      {isFirstRow && (
                        <td
                          rowSpan={group.items.length}
                          className="border-r border-slate-700 bg-slate-900 px-2.5 py-2 text-center align-middle"
                          style={{ minWidth: "130px" }}
                        >
                          <div className="text-[10px] font-black uppercase leading-snug text-white">
                            {group.account}
                          </div>
                          {group.accountId && (
                            <div className="mt-0.5 inline-block font-mono text-[8px] font-semibold text-slate-300 bg-slate-800 px-1 py-0.2 rounded">
                              {group.accountId}
                            </div>
                          )}
                          <div className="mt-1 text-[8px] font-medium text-slate-400">
                            {group.items.length} kampanye
                          </div>
                        </td>
                      )}

                      {/* Campaign Name */}
                      <td className="border-r border-slate-100 px-2.5 py-2">
                        <div className="text-[11px] font-semibold text-slate-800 leading-snug">
                          {item.campaignName}
                        </div>
                      </td>

                      {/* Budget */}
                      <td className="border-r border-slate-100 px-1 py-1.5 text-center">
                        <input
                          type="number"
                          value={item.budget || ""}
                          onChange={(e) =>
                            onUpdateRow(item.id, {
                              budget: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-14 rounded border border-transparent hover:border-slate-200 focus:border-blue-500 bg-transparent text-center text-[11px] font-semibold text-slate-600 outline-none tabular-nums"
                        />
                      </td>

                      {/* Spent */}
                      <td className="border-r border-slate-100 px-2.5 py-2 text-right">
                        <span className="text-xs font-bold text-slate-900 tabular-nums">
                          {formatUsd(item.spent)}
                        </span>
                      </td>

                      {/* Spent Tax Rp */}
                      <td className="border-r border-slate-100 px-2.5 py-2 text-right">
                        <span className="text-xs font-bold text-slate-900 tabular-nums">
                          {formatRp(item.spentTaxRp)}
                        </span>
                      </td>

                      {/* Results */}
                      <td className="border-r border-slate-100 px-2 py-2 text-center">
                        {item.results > 0 ? (
                          <NumBadge value={item.results} color="blue" />
                        ) : (
                          <span className="text-xs font-semibold text-slate-400">0</span>
                        )}
                      </td>

                      {/* CPH USD */}
                      <td className="border-r border-slate-100 px-2 py-2 text-center">
                        {item.cphUsd !== null ? (
                          <span className="inline-block rounded bg-slate-100 border border-slate-200 px-1.5 py-0.5 text-[11px] font-bold text-slate-800 tabular-nums">
                            {formatUsd(item.cphUsd)}
                          </span>
                        ) : (
                          <DivZero />
                        )}
                      </td>

                      {/* CPH Tax Rp */}
                      <td className="border-r border-slate-100 px-2 py-2 text-center">
                        {item.cphTaxRp !== null ? (
                          <span className="inline-block rounded bg-slate-100 border border-slate-200 px-1.5 py-0.5 text-[11px] font-bold text-slate-800 tabular-nums">
                            {formatRp(item.cphTaxRp)}
                          </span>
                        ) : (
                          <DivZero />
                        )}
                      </td>

                      {/* Regis */}
                      <td className="border-r border-slate-100 px-2 py-2 text-center">
                        {item.regis > 0 ? (
                          <NumBadge value={item.regis} color="amber" />
                        ) : (
                          <span className="text-xs font-semibold text-slate-400">0</span>
                        )}
                      </td>

                      {/* NDP */}
                      <td className="border-r border-slate-100 px-2 py-2 text-center">
                        {item.ndp > 0 ? (
                          <NumBadge value={item.ndp} color="green" />
                        ) : (
                          <span className="text-xs font-semibold text-slate-400">0</span>
                        )}
                      </td>

                      {/* CPR REF */}
                      <td className="border-r border-slate-100 px-2 py-2 text-center">
                        {item.cprRefRp !== null ? (
                          <span
                            className={`inline-block rounded px-1.5 py-0.5 text-[11px] font-black tabular-nums border ${
                              isLowCpr
                                ? "bg-amber-100 text-amber-900 border-amber-300 shadow-2xs"
                                : "bg-amber-50 text-amber-900 border-amber-200"
                            }`}
                            title={isLowCpr ? "CPR Rendah (Efisien)" : undefined}
                          >
                            {formatRp(item.cprRefRp)}
                          </span>
                        ) : (
                          <DivZero />
                        )}
                      </td>

                      {/* CPD REF (Highlighted when Low / Efisien) */}
                      <td className="border-r border-slate-100 px-2 py-2 text-center">
                        {item.cpdRefRp !== null ? (
                          <span
                            className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-black tabular-nums border ${
                              isLowCpd
                                ? "bg-emerald-600 text-white border-emerald-700 shadow-xs"
                                : "bg-slate-100 text-slate-800 border-slate-200"
                            }`}
                            title={isLowCpd ? "CPD Rendah / Biaya Akuisisi Efisien (Siap Scale!)" : "Biaya per NDP"}
                          >
                            {isLowCpd && <span className="text-[10px]">🔥</span>}
                            <span>{formatRp(item.cpdRefRp)}</span>
                          </span>
                        ) : (
                          <DivZero />
                        )}
                      </td>

                      {/* Status */}
                      <td className="border-r border-slate-100 px-1.5 py-2 text-center">
                        <select
                          value={normalizedItemStatus}
                          onChange={(e) =>
                            onUpdateRow(item.id, {
                              status: e.target.value as CampaignStatus,
                            })
                          }
                          className={`cursor-pointer rounded px-1.5 py-1 text-[9px] font-black outline-none border w-full ${
                            normalizedItemStatus === "Active"
                              ? "bg-emerald-600 text-white border-emerald-700 shadow-2xs"
                              : normalizedItemStatus === "OFF"
                              ? "bg-slate-700 text-white border-slate-800"
                              : normalizedItemStatus === "DISABLE"
                              ? "bg-rose-600 text-white border-rose-700"
                              : normalizedItemStatus === "Deleted"
                              ? "bg-rose-50 text-rose-700 border-rose-300"
                              : "bg-slate-100 text-slate-700 border-slate-300"
                          }`}
                        >
                          <option value="Active">Active</option>
                          <option value="OFF">OFF</option>
                          <option value="DISABLE">DISABLE</option>
                          <option value="Not delivering">Not delivering</option>
                          <option value="Not approved">Not approved</option>
                          <option value="Deleted">Deleted</option>
                          <option value="Completed">Completed</option>
                          <option value="Scheduled">Scheduled</option>
                          <option value="In draft">In draft</option>
                        </select>
                      </td>

                      {/* Ref Code */}
                      <td className="px-1.5 py-2 text-center">
                        <input
                          type="text"
                          value={item.refCode}
                          onChange={(e) =>
                            onUpdateRow(item.id, { refCode: e.target.value })
                          }
                          className="w-16 rounded border border-slate-200 bg-slate-50 px-1 py-1 text-center text-[11px] font-black text-slate-800 outline-none hover:border-slate-300 focus:bg-white focus:border-blue-500 transition"
                        />
                      </td>
                    </tr>
                  );
                })
              )
            )}
          </tbody>

          {/* Footer */}
          {filteredGroups.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-slate-400 bg-slate-100 font-bold text-slate-900">
                <td colSpan={2} className="border-r border-slate-300 px-3 py-2.5 text-[11px] font-black uppercase text-slate-800">
                  TOTAL ({filteredCampaignsCount} CAMPAIGNS)
                </td>
                <td className="border-r border-slate-300 text-center text-slate-400 font-bold">—</td>
                <td className="border-r border-slate-300 px-2.5 py-2.5 text-right font-black text-blue-700 tabular-nums">
                  {formatUsd(filteredSpent)}
                </td>
                <td className="border-r border-slate-300 px-2.5 py-2.5 text-right font-black text-blue-700 tabular-nums">
                  {formatRp(filteredSpentTax)}
                </td>
                <td className="border-r border-slate-300 text-center">
                  <NumBadge value={filteredResults} color="blue" />
                </td>
                <td className="border-r border-slate-300 text-center">
                  {filteredResults > 0 ? (
                    <span className="inline-block rounded bg-slate-200/80 px-1.5 py-0.5 text-[11px] font-bold text-slate-800 tabular-nums">
                      {formatUsd(filteredSpent / filteredResults)}
                    </span>
                  ) : (
                    <DivZero />
                  )}
                </td>
                <td className="border-r border-slate-300 text-center">
                  {filteredResults > 0 ? (
                    <span className="inline-block rounded bg-slate-200/80 px-1.5 py-0.5 text-[11px] font-bold text-slate-800 tabular-nums">
                      {formatRp(Math.round(filteredSpentTax / filteredResults))}
                    </span>
                  ) : (
                    <DivZero />
                  )}
                </td>
                <td className="border-r border-slate-300 text-center">
                  <NumBadge value={filteredRegis} color="amber" />
                </td>
                <td className="border-r border-slate-300 text-center">
                  <NumBadge value={filteredNdp} color="green" />
                </td>
                <td className="border-r border-slate-300 text-center">
                  {filteredRegis > 0 ? (
                    <span className="inline-block rounded bg-amber-100 border border-amber-300 px-1.5 py-0.5 text-[11px] font-black text-amber-950 tabular-nums">
                      {formatRp(Math.round(filteredSpentTax / filteredRegis))}
                    </span>
                  ) : (
                    <DivZero />
                  )}
                </td>
                <td className="border-r border-slate-300 text-center">
                  {filteredNdp > 0 ? (
                    <span className="inline-block rounded bg-emerald-600 border border-emerald-700 text-white px-2 py-0.5 text-[11px] font-black tabular-nums shadow-xs">
                      {formatRp(Math.round(filteredSpentTax / filteredNdp))}
                    </span>
                  ) : (
                    <DivZero />
                  )}
                </td>
                <td colSpan={2} className="px-2 py-2.5" />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
