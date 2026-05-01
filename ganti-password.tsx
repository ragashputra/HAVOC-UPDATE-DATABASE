// ============================================================
// ganti-password.tsx — UPDATED
// Perubahan: Header compact konsisten dengan navbar baru
// ============================================================
import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, ScrollView, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../lib/auth";
import { useTheme } from "../lib/theme";

export default function GantiPasswordScreen() {
  const { changePassword } = useAuth();
  const { C } = useTheme();
  const router = useRouter();
  const [oldPwd, setOldPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  // field definitions moved inline below
  const onSubmit = async () => {
    if (!oldPwd || !newPwd) { Alert.alert("Tidak valid", "Semua field wajib diisi"); return; }
    if (newPwd.length < 6) { Alert.alert("Tidak valid", "Password baru minimal 6 karakter"); return; }
    if (newPwd !== confirmPwd) { Alert.alert("Tidak cocok", "Konfirmasi password tidak sama"); return; }
    setSaving(true);
    try {
      await changePassword(oldPwd, newPwd);
      setOldPwd(""); setNewPwd(""); setConfirmPwd("");
      Alert.alert("Berhasil!", "Password berhasil diubah.", [{ text: "OK", onPress: () => router.back() }]);
    } catch (e) { Alert.alert("Gagal", e?.message ?? "Gagal ganti password"); }
    finally { setSaving(false); }
  };

  const fields = [
    { label: "PASSWORD LAMA", show: showOld, toggle: () => setShowOld(v => !v), value: oldPwd, onChange: setOldPwd },
    { label: "PASSWORD BARU (MIN 6 KARAKTER)", show: showNew, toggle: () => setShowNew(v => !v), value: newPwd, onChange: setNewPwd },
    { label: "KONFIRMASI PASSWORD BARU", show: showConfirm, toggle: () => setShowConfirm(v => !v), value: confirmPwd, onChange: setConfirmPwd },
  ];

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: C.bg }]}>
      {/* Header compact */}
      <View style={[s.header, { borderBottomColor: C.border, backgroundColor: C.headerBg }]}>
        <TouchableOpacity onPress={() => router.back()} style={[s.iconBtn, { borderColor: C.border }]}>
          <Ionicons name="chevron-back" size={18} color={C.textPrimary} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: C.textPrimary }]}>Ganti Password</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={[s.content, { backgroundColor: C.bg }]} showsVerticalScrollIndicator={false}>
        <View style={[s.card, { backgroundColor: C.surface, borderColor: C.border }]}>
          <View style={s.cardTop}>
            <View style={[s.iconCircle, { backgroundColor: C.stripBg }]}>
              <Ionicons name="lock-closed" size={24} color={C.textSecondary} />
            </View>
            <Text style={[s.cardTitle, { color: C.textPrimary }]}>Ubah Password Akun</Text>
          </View>

          {fields.map((f, i) => (
            <View key={i}>
              <Text style={[s.label, { color: C.textMuted }]}>{f.label}</Text>
              <View style={[s.pwdRow, { backgroundColor: C.inputBg, borderColor: C.border }]}>
                <TextInput
                  style={[s.input, { color: C.textPrimary }]}
                  value={f.value}
                  onChangeText={f.onChange}
                  placeholder="••••••••"
                  placeholderTextColor={C.textMuted}
                  secureTextEntry={!f.show}
                  editable={!saving}
                />
                <TouchableOpacity style={s.eyeBtn} onPress={f.toggle}>
                  <Ionicons name={f.show ? "eye-off" : "eye"} size={20} color={C.textMuted} />
                </TouchableOpacity>
              </View>
            </View>
          ))}

          <TouchableOpacity
            style={[s.btnPrimary, { backgroundColor: C.primary, opacity: saving ? 0.7 : 1 }]}
            onPress={onSubmit}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving ? <ActivityIndicator color={C.primaryFg} /> : (
              <>
                <Ionicons name="checkmark" size={16} color={C.primaryFg} />
                <Text style={[s.btnPrimaryText, { color: C.primaryFg }]}>Ganti Password</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1 },
  iconBtn: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  headerTitle: { fontSize: 15, fontWeight: "800" },
  content: { padding: 12, paddingBottom: 40 },
  card: { borderRadius: 18, borderWidth: 1, padding: 18, gap: 12 },
  cardTop: { alignItems: "center", gap: 8, marginBottom: 4 },
  iconCircle: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  cardTitle: { fontSize: 15, fontWeight: "800" },
  label: { fontSize: 10, fontWeight: "700", letterSpacing: 1.2 },
  input: { flex: 1, height: 48, paddingHorizontal: 14, fontSize: 15, fontWeight: "500" },
  pwdRow: { flexDirection: "row", alignItems: "center", height: 48, borderWidth: 1, borderRadius: 12, overflow: "hidden" },
  eyeBtn: { width: 46, height: 48, alignItems: "center", justifyContent: "center" },
  btnPrimary: { height: 50, borderRadius: 14, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, marginTop: 4 },
  btnPrimaryText: { fontWeight: "700", fontSize: 14 },
});