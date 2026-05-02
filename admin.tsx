import React, { useCallback, useEffect, useState } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Alert,
  TextInput, Modal, KeyboardAvoidingView, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth, APP_BACKEND_URL, authFetch } from "../lib/auth";

const COLORS = {
  bg: "#FFFFFF", surface: "#F4F4F5", border: "#E4E4E7",
  primary: "#18181B", primaryFg: "#FFFFFF", textSecondary: "#52525B",
  accentSuccess: "#059669", accentDrive: "#2563EB", accentDanger: "#DC2626", accentWarn: "#D97706",
};

type ResetReq = {
  id: string;
  email: string;
  user_id: string | null;
  nama_lengkap: string | null;
  message: string;
  status: "pending" | "completed";
  created_at: string;
  completed_at: string | null;
  completed_by: string | null;
};

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch { return iso; }
}

export default function AdminScreen() {
  const { user, token } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<ResetReq[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<"all" | "pending" | "completed">("all");

  const [resetModal, setResetModal] = useState<ResetReq | null>(null);
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [savingReset, setSavingReset] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const url = filter === "all"
        ? `${APP_BACKEND_URL}/api/admin/reset-requests`
        : `${APP_BACKEND_URL}/api/admin/reset-requests?status=${filter}`;
      const res = await authFetch(token, url);
      const data = await res.json();
      if (res.ok) setItems(data.items || []);
      else Alert.alert("Gagal", typeof data.detail === "string" ? data.detail : "Tidak bisa memuat data");
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, filter]);

  useEffect(() => { load(); }, [load]);

  if (user && user.role !== "admin") {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Ionicons name="lock-closed" size={56} color={COLORS.accentDanger} />
          <Text style={styles.deniedTitle}>AKSES DITOLAK</Text>
          <Text style={styles.deniedDesc}>Halaman ini hanya untuk admin.</Text>
          <TouchableOpacity style={styles.backCta} onPress={() => router.back()}>
            <Text style={styles.backCtaText}>KEMBALI</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const onResetPress = (req: ResetReq) => {
    if (req.status === "completed") return;
    setResetModal(req);
    setNewPwd(""); setConfirmPwd("");
  };

  const submitReset = async () => {
    if (!resetModal) return;
    if (newPwd.length < 6) { Alert.alert("Tidak valid", "Password minimal 6 karakter"); return; }
    if (newPwd !== confirmPwd) { Alert.alert("Tidak cocok", "Konfirmasi password tidak sama"); return; }
    setSavingReset(true);
    try {
      const res = await authFetch(token, `${APP_BACKEND_URL}/api/admin/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request_id: resetModal.id, new_password: newPwd }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data.detail === "string" ? data.detail : "Gagal reset password");
      Alert.alert("Berhasil", `Password untuk ${data.user_email} berhasil di-reset.`);
      setResetModal(null);
      load();
    } catch (e: any) {
      Alert.alert("Gagal", e?.message ?? "Tidak bisa reset password");
    } finally {
      setSavingReset(false);
    }
  };

  const onDelete = (req: ResetReq) => {
    Alert.alert("Hapus permintaan?", "Permintaan akan dihapus permanen.", [
      { text: "Batal", style: "cancel" },
      {
        text: "Hapus", style: "destructive", onPress: async () => {
          try {
            const res = await authFetch(token, `${APP_BACKEND_URL}/api/admin/reset-requests/${req.id}`, { method: "DELETE" });
            if (!res.ok) {
              const d = await res.json().catch(() => ({}));
              throw new Error(typeof d.detail === "string" ? d.detail : "Gagal menghapus");
            }
            load();
          } catch (e: any) {
            Alert.alert("Gagal", e?.message ?? "Tidak bisa menghapus");
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <TouchableOpacity testID="btn-back" onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>PANEL ADMIN</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.subHeader}>
        <Text style={styles.subHeaderTitle}>PERMINTAAN RESET PASSWORD</Text>
      </View>

      <View style={styles.filterRow}>
        {(["all", "pending", "completed"] as const).map((f) => (
          <TouchableOpacity
            key={f}
            testID={`filter-${f}`}
            style={[styles.filterChip, filter === f && styles.filterChipActive]}
            onPress={() => { setFilter(f); setLoading(true); }}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === "all" ? "SEMUA" : f === "pending" ? "PENDING" : "SELESAI"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="document-text-outline" size={64} color={COLORS.border} />
          <Text style={styles.emptyTitle}>Tidak ada permintaan</Text>
          <Text style={styles.emptyDesc}>Permintaan reset password akan muncul di sini.</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => it.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
          renderItem={({ item }) => (
            <View style={styles.card} testID={`reset-item-${item.id}`}>
              <View style={styles.cardTopRow}>
                <View style={[styles.statusPill, item.status === "pending" ? styles.pillPending : styles.pillDone]}>
                  <Text style={[styles.pillText, item.status === "pending" ? styles.pillTextPending : styles.pillTextDone]}>
                    {item.status === "pending" ? "PENDING" : "SELESAI"}
                  </Text>
                </View>
                <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
              </View>
              <Text style={styles.email} numberOfLines={1}>{item.email}</Text>
              {item.nama_lengkap && <Text style={styles.namaText}>{item.nama_lengkap}</Text>}
              {!item.user_id && (
                <View style={styles.warnBox}>
                  <Ionicons name="warning" size={12} color={COLORS.accentWarn} />
                  <Text style={styles.warnText}>Email tidak terdaftar di sistem</Text>
                </View>
              )}
              {!!item.message && <Text style={styles.message}>“{item.message}”</Text>}
              {item.status === "completed" && item.completed_at && (
                <Text style={styles.metaSmall}>Selesai: {formatDate(item.completed_at)} oleh {item.completed_by}</Text>
              )}
              <View style={styles.actionsRow}>
                {item.status === "pending" && item.user_id && (
                  <TouchableOpacity testID={`btn-reset-${item.id}`} style={styles.btnReset} onPress={() => onResetPress(item)}>
                    <Ionicons name="key" size={14} color={COLORS.primaryFg} />
                    <Text style={styles.btnResetText}>RESET PASSWORD</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity testID={`btn-delete-${item.id}`} style={styles.btnDelete} onPress={() => onDelete(item)}>
                  <Ionicons name="trash-outline" size={16} color={COLORS.accentDanger} />
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      <Modal visible={!!resetModal} transparent animationType="fade" onRequestClose={() => setResetModal(null)}>
        <KeyboardAvoidingView style={styles.modalBackdrop} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>RESET PASSWORD</Text>
            <Text style={styles.modalSub}>Untuk: {resetModal?.email}</Text>
            <Text style={[styles.label, { marginTop: 14 }]}>PASSWORD BARU (MIN 6)</Text>
            <TextInput
              testID="modal-input-new-password"
              style={styles.modalInput}
              placeholder="••••••••"
              placeholderTextColor="#A1A1AA"
              secureTextEntry
              value={newPwd}
              onChangeText={setNewPwd}
              editable={!savingReset}
            />
            <Text style={[styles.label, { marginTop: 10 }]}>KONFIRMASI</Text>
            <TextInput
              testID="modal-input-confirm-password"
              style={styles.modalInput}
              placeholder="••••••••"
              placeholderTextColor="#A1A1AA"
              secureTextEntry
              value={confirmPwd}
              onChangeText={setConfirmPwd}
              editable={!savingReset}
            />
            <View style={styles.modalRow}>
              <TouchableOpacity testID="modal-btn-cancel" style={styles.btnGhost} onPress={() => setResetModal(null)} disabled={savingReset}>
                <Text style={styles.btnGhostText}>BATAL</Text>
              </TouchableOpacity>
              <TouchableOpacity testID="modal-btn-confirm" style={styles.btnConfirm} onPress={submitReset} disabled={savingReset}>
                {savingReset ? <ActivityIndicator color={COLORS.primaryFg} /> : <Text style={styles.btnConfirmText}>SET PASSWORD</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: COLORS.border },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: COLORS.primary },
  headerTitle: { fontSize: 14, fontWeight: "900", color: COLORS.primary, letterSpacing: 1.5 },
  subHeader: { paddingHorizontal: 16, paddingTop: 14 },
  subHeaderTitle: { fontSize: 11, fontWeight: "900", color: COLORS.textSecondary, letterSpacing: 1.6 },
  filterRow: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 8, borderWidth: 2, borderColor: COLORS.border, backgroundColor: COLORS.bg },
  filterChipActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary },
  filterText: { fontSize: 11, fontWeight: "800", color: COLORS.textSecondary, letterSpacing: 1 },
  filterTextActive: { color: COLORS.primaryFg },
  list: { padding: 16, paddingTop: 0 },
  card: { borderWidth: 2, borderColor: COLORS.primary, padding: 14, backgroundColor: COLORS.surface, marginBottom: 12 },
  cardTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 4, borderWidth: 2 },
  pillPending: { borderColor: COLORS.accentWarn, backgroundColor: "#FFFBEB" },
  pillDone: { borderColor: COLORS.accentSuccess, backgroundColor: "#ECFDF5" },
  pillText: { fontSize: 10, fontWeight: "900", letterSpacing: 1.2 },
  pillTextPending: { color: COLORS.accentWarn },
  pillTextDone: { color: COLORS.accentSuccess },
  dateText: { fontSize: 11, color: COLORS.textSecondary, fontWeight: "600" },
  email: { fontSize: 14, fontWeight: "900", color: COLORS.primary },
  namaText: { fontSize: 12, fontWeight: "700", color: COLORS.textSecondary, marginTop: 2 },
  warnBox: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: "#FEF3C7", borderWidth: 1, borderColor: COLORS.accentWarn, alignSelf: "flex-start" },
  warnText: { fontSize: 10, color: COLORS.accentWarn, fontWeight: "700" },
  message: { fontSize: 12, color: COLORS.textSecondary, fontStyle: "italic", marginTop: 8, lineHeight: 17 },
  metaSmall: { fontSize: 10, color: COLORS.textSecondary, marginTop: 8, fontWeight: "600" },
  actionsRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12 },
  btnReset: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, backgroundColor: COLORS.primary, borderWidth: 2, borderColor: COLORS.primary },
  btnResetText: { color: COLORS.primaryFg, fontSize: 11, fontWeight: "900", letterSpacing: 1.1 },
  btnDelete: { width: 42, height: 38, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: COLORS.accentDanger, backgroundColor: "#FFF1F2" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: "800", color: COLORS.primary, marginTop: 12 },
  emptyDesc: { fontSize: 13, color: COLORS.textSecondary, textAlign: "center" },
  deniedTitle: { fontSize: 18, fontWeight: "900", color: COLORS.accentDanger, marginTop: 12, letterSpacing: 1 },
  deniedDesc: { fontSize: 13, color: COLORS.textSecondary, textAlign: "center" },
  backCta: { marginTop: 16, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: COLORS.primary, borderWidth: 2, borderColor: COLORS.primary },
  backCtaText: { color: COLORS.primaryFg, fontWeight: "900", letterSpacing: 1 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center", padding: 20 },
  modal: { width: "100%", maxWidth: 400, backgroundColor: COLORS.bg, borderWidth: 3, borderColor: COLORS.primary, padding: 20 },
  modalTitle: { fontSize: 16, fontWeight: "900", color: COLORS.primary, letterSpacing: 1 },
  modalSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
  label: { fontSize: 10, fontWeight: "800", color: COLORS.textSecondary, letterSpacing: 1.4, marginBottom: 6 },
  modalInput: { height: 48, borderWidth: 2, borderColor: COLORS.border, backgroundColor: COLORS.surface, paddingHorizontal: 12, fontSize: 15, fontWeight: "600", color: COLORS.primary },
  modalRow: { flexDirection: "row", gap: 10, marginTop: 18 },
  btnGhost: { flex: 1, height: 48, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: COLORS.primary },
  btnGhostText: { color: COLORS.primary, fontWeight: "900", letterSpacing: 1 },
  btnConfirm: { flex: 1, height: 48, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.primary, borderWidth: 2, borderColor: COLORS.primary },
  btnConfirmText: { color: COLORS.primaryFg, fontWeight: "900", letterSpacing: 1 },
});
