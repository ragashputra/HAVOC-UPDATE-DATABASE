// ============================================================
// profile.tsx — UPDATED
// Perubahan: Mengikuti navbar minimal (back button compact)
// ============================================================
import React, { useEffect, useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Modal,
  Platform, ActivityIndicator, ScrollView, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../lib/auth";
import { useTheme } from "../lib/theme";

// Border tegas adaptive — dark: putih 30%, light: hitam 22%
function getBorder(isDark: boolean) {
  return isDark ? "rgba(255,255,255,0.30)" : "rgba(0,0,0,0.22)";
}

// Warna label yang lebih kontras — dark: putih 75%, light: hitam 60%
function getLabelColor(isDark: boolean) {
  return isDark ? "rgba(255,255,255,0.75)" : "rgba(0,0,0,0.60)";
}

// Warna placeholder yang lebih kontras — dark: putih 55%, light: hitam 40%
function getPlaceholderColor(isDark: boolean) {
  return isDark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.40)";
}


export default function ProfileScreen() {
  const { user, updateProfile, refreshUser, generateRecoveryToken, getRecoveryStatus } = useAuth();
  const { C, mode } = useTheme();
  const isDark = mode === "dark";
  const router = useRouter();

  const [namaLengkap, setNamaLengkap] = useState(user?.nama_lengkap ?? "");
  const [unitUsaha, setUnitUsaha] = useState(user?.unit_usaha ?? "");
  const [savingProfile, setSavingProfile] = useState(false);
  const [recoveryStatus, setRecoveryStatus] = useState(null);
  const [generatingToken, setGeneratingToken] = useState(false);
  const [shownToken, setShownToken] = useState(null);

  useEffect(() => {
    getRecoveryStatus().then(setRecoveryStatus).catch(() => { });
  }, [getRecoveryStatus]);

  const onSaveProfile = async () => {
    if (!namaLengkap.trim() || namaLengkap.trim().length < 2) { Alert.alert("Tidak valid", "Nama minimal 2 karakter"); return; }
    if (!unitUsaha.trim()) { Alert.alert("Wajib diisi", "Unit Usaha wajib diisi"); return; }
    setSavingProfile(true);
    try {
      await updateProfile(namaLengkap, unitUsaha.trim().toUpperCase());
      await refreshUser();
      Alert.alert("Berhasil", "Profil berhasil diperbarui");
    } catch (e) { Alert.alert("Gagal", e?.message ?? "Tidak bisa update profil"); }
    finally { setSavingProfile(false); }
  };

  const onPressGenerate = () => {
    if (recoveryStatus?.has_token) {
      Alert.alert("Generate Ulang?", "Kode lama akan hangus.", [
        { text: "Batal", style: "cancel" },
        { text: "Generate Ulang", style: "destructive", onPress: doGenerate },
      ]);
    } else { doGenerate(); }
  };

  const doGenerate = async () => {
    setGeneratingToken(true);
    try {
      const result = await generateRecoveryToken();
      setShownToken(result.token);
      setRecoveryStatus({ has_token: true, generated_at: result.generated_at });
    } catch (e) { Alert.alert("Gagal", e?.message ?? "Gagal generate kode"); }
    finally { setGeneratingToken(false); }
  };

  const copyToken = async () => {
    if (!shownToken) return;
    try {
      const { Share } = await import("react-native");
      await Share.share({ message: `Kode Recovery: ${shownToken}` });
    } catch { Alert.alert("Kode Recovery", shownToken ?? ""); }
  };

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: C.bg }]}>
      {/* Header compact */}
      <View style={[s.header, { borderBottomColor: getBorder(isDark), backgroundColor: C.headerBg }]}>
        <TouchableOpacity onPress={() => router.back()} style={[s.iconBtn, { borderColor: getBorder(isDark) }]}>
          <Ionicons name="chevron-back" size={18} color={C.textPrimary} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: C.textPrimary }]}>Profil / Akun</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={[s.content, { backgroundColor: C.bg }]} showsVerticalScrollIndicator={false}>

        {/* Avatar card */}
        <View style={[s.avatarCard, { backgroundColor: C.surface, borderColor: getBorder(isDark) }]}>
          <View style={[s.avatar, { backgroundColor: C.primary }]}>
            <Text style={[s.avatarText, { color: C.primaryFg }]}>{(user?.nama_lengkap ?? "U")[0].toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.infoName, { color: C.textPrimary }]}>{user?.nama_lengkap}</Text>
            <Text style={[s.infoEmail, { color: C.textSecondary }]}>{user?.email}</Text>
            <View style={[s.roleBadge, { backgroundColor: C.stripBg }]}>
              <Text style={[s.roleText, { color: C.textSecondary }]}>{user?.role?.toUpperCase() ?? "USER"}</Text>
            </View>
          </View>
        </View>

        {/* Edit profil */}
        <View style={[s.card, { backgroundColor: C.surface, borderColor: getBorder(isDark) }]}>
          <View style={s.cardRow}>
            <Ionicons name="person" size={15} color={C.textSecondary} />
            <Text style={[s.cardTitle, { color: C.textPrimary }]}>Data Karyawan</Text>
          </View>

          <Text style={[s.label, { color: getLabelColor(isDark) }]}>NAMA LENGKAP</Text>
          <TextInput
            style={[s.input, { backgroundColor: C.inputBg, borderColor: getBorder(isDark), color: C.textPrimary }]}
            value={namaLengkap}
            onChangeText={setNamaLengkap}
            placeholder="Nama lengkap"
            placeholderTextColor={getPlaceholderColor(isDark)}
            autoCapitalize="words"
            editable={!savingProfile}
          />

          <Text style={[s.label, { color: getLabelColor(isDark) }]}>UNIT USAHA</Text>
          <TextInput
            style={[s.input, { backgroundColor: C.inputBg, borderColor: getBorder(isDark), color: C.textPrimary }]}
            value={unitUsaha}
            onChangeText={(t) => setUnitUsaha(t.toUpperCase())}
            placeholder="Nama cabang/unit usaha"
            placeholderTextColor={getPlaceholderColor(isDark)}
            autoCapitalize="characters"
            editable={!savingProfile}
          />
          <Text style={[s.hint, { color: getLabelColor(isDark) }]}>Nama cabang/unit usaha tempat bertugas.</Text>

          <TouchableOpacity
            style={[s.btnPrimary, { backgroundColor: C.primary, opacity: savingProfile ? 0.7 : 1 }]}
            onPress={onSaveProfile}
            disabled={savingProfile}
            activeOpacity={0.8}
          >
            {savingProfile ? <ActivityIndicator color={C.primaryFg} /> : (
              <>
                <Ionicons name="checkmark" size={16} color={C.primaryFg} />
                <Text style={[s.btnPrimaryText, { color: C.primaryFg }]}>Simpan Profil</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Kode Recovery */}
        <View style={[s.card, { backgroundColor: C.surface, borderColor: getBorder(isDark) }]}>
          <View style={s.cardRow}>
            <Ionicons name="key" size={15} color={C.textSecondary} />
            <Text style={[s.cardTitle, { color: C.textPrimary }]}>Kode Recovery Password</Text>
          </View>
          <Text style={[s.hint, { color: getLabelColor(isDark) }]}>
            Kode cadangan jika lupa password. Ditampilkan SEKALI SAJA — wajib di-screenshot.
          </Text>

          <View style={[s.statusBox, {
            backgroundColor: recoveryStatus?.has_token ? C.badgeSuccessBg : C.badgeOffBg,
            borderColor: recoveryStatus?.has_token ? C.accentSuccess : getBorder(isDark)
          }]}>
            <Ionicons
              name={recoveryStatus?.has_token ? "checkmark-circle" : "alert-circle"}
              size={16}
              color={recoveryStatus?.has_token ? C.accentSuccess : C.textMuted}
            />
            <Text style={[s.statusText, { color: recoveryStatus?.has_token ? C.accentSuccess : C.textMuted }]}>
              {recoveryStatus?.has_token
                ? `Kode aktif ${recoveryStatus.generated_at ? `· ${new Date(recoveryStatus.generated_at).toLocaleDateString("id-ID")}` : ""}`
                : "Belum ada kode recovery"}
            </Text>
          </View>

          <TouchableOpacity
            style={[s.btnPrimary, { backgroundColor: C.primary, opacity: generatingToken ? 0.7 : 1 }]}
            onPress={onPressGenerate}
            disabled={generatingToken}
            activeOpacity={0.8}
          >
            {generatingToken ? <ActivityIndicator color={C.primaryFg} /> : (
              <>
                <Ionicons name="key" size={16} color={C.primaryFg} />
                <Text style={[s.btnPrimaryText, { color: C.primaryFg }]}>
                  {recoveryStatus?.has_token ? "Generate Ulang" : "Generate Kode"}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Navigasi lainnya */}
        <View style={[s.card, { backgroundColor: C.surface, borderColor: getBorder(isDark) }]}>
          {[
            { icon: "lock-closed-outline", label: "Ganti Password", route: "/ganti-password" },
            { icon: "folder-outline", label: "Folder Google Drive", route: "/folder-drive" },
            { icon: "information-circle-outline", label: "Tentang Aplikasi", route: "/tentang" },
          ].map((item, i) => (
            <TouchableOpacity
              key={i}
              style={[s.menuRow, i > 0 && { borderTopWidth: 1, borderTopColor: getBorder(isDark) }]}
              onPress={() => router.push(item.route)}
              activeOpacity={0.7}
            >
              <Ionicons name={item.icon} size={18} color={C.textSecondary} />
              <Text style={[s.menuLabel, { color: C.textPrimary }]}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={16} color={C.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Modal token */}
      <Modal visible={!!shownToken} transparent animationType="fade" onRequestClose={() => setShownToken(null)}>
        <View style={s.modalBackdrop}>
          <View style={[s.tokenModal, { backgroundColor: C.surface, borderColor: getBorder(isDark) }]}>
            <View style={[s.iconBox2, { backgroundColor: C.badgeSuccessBg }]}>
              <Ionicons name="key" size={28} color={C.accentSuccess} />
            </View>
            <Text style={[s.tokenModalTitle, { color: C.textPrimary }]}>Kode Recovery Anda</Text>
            <Text style={[s.tokenModalSub, { color: C.textSecondary }]}>Ditampilkan SEKALI SAJA — screenshot sekarang!</Text>
            <View style={[s.tokenBox, { backgroundColor: C.bg, borderColor: getBorder(isDark) }]}>
              <Text style={[s.tokenBoxText, { color: C.textPrimary }]}>{shownToken}</Text>
            </View>
            <TouchableOpacity style={[s.btnPrimary, { backgroundColor: C.primary, width: "100%" }]} onPress={copyToken} activeOpacity={0.8}>
              <Ionicons name="share-outline" size={16} color={C.primaryFg} />
              <Text style={[s.btnPrimaryText, { color: C.primaryFg }]}>Bagikan / Salin Kode</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.btnOutline, { borderColor: getBorder(isDark), width: "100%" }]} onPress={() => setShownToken(null)} activeOpacity={0.8}>
              <Text style={[s.btnOutlineText, { color: C.textPrimary }]}>Sudah Saya Screenshot</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1 },
  iconBtn: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", borderWidth: 1.5 },
  headerTitle: { fontSize: 15, fontWeight: "800" },
  content: { padding: 12, gap: 10, paddingBottom: 40 },
  avatarCard: { flexDirection: "row", alignItems: "center", gap: 14, padding: 14, borderRadius: 16, borderWidth: 1.5 },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 20, fontWeight: "800" },
  infoName: { fontSize: 14, fontWeight: "800" },
  infoEmail: { fontSize: 11, marginTop: 1 },
  roleBadge: { marginTop: 5, alignSelf: "flex-start", paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  roleText: { fontSize: 10, fontWeight: "700" },
  card: { borderRadius: 16, borderWidth: 1.5, padding: 14, gap: 8 },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  cardTitle: { fontSize: 13, fontWeight: "800" },
  label: { fontSize: 10, fontWeight: "700", letterSpacing: 1.2, marginTop: 4 },
  input: { height: 46, borderWidth: 2, borderRadius: 12, paddingHorizontal: 13, fontSize: 14, fontWeight: "500" },
  hint: { fontSize: 13, fontWeight: "500", lineHeight: 18 },
  statusBox: { flexDirection: "row", alignItems: "center", gap: 8, padding: 10, borderRadius: 10, borderWidth: 1.5 },
  statusText: { fontSize: 12, fontWeight: "600", flex: 1 },
  btnPrimary: { height: 46, borderRadius: 12, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 7, marginTop: 2 },
  btnPrimaryText: { fontWeight: "700", fontSize: 14 },
  btnOutline: { height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 7, borderWidth: 1.5 },
  btnOutlineText: { fontWeight: "600", fontSize: 13 },
  menuRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12 },
  menuLabel: { flex: 1, fontSize: 13, fontWeight: "600" },
  iconBox2: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center", padding: 24 },
  tokenModal: { width: "100%", borderRadius: 20, borderWidth: 1.5, padding: 22, alignItems: "center", gap: 10 },
  tokenModalTitle: { fontSize: 17, fontWeight: "800" },
  tokenModalSub: { fontSize: 12, textAlign: "center" },
  tokenBox: { width: "100%", paddingVertical: 16, paddingHorizontal: 12, borderRadius: 14, borderWidth: 1.5, alignItems: "center" },
  tokenBoxText: { fontSize: 32, fontWeight: "900", letterSpacing: 10, fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" },
});