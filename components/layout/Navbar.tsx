"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import AuthModal from "@/components/auth/AuthModal";
import UserProfileMenu from "@/components/auth/UserProfileMenu";
import FacebookLoginButton from "@/components/auth/FacebookLoginButton";

interface NavbarProps {
  onScreenshot: () => void;
  onExportExcel: () => void;
  isScreenshotting: boolean;
  hasData: boolean;
  activeTab?: "account" | "campaign";
  onTabChange?: (tab: "account" | "campaign") => void;
}

export default function Navbar({
  onScreenshot,
  onExportExcel,
  isScreenshotting,
  hasData,
  activeTab,
  onTabChange,
}: NavbarProps) {
  const { isAuthenticated } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<"login" | "register">("login");
  const pathname = usePathname();

  // Determine active view based on tab or pathname
  const currentTab = activeTab || (pathname?.includes("campaign") ? "campaign" : "account");

  const openAuth = (tab: "login" | "register") => {
    setAuthModalTab(tab);
    setIsAuthModalOpen(true);
  };

  return (
    <>
      <div className="mb-5 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-xs font-black text-white">
                M
              </span>
              <h1 className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
                Meta Ads Report
              </h1>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              {currentTab === "campaign"
                ? "RAW Campaign + CRM Ref → Automatic Report"
                : "RAW Account → Mapping P-Code → Report"}
            </p>
          </div>

          {/* Navigation Tab Switcher */}
          <div className="flex items-center rounded-xl bg-slate-100 p-1 sm:ml-4">
            {onTabChange ? (
              <>
                <button
                  onClick={() => onTabChange("account")}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                    currentTab === "account"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <span>📊 Report Account</span>
                </button>
                <button
                  onClick={() => onTabChange("campaign")}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                    currentTab === "campaign"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <span>🎯 Report Campaign</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/"
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                    currentTab === "account"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <span>📊 Report Account</span>
                </Link>
                <Link
                  href="/report-campaign"
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                    currentTab === "campaign"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <span>🎯 Report Campaign</span>
                </Link>
                <Link
                  href="/ad-rules"
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition text-slate-600 hover:text-slate-900"
                >
                  <span>⚙️ Ad Rules</span>
                </Link>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            onClick={onScreenshot}
            disabled={isScreenshotting || !hasData}
            className="h-10 rounded-xl border border-slate-300 bg-white px-3.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isScreenshotting ? "Membuat Screenshot..." : "📸 Screenshot HD"}
          </button>

          <button
            onClick={onExportExcel}
            disabled={!hasData}
            className="h-10 rounded-xl bg-blue-600 px-4 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Export Excel
          </button>

          <div className="hidden h-6 w-px bg-slate-200 sm:block" />

          {isAuthenticated ? (
            <UserProfileMenu />
          ) : (
            <div className="flex items-center gap-2">
              {/* Primary: Facebook Login */}
              <FacebookLoginButton compact />
              {/* Secondary: Email login */}
              <button
                onClick={() => openAuth("login")}
                className="h-10 rounded-xl border border-slate-300 px-3 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
              >
                Email
              </button>
            </div>
          )}
        </div>
      </div>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        defaultTab={authModalTab}
      />
    </>
  );
}
