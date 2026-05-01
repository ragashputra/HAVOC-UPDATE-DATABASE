// ============================================================
// register.tsx — UPDATED v2.3.0
// Nama aplikasi → Honda Visual On-site Capture
// ============================================================
import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Image,
  KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../lib/auth";
import { useTheme } from "../lib/theme";

export default function RegisterScreen() {
  const { register } = useAuth();
  const { C } = useTheme();
  const [namaLengkap, setNamaLengkap] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const handleNamaChange = (text) => {
    setNamaLengkap(text.toUpperCase());
  };

  const onSubmit = async () => {
    setErr(null);
    if (!namaLengkap.trim() || !email.trim() || !password) { setErr("Semua field wajib diisi"); return; }
    if (password.length < 6) { setErr("Password minimal 6 karakter"); return; }
    if (password !== confirm) { setErr("Konfirmasi password tidak cocok"); return; }
    setBusy(true);
    try {
      await register(email, password, namaLengkap);
    } catch (e) {
      setErr(e?.message ?? "Registrasi gagal");
    } finally { setBusy(false); }
  };

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: C.bg }]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* Image: replace require() with actual import in your Expo project */}
          {/* <Image source={require("../assets/images/icon.png")} style={[s.logo, { borderColor: C.border }]} resizeMode="contain" /> */}
          <Text style={[s.brand, { color: C.textPrimary }]}>Honda Visual On-site Capture</Text>
          <Text style={[s.brandSub, { color: C.textSecondary }]}>PT Capella Dinamik Nusantara</Text>

          <View style={[s.card, { backgroundColor: C.surface, borderColor: C.border }]}>
            <Text style={[s.title, { color: C.textPrimary }]}>Daftar</Text>
            <Text style={[s.sub, { color: C.textSecondary }]}>Buat akun baru untuk akses aplikasi</Text>

            <Text style={[s.label, { color: C.textMuted }]}>NAMA LENGKAP</Text>
            <TextInput
              style={[s.input, { backgroundColor: C.inputBg, borderColor: C.border, color: C.textPrimary }]}
              value={namaLengkap}
              onChangeText={handleNamaChange}
              placeholder="Contoh: AHMAD RAGASH PUTRA"
              placeholderTextColor={C.textMuted}
              autoCapitalize="characters"
              editable={!busy}
            />

            <Text style={[s.label, { color: C.textMuted }]}>EMAIL</Text>
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

            {[
              { label: "PASSWORD (MIN 6 KARAKTER)", show: showPwd, toggle: () => setShowPwd(v => !v), value: password, onChange: setPassword },
              { label: "KONFIRMASI PASSWORD", show: showConfirm, toggle: () => setShowConfirm(v => !v), value: confirm, onChange: setConfirm },
            ].map((f, i) => (
              <View key={i}>
                <Text style={[s.label, { color: C.textMuted }]}>{f.label}</Text>
                <View style={[s.pwdRow, { backgroundColor: C.inputBg, borderColor: C.border }]}>
                  <TextInput
                    style={[s.pwdInput, { color: C.textPrimary }]}
                    value={f.value}
                    onChangeText={f.onChange}
                    placeholder="••••••••"
                    placeholderTextColor={C.textMuted}
                    secureTextEntry={!f.show}
                    editable={!busy}
                  />
                  <TouchableOpacity style={s.eyeBtn} onPress={f.toggle}>
                    <Ionicons name={f.show ? "eye-off" : "eye"} size={20} color={C.textMuted} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            {err && (
              <View style={[s.errBox, { backgroundColor: "#FFF1F2", borderColor: "#FECDD3" }]}>
                <Ionicons name="alert-circle" size={16} color="#E11D48" />
                <Text style={[s.errText, { color: "#E11D48" }]}>{err}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[s.btnPrimary, { backgroundColor: C.primary, opacity: busy ? 0.7 : 1 }]}
              onPress={onSubmit}
              disabled={busy}
              activeOpacity={0.8}
            >
              {busy ? <ActivityIndicator color={C.primaryFg} /> : <Text style={[s.btnPrimaryText, { color: C.primaryFg }]}>Buat Akun</Text>}
            </TouchableOpacity>
          </View>

          <View style={s.row}>
            <Text style={[s.muted, { color: C.textSecondary }]}>Sudah punya akun? </Text>
            <Link href="/login">
              <Text style={[s.link, { color: C.primary }]}>Masuk</Text>
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
  title: { fontSize: 22, fontWeight: "800" },
  sub: { fontSize: 12, marginBottom: 8 },
  label: { fontSize: 10, fontWeight: "700", letterSpacing: 1.2, marginBottom: 5, marginTop: 10 },
  input: { height: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, fontSize: 15, fontWeight: "500" },
  pwdRow: { flexDirection: "row", alignItems: "center", height: 48, borderWidth: 1, borderRadius: 12, overflow: "hidden" },
  pwdInput: { flex: 1, height: 48, paddingHorizontal: 14, fontSize: 15, fontWeight: "500" },
  eyeBtn: { width: 46, height: 48, alignItems: "center", justifyContent: "center" },
  errBox: { flexDirection: "row", alignItems: "center", gap: 6, padding: 10, borderRadius: 10, borderWidth: 1, marginTop: 8 },
  errText: { fontSize: 12, fontWeight: "600", flex: 1 },
  btnPrimary: { marginTop: 14, height: 50, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  btnPrimaryText: { fontWeight: "700", fontSize: 15 },
  row: { flexDirection: "row", justifyContent: "center", marginTop: 20, flexWrap: "wrap" },
  muted: { fontSize: 13 },
  link: { fontWeight: "700", fontSize: 13 },
});