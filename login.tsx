import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Image,
  KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../lib/auth";
import { useTheme } from "../lib/theme";

export default function LoginScreen() {
  const { login } = useAuth();
  const { C } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onSubmit = async () => {
    if (!email.trim() || !password) { setErr("Email dan password wajib diisi"); return; }
    setErr(null); setBusy(true);
    try {
      await login(email, password);
    } catch (e: any) {
      const msg = e?.message ?? "Login gagal";
      setErr(msg);
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
            <Text style={[s.title, { color: C.textPrimary }]}>Masuk</Text>
            <Text style={[s.sub, { color: C.textSecondary }]}>Login dengan akun yang sudah terdaftar</Text>

            <Text style={[s.label, { color: C.textSecondary }]}>EMAIL</Text>
            <TextInput
              style={[s.input, { backgroundColor: C.inputBg, borderColor: C.border, color: C.textPrimary }]}
              placeholder="emailanda@gmail.com" placeholderTextColor={C.textMuted}
              autoCapitalize="none" keyboardType="email-address" autoComplete="email"
              value={email} onChangeText={setEmail} editable={!busy}
            />

            <Text style={[s.label, { color: C.textSecondary, marginTop: 14 }]}>PASSWORD</Text>
            <View style={[s.pwdRow, { backgroundColor: C.inputBg, borderColor: C.border }]}>
              <TextInput
                style={[s.input, { flex: 1, borderWidth: 0, backgroundColor: "transparent" }]}
                placeholder="••••••••" placeholderTextColor={C.textMuted}
                secureTextEntry={!showPwd} value={password} onChangeText={setPassword} editable={!busy}
              />
              <TouchableOpacity style={s.eyeBtn} onPress={() => setShowPwd(v => !v)}>
                <Ionicons name={showPwd ? "eye-off-outline" : "eye-outline"} size={20} color={C.textMuted} />
              </TouchableOpacity>
            </View>

            {err && (
              <View style={[s.errBox, { backgroundColor: C.verifikasiBg }]}>
                <Ionicons name="alert-circle-outline" size={14} color={C.accentRecord} />
                <Text style={[s.errText, { color: C.accentRecord }]}>{err}</Text>
              </View>
            )}

            <TouchableOpacity style={[s.btnPrimary, { backgroundColor: C.primary, opacity: busy ? 0.7 : 1 }]} onPress={onSubmit} disabled={busy}>
              {busy ? <ActivityIndicator color={C.primaryFg} /> : <Text style={[s.btnPrimaryText, { color: C.primaryFg }]}>Masuk</Text>}
            </TouchableOpacity>

            <Link href="/forgot-password" asChild>
              <TouchableOpacity style={s.forgotBtn}>
                <Text style={[s.forgotText, { color: C.textSecondary }]}>Lupa password?</Text>
              </TouchableOpacity>
            </Link>

            <View style={s.row}>
              <Text style={[s.muted, { color: C.textSecondary }]}>Belum punya akun? </Text>
              <Link href="/register" asChild>
                <TouchableOpacity><Text style={[s.link, { color: C.accentDrive }]}>Daftar di sini</Text></TouchableOpacity>
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
  logo: { width: 80, height: 80, marginTop: 16, borderRadius: 20 },
  brand: { fontSize: 15, fontWeight: "800", marginTop: 10, textAlign: "center" },
  brandSub: { fontSize: 11, fontWeight: "500", marginBottom: 24, textAlign: "center" },
  card: { width: "100%", borderRadius: 20, borderWidth: 1, padding: 22, gap: 4 },
  title: { fontSize: 24, fontWeight: "800", marginBottom: 2 },
  sub: { fontSize: 12, marginBottom: 16 },
  label: { fontSize: 10, fontWeight: "700", letterSpacing: 1.2, marginBottom: 6, marginTop: 2 },
  input: { height: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, fontSize: 15, fontWeight: "500" },
  pwdRow: { flexDirection: "row", alignItems: "center", height: 48, borderWidth: 1, borderRadius: 12, overflow: "hidden" },
  eyeBtn: { width: 46, height: 48, alignItems: "center", justifyContent: "center" },
  errBox: { flexDirection: "row", alignItems: "center", gap: 6, padding: 10, borderRadius: 10, marginTop: 8 },
  errText: { fontSize: 12, fontWeight: "600", flex: 1 },
  btnPrimary: { marginTop: 18, height: 50, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  btnPrimaryText: { fontWeight: "700", fontSize: 15 },
  row: { flexDirection: "row", justifyContent: "center", marginTop: 16, flexWrap: "wrap" },
  muted: { fontSize: 13 },
  link: { fontWeight: "700", fontSize: 13 },
  forgotBtn: { alignSelf: "center", paddingVertical: 10, marginTop: 4 },
  forgotText: { fontSize: 13 },
});
