"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { AuthState, LoginPayload, RegisterPayload, User } from "@/types/auth";

interface AuthContextType extends AuthState {
  login: (payload: LoginPayload) => Promise<{ success: boolean; error?: string }>;
  register: (payload: RegisterPayload) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
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

  const login = async ({ email, password }: LoginPayload): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    // Simulate brief network delay
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

      // Check password (In production, replace with real backend or Firebase auth)
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
      };

      registeredUsers.push(newUser);
      localStorage.setItem(STORAGE_KEY_DB, JSON.stringify(registeredUsers));

      const sessionUser: User = {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        createdAt: newUser.createdAt,
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

  const logout = () => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY_SESSION);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
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
