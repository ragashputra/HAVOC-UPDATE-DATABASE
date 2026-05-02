// ============================================================
// history.tsx — UPDATED v2.3.0
// Fix: tombol X ganda pada search (hapus clearButtonMode, pakai manual saja)
// ============================================================
import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert, Animated, TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth, APP_BACKEND_URL, authFetch } from "../lib/auth";
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

function formatDate(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch { return iso; }
}

function formatSize(bytes) {
  if (!bytes) return "—";
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function isPhoto(item) {
  if (item.file_type === "cdb_photo") return true;
  const ext = item.file_name?.split(".").pop()?.toLowerCase() ?? "";
  return ["jpg", "jpeg", "png", "webp", "heic"].includes(ext);
}

function ItemCard({ item, C, isDark, onDelete, deletingId }) {
  const photo = isPhoto(item);
  return (
    <View style={[ic.card, { backgroundColor: C.surface, borderColor: getBorder(isDark) }]}>
      <View style={[ic.typeIcon, { backgroundColor: photo ? C.cdbBg : C.verifikasiBg }]}>
        <Ionicons name={photo ? "image" : "mic"} size={16} color={photo ? C.accentDrive : C.accentRecord} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <View style={ic.topRow}>
          <Text style={[ic.name, { color: C.textPrimary }]} numberOfLines={1}>{item.nama_konsumen}</Text>
          <View style={[ic.tag, { backgroundColor: photo ? C.cdbBg : C.verifikasiBg }]}>
            <Text style={[ic.tagText, { color: photo ? C.accentDrive : C.accentRecord }]}>
              {photo ? "Foto" : "Audio"}
            </Text>
          </View>
        </View>
        <View style={ic.metaRow}>
          <View style={[ic.mesinChip, { backgroundColor: C.stripBg }]}>
            <Text style={[ic.mesinText, { color: C.textSecondary }]}>{item.nomor_mesin}</Text>
          </View>
          <Text style={[ic.dot, { color: getLabelColor(isDark) }]}>·</Text>
          <Text style={[ic.meta, { color: getLabelColor(isDark) }]}>{formatSize(item.size_bytes)}</Text>
          <Text style={[ic.dot, { color: getLabelColor(isDark) }]}>·</Text>
          <Text style={[ic.meta, { color: getLabelColor(isDark) }]}>{formatDate(item.uploaded_at)}</Text>
        </View>
      </View>
      <TouchableOpacity
        onPress={() => onDelete(item)}
        disabled={deletingId === item.id}
        style={[ic.trash, { borderColor: getBorder(isDark), backgroundColor: C.deleteBtn }]}
      >
        {deletingId === item.id
          ? <ActivityIndicator size="small" color={C.accentRecord} />
          : <Ionicons name="trash-outline" size={15} color={C.accentRecord} />}
      </TouchableOpacity>
    </View>
  );
}

const ic = StyleSheet.create({
  card: { flexDirection: "row", alignItems: "center", gap: 8, padding: 9, borderRadius: 12, borderWidth: 1 },
  typeIcon: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 6 },
  name: { fontSize: 13, fontWeight: "800", flex: 1 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4, flexWrap: "wrap" },
  mesinChip: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 5 },
  mesinText: { fontSize: 11, fontWeight: "700" },
  dot: { fontSize: 11 },
  meta: { fontSize: 11, fontWeight: "600" },
  tag: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 20 },
  tagText: { fontSize: 10, fontWeight: "700" },
  trash: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center", borderWidth: 1 },
});

