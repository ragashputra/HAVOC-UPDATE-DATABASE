import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Image,
  KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView, Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../lib/auth";
import { useTheme } from "../lib/theme";

export default function RegisterScreen() {
  const { register } = useAuth();
  const { C, mode, toggleTheme } = useTheme();
  const isDark = mode === "dark";
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
            <Text style={[s.title, { color: C.textPrimary }]}>Daftar</Text>
            <Text style={[s.sub, { color: C.textSecondary }]}>Buat akun baru untuk akses aplikasi</Text>

            <Text style={[s.label, { color: C.textMuted }]}>NAMA LENGKAP</Text>
            <TextInput
              style={[s.input, { backgroundColor: C.inputBg, borderColor: C.border, color: C.textPrimary }]}
              value={namaLengkap}
              onChangeText={setNamaLengkap}
              placeholder="Ahmad Ragash Putra"
              placeholderTextColor={C.textMuted}
              autoCapitalize="words"
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

            <Text style={[s.label, { color: C.textMuted }]}>PASSWORD (MIN 6 KARAKTER)</Text>
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

            <Text style={[s.label, { color: C.textMuted }]}>KONFIRMASI PASSWORD</Text>
            <View style={[s.pwdRow, { backgroundColor: C.inputBg, borderColor: C.border }]}>
              <TextInput
                style={[s.input, { flex: 1, borderWidth: 0, backgroundColor: "transparent", color: C.textPrimary }]}
                value={confirm}
                onChangeText={setConfirm}
                placeholder="••••••••"
                placeholderTextColor={C.textMuted}
                secureTextEntry={!showConfirm}
                editable={!busy}
              />
              <TouchableOpacity onPress={() => setShowConfirm(v => !v)} style={s.eyeBtn}>
                <Ionicons name={showConfirm ? "eye-off-outline" : "eye-outline"} size={18} color={C.textMuted} />
              </TouchableOpacity>
            </View>

            {err && (
              <View style={[s.errBox, { backgroundColor: C.verifikasiBg }]}>
                <Ionicons name="alert-circle-outline" size={15} color={C.verifikasiText} />
                <Text style={[s.errText, { color: C.verifikasiText }]}>{err}</Text>
              </View>
            )}

            <TouchableOpacity onPress={onSubmit} disabled={busy} style={[s.btnPrimary, { backgroundColor: C.primary }]}>
              {busy ? <ActivityIndicator color={C.primaryFg} /> : <Text style={[s.btnPrimaryText, { color: C.primaryFg }]}>Buat Akun</Text>}
            </TouchableOpacity>
          </View>

          <View style={s.row}>
            <Text style={[s.muted, { color: isDark ? "rgba(255,255,255,0.55)" : C.textMuted }]}>Sudah punya akun? </Text>
            <Link href="/login" asChild>
              <TouchableOpacity>
                <Text style={[s.link, { color: isDark ? "#FFFFFF" : C.primary }]}>Masuk</Text>
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
  content: { padding: 24, alignItems: "center", paddingBottom: 40, gap: 0 },
  topBar: { width: "100%", flexDirection: "row", justifyContent: "flex-end", marginBottom: 4, marginTop: -8 },
  themeRow: { flexDirection: "row", alignItems: "center", gap: 2 },
  logo: { width: 72, height: 72, marginTop: 8, borderRadius: 18 },
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
