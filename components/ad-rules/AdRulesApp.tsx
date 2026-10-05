"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  AdAccount,
  AdRule,
  RulePreset,
  RuleMetric,
  RuleConditionOperator,
  RuleAction,
  RuleLevel,
  RuleTimeWindow,
  RuleCondition,
  ApplyRuleResult,
} from "@/types/ad-rules";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import FacebookLoginButton from "@/components/auth/FacebookLoginButton";

// ──────────────────────────────────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────────────────────────────────
const PRESET_CONTENT_TEST: Omit<
  AdRule,
  "id" | "accountIds" | "createdAt" | "updatedAt" | "preset"
> = {
  name: "📸 Tes Konten – Matikan jika Spend > $8",
  enabled: true,
  conditions: [{ metric: "spend", operator: "GREATER_THAN", value: 8 }],
  action: "PAUSE_AD",
  level: "AD",
  timeWindow: "today",
  triggeredCount: 0,
  lastRunAt: null,
  lastResult: null,
};

const PRESET_CPR_GUARD: Omit<
  AdRule,
  "id" | "accountIds" | "createdAt" | "updatedAt" | "preset"
> = {
  name: "🛡️ Jaga CPR – Matikan jika CPR > $3.5",
  enabled: true,
  conditions: [{ metric: "cpr", operator: "GREATER_THAN", value: 3.5 }],
  action: "PAUSE_AD",
  level: "AD",
  timeWindow: "today",
  triggeredCount: 0,
  lastRunAt: null,
  lastResult: null,
};

const METRIC_LABELS: Record<RuleMetric, string> = {
  spend: "Spend ($)",
  cpr: "CPR – Cost per Result ($)",
  cpc: "CPC – Cost per Click ($)",
  cpm: "CPM ($)",
  ctr: "CTR (%)",
  impressions: "Impressions",
  results: "Results / Registrasi",
};

const OPERATOR_LABELS: Record<RuleConditionOperator, string> = {
  GREATER_THAN: ">",
  GREATER_THAN_OR_EQUAL: ">=",
  LESS_THAN: "<",
  LESS_THAN_OR_EQUAL: "<=",
  EQUALS: "=",
};

const ACTION_LABELS: Record<RuleAction, string> = {
  PAUSE_AD: "⏸ Matikan Ad",
  PAUSE_ADSET: "⏸ Matikan Ad Set",
  PAUSE_CAMPAIGN: "⏸ Matikan Campaign",
  SEND_NOTIFICATION: "🔔 Kirim Notifikasi Saja",
};

const LEVEL_LABELS: Record<RuleLevel, string> = {
  AD: "Ad Level",
  ADSET: "Ad Set Level",
  CAMPAIGN: "Campaign Level",
};

const TIME_LABELS: Record<RuleTimeWindow, string> = {
  today: "Hari Ini",
  last_3d: "3 Hari Terakhir",
  last_7d: "7 Hari Terakhir",
  this_month: "Bulan Ini",
};

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────
function genId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : String(Date.now() + Math.random());
}

