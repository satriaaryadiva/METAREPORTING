"use client";

import React, { useState } from "react";
import { CustomRule } from "@/types/report";

interface CustomRulesCardProps {
  customRules: CustomRule[];
  onAddRule: (keyword: string, name: string) => void;
  onUpdateKeyword: (id: string, keyword: string) => void;
  onUpdateName: (id: string, name: string) => void;
  onDeleteRule: (id: string) => void;
}

export default function CustomRulesCard({
  customRules,
  onAddRule,
  onUpdateKeyword,
  onUpdateName,
  onDeleteRule,
}: CustomRulesCardProps) {
  const [newKeyword, setNewKeyword] = useState("");
  const [newName, setNewName] = useState("");

  const handleAdd = () => {
    if (!newKeyword.trim()) {
      alert("Masukkan kata kunci.");
      return;
    }
    if (!newName.trim()) {
      alert("Masukkan nama group.");
      return;
    }
    onAddRule(newKeyword, newName);
    setNewKeyword("");
    setNewName("");
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <h2 className="font-bold text-slate-800">04. CUSTOM TABLE</h2>
        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-700">
          BARU
        </span>
      </div>
      <p className="mb-4 mt-1 text-xs text-slate-500">
        Pisahkan account tanpa P Code (mis. "JW", "ROBERT") dari UNMAPPED berdasarkan
        kata kunci di nama account.
      </p>

      <div className="grid grid-cols-[80px_minmax(0,1fr)_40px] gap-2">
        <input
          value={newKeyword}
          onChange={(e) => setNewKeyword(e.target.value)}
          placeholder="JW"
          className="h-10 rounded-lg border border-slate-300 px-2 text-sm font-bold text-slate-800 outline-none focus:border-emerald-500"
        />

        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nama Group"
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          className="h-10 min-w-0 rounded-lg border border-slate-300 px-3 text-sm text-slate-800 outline-none focus:border-emerald-500"
        />

        <button
          onClick={handleAdd}
          className="rounded-lg bg-emerald-600 text-xl font-bold text-white transition hover:bg-emerald-700"
        >
          +
        </button>
      </div>

      <div className="mt-3 max-h-[220px] space-y-2 overflow-y-auto pr-1">
        {customRules.map((item) => (
          <div
            key={item.id}
            className="grid grid-cols-[80px_minmax(0,1fr)_36px] gap-2"
          >
            <input
              value={item.keyword}
              onChange={(e) => onUpdateKeyword(item.id, e.target.value)}
              className="h-9 rounded-lg border border-slate-300 px-2 text-xs font-bold text-slate-800 outline-none focus:border-emerald-500"
            />

            <input
              value={item.name}
              onChange={(e) => onUpdateName(item.id, e.target.value)}
              className="h-9 min-w-0 rounded-lg border border-slate-300 px-3 text-xs text-slate-800 outline-none focus:border-emerald-500"
            />

            <button
              onClick={() => onDeleteRule(item.id)}
              className="rounded-lg border border-slate-300 font-bold text-red-500 transition hover:border-red-300 hover:bg-red-50"
            >
              ×
            </button>
          </div>
        ))}

        {!customRules.length && (
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-400">
            Belum ada custom table. Contoh: kata kunci "JW", nama "JW TEAM".
          </p>
        )}
      </div>
    </div>
  );
}
