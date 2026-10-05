"use client";

import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";

export default function UserProfileMenu() {
  const { user, logout, fbAccessToken } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!user) return null;

  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "U";

  const isFbUser = user.loginMethod === "facebook";

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-1.5 pr-3 text-left transition hover:border-slate-300 hover:bg-slate-50"
      >
        {/* Avatar */}
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={user.name}
            className="h-8 w-8 rounded-lg object-cover"
          />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 text-xs font-bold text-white shadow-sm">
            {initials}
          </div>
        )}

        <div className="hidden text-xs sm:block">
          <div className="flex items-center gap-1.5">
            <p className="font-bold text-slate-800 leading-tight">{user.name}</p>
            {isFbUser && (
              <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[9px] font-black text-blue-700 leading-tight">
                FB
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 leading-tight">{user.role || "User"}</p>
        </div>
        <svg
          className={`h-4 w-4 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 origin-top-right rounded-2xl border border-slate-200 bg-white py-2 shadow-xl ring-1 ring-black/5 z-50">
          {/* Profile Header */}
          <div className="border-b border-slate-100 px-4 py-3">
            <div className="flex items-center gap-3">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="h-10 w-10 rounded-xl object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-sm font-bold text-white">
                  {initials}
                </div>
              )}
              <div>
                <p className="text-sm font-bold text-slate-900">{user.name}</p>
                <p className="truncate text-[11px] text-slate-500">{user.email}</p>
              </div>
            </div>
          </div>

          <div className="py-1 px-2">
            {/* Status */}
            <div className="flex items-center justify-between rounded-lg px-3 py-2 text-xs text-slate-600 hover:bg-slate-50">
              <span>Status Akun</span>
              <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                Aktif
              </span>
            </div>

            {/* Login method */}
            <div className="flex items-center justify-between rounded-lg px-3 py-2 text-xs text-slate-600 hover:bg-slate-50">
              <span>Login via</span>
              <span
                className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                  isFbUser
                    ? "bg-[#1877F2]/10 text-[#1877F2]"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {isFbUser ? "Facebook" : "Email"}
              </span>
            </div>

            {/* Token status (only for FB users) */}
            {isFbUser && fbAccessToken && (
              <div className="flex items-center justify-between rounded-lg px-3 py-2 text-xs text-slate-600 hover:bg-slate-50">
                <span>Meta Token</span>
                <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                  ✓ Tersimpan
                </span>
              </div>
            )}
          </div>

          <div className="border-t border-slate-100 px-2 pt-1">
            <button
              onClick={() => {
                setIsOpen(false);
                logout();
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-bold text-red-600 hover:bg-red-50"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              {isFbUser ? "Keluar & Disconnect Facebook" : "Keluar (Logout)"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
