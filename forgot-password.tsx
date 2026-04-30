import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Image,
  KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, Link } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { APP_BACKEND_URL } from "../lib/auth";
import { useTheme } from "../lib/theme";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { C } = useTheme();
  const [step, setStep] = useState<"form" | "success">("form");
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [busy, setBusy] = useState(false);

  const onSubmit = async () => {
    if (!email.trim()) { Alert.alert("Wajib diisi", "Email wajib diisi"); return; }
    if (!token.trim() || token.trim().length !== 6) { Alert.alert("Tidak valid", "Kode recovery harus 6 karakter"); return; }
    if (!newPassword || newPassword.length < 6) { Alert.alert("Tidak valid", "Password baru minimal 6 karakter"); return; }
    if (newPassword !== confirmPassword) { Alert.alert("Tidak cocok", "Konfirmasi password tidak sama"); return; }

    setBusy(true);
    try {
      const res = await fetch(`${APP_BACKEND_URL}/api/auth/recovery/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), token: token.trim().toUpperCase(), new_password: newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data.detail === "string" ? data.detail : "Gagal reset password");
      setStep("success");
    } catch (e: any) { Alert.alert("Gagal", e?.message ?? "Terjadi kesalahan"); }
    finally { setBusy(false); }
  };

  if (step === "success") {
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: C.bg }]} edges={["top","left","right"]}>
        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          <Image
            source={{ uri: "https://customer-assets.emergentagent.com/job_audio-archiver/artifacts/o8vroxrg_LOGO%20APLIKASIKU.png" }}
            style={s.logo} resizeMode="contain"
          />
          <View style={[s.card, { backgroundColor: C.surface, borderColor: C.border }]}>
            <View style={[s.successIcon, { backgroundColor: C.connectedHintBg }]}>
              <Ionicons name="checkmark-circle" size={48} color={C.accentSuccess} />
            </View>
            <Text style={[s.successTitle, { color: C.textPrimary }]}>Password Berhasil Direset!</Text>
            <Text style={[s.successDesc, { color: C.textSecondary }]}>
              Password sudah berhasil diubah. Kode recovery lama sudah hangus — generate kode baru di Profil setelah login.
            </Text>
            <View style={[s.infoBox, { backgroundColor: C.cdbBg, borderColor: C.accentDrive }]}>
              <Ionicons name="information-circle-outline" size={13} color={C.accentDrive} />
              <Text style={[s.infoText, { color: C.textSecondary }]}>
                Setelah login, segera generate kode recovery baru dan screenshot.
              </Text>
            </View>
            <TouchableOpacity testID="btn-back-login" style={[s.btnPrimary, { backgroundColor: C.primary }]} onPress={() => router.replace("/login")}>
              <Ionicons name="log-in-outline" size={16} color={C.primaryFg} />
              <Text style={[s.btnPrimaryText, { color: C.primaryFg }]}>Login Sekarang</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: C.bg }]} edges={["top","left","right"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Image
            source={{ uri: "https://customer-assets.emergentagent.com/job_audio-archiver/artifacts/o8vroxrg_LOGO%20APLIKASIKU.png" }}
            style={s.logo} resizeMode="contain"
          />
          <Text style={[s.brand, { color: C.textPrimary }]}>Perekam Verifikasi Konsumen</Text>
          <Text style={[s.brandSub, { color: C.textSecondary }]}>PT Capella Dinamik Nusantara</Text>

          <View style={[s.card, { backgroundColor: C.surface, borderColor: C.border }]}>
            <Text style={[s.title, { color: C.textPrimary }]}>Reset Password</Text>
            <Text style={[s.sub, { color: C.textSecondary }]}>Masukkan email, kode recovery, dan password baru.</Text>

            <View style={[s.infoBox, { backgroundColor: C.cdbBg, borderColor: C.accentDrive }]}>
              <Ionicons name="key-outline" size={14} color={C.accentDrive} />
              <Text style={[s.infoText, { color: C.textSecondary }]}>
                Kode recovery di-generate di menu Profil setelah login.
              </Text>
            </View>

            <Text style={[s.label, { color: C.textSecondary }]}>EMAIL TERDAFTAR</Text>
            <TextInput testID="input-email" style={[s.input, { backgroundColor: C.inputBg, borderColor: C.border, color: C.textPrimary }]}
              placeholder="emailanda@gmail.com" placeholderTextColor={C.textMuted}
              autoCapitalize="none" keyboardType="email-address" autoComplete="email"
              value={email} onChangeText={setEmail} editable={!busy} />

            <Text style={[s.label, { color: C.textSecondary, marginTop: 12 }]}>KODE RECOVERY (6 KARAKTER)</Text>
            <TextInput testID="input-token" style={[s.input, s.tokenInput, { backgroundColor: C.inputBg, borderColor: C.border, color: C.textPrimary }]}
              placeholder="CONTOH: A3BX7Z" placeholderTextColor={C.textMuted}
              autoCapitalize="characters" autoCorrect={false} maxLength={6}
              value={token} onChangeText={(t) => setToken(t.toUpperCase())} editable={!busy} />
            <Text style={[s.hint, { color: C.textMuted }]}>Lihat dari screenshot kode saat generate.</Text>

            <Text style={[s.label, { color: C.textSecondary, marginTop: 12 }]}>PASSWORD BARU</Text>
            <View style={[s.pwdRow, { backgroundColor: C.inputBg, borderColor: C.border }]}>
              <TextInput testID="input-new-password" style={[s.input, { flex: 1, borderWidth: 0, backgroundColor: "transparent", color: C.textPrimary }]}
                placeholder="Minimal 6 karakter" placeholderTextColor={C.textMuted}
                secureTextEntry={!showNewPwd} value={newPassword} onChangeText={setNewPassword} editable={!busy} />
              <TouchableOpacity style={s.eyeBtn} onPress={() => setShowNewPwd(v => !v)}>
                <Ionicons name={showNewPwd ? "eye-off-outline" : "eye-outline"} size={20} color={C.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={[s.label, { color: C.textSecondary, marginTop: 12 }]}>KONFIRMASI PASSWORD BARU</Text>
            <View style={[s.pwdRow, { backgroundColor: C.inputBg, borderColor: C.border }]}>
              <TextInput testID="input-confirm-password" style={[s.input, { flex: 1, borderWidth: 0, backgroundColor: "transparent", color: C.textPrimary }]}
                placeholder="Ulangi password baru" placeholderTextColor={C.textMuted}
                secureTextEntry={!showConfirmPwd} value={confirmPassword} onChangeText={setConfirmPassword} editable={!busy} />
              <TouchableOpacity style={s.eyeBtn} onPress={() => setShowConfirmPwd(v => !v)}>
                <Ionicons name={showConfirmPwd ? "eye-off-outline" : "eye-outline"} size={20} color={C.textMuted} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity testID="btn-submit" style={[s.btnPrimary, { backgroundColor: C.primary, opacity: busy ? 0.7 : 1 }]} onPress={onSubmit} disabled={busy}>
              {busy ? <ActivityIndicator color={C.primaryFg} /> : (
                <><Ionicons name="lock-closed-outline" size={16} color={C.primaryFg} /><Text style={[s.btnPrimaryText, { color: C.primaryFg }]}>Reset Password</Text></>
              )}
            </TouchableOpacity>

            <View style={s.row}>
              <Link href="/login" asChild>
                <TouchableOpacity testID="link-login">
                  <Text style={[s.link, { color: C.accentDrive }]}>Kembali ke Login</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 24, alignItems: "center", paddingBottom: 40 },
  logo: { width: 80, height: 80, marginTop: 12, borderRadius: 20 },
  brand: { fontSize: 14, fontWeight: "800", marginTop: 10, textAlign: "center" },
  brandSub: { fontSize: 11, marginBottom: 20, textAlign: "center" },
  card: { width: "100%", borderRadius: 20, borderWidth: 1, padding: 20, gap: 10 },
  title: { fontSize: 20, fontWeight: "800" },
  sub: { fontSize: 12 },
  infoBox: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 10, borderRadius: 10, borderWidth: 1 },
  infoText: { flex: 1, fontSize: 11, lineHeight: 16 },
  label: { fontSize: 10, fontWeight: "700", letterSpacing: 1.2, marginBottom: 5 },
  input: { height: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, fontSize: 15, fontWeight: "500" },
  tokenInput: { fontSize: 20, fontWeight: "800", letterSpacing: 6, textAlign: "center", fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" },
  hint: { fontSize: 11, marginTop: 3 },
  pwdRow: { flexDirection: "row", alignItems: "center", height: 48, borderWidth: 1, borderRadius: 12, overflow: "hidden" },
  eyeBtn: { width: 46, height: 48, alignItems: "center", justifyContent: "center" },
  btnPrimary: { height: 50, borderRadius: 14, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, marginTop: 6 },
  btnPrimaryText: { fontWeight: "700", fontSize: 14 },
  row: { justifyContent: "center", marginTop: 12 },
  link: { fontWeight: "700", fontSize: 13 },
  successIcon: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center" },
  successTitle: { fontSize: 17, fontWeight: "800", textAlign: "center" },
  successDesc: { fontSize: 12, textAlign: "center", lineHeight: 17 },
});
