import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert, Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth, APP_BACKEND_URL, authFetch } from "../lib/auth";
import { useTheme } from "../lib/theme";

type UploadItem = {
  id: string;
  nama_konsumen: string;
  nomor_mesin: string;
  file_name: string;
  file_type?: string;
  drive_link: string | null;
  size_bytes: number;
  uploaded_at: string;
};

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch { return iso; }
}

function formatSize(bytes: number): string {
  if (!bytes) return "—";
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function isPhoto(item: UploadItem): boolean {
  if (item.file_type === "cdb_photo") return true;
  const ext = item.file_name?.split(".").pop()?.toLowerCase() ?? "";
  return ["jpg","jpeg","png","webp","heic"].includes(ext);
}

function ItemCard({ item, C, onDelete, deletingId }: { item: UploadItem; C: any; onDelete: (item: UploadItem) => void; deletingId: string | null }) {
  const photo = isPhoto(item);
  return (
    <View style={[ic.card, { backgroundColor: C.surface, borderColor: C.border }]}>
      <View style={[ic.typeIcon, { backgroundColor: photo ? C.cdbBg : C.inputBg }]}>
        <Ionicons name={photo ? "image-outline" : "mic-outline"} size={18} color={photo ? C.accentDrive : C.accentRecord} />
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={[ic.name, { color: C.textPrimary }]} numberOfLines={1}>{item.nama_konsumen}</Text>
        <View style={ic.metaRow}>
          <View style={[ic.mesinChip, { backgroundColor: C.inputBg }]}>
            <Text style={[ic.mesinText, { color: C.textSecondary }]}>{item.nomor_mesin}</Text>
          </View>
          <Text style={[ic.dot, { color: C.textMuted }]}>·</Text>
          <Text style={[ic.meta, { color: C.textMuted }]}>{formatSize(item.size_bytes)}</Text>
          <Text style={[ic.dot, { color: C.textMuted }]}>·</Text>
          <Text style={[ic.meta, { color: C.textMuted }]}>{formatDate(item.uploaded_at)}</Text>
        </View>
        <View style={ic.tagRow}>
          <View style={[ic.tag, { backgroundColor: photo ? C.cdbBg : C.verifikasiBg }]}>
            <Text style={[ic.tagText, { color: photo ? C.accentDrive : C.accentRecord }]}>
              {photo ? "Foto CDB" : "Audio"}
            </Text>
          </View>
        </View>
      </View>
      <TouchableOpacity onPress={() => onDelete(item)} disabled={deletingId === item.id}
        style={[ic.trash, { borderColor: C.border, backgroundColor: C.deleteBtn }]}>
        {deletingId === item.id
          ? <ActivityIndicator size="small" color={C.accentRecord} />
          : <Ionicons name="trash-outline" size={15} color={C.accentRecord} />}
      </TouchableOpacity>
    </View>
  );
}

const ic = StyleSheet.create({
  card: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 12, borderRadius: 14, borderWidth: 1 },
  typeIcon: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  name: { fontSize: 13, fontWeight: "800" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 5, flexWrap: "wrap" },
  mesinChip: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  mesinText: { fontSize: 10, fontWeight: "600" },
  dot: { fontSize: 10 },
  meta: { fontSize: 10, fontWeight: "500" },
  tagRow: { flexDirection: "row", gap: 5 },
  tag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  tagText: { fontSize: 10, fontWeight: "700" },
  trash: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center", borderWidth: 1, marginTop: 2 },
});

export default function HistoryScreen() {
  const { token } = useAuth();
  const { C } = useTheme();
  const router = useRouter();
  const [items, setItems] = useState<UploadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fadeAnim = useState(new Animated.Value(0))[0];

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const res = await authFetch(token, `${APP_BACKEND_URL}/api/uploads`);
      const data = await res.json();
      if (res.ok) {
        setItems(data.items || []);
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
      }
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, [token]);

  useEffect(() => { load(); }, [load]);
  const onRefresh = () => { setRefreshing(true); load(); };

  const onDelete = (item: UploadItem) => {
    Alert.alert("Hapus dari Riwayat?", `"${item.file_name}"\n\nFile di Drive TIDAK terhapus.`, [
      { text: "Batal", style: "cancel" },
      { text: "Hapus", style: "destructive", onPress: async () => {
          setDeletingId(item.id);
          try {
            const res = await authFetch(token, `${APP_BACKEND_URL}/api/uploads/${item.id}`, { method: "DELETE" });
            if (!res.ok) {
              const d = await res.json().catch(() => ({}));
              throw new Error(typeof d.detail === "string" ? d.detail : "Gagal menghapus");
            }
            setItems(prev => prev.filter(x => x.id !== item.id));
          } catch (e: any) { Alert.alert("Gagal", e?.message ?? "Tidak bisa menghapus"); }
          finally { setDeletingId(null); }
        },
      },
    ]);
  };

  // Group by konsumen
  const audioItems = items.filter(i => !isPhoto(i));
  const photoItems = items.filter(i => isPhoto(i));

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: C.bg }]} edges={["top","left","right"]}>
      <View style={[s.header, { backgroundColor: C.headerBg, borderBottomColor: C.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={[s.iconBtn, { borderColor: C.border }]}>
          <Ionicons name="arrow-back" size={20} color={C.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[s.headerTitle, { color: C.textPrimary }]}>Riwayat Upload</Text>
          {items.length > 0 && <Text style={[s.headerSub, { color: C.textSecondary }]}>{audioItems.length} audio · {photoItems.length} foto</Text>}
        </View>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={C.textPrimary} />
        </View>
      ) : items.length === 0 ? (
        <View style={s.center}>
          <View style={[s.emptyIcon, { backgroundColor: C.surface }]}>
            <Ionicons name="cloud-offline-outline" size={40} color={C.textMuted} />
          </View>
          <Text style={[s.emptyTitle, { color: C.textPrimary }]}>Belum ada rekaman</Text>
          <Text style={[s.emptyDesc, { color: C.textSecondary }]}>File yang diupload akan tampil di sini</Text>
        </View>
      ) : (
        <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
          <FlatList
            data={items}
            keyExtractor={it => it.id}
            contentContainerStyle={[s.list, { backgroundColor: C.bg }]}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.textSecondary} />}
            showsVerticalScrollIndicator={false}
            decelerationRate="fast"
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            renderItem={({ item }) => (
              <ItemCard item={item} C={C} onDelete={onDelete} deletingId={deletingId} />
            )}
          />
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1 },
  iconBtn: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  headerTitle: { fontSize: 15, fontWeight: "800" },
  headerSub: { fontSize: 11, marginTop: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 15, fontWeight: "800" },
  emptyDesc: { fontSize: 12 },
  list: { padding: 12, paddingBottom: 40 },
});
