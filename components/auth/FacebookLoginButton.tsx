"use client";

import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";

// ── Facebook SDK Types ────────────────────────────────────────────────────────
interface FBAuthResponse {
  accessToken: string;
  userID: string;
  expiresIn: number;
  signedRequest: string;
  grantedScopes?: string;
}

interface FBStatusResponse {
  status: "connected" | "not_authorized" | "unknown";
  authResponse?: FBAuthResponse;
}

interface FBUserInfo {
  id: string;
  name: string;
  email?: string;
  picture?: {
    data: {
      url: string;
    };
  };
}

type FBSDK = {
  init: (opts: {
    appId: string;
    cookie: boolean;
    xfbml: boolean;
    version: string;
  }) => void;
  login: (
    cb: (res: FBStatusResponse) => void,
    opts: { scope: string; return_scopes: boolean }
  ) => void;
  api: (
    path: string,
    opts: { fields: string },
    cb: (res: FBUserInfo) => void
  ) => void;
  getLoginStatus: (cb: (res: FBStatusResponse) => void) => void;
};

type FBWindow = Window & { FB?: FBSDK; fbAsyncInit?: () => void };

// ── FB SDK Loader ─────────────────────────────────────────────────────────────
function useFacebookSDK(appId: string) {
  const [sdkReady, setSdkReady] = useState(false);

  useEffect(() => {
    if (!appId || appId === "your_facebook_app_id_here") return;

    const win = window as FBWindow;

    if (win.FB) {
      setSdkReady(true);
      return;
    }

    win.fbAsyncInit = function () {
      win.FB!.init({
        appId,
        cookie: true,
        xfbml: true,
        version: "v20.0",
      });
      setSdkReady(true);
    };

    // Inject the FB SDK script
    if (!document.getElementById("facebook-jssdk")) {
      const script = document.createElement("script");
      script.id = "facebook-jssdk";
      script.src = "https://connect.facebook.net/en_US/sdk.js";
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    }
  }, [appId]);

  return sdkReady;
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface FacebookLoginButtonProps {
  onSuccess?: () => void;
  onError?: (msg: string) => void;
  className?: string;
  compact?: boolean; // smaller style for navbar
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function FacebookLoginButton({
  onSuccess,
  onError,
  className = "",
  compact = false,
}: FacebookLoginButtonProps) {
  const { loginWithFacebook } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [customAppId, setCustomAppId] = useState("");
  const [showInputModal, setShowInputModal] = useState(false);
  const [inputAppId, setInputAppId] = useState("");

  // Determine active App ID: Env -> localStorage -> custom
  useEffect(() => {
    try {
      const saved = localStorage.getItem("meta_fb_app_id");
      if (saved) setCustomAppId(saved);
    } catch (_) {}
  }, []);

  const envAppId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
  const appId =
    envAppId && envAppId !== "your_facebook_app_id_here"
      ? envAppId
      : customAppId;

  const sdkReady = useFacebookSDK(appId);
  const isConfigured = Boolean(appId && appId.trim().length > 0);

  const saveAppIdAndLogin = (idToSave: string) => {
    const trimmed = idToSave.trim();
    if (!trimmed) return;
    try {
      localStorage.setItem("meta_fb_app_id", trimmed);
    } catch (_) {}
    setCustomAppId(trimmed);
    setShowInputModal(false);
  };

  const handleLogin = () => {
    if (!isConfigured) {
      setShowInputModal(true);
      return;
    }

    const win = window as FBWindow;

    if (!win.FB || !sdkReady) {
      const msg = "Facebook SDK sedang memuat. Silakan coba lagi dalam beberapa detik.";
      setError(msg);
      onError?.(msg);
      return;
    }

    setIsLoading(true);
    setError("");

    win.FB.login(
      (response) => {
        if (
          response.status === "connected" &&
          response.authResponse?.accessToken
        ) {
          const { accessToken, userID } = response.authResponse;

          // Fetch user profile
          win.FB!.api(
            "/me",
            { fields: "id,name,email,picture.type(large)" },
            (userInfo) => {
              loginWithFacebook({
                fbUserId: userID,
                fbAccessToken: accessToken,
                name: userInfo.name || `FB User ${userID}`,
                email: userInfo.email,
                avatarUrl: userInfo.picture?.data?.url,
              });
              setIsLoading(false);
              onSuccess?.();
            }
          );
        } else {
          const msg =
            response.status === "not_authorized"
              ? "Izin ditolak. Pastikan Anda mengizinkan akses ads_read."
              : "Login Facebook dibatalkan.";
          setIsLoading(false);
          setError(msg);
          onError?.(msg);
        }
      },
      {
        scope: "ads_read,ads_management,business_management,email,public_profile",
        return_scopes: true,
      }
    );
  };

  return (
    <div className="w-full">
      {compact ? (
        <button
          onClick={handleLogin}
          disabled={isLoading}
          className={`flex items-center gap-2 h-10 rounded-xl border border-blue-300 bg-[#1877F2] px-4 text-xs font-bold text-white shadow-sm hover:bg-[#166FE5] disabled:opacity-60 transition ${className}`}
        >
          {isLoading ? (
            <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
          ) : (
            <svg viewBox="0 0 24 24" fill="white" className="h-4 w-4">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
          )}
          {isLoading ? "Masuk…" : "Login Facebook"}
        </button>
      ) : (
        <button
          onClick={handleLogin}
          disabled={isLoading}
          className={`flex w-full items-center justify-center gap-3 h-12 rounded-xl bg-[#1877F2] text-sm font-bold text-white shadow-md shadow-blue-500/30 hover:bg-[#166FE5] disabled:opacity-60 transition ${className}`}
        >
          {isLoading ? (
            <span className="h-5 w-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
          ) : (
            <svg viewBox="0 0 24 24" fill="white" className="h-5 w-5">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
          )}
          {isLoading ? "Menghubungkan ke Facebook…" : "Masuk dengan Facebook"}
        </button>
      )}

      {!isConfigured && !compact && (
        <button
          onClick={() => setShowInputModal(true)}
          className="mt-2 w-full text-center text-[11px] text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg px-3 py-2 transition flex items-center justify-center gap-1 font-semibold"
        >
          ⚙️ Klik di sini untuk menginput Facebook App ID langsung di aplikasi
        </button>
      )}

      {error && (
        <p className="mt-2 text-center text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          ❌ {error}
        </p>
      )}

      {/* Input Modal if App ID missing */}
      {showInputModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-black text-slate-900 mb-1">
              Masukkan Facebook App ID
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Facebook Login memerlukan Facebook App ID dari App Anda di{" "}
              <a
                href="https://developers.facebook.com"
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 font-bold underline"
              >
                developers.facebook.com
              </a>.
            </p>

            <input
              type="text"
              value={inputAppId}
              onChange={(e) => setInputAppId(e.target.value)}
              placeholder="Contoh: 1234567890123456"
              className="w-full h-11 rounded-xl border border-slate-300 px-3 text-sm font-mono text-slate-900 outline-none focus:border-blue-500 mb-4"
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowInputModal(false)}
                className="h-10 px-4 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                onClick={() => saveAppIdAndLogin(inputAppId)}
                disabled={!inputAppId.trim()}
                className="h-10 px-5 rounded-xl bg-blue-600 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Simpan & Gunakan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
