import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Alert, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../lib/auth";
import { useTheme } from "../lib/theme";

export default function FolderDriveScreen() {
  const { user, updateDriveFolder } = useAuth();
  const { C } = useTheme();
  const router = useRouter();
  const [folderInput, setFolderInput] = useState(user?.drive_folder_id ?? "");
  const [saving, setSaving] = useState(false);

  const extractFolderId = (input: string): string => {
    const m = input.match(/\/folders\/([a-zA-Z0-9_-]+)/);
    return m ? m[1] : input.trim();
  };

  const onSave = async () => {
    const folderId = extractFolderId(folderInput);
    if (!folderId) { Alert.alert("Wajib diisi", "Folder ID / URL Drive wajib diisi"); return; }
    setSaving(true);
    try {
      await updateDriveFolder(folderId);
      setFolderInput(folderId);
      Alert.alert("Berhasil", "Folder Google Drive berhasil disimpan");
    } catch (e: any) { Alert.alert("Gagal", e?.message ?? "Gagal simpan folder"); }
    finally { setSaving(false); }
  };

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: C.bg }]} edges={["top","left","right"]}>
      <View style={[s.header, { backgroundColor: C.headerBg, borderBottomColor: C.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={[s.iconBtn, { borderColor: C.border }]}>
          <Ionicons name="arrow-back" size={20} color={C.textPrimary} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: C.textPrimary }]}>Folder Google Drive</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {/* Folder input card */}
        <View style={[s.card, { backgroundColor: C.cdbBg, borderColor: C.accentDrive }]}>
          <View style={s.cardRow}>
            <Ionicons name="folder" size={20} color={C.accentDrive} />
            <Text style={[s.cardTitle, { color: C.accentDrive }]}>Folder Tujuan Upload</Text>
          </View>
          <Text style={[s.desc, { color: C.textSecondary }]}>
            File rekaman & foto CDB akan masuk ke subfolder nomor mesin di dalam folder ini.
          </Text>

          <Text style={[s.label, { color: C.textSecondary }]}>FOLDER ID / URL DRIVE</Text>
          <TextInput
            style={[s.input, { backgroundColor: C.inputBg, borderColor: C.border, color: C.textPrimary }]}
            placeholder="ID atau URL folder Google Drive" placeholderTextColor={C.textMuted}
            value={folderInput} onChangeText={setFolderInput} editable={!saving}
            autoCapitalize="none" multiline numberOfLines={2}
          />

          {user?.drive_folder_id ? (
            <View style={[s.activeBox, { backgroundColor: C.connectedHintBg, borderColor: C.accentSuccess }]}>
              <Ionicons name="checkmark-circle" size={14} color={C.accentSuccess} />
              <Text style={[s.activeText, { color: C.accentSuccess }]} numberOfLines={1}>
                Aktif: {user.drive_folder_id.slice(0, 24)}...
              </Text>
            </View>
          ) : null}

          <TouchableOpacity style={[s.btnPrimary, { backgroundColor: C.accentDrive, opacity: saving ? 0.7 : 1 }]} onPress={onSave} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : (
              <><Ionicons name="save-outline" size={16} color="#fff" /><Text style={[s.btnPrimaryText, { color: "#fff" }]}>Simpan Folder</Text></>
            )}
          </TouchableOpacity>
        </View>

        {/* Panduan */}
        <View style={[s.card, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Text style={[s.cardTitle, { color: C.textPrimary }]}>Cara Dapat Folder ID</Text>
          {[
            "Buka Google Drive di browser",
            "Buat atau pilih folder yang ada",
            "Buka folder → lihat URL: drive.google.com/drive/folders/[ID]",
            "Copy bagian ID setelah /folders/",
            "Paste di kolom di atas",
          ].map((step, i) => (
            <View key={i} style={s.stepRow}>
              <View style={[s.stepNum, { backgroundColor: C.primary }]}>
                <Text style={[s.stepNumText, { color: C.primaryFg }]}>{i + 1}</Text>
              </View>
              <Text style={[s.stepText, { color: C.textSecondary }]}>{step}</Text>
            </View>
          ))}
          <TouchableOpacity style={[s.btnOutline, { borderColor: C.accentDrive }]} onPress={() => Linking.openURL("https://drive.google.com")}>
            <Ionicons name="open-outline" size={15} color={C.accentDrive} />
            <Text style={[s.btnPrimaryText, { color: C.accentDrive }]}>Buka Google Drive</Text>
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
  content: { padding: 14, gap: 12, paddingBottom: 40 },
  card: { borderRadius: 16, borderWidth: 1, padding: 14, gap: 10 },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardTitle: { fontSize: 13, fontWeight: "800" },
  desc: { fontSize: 12, lineHeight: 17 },
  label: { fontSize: 10, fontWeight: "700", letterSpacing: 1.2 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 13, fontWeight: "500" },
  activeBox: { flexDirection: "row", alignItems: "center", gap: 8, padding: 10, borderRadius: 10, borderWidth: 1 },
  activeText: { fontSize: 12, fontWeight: "600", flex: 1 },
  btnPrimary: { height: 46, borderRadius: 13, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 7 },
  btnPrimaryText: { fontWeight: "700", fontSize: 13 },
  btnOutline: { height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 7, borderWidth: 1.5 },
  stepRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  stepNum: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  stepNumText: { fontSize: 11, fontWeight: "800" },
  stepText: { flex: 1, fontSize: 12, lineHeight: 18 },
});