function makeRule(
  preset: RulePreset,
  accountIds: string[],
  base: Omit<AdRule, "id" | "accountIds" | "createdAt" | "updatedAt" | "preset">
): AdRule {
  const now = new Date().toISOString();
  return {
    ...base,
    id: genId(),
    preset,
    accountIds,
    createdAt: now,
    updatedAt: now,
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// Sub-components
// ──────────────────────────────────────────────────────────────────────────────

function StatusBadge({ enabled }: { enabled: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
        enabled
          ? "bg-emerald-100 text-emerald-700"
          : "bg-slate-100 text-slate-500"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          enabled ? "bg-emerald-500" : "bg-slate-400"
        }`}
      />
      {enabled ? "Aktif" : "Nonaktif"}
    </span>
  );
}

interface ConditionEditorProps {
  conditions: RuleCondition[];
  onChange: (conds: RuleCondition[]) => void;
}
function ConditionEditor({ conditions, onChange }: ConditionEditorProps) {
  const addCondition = () => {
    onChange([
      ...conditions,
      { metric: "spend", operator: "GREATER_THAN", value: 0 },
    ]);
  };
  const removeCondition = (i: number) => {
    onChange(conditions.filter((_, idx) => idx !== i));
  };
  const updateCondition = (
    i: number,
    field: keyof RuleCondition,
    value: string | number
  ) => {
    onChange(
      conditions.map((c, idx) =>
        idx === i ? { ...c, [field]: value } : c
      )
    );
  };

  return (
    <div className="space-y-2">
      {conditions.map((cond, i) => (
        <div
          key={i}
          className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3"
        >
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wide min-w-[30px]">
            {i === 0 ? "JIKA" : "DAN"}
          </span>
          <select
            value={cond.metric}
            onChange={(e) =>
              updateCondition(i, "metric", e.target.value as RuleMetric)
            }
            className="flex-1 min-w-[160px] h-9 rounded-lg border border-slate-300 bg-white px-2 text-sm text-slate-800 outline-none focus:border-blue-500"
          >
            {(Object.keys(METRIC_LABELS) as RuleMetric[]).map((m) => (
              <option key={m} value={m}>
                {METRIC_LABELS[m]}
              </option>
            ))}
          </select>
          <select
            value={cond.operator}
            onChange={(e) =>
              updateCondition(
                i,
                "operator",
                e.target.value as RuleConditionOperator
              )
            }
            className="w-[72px] h-9 rounded-lg border border-slate-300 bg-white px-2 text-sm text-center font-bold text-slate-800 outline-none focus:border-blue-500"
          >
            {(Object.keys(OPERATOR_LABELS) as RuleConditionOperator[]).map(
              (op) => (
                <option key={op} value={op}>
                  {OPERATOR_LABELS[op]}
                </option>
              )
            )}
          </select>
          <input
            type="number"
            step="0.01"
            value={cond.value}
            onChange={(e) =>
              updateCondition(i, "value", parseFloat(e.target.value) || 0)
            }
            className="w-24 h-9 rounded-lg border border-slate-300 bg-white px-2 text-sm text-slate-800 outline-none focus:border-blue-500"
          />
          <button
            onClick={() => removeCondition(i)}
            className="ml-auto h-9 w-9 flex items-center justify-center rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition"
          >
            ×
          </button>
        </div>
      ))}
      <button
        onClick={addCondition}
        className="flex items-center gap-1.5 rounded-lg border border-dashed border-blue-300 px-3 py-2 text-xs font-bold text-blue-600 hover:bg-blue-50 transition w-full justify-center"
      >
        + Tambah Kondisi
      </button>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Rule Form Modal
// ──────────────────────────────────────────────────────────────────────────────
interface RuleFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (rule: AdRule) => void;
  accounts: AdAccount[];
  editingRule?: AdRule | null;
}

function RuleFormModal({
  isOpen,
  onClose,
  onSave,
  accounts,
  editingRule,
}: RuleFormModalProps) {
  const [name, setName] = useState("");
  const [preset, setPreset] = useState<RulePreset>("custom");
  const [conditions, setConditions] = useState<RuleCondition[]>([
    { metric: "spend", operator: "GREATER_THAN", value: 0 },
  ]);
  const [action, setAction] = useState<RuleAction>("PAUSE_AD");
  const [level, setLevel] = useState<RuleLevel>("AD");
  const [timeWindow, setTimeWindow] = useState<RuleTimeWindow>("today");
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [enabled, setEnabled] = useState(true);

  // Populate when editing
  useEffect(() => {
    if (editingRule) {
      setName(editingRule.name);
      setPreset(editingRule.preset);
      setConditions(editingRule.conditions);
      setAction(editingRule.action);
      setLevel(editingRule.level);
      setTimeWindow(editingRule.timeWindow);
      setSelectedAccountIds(editingRule.accountIds);
      setEnabled(editingRule.enabled);
    } else {
      setName("");
      setPreset("custom");
      setConditions([{ metric: "spend", operator: "GREATER_THAN", value: 0 }]);
      setAction("PAUSE_AD");
      setLevel("AD");
      setTimeWindow("today");
      setSelectedAccountIds(accounts.map((a) => a.id));
      setEnabled(true);
    }
  }, [editingRule, accounts, isOpen]);

  const applyPreset = (p: RulePreset) => {
    setPreset(p);
    if (p === "content_test") {
      setName(PRESET_CONTENT_TEST.name);
      setConditions(PRESET_CONTENT_TEST.conditions);
      setAction(PRESET_CONTENT_TEST.action);
      setLevel(PRESET_CONTENT_TEST.level);
      setTimeWindow(PRESET_CONTENT_TEST.timeWindow);
    } else if (p === "cpr_guard") {
      setName(PRESET_CPR_GUARD.name);
      setConditions(PRESET_CPR_GUARD.conditions);
      setAction(PRESET_CPR_GUARD.action);
      setLevel(PRESET_CPR_GUARD.level);
      setTimeWindow(PRESET_CPR_GUARD.timeWindow);
    }
  };

  const toggleAccount = (id: string) => {
    setSelectedAccountIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSave = () => {
    if (!name.trim()) {
      alert("Nama rule wajib diisi.");
      return;
    }
    if (conditions.length === 0) {
      alert("Minimal 1 kondisi harus ditambahkan.");
      return;
    }
    if (selectedAccountIds.length === 0) {
      alert("Pilih minimal 1 Ad Account.");
      return;
    }

    const now = new Date().toISOString();
    const rule: AdRule = {
      id: editingRule?.id || genId(),
      name: name.trim(),
      preset,
      enabled,
      accountIds: selectedAccountIds,
      conditions,
      action,
      level,
      timeWindow,
      createdAt: editingRule?.createdAt || now,
      updatedAt: now,
      triggeredCount: editingRule?.triggeredCount || 0,
      lastRunAt: editingRule?.lastRunAt || null,
      lastResult: editingRule?.lastResult || null,
    };
    onSave(rule);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 backdrop-blur-sm p-4 pt-10">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-base font-black text-slate-900">
              {editingRule ? "Edit Rule" : "Buat Rule Baru"}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Atur kondisi otomatis untuk mematikan / memantau iklan
            </p>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition text-lg"
          >
            ×
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Preset Picker */}
          <div>
            <p className="mb-2 text-xs font-bold text-slate-600 uppercase tracking-wide">
              Template Cepat
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {(
                [
                  {
                    key: "content_test",
                    label: "📸 Tes Konten",
                    desc: "Spend > $8 → Ad OFF",
                    color: "orange",
                  },
                  {
                    key: "cpr_guard",
                    label: "🛡️ Jaga CPR",
                    desc: "CPR > $3.5 → Ad OFF",
                    color: "red",
                  },
                  {
                    key: "custom",
                    label: "✏️ Custom",
                    desc: "Buat kondisi sendiri",
                    color: "blue",
                  },
                ] as const
              ).map((p) => (
                <button
                  key={p.key}
                  onClick={() => applyPreset(p.key)}
                  className={`rounded-xl border-2 p-3 text-left transition ${
                    preset === p.key
                      ? p.color === "orange"
                        ? "border-orange-400 bg-orange-50"
                        : p.color === "red"
                        ? "border-red-400 bg-red-50"
                        : "border-blue-400 bg-blue-50"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                >
                  <div className="text-sm font-bold text-slate-800">
                    {p.label}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">{p.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Rule Name */}
          <div>
            <label className="text-sm font-bold text-slate-700 block mb-1">
              Nama Rule
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Matikan Ad jika Spend > $8"
              className="w-full h-10 rounded-xl border border-slate-300 px-3 text-sm text-slate-800 outline-none focus:border-blue-500 transition"
            />
          </div>

          {/* Conditions */}
          <div>
            <label className="text-sm font-bold text-slate-700 block mb-2">
              Kondisi (AND logic)
            </label>
            <ConditionEditor
              conditions={conditions}
              onChange={setConditions}
            />
          </div>

          {/* Action / Level / TimeWindow */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1 uppercase tracking-wide">
                Aksi
              </label>
              <select
                value={action}
                onChange={(e) => setAction(e.target.value as RuleAction)}
                className="w-full h-10 rounded-xl border border-slate-300 px-3 text-sm text-slate-800 outline-none focus:border-blue-500 bg-white"
              >
                {(Object.keys(ACTION_LABELS) as RuleAction[]).map((a) => (
                  <option key={a} value={a}>
                    {ACTION_LABELS[a]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1 uppercase tracking-wide">
                Level
              </label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value as RuleLevel)}
                className="w-full h-10 rounded-xl border border-slate-300 px-3 text-sm text-slate-800 outline-none focus:border-blue-500 bg-white"
              >
                {(Object.keys(LEVEL_LABELS) as RuleLevel[]).map((l) => (
                  <option key={l} value={l}>
                    {LEVEL_LABELS[l]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1 uppercase tracking-wide">
                Rentang Waktu
              </label>
              <select
                value={timeWindow}
                onChange={(e) => setTimeWindow(e.target.value as RuleTimeWindow)}
                className="w-full h-10 rounded-xl border border-slate-300 px-3 text-sm text-slate-800 outline-none focus:border-blue-500 bg-white"
              >
                {(Object.keys(TIME_LABELS) as RuleTimeWindow[]).map((t) => (
                  <option key={t} value={t}>
                    {TIME_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Account Selection */}
          {accounts.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-bold text-slate-700">
                  Ad Account yang Diterapkan
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      setSelectedAccountIds(accounts.map((a) => a.id))
                    }
                    className="text-xs font-bold text-blue-600 hover:underline"
                  >
                    Pilih Semua
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    onClick={() => setSelectedAccountIds([])}
                    className="text-xs font-bold text-slate-500 hover:underline"
                  >
                    Hapus Semua
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto rounded-xl border border-slate-200 p-3">
                {accounts.map((acc) => {
                  const isSelected = selectedAccountIds.includes(acc.id);
                  return (
                    <button
                      key={acc.id}
                      onClick={() => toggleAccount(acc.id)}
                      className={`flex items-center gap-2.5 rounded-lg border p-2.5 text-left transition ${
                        isSelected
                          ? "border-blue-300 bg-blue-50"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <div
                        className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border-2 transition ${
                          isSelected
                            ? "border-blue-600 bg-blue-600"
                            : "border-slate-300 bg-white"
                        }`}
                      >
                        {isSelected && (
                          <svg
                            className="h-3 w-3 text-white"
                            viewBox="0 0 12 12"
                            fill="none"
                          >
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
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-800 truncate">
                          {acc.name}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {acc.id}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
              <p className="mt-1 text-xs text-slate-400">
                {selectedAccountIds.length} dari {accounts.length} akun dipilih
              </p>
            </div>
          )}

          {/* Status Toggle */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setEnabled((prev) => !prev)}
              className={`relative h-6 w-11 rounded-full transition-colors ${
                enabled ? "bg-blue-600" : "bg-slate-300"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  enabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
            <span className="text-sm font-semibold text-slate-700">
              {enabled ? "Rule Aktif" : "Rule Nonaktif"}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-4">
          <button
            onClick={onClose}
            className="h-10 rounded-xl border border-slate-300 px-5 text-sm font-bold text-slate-600 hover:bg-slate-50 transition"
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            className="h-10 rounded-xl bg-blue-600 px-6 text-sm font-bold text-white shadow-sm hover:bg-blue-700 transition"
          >
            {editingRule ? "Simpan Perubahan" : "Buat Rule"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Rule Card
// ──────────────────────────────────────────────────────────────────────────────
interface RuleCardProps {
  rule: AdRule;
  accounts: AdAccount[];
  accessToken: string;
  onEdit: (rule: AdRule) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
  onRun: (rule: AdRule) => Promise<void>;
  onPushToMeta?: (rule: AdRule) => Promise<void>;
  isRunning: boolean;
  lastResult?: ApplyRuleResult | null;
}

function RuleCard({
  rule,
  accounts,
  onEdit,
  onDelete,
  onToggle,
  onRun,
  onPushToMeta,
  isRunning,
  lastResult,
}: RuleCardProps) {
  const [isPushing, setIsPushing] = useState(false);
  const linkedAccounts = accounts.filter((a) =>
    rule.accountIds.includes(a.id)
  );

  const presetColor =
    rule.preset === "content_test"
      ? { bg: "bg-orange-50", border: "border-orange-200", badge: "bg-orange-100 text-orange-700" }
      : rule.preset === "cpr_guard"
      ? { bg: "bg-red-50", border: "border-red-200", badge: "bg-red-100 text-red-700" }
      : { bg: "bg-blue-50", border: "border-blue-200", badge: "bg-blue-100 text-blue-700" };

  const presetLabel =
    rule.preset === "content_test"
      ? "Tes Konten"
      : rule.preset === "cpr_guard"
      ? "Jaga CPR"
      : "Custom";

  return (
    <div
      className={`rounded-2xl border-2 ${presetColor.border} ${
        rule.enabled ? "" : "opacity-60"
      } bg-white shadow-sm overflow-hidden`}
    >
      {/* Top accent bar */}
      <div
        className={`h-1 w-full ${
          rule.preset === "content_test"
            ? "bg-gradient-to-r from-orange-400 to-amber-400"
            : rule.preset === "cpr_guard"
            ? "bg-gradient-to-r from-red-500 to-rose-400"
            : "bg-gradient-to-r from-blue-500 to-indigo-500"
        }`}
      />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${presetColor.badge}`}
              >
                {presetLabel}
              </span>
              <StatusBadge enabled={rule.enabled} />
            </div>
            <h3 className="mt-1.5 text-sm font-black text-slate-900 leading-snug">
              {rule.name}
            </h3>
          </div>
          {/* Toggle */}
          <button
            onClick={() => onToggle(rule.id)}
            className={`relative mt-0.5 h-6 w-11 flex-shrink-0 rounded-full transition-colors ${
              rule.enabled ? "bg-blue-600" : "bg-slate-300"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                rule.enabled ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* Conditions */}
        <div className="mb-3 space-y-1.5">
          {rule.conditions.map((cond, i) => (
            <div
              key={i}
              className="flex items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs"
            >
              <span className="text-slate-400 font-medium">
                {i === 0 ? "Jika" : "Dan"}
              </span>
              <span className="font-bold text-slate-700">
                {METRIC_LABELS[cond.metric]}
              </span>
              <span className="font-black text-slate-800">
                {OPERATOR_LABELS[cond.operator]}
              </span>
              <span className="font-black text-blue-700">{cond.value}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs">
            <span className="text-slate-400 font-medium">Maka</span>
            <span className="font-bold text-slate-700">
              {ACTION_LABELS[rule.action]}
            </span>
            <span className="ml-auto text-slate-400 font-medium">
              {LEVEL_LABELS[rule.level]} · {TIME_LABELS[rule.timeWindow]}
            </span>
          </div>
        </div>

        {/* Accounts */}
        <div className="mb-4">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1.5">
            Ad Account ({linkedAccounts.length})
          </p>
          <div className="flex flex-wrap gap-1">
            {linkedAccounts.slice(0, 3).map((acc) => (
              <span
                key={acc.id}
                className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-600 truncate max-w-[140px]"
                title={acc.name}
              >
                {acc.name}
              </span>
            ))}
            {linkedAccounts.length > 3 && (
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                +{linkedAccounts.length - 3} lagi
              </span>
            )}
          </div>
        </div>

        {/* Last result */}
        {lastResult && lastResult.affectedItems.length > 0 && (
          <div className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 p-2.5">
            <p className="text-xs font-bold text-emerald-700 mb-1">
              ✅ Terakhir Dijalankan: {lastResult.triggeredCount} item terpengaruh
            </p>
            <div className="space-y-1 max-h-24 overflow-y-auto">
              {lastResult.affectedItems.slice(0, 5).map((item, i) => (
                <div key={i} className="flex items-center gap-1.5 text-[11px]">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      item.success ? "bg-emerald-400" : "bg-red-400"
                    }`}
                  />
                  <span className="text-slate-600 truncate flex-1">
                    {item.name}
                  </span>
                  <span className="text-slate-400 font-mono">
                    {item.metric}={item.metricValue.toFixed(2)}
                  </span>
                </div>
              ))}
              {lastResult.affectedItems.length > 5 && (
                <p className="text-[11px] text-slate-400">
                  +{lastResult.affectedItems.length - 5} item lainnya…
                </p>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onRun(rule)}
              disabled={isRunning || !rule.enabled}
              className="flex-1 h-9 rounded-xl bg-blue-600 text-xs font-bold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-1.5"
            >
              {isRunning ? (
                <>
                  <span className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  Menjalankan…
                </>
              ) : (
                "▶ Eksekusi Sekarang"
              )}
            </button>
            <button
              onClick={() => onEdit(rule)}
              className="h-9 w-9 flex items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition text-sm"
              title="Edit"
            >
              ✏️
            </button>
            <button
              onClick={() => {
                if (
                  window.confirm(
                    `Hapus rule "${rule.name}"? Tindakan ini tidak bisa dibatalkan.`
                  )
                ) {
                  onDelete(rule.id);
                }
              }}
              className="h-9 w-9 flex items-center justify-center rounded-xl border border-red-100 text-red-400 hover:bg-red-50 hover:text-red-600 transition text-sm"
              title="Hapus"
            >
              🗑️
            </button>
          </div>

          {onPushToMeta && (
            <button
              onClick={async () => {
                setIsPushing(true);
                await onPushToMeta(rule);
                setIsPushing(false);
              }}
              disabled={isPushing}
              className="w-full h-8 rounded-lg border border-purple-200 bg-purple-50 text-[11px] font-bold text-purple-700 hover:bg-purple-100 transition flex items-center justify-center gap-1"
              title="Sync & Daftarkan Rule ini ke Meta Ads Manager (Automated Rules)"
            >
              {isPushing ? "Menyinkronkan…" : "📤 Sync & Daftarkan ke Meta Ads Manager"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Main AdRulesApp Component
// ──────────────────────────────────────────────────────────────────────────────
const LS_RULES_KEY = "meta_ad_rules_v1";
const LS_TOKEN_KEY = "meta_report_autosync_settings";

export default function AdRulesApp() {
  const { fbAccessToken } = useAuth();
  const [accessToken, setAccessToken] = useState("");
  const [businessId, setBusinessId] = useState("");
  const [accounts, setAccounts] = useState<AdAccount[]>([]);
  const [isFetchingAccounts, setIsFetchingAccounts] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [rules, setRules] = useState<AdRule[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AdRule | null>(null);
  const [runningRuleId, setRunningRuleId] = useState<string | null>(null);
  const [ruleResults, setRuleResults] = useState<Record<string, ApplyRuleResult>>({});
  const [globalStatus, setGlobalStatus] = useState<{
    msg: string;
    type: "success" | "error" | "info";
  } | null>(null);

  // Auto-populate token from Facebook login session if available
  useEffect(() => {
    if (fbAccessToken) {
      setAccessToken(fbAccessToken);
    }
  }, [fbAccessToken]);

  // Load token from existing autosync settings
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_TOKEN_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.meta?.accessToken) {
          setAccessToken((prev) => prev || parsed.meta.accessToken);
        }
      }
    } catch (_) {}

    try {
      const savedRules = localStorage.getItem(LS_RULES_KEY);
      if (savedRules) {
        setRules(JSON.parse(savedRules));
      }
    } catch (_) {}
  }, []);

  // Persist rules to localStorage
  const persistRules = useCallback((newRules: AdRule[]) => {
    setRules(newRules);
    try {
      localStorage.setItem(LS_RULES_KEY, JSON.stringify(newRules));
    } catch (_) {}
  }, []);

  const showStatus = (msg: string, type: "success" | "error" | "info") => {
    setGlobalStatus({ msg, type });
    setTimeout(() => setGlobalStatus(null), 5000);
  };

  // Fetch Ad Accounts
  const handleFetchAccounts = async () => {
    if (!accessToken.trim()) {
      setFetchError("Masukkan Meta Access Token terlebih dahulu.");
      return;
    }
    setFetchError("");
    setIsFetchingAccounts(true);
    setAccounts([]);

    try {
      const res = await fetch("/api/sync/meta/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessToken: accessToken.trim(),
          businessId: businessId.trim() || undefined,
        }),
      });
      const data = await res.json();

      if (data.success && Array.isArray(data.data)) {
        const activeAccounts = data.data.filter(
          (a: AdAccount) => a.status === "ACTIVE"
        );
        setAccounts(activeAccounts);
        showStatus(
          `✅ ${activeAccounts.length} Ad Account aktif berhasil dimuat`,
          "success"
        );
      } else {
        setFetchError(data.error || "Gagal memuat Ad Account.");
      }
    } catch (err) {
      setFetchError(
        err instanceof Error ? err.message : "Terjadi kesalahan jaringan."
      );
    } finally {
      setIsFetchingAccounts(false);
    }
  };

  // Save rule
  const handleSaveRule = (rule: AdRule) => {
    const exists = rules.some((r) => r.id === rule.id);
    let updated: AdRule[];
    if (exists) {
      updated = rules.map((r) => (r.id === rule.id ? rule : r));
    } else {
      updated = [rule, ...rules];
    }
    persistRules(updated);
    showStatus(exists ? "✅ Rule berhasil diperbarui" : "✅ Rule baru berhasil dibuat", "success");
  };

  const handleDeleteRule = (id: string) => {
    persistRules(rules.filter((r) => r.id !== id));
    showStatus("🗑️ Rule berhasil dihapus", "info");
  };

  const handleToggleRule = (id: string) => {
    const updated = rules.map((r) =>
      r.id === id ? { ...r, enabled: !r.enabled, updatedAt: new Date().toISOString() } : r
    );
    persistRules(updated);
  };

  // Run a rule
  const handleRunRule = async (rule: AdRule) => {
    if (!accessToken.trim()) {
      showStatus("❌ Masukkan Meta Access Token terlebih dahulu.", "error");
      return;
    }

    setRunningRuleId(rule.id);
    showStatus(`▶ Menjalankan rule "${rule.name}"…`, "info");

    try {
      const res = await fetch("/api/ad-rules/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken: accessToken.trim(), rule }),
      });
      const data = await res.json();

      if (data.success && data.data) {
        const result: ApplyRuleResult = data.data;
        setRuleResults((prev) => ({ ...prev, [rule.id]: result }));

        // Update rule metadata
        const updated = rules.map((r) =>
          r.id === rule.id
            ? {
                ...r,
                lastRunAt: new Date().toISOString(),
                triggeredCount: (r.triggeredCount || 0) + result.triggeredCount,
                lastResult: `${result.triggeredCount} item terpengaruh`,
                updatedAt: new Date().toISOString(),
              }
            : r
        );
        persistRules(updated);

        showStatus(
          `✅ Rule selesai dijalankan: ${result.triggeredCount} item terpengaruh`,
          "success"
        );
      } else {
        showStatus(`❌ ${data.error || "Gagal menjalankan rule."}`, "error");
      }
    } catch (err) {
      showStatus(
        `❌ ${err instanceof Error ? err.message : "Error tidak diketahui"}`,
        "error"
      );
    } finally {
      setRunningRuleId(null);
    }
  };

  // Push rule to Meta's native adrules_library so it shows up in Meta Ads Manager UI
  const handlePushToMeta = async (rule: AdRule) => {
    if (!accessToken.trim()) {
      showStatus("❌ Masukkan Meta Access Token terlebih dahulu.", "error");
      return;
    }

    showStatus(`📤 Menyinkronkan rule "${rule.name}" ke Meta Ads Manager…`, "info");

    try {
      const res = await fetch("/api/ad-rules/sync-meta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken: accessToken.trim(), rule }),
      });
      const data = await res.json();

      if (data.success) {
        showStatus(
          data.msg || "✅ Rule berhasil didaftarkan langsung ke Meta Ads Manager!",
          "success"
        );
      } else {
        showStatus(`❌ ${data.error || data.msg || "Gagal sync ke Meta."}`, "error");
      }
    } catch (err) {
      showStatus(
        `❌ ${err instanceof Error ? err.message : "Error jaringan"}`,
        "error"
      );
    }
  };

  // Run all enabled rules sequentially
  const handleRunAllRules = async () => {
    const enabledRules = rules.filter((r) => r.enabled);
    if (!enabledRules.length) {
      showStatus("Tidak ada rule aktif untuk dijalankan.", "info");
      return;
    }
    showStatus(`▶ Menjalankan ${enabledRules.length} rule…`, "info");
    for (const rule of enabledRules) {
      await handleRunRule(rule);
    }
    showStatus("✅ Semua rule selesai dijalankan.", "success");
  };

  const handleAddPreset = (preset: "content_test" | "cpr_guard") => {
    const allIds = accounts.map((a) => a.id);
    const base = preset === "content_test" ? PRESET_CONTENT_TEST : PRESET_CPR_GUARD;
    const rule = makeRule(preset, allIds, base);
    const updated = [rule, ...rules];
    persistRules(updated);
    showStatus(`✅ Rule "${rule.name}" berhasil ditambahkan!`, "success");
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 pb-16">
      <div className="mx-auto w-full max-w-[1400px] px-4 py-5 sm:px-6 lg:px-8">
        {/* ── Navbar ─────────────────────────────────────────── */}
        <div className="mb-5 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-sm font-black text-white">
              M
            </span>
            <div>
              <h1 className="text-xl font-black tracking-tight text-slate-900">
                Meta Ads Report
              </h1>
              <p className="text-xs text-slate-500">Ad Rules – Otomasi Iklan Cerdas</p>
            </div>
          </div>

          {/* Page Navigation */}
          <div className="flex items-center rounded-xl bg-slate-100 p-1">
            <Link
              href="/"
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition"
            >
              📊 Report Account
            </Link>
            <Link
              href="/report-campaign"
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition"
            >
              🎯 Report Campaign
            </Link>
            <span className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold bg-white text-blue-600 shadow-sm">
              ⚙️ Ad Rules
            </span>
          </div>

          {rules.filter((r) => r.enabled).length > 0 && (
            <button
              onClick={handleRunAllRules}
              disabled={runningRuleId !== null}
              className="h-10 rounded-xl bg-emerald-600 px-5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 transition flex items-center gap-2"
            >
              {runningRuleId ? (
                <>
                  <span className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  Running…
                </>
              ) : (
                <>▶▶ Jalankan Semua Rule</>
              )}
            </button>
          )}
        </div>

        {/* ── Global Status Toast ─────────────────────────────── */}
        {globalStatus && (
          <div
            className={`mb-4 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition-all ${
              globalStatus.type === "success"
                ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                : globalStatus.type === "error"
                ? "border-red-300 bg-red-50 text-red-800"
                : "border-blue-300 bg-blue-50 text-blue-800"
            }`}
          >
            {globalStatus.msg}
            <button
              onClick={() => setGlobalStatus(null)}
              className="ml-auto text-slate-400 hover:text-slate-600"
            >
              ×
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[380px_1fr]">
          {/* ── Left Panel: Token + Accounts ─────────────────── */}
          <div className="space-y-4">
            {/* Token Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-sm">
                  🔑
                </span>
                <div>
                  <h2 className="text-sm font-black text-slate-900">
                    Meta Access Token
                  </h2>
                  <p className="text-xs text-slate-500">
                    Untuk fetch Ad Account aktif
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Meta Access Token
                  </label>
                  <textarea
                    value={accessToken}
                    onChange={(e) => setAccessToken(e.target.value)}
                    placeholder="EAAxxxxxxxxxxxxxxx..."
                    rows={3}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-mono text-slate-800 outline-none focus:border-blue-500 transition resize-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Business Manager (BM) ID <span className="text-slate-400 font-normal">(Opsional)</span>
                  </label>
                  <input
                    type="text"
                    value={businessId}
                    onChange={(e) => setBusinessId(e.target.value)}
                    placeholder="Contoh: 123456789012345"
                    className="w-full h-9 rounded-xl border border-slate-300 px-3 text-xs font-mono text-slate-800 outline-none focus:border-blue-500 transition"
                  />
                </div>

                {fetchError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                    ❌ {fetchError}
                  </div>
                )}

                <button
                  onClick={handleFetchAccounts}
                  disabled={isFetchingAccounts}
                  className="w-full h-10 rounded-xl bg-blue-600 text-sm font-bold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
                >
                  {isFetchingAccounts ? (
                    <>
                      <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      Memuat Akun…
                    </>
                  ) : (
                    "🔍 Fetch Ad Accounts Aktif"
                  )}
                </button>
              </div>
            </div>

            {/* Accounts List */}
            {accounts.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-black text-slate-900">
                    Ad Account Aktif
                  </h2>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">
                    {accounts.length} akun
                  </span>
                </div>
                <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                  {accounts.map((acc) => (
                    <div
                      key={acc.id}
                      className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5"
                    >
                      <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-blue-600 text-xs font-black text-white">
                        {acc.name.charAt(0).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">
                          {acc.name}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          {acc.id} · {acc.currency}
                        </p>
                      </div>
                      <span className="ml-auto flex-shrink-0 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600">
                        ●
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Add Presets */}
            {accounts.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-sm font-black text-slate-900 mb-1">
                  Tambah Rule Cepat
                </h2>
                <p className="text-xs text-slate-500 mb-3">
                  Template siap pakai, berlaku ke semua akun
                </p>
                <div className="space-y-2">
                  <button
                    onClick={() => handleAddPreset("content_test")}
                    className="w-full flex items-center gap-3 rounded-xl border-2 border-orange-200 bg-orange-50 p-3 text-left hover:border-orange-300 transition"
                  >
                    <span className="text-xl">📸</span>
                    <div>
                      <div className="text-xs font-black text-orange-800">
                        Tes Konten
                      </div>
                      <div className="text-[11px] text-orange-600">
                        Spend &gt; $8 → Ad OFF
                      </div>
                    </div>
                    <span className="ml-auto text-orange-400 font-black">+</span>
                  </button>

                  <button
                    onClick={() => handleAddPreset("cpr_guard")}
                    className="w-full flex items-center gap-3 rounded-xl border-2 border-red-200 bg-red-50 p-3 text-left hover:border-red-300 transition"
                  >
                    <span className="text-xl">🛡️</span>
                    <div>
                      <div className="text-xs font-black text-red-800">
                        Jaga CPR
                      </div>
                      <div className="text-[11px] text-red-600">
                        CPR &gt; $3.5 → Ad OFF
                      </div>
                    </div>
                    <span className="ml-auto text-red-400 font-black">+</span>
                  </button>

                  <button
                    onClick={() => {
                      setEditingRule(null);
                      setIsFormOpen(true);
                    }}
                    className="w-full flex items-center gap-3 rounded-xl border-2 border-dashed border-blue-200 p-3 text-left hover:border-blue-300 transition"
                  >
                    <span className="text-xl">✏️</span>
                    <div>
                      <div className="text-xs font-black text-blue-800">
                        Custom Rule
                      </div>
                      <div className="text-[11px] text-blue-600">
                        Buat kondisi sendiri
                      </div>
                    </div>
                    <span className="ml-auto text-blue-400 font-black">+</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── Right Panel: Rules ─────────────────────────────── */}
          <div>
            {/* Header */}
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-900">
                  Rules Aktif
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {rules.length === 0
                    ? "Belum ada rule. Buat rule pertama Anda."
                    : `${rules.filter((r) => r.enabled).length} aktif · ${
                        rules.filter((r) => !r.enabled).length
                      } nonaktif`}
                </p>
              </div>
              <button
                onClick={() => {
                  setEditingRule(null);
                  setIsFormOpen(true);
                }}
                className="h-10 rounded-xl bg-blue-600 px-4 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition flex items-center gap-2"
              >
                + Buat Rule
              </button>
            </div>

            {/* Empty State */}
            {rules.length === 0 && (
              <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white py-20">
                <div className="mb-3 text-5xl">⚙️</div>
                <h3 className="text-base font-black text-slate-800 mb-1">
                  Belum Ada Rule
                </h3>
                <p className="text-sm text-slate-500 mb-5 text-center max-w-xs">
                  Buat rule untuk otomatis mematikan iklan atau memantau
                  performa berdasarkan kondisi yang kamu tentukan.
                </p>
                {accounts.length === 0 ? (
                  <p className="text-xs text-slate-400">
                    Fetch Ad Account terlebih dahulu di panel kiri →
                  </p>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAddPreset("content_test")}
                      className="h-9 rounded-xl border border-orange-300 bg-orange-50 px-4 text-xs font-bold text-orange-700 hover:bg-orange-100 transition"
                    >
                      📸 Tambah Tes Konten
                    </button>
                    <button
                      onClick={() => handleAddPreset("cpr_guard")}
                      className="h-9 rounded-xl border border-red-300 bg-red-50 px-4 text-xs font-bold text-red-700 hover:bg-red-100 transition"
                    >
                      🛡️ Tambah Jaga CPR
                    </button>
                    <button
                      onClick={() => {
                        setEditingRule(null);
                        setIsFormOpen(true);
                      }}
                      className="h-9 rounded-xl bg-blue-600 px-4 text-xs font-bold text-white hover:bg-blue-700 transition"
                    >
                      + Custom Rule
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Rules Grid */}
            {rules.length > 0 && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3">
                {rules.map((rule) => (
                  <RuleCard
                    key={rule.id}
                    rule={rule}
                    accounts={accounts}
                    accessToken={accessToken}
                    onEdit={(r) => {
                      setEditingRule(r);
                      setIsFormOpen(true);
                    }}
                    onDelete={handleDeleteRule}
                    onToggle={handleToggleRule}
                    onRun={handleRunRule}
                    onPushToMeta={handlePushToMeta}
                    isRunning={runningRuleId === rule.id}
                    lastResult={ruleResults[rule.id] || null}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Rule Form Modal ──────────────────────────────────── */}
      <RuleFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingRule(null);
        }}
        onSave={handleSaveRule}
        accounts={accounts}
        editingRule={editingRule}
      />
    </main>
  );
}
