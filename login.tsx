import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Image,
  KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView, Alert, Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../lib/auth";
import { useTheme } from "../lib/theme";

export default function LoginScreen() {
  const { login } = useAuth();
  const { C, mode, toggleTheme } = useTheme();
  const isDark = mode === "dark";
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
      setErr(e?.message ?? "Login gagal");
    } finally { setBusy(false); }
  };

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: C.bg }]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
          <View style={s.topBar}>
            <View style={s.themeRow}>
              <Ionicons name={isDark ? "moon" : "sunny"} size={14} color={isDark ? "#fff" : C.textMuted} />
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{ false: "#E4E4E7", true: "#34C759" }}
                thumbColor="#fff"
                ios_backgroundColor="#E4E4E7"
                style={{ transform: [{ scaleX: 0.78 }, { scaleY: 0.78 }] }}
              />
            </View>
          </View>

          <Image source={require("../assets/images/icon.png")} style={s.logo} />
          <Text style={[s.brand, { color: isDark ? "#FFFFFF" : C.textPrimary }]}>Honda Visual On-site Capture</Text>
          <Text style={[s.brandSub, { color: isDark ? "rgba(255,255,255,0.6)" : C.textMuted }]}>PT Capella Dinamik Nusantara</Text>

          <View style={[s.card, { backgroundColor: C.surface, borderColor: C.border }]}>
            <Text style={[s.title, { color: C.textPrimary }]}>Masuk</Text>
            <Text style={[s.sub, { color: C.textSecondary }]}>Login dengan akun yang sudah terdaftar</Text>

            <Text style={[s.label, { color: C.textMuted }]}>EMAIL</Text>
            <TextInput
              style={[s.input, { backgroundColor: C.inputBg, borderColor: C.border, color: C.textPrimary }]}
              value={email}
              onChangeText={setEmail}
              placeholder="emailanda@gmail.com"
              placeholderTextColor={C.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!busy}
            />

            <Text style={[s.label, { color: C.textMuted }]}>PASSWORD</Text>
            <View style={[s.pwdRow, { backgroundColor: C.inputBg, borderColor: C.border }]}>
              <TextInput
                style={[s.input, { flex: 1, borderWidth: 0, backgroundColor: "transparent", color: C.textPrimary }]}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={C.textMuted}
                secureTextEntry={!showPwd}
                editable={!busy}
              />
              <TouchableOpacity onPress={() => setShowPwd(v => !v)} style={s.eyeBtn}>
                <Ionicons name={showPwd ? "eye-off-outline" : "eye-outline"} size={18} color={C.textMuted} />
              </TouchableOpacity>
            </View>

            {err && (
              <View style={[s.errBox, { backgroundColor: C.verifikasiBg }]}>
                <Ionicons name="alert-circle-outline" size={15} color={C.verifikasiText} />
                <Text style={[s.errText, { color: C.verifikasiText }]}>{err}</Text>
              </View>
            )}

            <TouchableOpacity onPress={onSubmit} disabled={busy} style={[s.btnPrimary, { backgroundColor: C.primary }]}>
              {busy ? <ActivityIndicator color={C.primaryFg} /> : <Text style={[s.btnPrimaryText, { color: C.primaryFg }]}>Masuk</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={s.forgotBtn}>
              <Link href="/forgot-password" asChild>
                <Text style={[s.forgotText, { color: isDark ? "rgba(255,255,255,0.5)" : C.textMuted }]}>Lupa password?</Text>
              </Link>
            </TouchableOpacity>
          </View>

          <View style={s.row}>
            <Text style={[s.muted, { color: isDark ? "rgba(255,255,255,0.55)" : C.textMuted }]}>Belum punya akun? </Text>
            <Link href="/register" asChild>
              <TouchableOpacity>
                <Text style={[s.link, { color: isDark ? "#FFFFFF" : C.primary }]}>Daftar di sini</Text>
              </TouchableOpacity>
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
  topBar: { width: "100%", flexDirection: "row", justifyContent: "flex-end", marginBottom: 4, marginTop: -8 },
  themeRow: { flexDirection: "row", alignItems: "center", gap: 2 },
  logo: { width: 80, height: 80, marginTop: 8, borderRadius: 20 },
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
