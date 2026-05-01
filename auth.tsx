import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL!;
const TOKEN_KEY = "smh_jwt_token";

export type AuthUser = {
  id: string;
  email: string;
  nama_lengkap: string;
  role: string;
  drive_folder_id?: string | null;
  unit_usaha?: string | null;
};

type AuthCtx = {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, nama_lengkap: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateProfile: (nama_lengkap: string, unit_usaha?: string) => Promise<void>;
  changePassword: (old_password: string, new_password: string) => Promise<void>;
  updateDriveFolder: (drive_folder_id: string) => Promise<void>;
  generateRecoveryToken: () => Promise<{ token: string; generated_at: string }>;
  getRecoveryStatus: () => Promise<{ has_token: boolean; generated_at: string | null }>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchMe = useCallback(async (jwt: string): Promise<AuthUser | null> => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${jwt}` },
      });
      if (!res.ok) return null;
      return (await res.json()) as AuthUser;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(TOKEN_KEY);
        if (stored) {
          const u = await fetchMe(stored);
          if (u) {
            setToken(stored);
            setUser(u);
          } else {
            await AsyncStorage.removeItem(TOKEN_KEY);
          }
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [fetchMe]);

  const login = async (email: string, password: string) => {
    const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(typeof data.detail === "string" ? data.detail : "Login gagal");
    }
    await AsyncStorage.setItem(TOKEN_KEY, data.access_token);
    setToken(data.access_token);
    setUser(data.user);
  };

  const register = async (email: string, password: string, nama_lengkap: string) => {
    const res = await fetch(`${BACKEND_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        password,
        nama_lengkap: nama_lengkap.trim(),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      const detail = data.detail;
      const msg =
        typeof detail === "string"
          ? detail
          : Array.isArray(detail)
            ? detail.map((d: any) => d.msg ?? JSON.stringify(d)).join(", ")
            : "Registrasi gagal";
      throw new Error(msg);
    }
    await AsyncStorage.setItem(TOKEN_KEY, data.access_token);
    setToken(data.access_token);
    setUser(data.user);
  };

  const logout = async () => {
    await AsyncStorage.removeItem(TOKEN_KEY);
    setUser(null);
    setToken(null);
  };

  const refreshUser = async () => {
    if (token) {
      const u = await fetchMe(token);
      if (u) setUser(u);
    }
  };

  const updateProfile = async (nama_lengkap: string, unit_usaha?: string) => {
    if (!token) throw new Error("Tidak terotentikasi");
    const body: any = { nama_lengkap: nama_lengkap.trim() };
    if (unit_usaha !== undefined) body.unit_usaha = unit_usaha;
    const res = await fetch(`${BACKEND_URL}/api/auth/profile`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      const detail = data.detail;
      const msg = typeof detail === "string" ? detail : Array.isArray(detail) ? detail.map((d: any) => d.msg ?? JSON.stringify(d)).join(", ") : "Gagal update profil";
      throw new Error(msg);
    }
    setUser(data as AuthUser);
  };

  const changePassword = async (old_password: string, new_password: string) => {
    if (!token) throw new Error("Tidak terotentikasi");
    const res = await fetch(`${BACKEND_URL}/api/auth/change-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ old_password, new_password }),
    });
    const data = await res.json();
    if (!res.ok) {
      const detail = data.detail;
      const msg = typeof detail === "string" ? detail : Array.isArray(detail) ? detail.map((d: any) => d.msg ?? JSON.stringify(d)).join(", ") : "Gagal ganti password";
      throw new Error(msg);
    }
  };

  const updateDriveFolder = async (drive_folder_id: string) => {
    if (!token) throw new Error("Tidak terotentikasi");
    const res = await fetch(`${BACKEND_URL}/api/auth/drive-folder`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ drive_folder_id }),
    });
    const data = await res.json();
    if (!res.ok) {
      const detail = data.detail;
      const msg = typeof detail === "string" ? detail : Array.isArray(detail) ? detail.map((d: any) => d.msg ?? JSON.stringify(d)).join(", ") : "Gagal update folder Drive";
      throw new Error(msg);
    }
    setUser(data as AuthUser);
  };

  const generateRecoveryToken = async () => {
    if (!token) throw new Error("Tidak terotentikasi");
    const res = await fetch(`${BACKEND_URL}/api/auth/recovery/generate`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) {
      const detail = data.detail;
      const msg = typeof detail === "string" ? detail : "Gagal generate kode recovery";
      throw new Error(msg);
    }
    return data as { token: string; generated_at: string };
  };

  const getRecoveryStatus = async () => {
    if (!token) throw new Error("Tidak terotentikasi");
    const res = await fetch(`${BACKEND_URL}/api/auth/recovery/status`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error("Gagal cek status recovery");
    return data as { has_token: boolean; generated_at: string | null };
  };

  return (
    <Ctx.Provider value={{ user, token, loading, login, register, logout, refreshUser, updateProfile, changePassword, updateDriveFolder, generateRecoveryToken, getRecoveryStatus }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth(): AuthCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used inside AuthProvider");
  return c;
}

export async function authFetch(token: string | null, url: string, init?: RequestInit) {
  const headers = new Headers(init?.headers || {});
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(url, { ...init, headers });
}

export const APP_BACKEND_URL = BACKEND_URL;