export default function HistoryScreen() {
  const { token } = useAuth();
  const { C, mode } = useTheme();
  const isDark = mode === "dark";
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const res = await authFetch(token, `${APP_BACKEND_URL}/api/uploads`);
      const data = await res.json();
      if (res.ok) {
        setItems(data.items || []);
        Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
      }
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, [token]);

  useEffect(() => { load(); }, [load]);
  const onRefresh = () => { setRefreshing(true); load(); };

  const filteredItems = items.filter(item => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.nama_konsumen?.toLowerCase().includes(q) ||
      item.nomor_mesin?.toLowerCase().includes(q) ||
      item.file_name?.toLowerCase().includes(q)
    );
  });

  const audioItems = filteredItems.filter(i => !isPhoto(i));
  const photoItems = filteredItems.filter(i => isPhoto(i));

  const onDelete = (item) => {
    Alert.alert("Hapus dari Riwayat?", `"${item.file_name}"\n\nFile di Drive TIDAK terhapus.`, [
      { text: "Batal", style: "cancel" },
      {
        text: "Hapus", style: "destructive", onPress: async () => {
          setDeletingId(item.id);
          try {
            const res = await authFetch(token, `${APP_BACKEND_URL}/api/uploads/${item.id}`, { method: "DELETE" });
            if (!res.ok) {
              const d = await res.json().catch(() => ({}));
              throw new Error(typeof d.detail === "string" ? d.detail : "Gagal menghapus");
            }
            setItems(prev => prev.filter(x => x.id !== item.id));
          } catch (e) { Alert.alert("Gagal", e?.message ?? "Tidak bisa menghapus"); }
          finally { setDeletingId(null); }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: C.bg }]}>
      {/* Header */}
      <View style={[s.header, { borderBottomColor: getBorder(isDark), backgroundColor: C.headerBg }]}>
        <TouchableOpacity onPress={() => router.back()} style={[s.iconBtn, { borderColor: getBorder(isDark) }]}>
          <Ionicons name="chevron-back" size={18} color={C.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[s.headerTitle, { color: C.textPrimary }]}>Riwayat Upload</Text>
          {items.length > 0 && (
            <Text style={[s.headerSub, { color: getLabelColor(isDark) }]}>
              {audioItems.length} audio · {photoItems.length} foto
            </Text>
          )}
        </View>
      </View>

      {/* Search Bar — clearButtonMode dihapus, pakai tombol X manual saja */}
      <View style={[s.searchContainer, { backgroundColor: C.bg, borderBottomColor: getBorder(isDark) }]}>
        <View style={[
          s.searchBar,
          { backgroundColor: C.surface, borderColor: searchFocused ? C.primary : getBorder(isDark) }
        ]}>
          <Ionicons name="search" size={16} color={getLabelColor(isDark)} style={{ marginLeft: 10 }} />
          <TextInput
            style={[s.searchInput, { color: C.textPrimary }]}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Cari nama, nomor mesin..."
            placeholderTextColor={getPlaceholderColor(isDark)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            returnKeyType="search"
            // TIDAK menggunakan clearButtonMode agar tidak double-X
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")} style={s.clearBtn}>
              <Ionicons name="close-circle" size={17} color={getLabelColor(isDark)} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      ) : filteredItems.length === 0 ? (
        <View style={s.center}>
          <View style={[s.emptyIcon, { backgroundColor: C.surface }]}>
            <Ionicons name={searchQuery ? "search" : "mic-off"} size={32} color={C.textMuted} />
          </View>
          <Text style={[s.emptyTitle, { color: C.textPrimary }]}>
            {searchQuery ? "Tidak ditemukan" : "Belum ada rekaman"}
          </Text>
          <Text style={[s.emptyDesc, { color: C.textMuted }]}>
            {searchQuery ? `Tidak ada hasil untuk "${searchQuery}"` : "File yang diupload akan tampil di sini"}
          </Text>
        </View>
      ) : (
        <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
          <FlatList
            data={filteredItems}
            keyExtractor={it => it.id}
            contentContainerStyle={[s.list, { backgroundColor: C.bg }]}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={C.primary}
                colors={[C.primary]}
              />
            }
            showsVerticalScrollIndicator={false}
            decelerationRate="normal"
            ItemSeparatorComponent={() => <View style={{ height: 5 }} />}
            renderItem={({ item }) => (
              <ItemCard
                item={item}
                C={C}
                isDark={isDark}
                onDelete={onDelete}
                deletingId={deletingId}
              />
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
  headerSub: { fontSize: 13, fontWeight: "600", marginTop: 1 },
  searchContainer: { paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1 },
  searchBar: { flexDirection: "row", alignItems: "center", borderRadius: 12, borderWidth: 1, height: 40 },
  searchInput: { flex: 1, fontSize: 14, fontWeight: "500", paddingVertical: 0, paddingHorizontal: 8 },
  clearBtn: { paddingRight: 10, paddingLeft: 4 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 15, fontWeight: "800" },
  emptyDesc: { fontSize: 12 },
  list: { padding: 10, paddingBottom: 40 },
});