// ============================================================
// login.tsx — UPDATED v2.3.0
// Nama aplikasi → Honda Visual On-site Capture
// ============================================================
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


export default function LoginScreen() {
  const { login } = useAuth();
  const { C, mode } = useTheme();
  const isDark = mode === "dark";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const onSubmit = async () => {
    if (!email.trim() || !password) { setErr("Email dan password wajib diisi"); return; }
    setErr(null); setBusy(true);
    try {
      await login(email, password);
    } catch (e) {
      setErr(e?.message ?? "Login gagal");
    } finally { setBusy(false); }
  };

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: C.bg }]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* Image: replace require() with actual import in your Expo project */}
          {/* <Image source={require("../assets/images/icon.png")} style={[s.logo, { borderColor: getBorder(isDark) }]} resizeMode="contain" /> */}
          <Text style={[s.brand, { color: C.textPrimary }]}>Honda Visual On-site Capture</Text>
          <Text style={[s.brandSub, { color: C.textSecondary }]}>PT Capella Dinamik Nusantara</Text>

          <View style={[s.card, { backgroundColor: C.surface, borderColor: getBorder(isDark) }]}>
            <Text style={[s.title, { color: C.textPrimary }]}>Masuk</Text>
            <Text style={[s.sub, { color: C.textSecondary }]}>Login dengan akun yang sudah terdaftar</Text>

            <Text style={[s.label, { color: getLabelColor(isDark) }]}>EMAIL</Text>
            <TextInput
              style={[s.input, { backgroundColor: C.inputBg, borderColor: getBorder(isDark), color: C.textPrimary }]}
              value={email}
              onChangeText={setEmail}
              placeholder="emailanda@gmail.com"
              placeholderTextColor={getPlaceholderColor(isDark)}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!busy}
            />

            <Text style={[s.label, { color: getLabelColor(isDark) }]}>PASSWORD</Text>
            <View style={[s.pwdRow, { backgroundColor: C.inputBg, borderColor: getBorder(isDark) }]}>
              <TextInput
                style={[s.pwdInput, { color: C.textPrimary }]}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={getPlaceholderColor(isDark)}
                secureTextEntry={!showPwd}
                editable={!busy}
              />
              <TouchableOpacity style={s.eyeBtn} onPress={() => setShowPwd(v => !v)}>
                <Ionicons name={showPwd ? "eye-off" : "eye"} size={20} color={getLabelColor(isDark)} />
              </TouchableOpacity>
            </View>

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
              {busy ? <ActivityIndicator color={C.primaryFg} /> : <Text style={[s.btnPrimaryText, { color: C.primaryFg }]}>Masuk</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={s.forgotBtn}>
              <Link href="/forgot-password">
                <Text style={[s.forgotText, { color: C.textSecondary }]}>Lupa password?</Text>
              </Link>
            </TouchableOpacity>
          </View>

          <View style={s.row}>
            <Text style={[s.muted, { color: C.textSecondary }]}>Belum punya akun? </Text>
            <Link href="/register">
              <Text style={[s.link, { color: C.primary }]}>Daftar di sini</Text>
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
  logo: { width: 88, height: 88, marginTop: 20, borderRadius: 22, borderWidth: 1 },
  brand: { fontSize: 15, fontWeight: "800", marginTop: 12, textAlign: "center" },
  brandSub: { fontSize: 11, fontWeight: "500", marginBottom: 28, textAlign: "center" },
  card: { width: "100%", borderRadius: 20, borderWidth: 1.5, padding: 22, gap: 4 },
  title: { fontSize: 24, fontWeight: "800", marginBottom: 2 },
  sub: { fontSize: 12, marginBottom: 16 },
  label: { fontSize: 10, fontWeight: "700", letterSpacing: 1.2, marginBottom: 6, marginTop: 8 },
  input: { height: 48, borderWidth: 2, borderRadius: 12, paddingHorizontal: 14, fontSize: 15, fontWeight: "500" },
  pwdRow: { flexDirection: "row", alignItems: "center", height: 48, borderWidth: 2, borderRadius: 12, overflow: "hidden" },
  pwdInput: { flex: 1, height: 48, paddingHorizontal: 14, fontSize: 15, fontWeight: "500" },
  eyeBtn: { width: 46, height: 48, alignItems: "center", justifyContent: "center" },
  errBox: { flexDirection: "row", alignItems: "center", gap: 6, padding: 10, borderRadius: 10, marginTop: 8, borderWidth: 1.5 },
  errText: { fontSize: 12, fontWeight: "600", flex: 1 },
  btnPrimary: { marginTop: 18, height: 50, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  btnPrimaryText: { fontWeight: "700", fontSize: 15 },
  row: { flexDirection: "row", justifyContent: "center", marginTop: 20, flexWrap: "wrap" },
  muted: { fontSize: 13 },
  link: { fontWeight: "700", fontSize: 13 },
  forgotBtn: { alignSelf: "center", paddingVertical: 10, marginTop: 4 },
  forgotText: { fontSize: 13 },
});