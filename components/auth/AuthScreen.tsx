"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";

export default function AuthScreen() {
  const [tab, setTab] = useState<"login" | "register">("login");
  const { login, register } = useAuth();

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const resetForm = () => {
    setName("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setErrorMsg("");
    setSuccessMsg("");
  };

  const handleSwitchTab = (newTab: "login" | "register") => {
    setTab(newTab);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!email.trim() || !password.trim()) {
      setErrorMsg("Email dan kata sandi wajib diisi.");
      return;
    }

    if (tab === "register") {
      if (!name.trim()) {
        setErrorMsg("Nama lengkap wajib diisi.");
        return;
      }
      if (password.length < 6) {
        setErrorMsg("Kata sandi minimal 6 karakter.");
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg("Konfirmasi kata sandi tidak cocok.");
        return;
      }
    }

    setLoading(true);

    if (tab === "login") {
      const res = await login({ email, password });
      setLoading(false);
      if (!res.success) {
        setErrorMsg(res.error || "Login gagal.");
      }
    } else {
      const res = await register({ name, email, password });
      setLoading(false);
      if (res.success) {
        setSuccessMsg("Pendaftaran berhasil! Mengalihkan ke dashboard...");
      } else {
        setErrorMsg(res.error || "Pendaftaran gagal.");
      }
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 p-4 sm:p-6 lg:p-8">
      {/* Decorative background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[500px] w-[600px] rounded-full bg-blue-600/20 blur-[120px]" />
        <div className="absolute bottom-0 right-10 h-[350px] w-[350px] rounded-full bg-indigo-500/15 blur-[100px]" />
      </div>

      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-slate-700/60 bg-slate-900/90 shadow-2xl backdrop-blur-xl">
        {/* Card Top Branding Header */}
        <div className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-6 sm:p-8 text-white">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/20 text-xl font-black shadow-inner">
              M
            </span>
            <div>
              <h1 className="text-xl font-black tracking-tight sm:text-2xl">
                Meta Ads Report
              </h1>
              <p className="text-xs font-semibold text-blue-100/90">
                Dashboard & Automation
              </p>
            </div>
          </div>

          <p className="mt-4 text-xs leading-relaxed text-blue-100">
            {tab === "login"
              ? "Silakan masuk dengan akun Anda untuk mengakses sistem laporan dan kalkulasi Meta Ads."
              : "Daftarkan akun baru untuk mengelola mapping, perhitungan fee, dan export laporan."}
          </p>

          {/* Tab Selector */}
          <div className="mt-6 flex rounded-2xl bg-black/25 p-1 backdrop-blur-md">
            <button
              type="button"
              onClick={() => handleSwitchTab("login")}
              className={`flex-1 rounded-xl py-2 text-xs font-bold transition ${
                tab === "login"
                  ? "bg-white text-blue-700 shadow-md"
                  : "text-white/80 hover:text-white"
              }`}
            >
              Masuk (Login)
            </button>
            <button
              type="button"
              onClick={() => handleSwitchTab("register")}
              className={`flex-1 rounded-xl py-2 text-xs font-bold transition ${
                tab === "register"
                  ? "bg-white text-blue-700 shadow-md"
                  : "text-white/80 hover:text-white"
              }`}
            >
              Daftar Akun
            </button>
          </div>
        </div>

        {/* Card Form Body */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-8">
          {errorMsg && (
            <div className="mb-5 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs font-semibold text-red-400">
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-5 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs font-semibold text-emerald-400">
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span>{successMsg}</span>
            </div>
          )}

          <div className="space-y-4">
            {tab === "register" && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Alex Pratama"
                  className="mt-1.5 h-11 w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@email.com"
                className="mt-1.5 h-11 w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                Kata Sandi
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-1.5 h-11 w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {tab === "register" && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                  Konfirmasi Kata Sandi
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="mt-1.5 h-11 w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-6 flex h-12 w-full items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-sm font-bold text-white shadow-lg shadow-blue-500/25 transition hover:from-blue-500 hover:to-indigo-500 disabled:opacity-60"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Memproses...
              </span>
            ) : tab === "login" ? (
              "Masuk ke Dashboard"
            ) : (
              "Daftar & Masuk"
            )}
          </button>

          <p className="mt-5 text-center text-xs text-slate-400">
            {tab === "login" ? (
              <>
                Belum punya akun?{" "}
                <button
                  type="button"
                  onClick={() => handleSwitchTab("register")}
                  className="font-bold text-blue-400 hover:text-blue-300 underline"
                >
                  Daftar di sini
                </button>
              </>
            ) : (
              <>
                Sudah memiliki akun?{" "}
                <button
                  type="button"
                  onClick={() => handleSwitchTab("login")}
                  className="font-bold text-blue-400 hover:text-blue-300 underline"
                >
                  Masuk di sini
                </button>
              </>
            )}
          </p>
        </form>
      </div>
    </div>
  );
}
