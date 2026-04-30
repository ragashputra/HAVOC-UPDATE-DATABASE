import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Alert } from "react-native";
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

  const onSubmit = async () => {
    if (!oldPwd || !newPwd) { Alert.alert("Tidak valid", "Semua field wajib diisi"); return; }
    if (newPwd.length < 6) { Alert.alert("Tidak valid", "Password baru minimal 6 karakter"); return; }
    if (newPwd !== confirmPwd) { Alert.alert("Tidak cocok", "Konfirmasi password tidak sama"); return; }
    setSaving(true);
    try {
      await changePassword(oldPwd, newPwd);
      setOldPwd(""); setNewPwd(""); setConfirmPwd("");
      Alert.alert("Berhasil!", "Password berhasil diubah.", [{ text: "OK", onPress: () => router.back() }]);
    } catch (e: any) { Alert.alert("Gagal", e?.message ?? "Gagal ganti password"); }
    finally { setSaving(false); }
  };

  const fields = [
    { label: "PASSWORD LAMA", show: showOld, toggle: () => setShowOld(v => !v), value: oldPwd, onChange: setOldPwd },
    { label: "PASSWORD BARU (MIN 6 KARAKTER)", show: showNew, toggle: () => setShowNew(v => !v), value: newPwd, onChange: setNewPwd },
    { label: "KONFIRMASI PASSWORD BARU", show: showConfirm, toggle: () => setShowConfirm(v => !v), value: confirmPwd, onChange: setConfirmPwd },
  ];

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: C.bg }]} edges={["top","left","right"]}>
      <View style={[s.header, { backgroundColor: C.headerBg, borderBottomColor: C.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={[s.iconBtn, { borderColor: C.border }]}>
          <Ionicons name="arrow-back" size={20} color={C.textPrimary} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: C.textPrimary }]}>Ganti Password</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={[s.card, { backgroundColor: C.surface, borderColor: C.border }]}>
          <View style={s.cardTop}>
            <View style={[s.iconCircle, { backgroundColor: C.inputBg }]}>
              <Ionicons name="lock-closed" size={24} color={C.textPrimary} />
            </View>
            <Text style={[s.cardTitle, { color: C.textPrimary }]}>Ubah Password Akun</Text>
          </View>

          {fields.map((f, i) => (
            <View key={i} style={{ gap: 5 }}>
              <Text style={[s.label, { color: C.textSecondary }]}>{f.label}</Text>
              <View style={[s.pwdRow, { backgroundColor: C.inputBg, borderColor: C.border }]}>
                <TextInput
                  style={[s.input, { flex: 1, borderWidth: 0, backgroundColor: "transparent", color: C.textPrimary }]}
                  placeholder="••••••••" placeholderTextColor={C.textMuted}
                  secureTextEntry={!f.show} value={f.value} onChangeText={f.onChange} editable={!saving}
                />
                <TouchableOpacity style={s.eyeBtn} onPress={f.toggle}>
                  <Ionicons name={f.show ? "eye-off-outline" : "eye-outline"} size={20} color={C.textMuted} />
                </TouchableOpacity>
              </View>
            </View>
          ))}

          <TouchableOpacity style={[s.btnPrimary, { backgroundColor: C.primary, opacity: saving ? 0.7 : 1 }]} onPress={onSubmit} disabled={saving}>
            {saving ? <ActivityIndicator color={C.primaryFg} /> : (
              <><Ionicons name="lock-closed-outline" size={16} color={C.primaryFg} /><Text style={[s.btnPrimaryText, { color: C.primaryFg }]}>Ganti Password</Text></>
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
  content: { padding: 14, paddingBottom: 40 },
  card: { borderRadius: 18, borderWidth: 1, padding: 20, gap: 14 },
  cardTop: { alignItems: "center", gap: 10, marginBottom: 4 },
  iconCircle: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  cardTitle: { fontSize: 16, fontWeight: "800" },
  label: { fontSize: 10, fontWeight: "700", letterSpacing: 1.2 },
  input: { height: 48, paddingHorizontal: 14, fontSize: 15, fontWeight: "500" },
  pwdRow: { flexDirection: "row", alignItems: "center", height: 48, borderWidth: 1, borderRadius: 12, overflow: "hidden" },
  eyeBtn: { width: 46, height: 48, alignItems: "center", justifyContent: "center" },
  btnPrimary: { height: 50, borderRadius: 14, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, marginTop: 4 },
  btnPrimaryText: { fontWeight: "700", fontSize: 14 },
});
