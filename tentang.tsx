// ============================================================
// tentang.tsx — UPDATED v2.3.0
// Nama aplikasi → Honda Visual On-site Capture
// ============================================================
import React from "react";
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../lib/theme";

const APP_VERSION = "2.3.0";

export default function TentangScreen() {
  const router = useRouter();
  const { C, mode, toggleTheme } = useTheme();
  const isDark = mode === "dark";

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: C.bg }]}>
      <View style={[s.header, { borderBottomColor: C.border, backgroundColor: C.headerBg }]}>
        <TouchableOpacity onPress={() => router.back()} style={[s.backBtn, { borderColor: C.border }]}>
          <Ionicons name="chevron-back" size={18} color={C.textPrimary} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: C.textPrimary }]}>Tentang Aplikasi</Text>
        <TouchableOpacity
          style={[s.themeBtn, { borderColor: C.border }]}
          onPress={toggleTheme}
          activeOpacity={0.7}
        >
          <Ionicons name={isDark ? "sunny" : "moon"} size={16} color={C.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={[s.content, { backgroundColor: C.bg }]} showsVerticalScrollIndicator={false}>

        <View style={[s.logoSection, { backgroundColor: C.surface, borderColor: C.border }]}>
          {/* Image: replace require() with actual import in your Expo project */}
          {/* <Image source={require("../assets/images/icon.png")} style={s.logo} resizeMode="contain" /> */}
          <Text style={[s.appName, { color: C.textPrimary }]}>Honda Visual On-site Capture</Text>
          <Text style={[s.appCompany, { color: C.textSecondary }]}>PT Capella Dinamik Nusantara</Text>
          <View style={[s.versionBadge, { backgroundColor: C.stripBg }]}>
            <Ionicons name="git-branch" size={12} color={C.textMuted} />
            <Text style={[s.versionText, { color: C.textMuted }]}>v{APP_VERSION}</Text>
          </View>
        </View>

        <View style={[s.card, { backgroundColor: C.surface, borderColor: C.border }]}>
          <View style={s.cardHeader}>
            <Ionicons name="code-slash" size={15} color={C.textSecondary} />
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

        <View style={[s.card, { backgroundColor: C.surface, borderColor: C.border }]}>
          <View style={s.cardHeader}>
            <Ionicons name="information-circle" size={15} color={C.textSecondary} />
            <Text style={[s.cardTitle, { color: C.textPrimary }]}>Informasi Aplikasi</Text>
          </View>
          {[
            { label: "Versi", value: APP_VERSION },
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

        <Text style={[s.copyright, { color: C.textMuted }]}>
          © 2026 PT Capella Dinamik Nusantara.{"\n"}Dikembangkan oleh Ahmad Ragash Putra.
        </Text>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1 },
  backBtn: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  themeBtn: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  headerTitle: { fontSize: 15, fontWeight: "800" },
  content: { padding: 12, gap: 10, paddingBottom: 40 },
  logoSection: { alignItems: "center", paddingVertical: 24, gap: 6, borderRadius: 14, borderWidth: 1 },
  logo: { width: 72, height: 72, borderRadius: 14 },
  appName: { fontSize: 14, fontWeight: "900", textAlign: "center" },
  appCompany: { fontSize: 11, fontWeight: "600", textAlign: "center" },
  versionBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, marginTop: 4 },
  versionText: { fontSize: 11, fontWeight: "800" },
  card: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 10 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 7 },
  cardTitle: { fontSize: 13, fontWeight: "800" },
  devRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  devAvatar: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  devAvatarText: { fontSize: 18, fontWeight: "900" },
  devName: { fontSize: 13, fontWeight: "900" },
  devRole: { fontSize: 11, marginTop: 1 },
  devEmail: { fontSize: 11, marginTop: 1, fontWeight: "600" },
  infoRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1 },
  infoLabel: { fontSize: 12, fontWeight: "600", flex: 1 },
  infoValue: { fontSize: 12, fontWeight: "800", flex: 1, textAlign: "right" },
  copyright: { fontSize: 11, textAlign: "center", lineHeight: 17 },
});
