// ============================================================
// forgot-password.tsx — UPDATED
// Perubahan: Logo aplikasi ditambahkan
// ============================================================
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
  const [step, setStep] = useState("form");
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
      <SafeAreaView style={[s.safe, { backgroundColor: C.bg }]}>
        <ScrollView contentContainerStyle={[s.content, { justifyContent: "center", flex: 1 }]}>
          <View style={[s.successIcon, { backgroundColor: "#ECFDF5" }]}>
            <Ionicons name="checkmark-circle" size={44} color="#059669" />
          </View>
          <Text style={[s.successTitle, { color: C.textPrimary }]}>Password Berhasil Direset!</Text>
          <Text style={[s.successDesc, { color: C.textSecondary }]}>
            Password sudah berhasil diubah. Kode recovery lama sudah hangus — generate kode baru di Profil setelah login.
          </Text>
          <View style={[s.infoBox, { backgroundColor: C.surface, borderColor: C.border }]}>
            <Ionicons name="information-circle" size={16} color={C.accentWarning} />
            <Text style={[s.infoText, { color: C.textSecondary }]}>
              Setelah login, segera generate kode recovery baru dan screenshot.
            </Text>
          </View>
          <TouchableOpacity
            style={[s.btnPrimary, { backgroundColor: C.primary }]}
            onPress={() => router.replace("/login")}
            activeOpacity={0.8}
          >
            <Text style={[s.btnPrimaryText, { color: C.primaryFg }]}>Login Sekarang</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: C.bg }]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* LOGO APLIKASI */}
          <Image
            source={require("../assets/images/icon.png")}
            style={[s.logo, { borderColor: C.border }]}
            resizeMode="contain"
          />
          <Text style={[s.brand, { color: C.textPrimary }]}>Perekam Verifikasi Data Konsumen</Text>
          <Text style={[s.brandSub, { color: C.textSecondary }]}>PT Capella Dinamik Nusantara</Text>

          <View style={[s.card, { backgroundColor: C.surface, borderColor: C.border }]}>
            <Text style={[s.title, { color: C.textPrimary }]}>Reset Password</Text>
            <Text style={[s.sub, { color: C.textSecondary }]}>Masukkan email, kode recovery, dan password baru.</Text>

            <View style={[s.infoBox, { backgroundColor: C.surface, borderColor: C.border }]}>
              <Ionicons name="key" size={14} color={C.accentWarning} />
              <Text style={[s.infoText, { color: C.textSecondary }]}>
                Kode recovery di-generate di menu Profil setelah login.
              </Text>
            </View>

            <Text style={[s.label, { color: C.textMuted }]}>EMAIL TERDAFTAR</Text>
            <TextInput
              style={[s.input, { backgroundColor: C.inputBg, borderColor: C.border, color: C.textPrimary }]}
              value={email}
              onChangeText={setEmail}
              placeholder="emailanda@gmail.com"
              placeholderTextColor={C.textMuted}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!busy}
            />

            <Text style={[s.label, { color: C.textMuted }]}>KODE RECOVERY (6 KARAKTER)</Text>
            <TextInput
              style={[s.input, s.tokenInput, { backgroundColor: C.inputBg, borderColor: C.border, color: C.textPrimary }]}
              value={token}
              onChangeText={(t) => setToken(t.toUpperCase())}
              placeholder="••••••"
              placeholderTextColor={C.textMuted}
              maxLength={6}
              autoCapitalize="characters"
              editable={!busy}
            />
            <Text style={[s.hint, { color: C.textMuted }]}>Lihat dari screenshot kode saat generate.</Text>

            <Text style={[s.label, { color: C.textMuted }]}>PASSWORD BARU</Text>
            <View style={[s.pwdRow, { backgroundColor: C.inputBg, borderColor: C.border }]}>
              <TextInput
                style={[s.pwdInput, { color: C.textPrimary }]}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Min. 6 karakter"
                placeholderTextColor={C.textMuted}
                secureTextEntry={!showNewPwd}
                editable={!busy}
              />
              <TouchableOpacity style={s.eyeBtn} onPress={() => setShowNewPwd(v => !v)}>
                <Ionicons name={showNewPwd ? "eye-off" : "eye"} size={20} color={C.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={[s.label, { color: C.textMuted }]}>KONFIRMASI PASSWORD BARU</Text>
            <View style={[s.pwdRow, { backgroundColor: C.inputBg, borderColor: C.border }]}>
              <TextInput
                style={[s.pwdInput, { color: C.textPrimary }]}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Ulangi password baru"
                placeholderTextColor={C.textMuted}
                secureTextEntry={!showConfirmPwd}
                editable={!busy}
              />
              <TouchableOpacity style={s.eyeBtn} onPress={() => setShowConfirmPwd(v => !v)}>
                <Ionicons name={showConfirmPwd ? "eye-off" : "eye"} size={20} color={C.textMuted} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[s.btnPrimary, { backgroundColor: C.primary, opacity: busy ? 0.7 : 1 }]}
              onPress={onSubmit}
              disabled={busy}
              activeOpacity={0.8}
            >
              {busy ? <ActivityIndicator color={C.primaryFg} /> : (
                <>
                  <Ionicons name="lock-closed" size={16} color={C.primaryFg} />
                  <Text style={[s.btnPrimaryText, { color: C.primaryFg }]}>Reset Password</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={s.row}>
            <Link href="/login">
              <Text style={[s.link, { color: C.textSecondary }]}>← Kembali ke Login</Text>
            </Link>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 24, alignItems: "center", paddingBottom: 40 },
  logo: { width: 80, height: 80, marginTop: 16, borderRadius: 20, borderWidth: 1 },
  brand: { fontSize: 14, fontWeight: "800", marginTop: 12, textAlign: "center" },
  brandSub: { fontSize: 11, marginBottom: 24, textAlign: "center" },
  card: { width: "100%", borderRadius: 20, borderWidth: 1, padding: 20, gap: 4 },
  title: { fontSize: 20, fontWeight: "800" },
  sub: { fontSize: 12, marginBottom: 4 },
  infoBox: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 10, borderRadius: 10, borderWidth: 1 },
  infoText: { flex: 1, fontSize: 11, lineHeight: 16 },
  label: { fontSize: 10, fontWeight: "700", letterSpacing: 1.2, marginBottom: 5, marginTop: 10 },
  input: { height: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, fontSize: 15, fontWeight: "500" },
  tokenInput: { fontSize: 20, fontWeight: "800", letterSpacing: 6, textAlign: "center", fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" },
  hint: { fontSize: 11, marginTop: 3 },
  pwdRow: { flexDirection: "row", alignItems: "center", height: 48, borderWidth: 1, borderRadius: 12, overflow: "hidden" },
  pwdInput: { flex: 1, height: 48, paddingHorizontal: 14, fontSize: 15, fontWeight: "500" },
  eyeBtn: { width: 46, height: 48, alignItems: "center", justifyContent: "center" },
  btnPrimary: { height: 50, borderRadius: 14, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, marginTop: 14 },
  btnPrimaryText: { fontWeight: "700", fontSize: 14 },
  row: { justifyContent: "center", marginTop: 16 },
  link: { fontWeight: "700", fontSize: 13 },
  successIcon: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  successTitle: { fontSize: 17, fontWeight: "800", textAlign: "center", marginBottom: 8 },
  successDesc: { fontSize: 12, textAlign: "center", lineHeight: 17, marginBottom: 12 },
});