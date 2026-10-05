"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { AuthState, FacebookLoginPayload, LoginPayload, RegisterPayload, User } from "@/types/auth";

interface AuthContextType extends AuthState {
  login: (payload: LoginPayload) => Promise<{ success: boolean; error?: string }>;
  register: (payload: RegisterPayload) => Promise<{ success: boolean; error?: string }>;
  loginWithFacebook: (payload: FacebookLoginPayload) => void;
  logout: () => void;
  fbAccessToken: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY_SESSION = "meta_report_auth_user";
const STORAGE_KEY_DB = "meta_report_registered_users";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Initialize session from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_SESSION);
      if (stored) {
        setUser(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to load auth session", e);
    }
  }, []);

  // ── Facebook OAuth Login ────────────────────────────────────────
  const loginWithFacebook = (payload: FacebookLoginPayload) => {
    const sessionUser: User = {
      id: `fb_${payload.fbUserId}`,
      name: payload.name,
      email: payload.email || `${payload.fbUserId}@facebook.com`,
      avatarUrl: payload.avatarUrl,
      role: "Advertiser",
      createdAt: new Date().toISOString(),
      fbUserId: payload.fbUserId,
      fbAccessToken: payload.fbAccessToken,
      loginMethod: "facebook",
    };

    setUser(sessionUser);
    localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(sessionUser));

    // Also persist token into autosync settings so AdRules page picks it up
    try {
      const existing = localStorage.getItem("meta_report_autosync_settings");
      const parsed = existing ? JSON.parse(existing) : {};
      const updated = {
        ...parsed,
        meta: {
          ...(parsed.meta || {}),
          accessToken: payload.fbAccessToken,
        },
      };
      localStorage.setItem("meta_report_autosync_settings", JSON.stringify(updated));
    } catch (_) {}
  };

  // ── Email Login ────────────────────────────────────────────────
  const login = async ({ email, password }: LoginPayload): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 400));

    try {
      const dbUsersStr = localStorage.getItem(STORAGE_KEY_DB);
      const registeredUsers: Array<User & { passwordHash?: string }> = dbUsersStr
        ? JSON.parse(dbUsersStr)
        : [];

      const normalizedEmail = email.trim().toLowerCase();
      const existingUser = registeredUsers.find(
        (u) => u.email.toLowerCase() === normalizedEmail
      );

      if (!existingUser) {
        setIsLoading(false);
        return { success: false, error: "Email atau kata sandi tidak ditemukan." };
      }

      if (existingUser.passwordHash && existingUser.passwordHash !== password) {
        setIsLoading(false);
        return { success: false, error: "Kata sandi salah. Silakan coba lagi." };
      }

      const sessionUser: User = {
        id: existingUser.id,
        name: existingUser.name,
        email: existingUser.email,
        avatarUrl: existingUser.avatarUrl,
        role: existingUser.role || "Advertiser",
        createdAt: existingUser.createdAt,
        loginMethod: "email",
      };

      setUser(sessionUser);
      localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(sessionUser));
      setIsLoading(false);
      return { success: true };
    } catch (err) {
      setIsLoading(false);
      return {
        success: false,
        error: err instanceof Error ? err.message : "Terjadi kesalahan saat login.",
      };
    }
  };

  // ── Email Register ─────────────────────────────────────────────
  const register = async ({
    name,
    email,
    password,
  }: RegisterPayload): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 400));

    try {
      const dbUsersStr = localStorage.getItem(STORAGE_KEY_DB);
      const registeredUsers: Array<User & { passwordHash?: string }> = dbUsersStr
        ? JSON.parse(dbUsersStr)
        : [];

      const normalizedEmail = email.trim().toLowerCase();
      const existingUser = registeredUsers.find(
        (u) => u.email.toLowerCase() === normalizedEmail
      );

      if (existingUser) {
        setIsLoading(false);
        return { success: false, error: "Email ini sudah terdaftar. Silakan login." };
      }

      const newUser: User & { passwordHash: string } = {
        id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
        name: name.trim(),
        email: normalizedEmail,
        passwordHash: password,
        role: "Advertiser",
        createdAt: new Date().toISOString(),
        loginMethod: "email",
      };

      registeredUsers.push(newUser);
      localStorage.setItem(STORAGE_KEY_DB, JSON.stringify(registeredUsers));

      const sessionUser: User = {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        createdAt: newUser.createdAt,
        loginMethod: "email",
      };

      setUser(sessionUser);
      localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(sessionUser));
      setIsLoading(false);
      return { success: true };
    } catch (err) {
      setIsLoading(false);
      return {
        success: false,
        error: err instanceof Error ? err.message : "Gagal mendaftarkan akun.",
      };
    }
  };

  // ── Logout ─────────────────────────────────────────────────────
  type FBWindow = Window & {
    FB?: {
      getLoginStatus: (cb: (r: { status: string }) => void) => void;
      logout: (cb: () => void) => void;
    };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY_SESSION);
    // Sign out from Facebook SDK if available
    if (typeof window !== "undefined" && (window as FBWindow).FB) {
      const FB = (window as FBWindow).FB!;
      FB.getLoginStatus((response) => {
        if (response.status === "connected") {
          FB.logout(() => {});
        }
      });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        loginWithFacebook,
        logout,
        fbAccessToken: user?.fbAccessToken || null,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
