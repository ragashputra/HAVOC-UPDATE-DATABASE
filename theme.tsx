import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

type ThemeMode = "light" | "dark";

type ThemeCtx = {
  mode: ThemeMode;
  toggleTheme: () => void;
  C: typeof LIGHT;
};

export const LIGHT = {
  bg: "#FFFFFF",
  surface: "#F4F4F5",
  surfaceCard: "#FAFAFA",
  border: "#E4E4E7",
  borderStrong: "#18181B",
  textPrimary: "#18181B",
  textSecondary: "#52525B",
  textMuted: "#A1A1AA",
  primary: "#18181B",
  primaryFg: "#FFFFFF",
  accentRecord: "#E11D48",
  accentSuccess: "#059669",
  accentDrive: "#2563EB",
  accentWarning: "#D97706",
  overlay: "rgba(0,0,0,0.55)",
  inputBg: "#F4F4F5",
  headerBg: "#FFFFFF",
  badgeSuccessBg: "#ECFDF5",
  badgeSuccessText: "#059669",
  badgeOffBg: "#F4F4F5",
  badgeOffText: "#52525B",
  verifikasiBg: "#FFF5F5",
  verifikasiText: "#DC2626",
  cdbBg: "#EFF6FF",
  menuBg: "#FFFFFF",
  deleteBtn: "#FFF1F2",
  connectedHintBg: "#ECFDF5",
  stripBg: "#F4F4F5",
};

export const DARK = {
  bg: "#09090B",
  surface: "#18181B",
  surfaceCard: "#1C1C1F",
  border: "#27272A",
  borderStrong: "#52525B",
  textPrimary: "#FAFAFA",
  textSecondary: "#A1A1AA",
  textMuted: "#52525B",
  primary: "#FAFAFA",
  primaryFg: "#09090B",
  accentRecord: "#F43F5E",
  accentSuccess: "#10B981",
  accentDrive: "#60A5FA",
  accentWarning: "#FBBF24",
  overlay: "rgba(0,0,0,0.75)",
  inputBg: "#27272A",
  headerBg: "#09090B",
  badgeSuccessBg: "#064E3B",
  badgeSuccessText: "#10B981",
  badgeOffBg: "#27272A",
  badgeOffText: "#A1A1AA",
  verifikasiBg: "#1F0A0A",
  verifikasiText: "#F87171",
  cdbBg: "#0F1B2D",
  menuBg: "#18181B",
  deleteBtn: "#2D0D0D",
  connectedHintBg: "#064E3B",
  stripBg: "#18181B",
};

const ThemeContext = createContext<ThemeCtx | null>(null);
const THEME_KEY = "smh_theme_mode";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>("light");

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then((v) => {
      if (v === "dark" || v === "light") setMode(v);
    });
  }, []);

  const toggleTheme = async () => {
    const next: ThemeMode = mode === "light" ? "dark" : "light";
    setMode(next);
    await AsyncStorage.setItem(THEME_KEY, next);
  };

  const C = mode === "dark" ? DARK : LIGHT;

  return (
    <ThemeContext.Provider value={{ mode, toggleTheme, C }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeCtx {
  const c = useContext(ThemeContext);
  if (!c) throw new Error("useTheme must be used inside ThemeProvider");
  return c;
}
