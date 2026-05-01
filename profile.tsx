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

export default function ProfileScreen() {
  const { user, updateProfile, refreshUser, generateRecoveryToken, getRecoveryStatus } = useAuth();
  const { C } = useTheme();
  const router = useRouter();

  const [namaLengkap, setNamaLengkap] = useState(user?.nama_lengkap ?? "");
  const [unitUsaha, setUnitUsaha] = useState(user?.unit_usaha ?? "");
  const [savingProfile, setSavingProfile] = useState(false);
  const [recoveryStatus, setRecoveryStatus] = useState<{ has_token: boolean; generated_at: string | null } | null>(null);
  const [generatingToken, setGeneratingToken] = useState(false);
  const [shownToken, setShownToken] = useState<string | null>(null);

  useEffect(() => {
    getRecoveryStatus().then(setRecoveryStatus).catch(() => {});
  }, [getRecoveryStatus]);

  const onSaveProfile = async () => {
    if (!namaLengkap.trim() || namaLengkap.trim().length < 2) { Alert.alert("Tidak valid", "Nama minimal 2 karakter"); return; }
    if (!unitUsaha.trim()) { Alert.alert("Wajib diisi", "Unit Usaha wajib diisi"); return; }
    setSavingProfile(true);
    try {
      await updateProfile(namaLengkap, unitUsaha.trim().toUpperCase());
      await refreshUser();
      Alert.alert("Berhasil", "Profil berhasil diperbarui");
    } catch (e: any) { Alert.alert("Gagal", e?.message ?? "Tidak bisa update profil"); }
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
    } catch (e: any) { Alert.alert("Gagal", e?.message ?? "Gagal generate kode"); }
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
      <View style={[s.header, { borderBottomColor: C.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={[s.iconBtn, { borderColor: C.border }]}>
          <Ionicons name="chevron-back" size={18} color={C.textPrimary} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: C.textPrimary }]}>Profil / Akun</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={[s.avatarCard, { backgroundColor: C.surface, borderColor: C.border }]}>
          <View style={[s.avatar, { backgroundColor: C.primary }]}>
            <Text style={[s.avatarText, { color: C.primaryFg }]}>{(user?.nama_lengkap ?? "U")[0].toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.infoName, { color: C.textPrimary }]}>{user?.nama_lengkap}</Text>
            <Text style={[s.infoEmail, { color: C.textMuted }]}>{user?.email}</Text>
            <View style={[s.roleBadge, { backgroundColor: C.inputBg }]}>
              <Text style={[s.roleText, { color: C.textSecondary }]}>{user?.role?.toUpperCase() ?? "USER"}</Text>
            </View>
          </View>
        </View>

        <View style={[s.card, { backgroundColor: C.surface, borderColor: C.border }]}>
          <View style={s.cardRow}>
            <Ionicons name="person-outline" size={15} color={C.textSecondary} />
            <Text style={[s.cardTitle, { color: C.textPrimary }]}>Data Karyawan</Text>
          </View>
          <Text style={[s.label, { color: C.textMuted }]}>NAMA LENGKAP</Text>
          <TextInput
            style={[s.input, { backgroundColor: C.inputBg, borderColor: C.border, color: C.textPrimary }]}
            value={namaLengkap}
            onChangeText={setNamaLengkap}
            placeholder="Nama lengkap"
            placeholderTextColor={C.textMuted}
            autoCapitalize="words"
            editable={!savingProfile}
          />
          <Text style={[s.label, { color: C.textMuted }]}>UNIT USAHA</Text>
          <TextInput
            style={[s.input, { backgroundColor: C.inputBg, borderColor: C.border, color: C.textPrimary }]}
            value={unitUsaha}
            onChangeText={(t) => setUnitUsaha(t.toUpperCase())}
            placeholder="Nama cabang / unit usaha"
            placeholderTextColor={C.textMuted}
            autoCapitalize="characters"
            editable={!savingProfile}
          />
          <TouchableOpacity
            onPress={onSaveProfile}
            disabled={savingProfile}
            style={[s.btnPrimary, { backgroundColor: C.primary }]}
          >
            {savingProfile ? <ActivityIndicator color={C.primaryFg} /> : (
              <>
                <Ionicons name="checkmark-outline" size={16} color={C.primaryFg} />
                <Text style={[s.btnPrimaryText, { color: C.primaryFg }]}>Simpan Profil</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={[s.card, { backgroundColor: C.surface, borderColor: C.border }]}>
          <View style={s.cardRow}>
            <Ionicons name="key-outline" size={15} color={C.accentWarning} />
            <Text style={[s.cardTitle, { color: C.textPrimary }]}>Kode Recovery Password</Text>
          </View>
          <Text style={[s.hint, { color: C.textSecondary }]}>
            Kode cadangan jika lupa password. Ditampilkan SEKALI SAJA — wajib di-screenshot.
          </Text>

          <View style={[s.statusBox, {
            backgroundColor: recoveryStatus?.has_token ? C.badgeSuccessBg : C.inputBg,
            borderColor: recoveryStatus?.has_token ? C.accentSuccess : C.border,
          }]}>
            <Ionicons
              name={recoveryStatus?.has_token ? "shield-checkmark-outline" : "shield-outline"}
              size={15}
              color={recoveryStatus?.has_token ? C.accentSuccess : C.textMuted}
            />
            <Text style={[s.statusText, { color: recoveryStatus?.has_token ? C.accentSuccess : C.textMuted }]}>
              {recoveryStatus?.has_token
                ? `Kode aktif ${recoveryStatus.generated_at ? `· ${new Date(recoveryStatus.generated_at).toLocaleDateString("id-ID")}` : ""}`
                : "Belum ada kode recovery"}
            </Text>
          </View>

          <TouchableOpacity
            onPress={onPressGenerate}
            disabled={generatingToken}
            style={[s.btnPrimary, { backgroundColor: recoveryStatus?.has_token ? C.accentWarning : C.accentSuccess }]}
          >
            {generatingToken ? <ActivityIndicator color="#fff" /> : (
              <>
                <Ionicons name="refresh-outline" size={16} color="#fff" />
                <Text style={[s.btnPrimaryText, { color: "#fff" }]}>
                  {recoveryStatus?.has_token ? "Generate Ulang" : "Generate Kode"}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={() => router.push("/ganti-password")}
          style={[s.btnOutline, { borderColor: C.border }]}
        >
          <Ionicons name="lock-closed-outline" size={16} color={C.textSecondary} />
          <Text style={[s.btnOutlineText, { color: C.textSecondary }]}>Ganti Password</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={!!shownToken} transparent animationType="fade" onRequestClose={() => setShownToken(null)}>
        <View style={s.modalBackdrop}>
          <View style={[s.tokenModal, { backgroundColor: C.surface, borderColor: C.border }]}>
            <Ionicons name="key" size={28} color={C.accentWarning} />
            <Text style={[s.tokenModalTitle, { color: C.textPrimary }]}>Kode Recovery Anda</Text>
            <Text style={[s.tokenModalSub, { color: C.textSecondary }]}>
              Ditampilkan SEKALI SAJA — screenshot sekarang!
            </Text>
            <View style={[s.tokenBox, { backgroundColor: C.inputBg, borderColor: C.accentWarning }]}>
              <Text style={[s.tokenBoxText, { color: C.accentWarning }]}>{shownToken}</Text>
            </View>
            <TouchableOpacity onPress={copyToken} style={[s.btnOutline, { borderColor: C.accentSuccess }]}>
              <Ionicons name="share-outline" size={16} color={C.accentSuccess} />
              <Text style={[s.btnOutlineText, { color: C.accentSuccess }]}>Bagikan / Salin Kode</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShownToken(null)} style={[s.btnPrimary, { backgroundColor: C.primary }]}>
              <Text style={[s.btnPrimaryText, { color: C.primaryFg }]}>Sudah Saya Screenshot</Text>
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
  iconBtn: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  headerTitle: { fontSize: 15, fontWeight: "800" },
  content: { padding: 14, gap: 12, paddingBottom: 40 },
  avatarCard: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderRadius: 16, borderWidth: 1 },
  avatar: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 22, fontWeight: "800" },
  infoName: { fontSize: 15, fontWeight: "800" },
  infoEmail: { fontSize: 11, marginTop: 1 },
  roleBadge: { marginTop: 6, alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  roleText: { fontSize: 10, fontWeight: "700" },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 8 },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardTitle: { fontSize: 14, fontWeight: "800", marginBottom: 4 },
  label: { fontSize: 10, fontWeight: "700", letterSpacing: 1.2, marginBottom: 5 },
  input: { height: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, fontSize: 14, fontWeight: "500" },
  hint: { fontSize: 12, lineHeight: 17 },
  statusBox: { flexDirection: "row", alignItems: "center", gap: 8, padding: 10, borderRadius: 10, borderWidth: 1 },
  statusText: { fontSize: 12, fontWeight: "600", flex: 1 },
  btnPrimary: { height: 48, borderRadius: 13, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, marginTop: 4 },
  btnPrimaryText: { fontWeight: "700", fontSize: 14 },
  btnOutline: { width: "100%", height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, borderWidth: 1 },
  btnOutlineText: { fontWeight: "600", fontSize: 13 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center", padding: 24 },
  tokenModal: { width: "100%", borderRadius: 20, borderWidth: 1, padding: 24, alignItems: "center", gap: 12 },
  tokenModalTitle: { fontSize: 18, fontWeight: "800" },
  tokenModalSub: { fontSize: 12, textAlign: "center" },
  tokenBox: { width: "100%", paddingVertical: 18, paddingHorizontal: 12, borderRadius: 14, borderWidth: 1, alignItems: "center" },
  tokenBoxText: { fontSize: 34, fontWeight: "900", letterSpacing: 10, fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" },
});
