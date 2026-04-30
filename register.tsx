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
  const [err, setErr] = useState<string | null>(null);

  const onSubmit = async () => {
    setErr(null);
    if (!namaLengkap.trim() || !email.trim() || !password) { setErr("Semua field wajib diisi"); return; }
    if (password.length < 6) { setErr("Password minimal 6 karakter"); return; }
    if (password !== confirm) { setErr("Konfirmasi password tidak cocok"); return; }
    setBusy(true);
    try {
      await register(email, password, namaLengkap);
    } catch (e: any) {
      setErr(e?.message ?? "Registrasi gagal");
    } finally { setBusy(false); }
  };

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
            <Text style={[s.title, { color: C.textPrimary }]}>Daftar</Text>
            <Text style={[s.sub, { color: C.textSecondary }]}>Buat akun baru untuk akses aplikasi</Text>

            {[
              { label: "NAMA LENGKAP", placeholder: "Ahmad Ragash Putra", value: namaLengkap, onChange: setNamaLengkap, cap: "words" as any, secure: false },
              { label: "EMAIL", placeholder: "emailanda@gmail.com", value: email, onChange: setEmail, cap: "none" as any, secure: false, keyboard: "email-address" as any },
            ].map((f, i) => (
              <View key={i}>
                <Text style={[s.label, { color: C.textSecondary }]}>{f.label}</Text>
                <TextInput
                  style={[s.input, { backgroundColor: C.inputBg, borderColor: C.border, color: C.textPrimary }]}
                  placeholder={f.placeholder} placeholderTextColor={C.textMuted}
                  autoCapitalize={f.cap} keyboardType={f.keyboard}
                  value={f.value} onChangeText={f.onChange} editable={!busy}
                />
              </View>
            ))}

            {[
              { label: "PASSWORD (MIN 6 KARAKTER)", show: showPwd, toggle: () => setShowPwd(v => !v), value: password, onChange: setPassword },
              { label: "KONFIRMASI PASSWORD", show: showConfirm, toggle: () => setShowConfirm(v => !v), value: confirm, onChange: setConfirm },
            ].map((f, i) => (
              <View key={i}>
                <Text style={[s.label, { color: C.textSecondary }]}>{f.label}</Text>
                <View style={[s.pwdRow, { backgroundColor: C.inputBg, borderColor: C.border }]}>
                  <TextInput
                    style={[s.input, { flex: 1, borderWidth: 0, backgroundColor: "transparent" }]}
                    placeholder="••••••••" placeholderTextColor={C.textMuted}
                    secureTextEntry={!f.show} value={f.value} onChangeText={f.onChange} editable={!busy}
                  />
                  <TouchableOpacity style={s.eyeBtn} onPress={f.toggle}>
                    <Ionicons name={f.show ? "eye-off-outline" : "eye-outline"} size={20} color={C.textMuted} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            {err && (
              <View style={[s.errBox, { backgroundColor: C.verifikasiBg }]}>
                <Ionicons name="alert-circle-outline" size={14} color={C.accentRecord} />
                <Text style={[s.errText, { color: C.accentRecord }]}>{err}</Text>
              </View>
            )}

            <TouchableOpacity style={[s.btnPrimary, { backgroundColor: C.primary, opacity: busy ? 0.7 : 1 }]} onPress={onSubmit} disabled={busy}>
              {busy ? <ActivityIndicator color={C.primaryFg} /> : <Text style={[s.btnPrimaryText, { color: C.primaryFg }]}>Buat Akun</Text>}
            </TouchableOpacity>

            <View style={s.row}>
              <Text style={[s.muted, { color: C.textSecondary }]}>Sudah punya akun? </Text>
              <Link href="/login" asChild>
                <TouchableOpacity><Text style={[s.link, { color: C.accentDrive }]}>Masuk</Text></TouchableOpacity>
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
  content: { padding: 24, alignItems: "center", paddingBottom: 40, gap: 0 },
  logo: { width: 72, height: 72, marginTop: 12, borderRadius: 18 },
  brand: { fontSize: 14, fontWeight: "800", marginTop: 10, textAlign: "center" },
  brandSub: { fontSize: 11, marginBottom: 20, textAlign: "center" },
  card: { width: "100%", borderRadius: 20, borderWidth: 1, padding: 20, gap: 10 },
  title: { fontSize: 22, fontWeight: "800" },
  sub: { fontSize: 12, marginBottom: 4 },
  label: { fontSize: 10, fontWeight: "700", letterSpacing: 1.2, marginBottom: 5 },
  input: { height: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, fontSize: 15, fontWeight: "500" },
  pwdRow: { flexDirection: "row", alignItems: "center", height: 48, borderWidth: 1, borderRadius: 12, overflow: "hidden" },
  eyeBtn: { width: 46, height: 48, alignItems: "center", justifyContent: "center" },
  errBox: { flexDirection: "row", alignItems: "center", gap: 6, padding: 10, borderRadius: 10 },
  errText: { fontSize: 12, fontWeight: "600", flex: 1 },
  btnPrimary: { marginTop: 6, height: 50, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  btnPrimaryText: { fontWeight: "700", fontSize: 15 },
  row: { flexDirection: "row", justifyContent: "center", marginTop: 10, flexWrap: "wrap" },
  muted: { fontSize: 13 },
  link: { fontWeight: "700", fontSize: 13 },
});
