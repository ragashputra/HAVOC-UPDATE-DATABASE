import React from "react";
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../lib/theme";
import appJson from "../app.json";

export default function TentangScreen() {
  const router = useRouter();
  const { C, mode, toggleTheme } = useTheme();
  const version = appJson?.expo?.version ?? "2.1.0";
  const isDark = mode === "dark";

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: C.bg }]} edges={["top","left","right"]}>
      <View style={[s.header, { backgroundColor: C.headerBg, borderBottomColor: C.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={[s.backBtn, { borderColor: C.border }]}>
          <Ionicons name="arrow-back" size={20} color={C.textPrimary} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: C.textPrimary }]}>Tentang Aplikasi</Text>
        <TouchableOpacity onPress={toggleTheme} style={[s.themeBtn, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Ionicons name={isDark ? "sunny" : "moon"} size={16} color={isDark ? "#FBBF24" : C.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={[s.content, { backgroundColor: C.bg }]}>
        {/* Logo */}
        <View style={[s.logoSection, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Image
            source={{ uri: "https://customer-assets.emergentagent.com/job_audio-archiver/artifacts/o8vroxrg_LOGO%20APLIKASIKU.png" }}
            style={s.logo} resizeMode="contain"
          />
          <Text style={[s.appName, { color: C.textPrimary }]}>Voice Record Customer Honda</Text>
          <Text style={[s.appCompany, { color: C.textSecondary }]}>PT Capella Dinamik Nusantara</Text>
          <View style={[s.versionBadge, { backgroundColor: C.primary }]}>
            <Ionicons name="layers-outline" size={12} color={C.primaryFg} />
            <Text style={[s.versionText, { color: C.primaryFg }]}>v{version}</Text>
          </View>
        </View>

        {/* Developer */}
        <View style={[s.card, { backgroundColor: C.surface, borderColor: C.border }]}>
          <View style={s.cardHeader}>
            <Ionicons name="code-slash" size={16} color={C.textPrimary} />
            <Text style={[s.cardTitle, { color: C.textPrimary }]}>Developer</Text>
          </View>
          <View style={s.devRow}>
            <View style={[s.devAvatar, { backgroundColor: C.primary }]}>
              <Text style={[s.devAvatarText, { color: C.primaryFg }]}>A</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.devName, { color: C.textPrimary }]}>AHMAD RAGASH PUTRA</Text>
              <Text style={[s.devRole, { color: C.textSecondary }]}>Mobile App Developer</Text>
              <Text style={[s.devEmail, { color: C.accentDrive }]}>ragashhmunthe@gmail.com</Text>
            </View>
          </View>
        </View>

        {/* Info Aplikasi */}
        <View style={[s.card, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Text style={[s.cardTitle, { color: C.textPrimary }]}>Informasi Aplikasi</Text>
          {[
            { label: "Versi", value: version },
            { label: "Platform", value: "Android / iOS" },
            { label: "Backend", value: "FastAPI + MongoDB" },
            { label: "Storage", value: "Google Drive API" },
            { label: "Dibuat untuk", value: "PT Capella Dinamik Nusantara" },
          ].map((item, i) => (
            <View key={i} style={[s.infoRow, { borderBottomColor: C.border }]}>
              <Text style={[s.infoLabel, { color: C.textSecondary }]}>{item.label}</Text>
              <Text style={[s.infoValue, { color: C.textPrimary }]}>{item.value}</Text>
            </View>
          ))}
        </View>

        {/* Copyright */}
        <Text style={[s.copyright, { color: C.textMuted }]}>
          © 2024–2026 PT Capella Dinamik Nusantara.{"\n"}Dikembangkan oleh Ahmad Ragash Putra.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1 },
  backBtn: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  themeBtn: { width: 36, height: 36, borderRadius: 16, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  headerTitle: { fontSize: 15, fontWeight: "800" },
  content: { padding: 14, gap: 12, paddingBottom: 40 },
  logoSection: { alignItems: "center", paddingVertical: 24, gap: 6, borderRadius: 14, borderWidth: 1 },
  logo: { width: 80, height: 80, borderRadius: 16 },
  appName: { fontSize: 15, fontWeight: "900", textAlign: "center" },
  appCompany: { fontSize: 11, fontWeight: "600", textAlign: "center" },
  versionBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, marginTop: 4 },
  versionText: { fontSize: 11, fontWeight: "800" },
  card: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 12 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardTitle: { fontSize: 13, fontWeight: "800" },
  devRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  devAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  devAvatarText: { fontSize: 20, fontWeight: "900" },
  devName: { fontSize: 13, fontWeight: "900" },
  devRole: { fontSize: 11, marginTop: 1 },
  devEmail: { fontSize: 11, marginTop: 1, fontWeight: "600" },
  infoRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1 },
  infoLabel: { fontSize: 12, fontWeight: "600", flex: 1 },
  infoValue: { fontSize: 12, fontWeight: "800", flex: 1, textAlign: "right" },
  copyright: { fontSize: 11, textAlign: "center", lineHeight: 17 },
});
