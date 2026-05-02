// ============================================================
// tentang.tsx — UPDATED v2.3.0
// UI: minimalis compact, timeline pill horizontal changelog
// ============================================================
import React, { useState, useRef } from "react";
import {
  View, Text, StyleSheet, ScrollView, Image,
  TouchableOpacity, ActivityIndicator, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../lib/theme";

function getBorder(isDark: boolean) {
  return isDark ? "rgba(255,255,255,0.30)" : "rgba(0,0,0,0.22)";
}

const APP_VERSION = "3.0.1";
const GREEN = "#16a34a";
const LOGO = require("../assets/images/logo.png");

// ─── Changelog data — tambah entri baru di paling atas ───────
const CHANGELOG: { version: string; date: string; items: string[] }[] = [
  {
    version: "3.0.1",
    date: "Mei 2026",
    items: [
      "Tampilan UI minimalis terbaru di seluruh halaman",
      "Scrolling lebih halus dengan efek animasi yang diperbarui",
      "Tombol pencairan tersedia langsung di riwayat transaksi",
      "Browse & pilih audio dan gambar langsung dari perangkat",
      "Perbaikan bug dan pembaruan minor lainnya",
    ],
  },
  {
    version: "2.3.0",
    date: "Mei 2026",
    items: [
      "Nama aplikasi: Honda Visual On-site Capture",
      "Nomor mesin 12 karakter dengan indikator hijau/merah",
      "Waveform & timer rekam warna hijau",
      "Ikon Drive glowing hijau/merah",
      "Poin verifikasi konsumen diperbarui (8 item)",
      "Playback seek bar diperbaiki",
      "Icon navbar lebih besar, border lebih tebal",
    ],
  },
  {
    version: "2.2.0",
    date: "Apr 2026",
    items: [
      "Integrasi Google Drive API langsung dari aplikasi",
      "Upload audio & foto dalam satu sesi",
      "Dark mode sebagai tema default",
      "Animasi loading overlay baru",
    ],
  },
  {
    version: "2.1.0",
    date: "Mar 2026",
    items: [
      "Fitur rekam audio dengan waveform visual",
      "Tambah foto CDB dari kamera / galeri",
      "Preview foto sebelum upload",
      "Perbaikan stabilitas koneksi backend",
    ],
  },
  {
    version: "2.0.0",
    date: "Feb 2026",
    items: [
      "Rilis awal HAVOC",
      "Login dengan akun Sales People",
      "Form data konsumen dasar",
      "Dukungan Android & iOS",
    ],
  },
];

// ─── Main Screen ──────────────────────────────────────────────
export default function TentangScreen() {
  const router = useRouter();
  const { C, mode, toggleTheme } = useTheme();
  const isDark = mode === "dark";

  const [activeVersion, setActiveVersion] = useState(0);
  const [updateStatus, setUpdateStatus] = useState<"idle" | "checking" | "latest" | "update">("idle");

  const handleCekPembaruan = async () => {
    setUpdateStatus("checking");
    try {
      // TODO: ganti dengan endpoint backend
      // const res = await fetch(`${APP_BACKEND_URL}/api/app/version`);
      // const data = await res.json();
      // const latest = data.version;
      await new Promise(r => setTimeout(r, 1600));
      const latest = APP_VERSION;

      if (latest === APP_VERSION) {
        setUpdateStatus("latest");
      } else {
        setUpdateStatus("update");
        Alert.alert(
          "Pembaruan Tersedia 🚀",
          `Versi terbaru: v${latest}\nVersi kamu: v${APP_VERSION}\n\nUpdate melalui toko aplikasi.`,
          [{ text: "OK" }]
        );
      }
      setTimeout(() => setUpdateStatus("idle"), 3500);
    } catch {
      setUpdateStatus("idle");
      Alert.alert("Gagal", "Periksa koneksi internet kamu.");
    }
  };

  const isChecking = updateStatus === "checking";
  const isLatestOk = updateStatus === "latest";
  const hasUpdate = updateStatus === "update";
  const activeEntry = CHANGELOG[activeVersion];

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: C.bg }]}>

      {/* ── Header ── */}
      <View style={[s.header, { borderBottomColor: getBorder(isDark), backgroundColor: C.headerBg }]}>
        <TouchableOpacity onPress={() => router.back()} style={[s.iconBtn, { borderColor: getBorder(isDark) }]}>
          <Ionicons name="chevron-back" size={18} color={C.textPrimary} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: C.textPrimary }]}>Tentang Aplikasi</Text>
        <TouchableOpacity style={[s.iconBtn, { borderColor: getBorder(isDark) }]} onPress={toggleTheme} activeOpacity={0.7}>
          <Ionicons name={isDark ? "sunny" : "moon"} size={16} color={C.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* ── App Identity — logo kecil horizontal ── */}
        <View style={[s.identityCard, { backgroundColor: C.surface, borderColor: getBorder(isDark) }]}>
          <Image source={require("../assets/images/logo.png")} style={s.logo} resizeMode="contain" />
          <View style={s.identityInfo}>
            <Text style={[s.appName, { color: C.textPrimary }]} numberOfLines={1} adjustsFontSizeToFit>Honda Visual On-site Capture</Text>
            <View style={s.identityRow}>
              {/* Badge versi */}
              <View style={[s.versionPill, { backgroundColor: GREEN + "20" }]}>
                <Ionicons name="git-branch" size={10} color={GREEN} />
                <Text style={[s.versionPillText, { color: GREEN }]}>v{APP_VERSION}</Text>
              </View>
              {/* Tombol Cek Pembaruan — compact inline */}
              <TouchableOpacity
                style={[
                  s.cekBtn,
                  {
                    backgroundColor: isLatestOk ? GREEN + "18" : hasUpdate ? "#dc262618" : C.stripBg,
                    borderColor: "#2563eb",
                  },
                ]}
                onPress={handleCekPembaruan}
                disabled={isChecking}
                activeOpacity={0.75}
              >
                <View style={s.cekIconWrap}>
                  {isChecking
                    ? <ActivityIndicator size={12} color="#2563eb" style={{ transform: [{ scale: 0.7 }] }} />
                    : <Ionicons
                        name={isLatestOk ? "checkmark-circle" : hasUpdate ? "arrow-up-circle" : "refresh"}
                        size={12}
                        color={isLatestOk ? GREEN : hasUpdate ? "#dc2626" : "#2563eb"}
                      />
                  }
                </View>
                <Text style={[s.cekBtnText, {
                  color: isLatestOk ? GREEN : hasUpdate ? "#dc2626" : "#2563eb",
                }]}>
                  {isChecking ? "Memeriksa..." : isLatestOk ? "Terbaru ✓" : hasUpdate ? "Ada Update!" : "Cek update"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ── Info + Developer — satu card compact ── */}
        <View style={[s.card, { backgroundColor: C.surface, borderColor: getBorder(isDark) }]}>
          {/* Developer row */}
          <View style={s.devRow}>
            <View style={[s.devAvatar, { backgroundColor: C.primary }]}>
              <Text style={[s.devAvatarText, { color: C.primaryFg }]}>A</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.devName, { color: C.textPrimary }]}>Ahmad Ragash Putra</Text>
              <Text style={[s.devEmail, { color: C.accentDrive }]}>ragashhmunthe@gmail.com</Text>
            </View>
            <View style={[s.rolePill, { backgroundColor: C.stripBg }]}>
              <Text style={[s.roleText, { color: C.textSecondary }]}>Developer</Text>
            </View>
          </View>

          <View style={[s.divider, { backgroundColor: getBorder(isDark) }]} />

          {/* Info 2 kolom grid */}
          <View style={s.infoGrid}>
            {[
              { label: "Platform", value: "Android" },
              { label: "Backend", value: "FastAPI + MongoDB" },
              { label: "Storage", value: "Google Drive API" },
              { label: "Klien", value: "PT CDN" },
            ].map((item, i) => (
              <View key={i} style={s.infoGridItem}>
                <Text style={[s.infoGridLabel, { color: C.textSecondary }]}>{item.label}</Text>
                <Text style={[s.infoGridValue, { color: C.textPrimary }]}>{item.value}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Riwayat Pembaruan ── */}
        <View style={[s.card, { backgroundColor: C.surface, borderColor: getBorder(isDark), gap: 10 }]}>
          <View style={s.cardHeaderRow}>
            <Ionicons name="time-outline" size={14} color={C.textSecondary} />
            <Text style={[s.cardTitle, { color: C.textPrimary }]}>Riwayat Pembaruan</Text>
          </View>

          {/* Pill versi — horizontal scroll */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.pillRow}>
            {CHANGELOG.map((entry, i) => {
              const active = i === activeVersion;
              return (
                <TouchableOpacity
                  key={entry.version}
                  style={[
                    s.pill,
                    {
                      backgroundColor: active ? (i === 0 ? GREEN : "#2563eb") : "#2563eb15",
                      borderColor: active ? "transparent" : "#2563eb60",
                    },
                  ]}
                  onPress={() => setActiveVersion(i)}
                  activeOpacity={0.8}
                >
                  {i === 0 && (
                    <View style={[s.pillDot, { backgroundColor: active ? "#ffffff99" : GREEN }]} />
                  )}
                  <Text style={[s.pillText, { color: active ? "#ffffff" : C.textPrimary }]}>
                    v{entry.version}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Detail versi aktif */}
          <View style={[s.detailBox, { backgroundColor: C.bg, borderColor: getBorder(isDark) }]}>
            <View style={s.detailHeader}>
              <Text style={[s.detailVersion, { color: C.textPrimary }]}>v{activeEntry.version}</Text>
              <Text style={[s.detailDate, { color: C.textSecondary }]}>{activeEntry.date}</Text>
            </View>
            {activeEntry.items.map((item, i) => (
              <View key={i} style={s.detailRow}>
                <View style={[s.detailDot, { backgroundColor: activeVersion === 0 ? GREEN : C.textMuted }]} />
                <Text style={[s.detailText, { color: C.textSecondary }]}>{item}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Copyright ── */}
        <Text style={[s.copyright, { color: C.textSecondary }]}>
          © 2026 PT Capella Dinamik Nusantara · Ahmad Ragash Putra
        </Text>

        <View style={{ height: 16 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1,
  },
  iconBtn: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center", borderWidth: 1.5 },
  headerTitle: { fontSize: 14, fontWeight: "800" },
  content: { padding: 12, gap: 10, paddingBottom: 32 },

  // Identity card
  identityCard: {
    flexDirection: "row", alignItems: "center", gap: 14,
    padding: 14, borderRadius: 14, borderWidth: 1.5,
  },
  logo: { width: 64, height: 64, borderRadius: 12 },
  identityInfo: { flex: 1, gap: 8 },
  appName: { fontSize: 15, fontWeight: "900", lineHeight: 20 },
  identityRow: { flexDirection: "row", alignItems: "center", gap: 7, flexWrap: "wrap" },
  versionPill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  versionPillText: { fontSize: 11, fontWeight: "800" },
  cekBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  cekIconWrap: { width: 12, height: 12, alignItems: "center", justifyContent: "center" },
  cekBtnText: { fontSize: 11, fontWeight: "700" },

  // Card
  card: { borderRadius: 14, borderWidth: 1.5, padding: 12, gap: 10 },
  cardHeaderRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  cardTitle: { fontSize: 13, fontWeight: "800" },
  divider: { height: 1 },

  // Developer
  devRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  devAvatar: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  devAvatarText: { fontSize: 16, fontWeight: "900" },
  devName: { fontSize: 13, fontWeight: "800" },
  devEmail: { fontSize: 11, marginTop: 1, fontWeight: "600" },
  rolePill: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8 },
  roleText: { fontSize: 13, fontWeight: "700" },

  // Info grid
  infoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  infoGridItem: { width: "47%", gap: 2 },
  infoGridLabel: { fontSize: 11, fontWeight: "600" },
  infoGridValue: { fontSize: 12, fontWeight: "800" },

  // Changelog pills
  pillRow: { flexDirection: "row", gap: 6, paddingVertical: 2 },
  pill: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  pillText: { fontSize: 12, fontWeight: "700" },
  pillDot: { width: 5, height: 5, borderRadius: 3 },

  // Changelog detail
  detailBox: { borderRadius: 10, borderWidth: 1, padding: 12, gap: 7 },
  detailHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 2 },
  detailVersion: { fontSize: 13, fontWeight: "900" },
  detailDate: { fontSize: 12, fontWeight: "600" },
  detailRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  detailDot: { width: 5, height: 5, borderRadius: 3, marginTop: 6 },
  detailText: { fontSize: 12, lineHeight: 18, flex: 1 },

  copyright: { fontSize: 11, textAlign: "center", lineHeight: 17 },
});
