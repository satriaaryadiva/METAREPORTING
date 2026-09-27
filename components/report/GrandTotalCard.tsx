"use client";

import React from "react";
import { usd, rupiah } from "@/lib/utils";

interface GrandTotalCardProps {
  totalSpending: number;
  totalFee: number;
  totalRP: number;
}

export default function GrandTotalCard({
  totalSpending,
  totalFee,
  totalRP,
}: GrandTotalCardProps) {
  return (
    <div className="mt-5 rounded-2xl border border-slate-300 bg-white p-4 shadow-sm">
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <p className="text-[11px] font-bold uppercase text-slate-500">
            Grand Spending
          </p>
          <p className="mt-1 text-xl font-black text-slate-800">{usd(totalSpending)}</p>
        </div>

        <div>
          <p className="text-[11px] font-bold uppercase text-slate-500">
            Grand Fee
          </p>
          <p className="mt-1 text-xl font-black text-slate-800">{usd(totalFee)}</p>
        </div>

        <div className="rounded-xl bg-blue-600 p-3 text-white">
          <p className="text-[11px] font-bold uppercase text-blue-100">
            Grand Total Rupiah
          </p>
          <p className="mt-1 text-xl font-black">{rupiah(totalRP)}</p>
        </div>
      </div>
    </div>
  );
}
