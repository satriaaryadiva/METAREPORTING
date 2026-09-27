"use client";

import React, { useState } from "react";
import { Mapping } from "@/types/report";

interface MappingCardProps {
  mapping: Mapping[];
  onAddMapping: (pCode: string, name: string) => void;
  onUpdatePCode: (id: string, pCode: string) => void;
  onUpdateName: (id: string, name: string) => void;
  onDeleteMapping: (id: string) => void;
}

export default function MappingCard({
  mapping,
  onAddMapping,
  onUpdatePCode,
  onUpdateName,
  onDeleteMapping,
}: MappingCardProps) {
  const [newPCode, setNewPCode] = useState("");
  const [newName, setNewName] = useState("");

  const handleAdd = () => {
    if (!newPCode.trim()) {
      alert("Masukkan P Code.");
      return;
    }
    if (!newName.trim()) {
      alert("Masukkan nama.");
      return;
    }
    onAddMapping(newPCode, newName);
    setNewPCode("");
    setNewName("");
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="font-bold text-slate-800">03. MAPPING P CODE</h2>
      <p className="mb-4 mt-1 text-xs text-slate-500">P Code → Nama</p>

      <div className="grid grid-cols-[70px_minmax(0,1fr)_40px] gap-2">
        <input
          value={newPCode}
          onChange={(e) => setNewPCode(e.target.value)}
          placeholder="P12"
          className="h-10 rounded-lg border border-slate-300 px-2 text-sm font-bold text-slate-800 outline-none focus:border-blue-500"
        />

        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nama"
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          className="h-10 min-w-0 rounded-lg border border-slate-300 px-3 text-sm text-slate-800 outline-none focus:border-blue-500"
        />

        <button
          onClick={handleAdd}
          className="rounded-lg bg-blue-600 text-xl font-bold text-white transition hover:bg-blue-700"
        >
          +
        </button>
      </div>

      <div className="mt-3 max-h-[220px] space-y-2 overflow-y-auto pr-1">
        {mapping.map((item) => (
          <div
            key={item.id}
            className="grid grid-cols-[65px_minmax(0,1fr)_36px] gap-2"
          >
            <input
              value={item.pCode}
              onChange={(e) => onUpdatePCode(item.id, e.target.value)}
              className="h-9 rounded-lg border border-slate-300 px-2 text-xs font-bold text-slate-800 outline-none focus:border-blue-500"
            />

            <input
              value={item.name}
              onChange={(e) => onUpdateName(item.id, e.target.value)}
              className="h-9 min-w-0 rounded-lg border border-slate-300 px-3 text-xs text-slate-800 outline-none focus:border-blue-500"
            />

            <button
              onClick={() => onDeleteMapping(item.id)}
              className="rounded-lg border border-slate-300 font-bold text-red-500 transition hover:border-red-300 hover:bg-red-50"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
