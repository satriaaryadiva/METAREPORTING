"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: "login" | "register";
}

export default function AuthModal({
  isOpen,
  onClose,
  defaultTab = "login",
}: AuthModalProps) {
  const [tab, setTab] = useState<"login" | "register">(defaultTab);
  const { login, register } = useAuth();

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  if (!isOpen) return null;

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
      if (res.success) {
        resetForm();
        onClose();
      } else {
        setErrorMsg(res.error || "Login gagal.");
      }
    } else {
      const res = await register({ name, email, password });
      setLoading(false);
      if (res.success) {
        setSuccessMsg("Pendaftaran berhasil! Anda sudah otomatis masuk.");
        setTimeout(() => {
          resetForm();
          onClose();
        }, 1200);
      } else {
        setErrorMsg(res.error || "Pendaftaran gagal.");
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div
        className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-6 text-white">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white transition hover:bg-white/30"
          >
            ✕
          </button>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 text-base font-black">
              M
            </span>
            <h2 className="text-xl font-black tracking-tight">Meta Ads Report</h2>
          </div>
          <p className="mt-1 text-xs text-blue-100">
            {tab === "login"
              ? "Masuk untuk menyimpan mapping & riwayat report Anda"
              : "Daftar akun baru untuk mulai kelola laporan Meta Ads"}
          </p>

          {/* Tab buttons */}
          <div className="mt-5 flex rounded-xl bg-black/20 p-1">
            <button
              type="button"
              onClick={() => handleSwitchTab("login")}
              className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition ${
                tab === "login"
                  ? "bg-white text-blue-700 shadow-sm"
                  : "text-white/80 hover:text-white"
              }`}
            >
              Masuk
            </button>
            <button
              type="button"
              onClick={() => handleSwitchTab("register")}
              className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition ${
                tab === "register"
                  ? "bg-white text-blue-700 shadow-sm"
                  : "text-white/80 hover:text-white"
              }`}
            >
              Daftar Akun
            </button>
          </div>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6">
          {errorMsg && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-600">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-700">
              {successMsg}
            </div>
          )}

          <div className="space-y-4">
            {tab === "register" && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Budi Santoso"
                  className="mt-1.5 h-11 w-full rounded-xl border border-slate-300 px-3.5 text-sm text-slate-800 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@email.com"
                className="mt-1.5 h-11 w-full rounded-xl border border-slate-300 px-3.5 text-sm text-slate-800 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                Kata Sandi
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-1.5 h-11 w-full rounded-xl border border-slate-300 px-3.5 text-sm text-slate-800 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {tab === "register" && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Konfirmasi Kata Sandi
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="mt-1.5 h-11 w-full rounded-xl border border-slate-300 px-3.5 text-sm text-slate-800 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-6 flex h-11 w-full items-center justify-center rounded-xl bg-blue-600 text-sm font-bold text-white shadow-md shadow-blue-500/20 transition hover:bg-blue-700 disabled:opacity-60"
          >
            {loading
              ? "Memproses..."
              : tab === "login"
              ? "Masuk ke Akun"
              : "Buat Akun Baru"}
          </button>

          <p className="mt-4 text-center text-xs text-slate-500">
            {tab === "login" ? (
              <>
                Belum punya akun?{" "}
                <button
                  type="button"
                  onClick={() => handleSwitchTab("register")}
                  className="font-bold text-blue-600 hover:underline"
                >
                  Daftar sekarang
                </button>
              </>
            ) : (
              <>
                Sudah punya akun?{" "}
                <button
                  type="button"
                  onClick={() => handleSwitchTab("login")}
                  className="font-bold text-blue-600 hover:underline"
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
