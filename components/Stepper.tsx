"use client";

import React from "react";

export interface StepperStep {
  label: string;
}

export const AD_RULES_STEPS: StepperStep[] = [
  { label: "Hubungkan" },
  { label: "Pilih Akun" },
  { label: "Atur Rule" },
  { label: "Preview & Jalankan" },
];

interface StepperProps {
  /** 1-indexed current step */
  currentStep: number;
  steps?: StepperStep[];
}

/**
 * Horizontal progress stepper. This is a status indicator, not a navigable
 * wizard — the app below stays a single scrollable page, this just orients
 * the user to where they are in Hubungkan → Pilih Akun → Atur Rule → Jalankan.
 */
export default function Stepper({ currentStep, steps = AD_RULES_STEPS }: StepperProps) {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto py-1">
      {steps.map((step, idx) => {
        const stepNum = idx + 1;
        const isDone = stepNum < currentStep;
        const isCurrent = stepNum === currentStep;

        return (
          <React.Fragment key={step.label}>
            <div className="flex flex-shrink-0 items-center gap-1.5">
              <span
                className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-black transition-colors ${
                  isDone
                    ? "bg-emerald-500 text-white"
                    : isCurrent
                    ? "bg-blue-600 text-white"
                    : "bg-slate-200 text-slate-500"
                }`}
              >
                {isDone ? "✓" : stepNum}
              </span>
              <span
                className={`text-xs font-bold whitespace-nowrap ${
                  isCurrent ? "text-blue-700" : isDone ? "text-slate-600" : "text-slate-400"
                }`}
              >
                {step.label}
              </span>
            </div>
            {stepNum < steps.length && (
              <span
                className={`mx-1 h-px w-5 flex-shrink-0 ${
                  isDone ? "bg-emerald-400" : "bg-slate-200"
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
