"use client";

import React from "react";
import { usd, rupiah } from "@/lib/utils";

interface SummaryCardsProps {
  totalSpending: number;
  totalFee: number;
  totalWithFee: number;
  totalRP: number;
  fee: number;
  rate: number;
}

export default function SummaryCards({
  totalSpending,
  totalFee,
  totalWithFee,
  totalRP,
  fee,
  rate,
}: SummaryCardsProps) {
  return (
    <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-[11px] font-bold uppercase text-slate-500">
          Total Spending
        </p>
        <p className="mt-1 text-2xl font-black text-slate-900">{usd(totalSpending)}</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-[11px] font-bold uppercase text-slate-500">
          Fee {fee}%
        </p>
        <p className="mt-1 text-2xl font-black text-slate-900">{usd(totalFee)}</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-[11px] font-bold uppercase text-slate-500">
          Total + Fee
        </p>
        <p className="mt-1 text-2xl font-black text-slate-900">{usd(totalWithFee)}</p>
      </div>

      <div className="rounded-2xl bg-blue-600 p-4 text-white shadow-sm">
        <p className="text-[11px] font-bold uppercase text-blue-100">
          Total Rupiah
        </p>
        <p className="mt-1 text-2xl font-black">{rupiah(totalRP)}</p>
        <p className="mt-1 text-[11px] text-blue-100">
          Kurs {rate.toLocaleString("id-ID")}
        </p>
      </div>
    </div>
  );
}
