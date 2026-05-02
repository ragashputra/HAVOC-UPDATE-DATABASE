// ============================================================
// index.tsx — UPDATED v2.3.0
// Perubahan:
//  1. Nama aplikasi → Honda Visual On-site Capture (HVOC)
//  2. No mesin 13 karakter, indikator hijau/merah, hapus hint
//  3. Hapus panel admin sepenuhnya
//  4. Dark mode sebagai default
//  5. Waveform & timer rekam warna hijau
//  6. Fix PlaybackBar — gunakan state posisi terpisah, tidak gerak sendiri
//  7. Drive icon efek glow hijau/merah
//  8. WhatsNew icon minimalis
//  9. Poin verifikasi baru (8 item), 2 kolom compact
// 10. Icon navbar lebih besar, border lebih tebal
// 11. -
// ============================================================

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, Platform, KeyboardAvoidingView, Image,
  Animated, Easing, Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system/legacy";
import * as DocumentPicker from "expo-document-picker";
import * as WebBrowser from "expo-web-browser";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth, APP_BACKEND_URL, authFetch } from "../lib/auth";
import { useTheme } from "../lib/theme";

// ─── App version ──────────────────────────────────────────────
const APP_VERSION = "2.3.0";
const WHATS_NEW_KEY = `whats_new_seen_v${APP_VERSION}`;
const WHATS_NEW_ITEMS = [
  "Nama aplikasi: Honda Visual On-site Capture",
  "Nomor mesin kini 13 karakter dengan indikator",
  "Waveform & timer rekam warna hijau",
  "Ikon Drive glowing hijau/merah",
  "Poin verifikasi konsumen diperbarui",
  "Playback seek bar diperbaiki",
];

const GREEN = "#16a34a";
const RED   = "#dc2626";

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

// ─── Helpers ──────────────────────────────────────────────────
function formatTime(ms) {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60).toString().padStart(2, "0");
  const s = (total % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function formatNomorMesin(raw) {
  const clean = raw.replace(/\s/g, "").toUpperCase();
  if (clean.length <= 5) return clean;
  return clean.slice(0, 5) + " " + clean.slice(5, 13);
}

// ─── WhatsNew Modal ───────────────────────────────────────────
function WhatsNewModal({ visible, onClose, C, isDark }) {
  const scaleAnim = useRef(new Animated.Value(0.88)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 9 }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={wn.backdrop}>
        <Animated.View style={[
          wn.card,
          { backgroundColor: C.surface, borderColor: getBorder(isDark), transform: [{ scale: scaleAnim }], opacity: opacityAnim }
        ]}>
          {/* Icon minimalis */}
          <View style={[wn.iconRow, { backgroundColor: GREEN + "22", borderRadius: 12, padding: 6 }]}>
            <Ionicons name="rocket-outline" size={22} color={GREEN} />
            <Text style={[wn.title, { color: C.textPrimary }]}>Update v{APP_VERSION}</Text>
          </View>
          <View style={{ gap: 6, marginTop: 10, width: "100%" }}>
            {WHATS_NEW_ITEMS.map((item, i) => (
              <View key={i} style={wn.itemRow}>
                <View style={[wn.dot, { backgroundColor: GREEN }]} />
                <Text style={[wn.itemText, { color: C.textSecondary }]}>{item}</Text>
              </View>
            ))}
          </View>
          <TouchableOpacity
            style={[wn.btn, { backgroundColor: C.primary }]}
            onPress={onClose}
            activeOpacity={0.85}
          >
            <Text style={[wn.btnText, { color: C.primaryFg }]}>Mengerti</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const wn = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.65)", alignItems: "center", justifyContent: "center", padding: 28 },
  card: { width: "100%", maxWidth: 340, borderRadius: 20, borderWidth: 1.5, padding: 20, alignItems: "flex-start", gap: 4 },
  iconRow: { flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "flex-start" },
  title: { fontSize: 16, fontWeight: "900" },
  itemRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  dot: { width: 5, height: 5, borderRadius: 3 },
  itemText: { fontSize: 12, lineHeight: 18, flex: 1 },
  btn: { marginTop: 14, width: "100%", height: 46, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  btnText: { fontSize: 14, fontWeight: "700" },
});

// ─── Loading Overlay ──────────────────────────────────────────
function LoadingOverlay({ visible, label, progress, C, isDark }) {
  const spin = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(fade, { toValue: 1, duration: 200, useNativeDriver: true }).start();
      Animated.loop(Animated.timing(spin, { toValue: 1, duration: 900, easing: Easing.linear, useNativeDriver: true })).start();
    } else {
      Animated.timing(fade, { toValue: 0, duration: 150, useNativeDriver: true }).start();
      spin.stopAnimation();
    }
  }, [visible]);

  if (!visible) return null;
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });

  return (
    <Animated.View style={[ls.overlay, { opacity: fade }]}>
      <View style={[ls.box, { backgroundColor: C.surface, borderColor: getBorder(isDark) }]}>
        <Animated.View style={[ls.ring, { borderColor: C.primary, borderTopColor: "transparent", transform: [{ rotate }] }]} />
        <Text style={[ls.label, { color: C.textPrimary }]}>{label}</Text>
        {progress !== undefined && (
          <>
            <View style={[ls.bar, { backgroundColor: getBorder(isDark) }]}>
              <View style={[ls.barFill, { backgroundColor: C.primary, width: `${Math.round(progress * 100)}%` }]} />
            </View>
            <Text style={[ls.pct, { color: C.textPrimary }]}>{Math.round(progress * 100)}%</Text>
          </>
        )}
      </View>
    </Animated.View>
  );
}

const ls = StyleSheet.create({
  overlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center", zIndex: 999 },
  box: { padding: 28, alignItems: "center", gap: 12, width: 200, borderRadius: 20, borderWidth: 1.5, shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 10 },
  ring: { width: 44, height: 44, borderRadius: 22, borderWidth: 3 },
  label: { fontSize: 12, fontWeight: "700", textAlign: "center" },
  bar: { width: "100%", height: 5, borderRadius: 3, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 3 },
  pct: { fontSize: 16, fontWeight: "800" },
});

// ─── Waveform — warna hijau (bars sebagai useRef tunggal) ──────
const NUM_BARS = 28;

function Waveform({ isRecording }) {
  // Gunakan satu useRef berisi array, bukan useRef di dalam loop
  const barsRef = useRef(
    Array.from({ length: NUM_BARS }, () => new Animated.Value(0.2))
  );
  const bars = barsRef.current;

  useEffect(() => {
    if (isRecording) {
      const anims = bars.map((bar) =>
        Animated.loop(
          Animated.sequence([
            Animated.timing(bar, { toValue: Math.random() * 0.8 + 0.2, duration: 150, useNativeDriver: true }),
            Animated.timing(bar, { toValue: Math.random() * 0.5 + 0.1, duration: 150, useNativeDriver: true }),
          ])
        )
      );
      anims.forEach((a, i) => setTimeout(() => a.start(), i * 30));
      return () => anims.forEach(a => a.stop());
    } else {
      bars.forEach(bar => Animated.timing(bar, { toValue: 0.2, duration: 200, useNativeDriver: true }).start());
    }
  }, [isRecording]);

  return (
    <View style={wf.container}>
      {bars.map((bar, i) => (
        <Animated.View
          key={i}
          style={[wf.bar, { backgroundColor: GREEN, transform: [{ scaleY: bar }] }]}
        />
      ))}
    </View>
  );
}

const wf = StyleSheet.create({
  container: { flexDirection: "row", alignItems: "center", justifyContent: "center", height: 50, gap: 3 },
  bar: { width: 3, height: 44, borderRadius: 2 },
});

// ─── PlaybackBar — tanpa seekbar, compact ─────────────────────
function PlaybackBar({ uri, durationMs, C, isDark }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [totalMs, setTotalMs] = useState(durationMs || 0);

  const soundRef = useRef(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    return () => {
      clearInterval(intervalRef.current);
      soundRef.current?.unloadAsync().catch(() => {});
    };
  }, []);

  const getSound = async () => {
    if (soundRef.current) return soundRef.current;
    const { sound } = await Audio.Sound.createAsync({ uri }, { shouldPlay: false });
    soundRef.current = sound;
    const st = await sound.getStatusAsync();
    if (st.isLoaded && st.durationMillis) setTotalMs(st.durationMillis);
    sound.setOnPlaybackStatusUpdate((s) => {
      if (s.isLoaded && s.didJustFinish) {
        setIsPlaying(false);
        sound.setPositionAsync(0);
        clearInterval(intervalRef.current);
      }
    });
    return sound;
  };

  const togglePlay = async () => {
    const sound = await getSound();
    if (isPlaying) {
      await sound.pauseAsync();
      clearInterval(intervalRef.current);
      setIsPlaying(false);
    } else {
      // Pastikan output ke speaker utama/besar, bukan earpiece
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
      await sound.playAsync();
      setIsPlaying(true);
    }
  };

  return (
    <View style={[pb.container, { backgroundColor: C.surface, borderColor: getBorder(isDark) }]}>
      <TouchableOpacity style={[pb.playBtn, { backgroundColor: C.primary }]} onPress={togglePlay} activeOpacity={0.8}>
        <Ionicons name={isPlaying ? "pause" : "play"} size={18} color={C.primaryFg} />
      </TouchableOpacity>
      <View style={{ flex: 1 }}>
        <Text style={[pb.label, { color: C.textPrimary }]}>Audio terekam</Text>
        <Text style={[pb.dur, { color: C.textMuted }]}>{formatTime(totalMs)}</Text>
      </View>
    </View>
  );
}

const pb = StyleSheet.create({
  container: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5 },
  playBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  label: { fontSize: 12, fontWeight: "700" },
  dur: { fontSize: 11, fontWeight: "500", fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace", marginTop: 1 },
  badge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: "700" },
});

// ─── Main Screen ──────────────────────────────────────────────
export default function Index() {
  const { user, token, logout } = useAuth();
  const { mode, toggleTheme, C } = useTheme();
  const router = useRouter();
  const isDark = mode === "dark";

  const [driveConnected, setDriveConnected] = useState(false);
  const [driveEmail, setDriveEmail] = useState(null);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [connecting, setConnecting] = useState(false);

  const [namaKonsumen, setNamaKonsumen] = useState("");
  const [nomorMesin, setNomorMesin] = useState("");
  const [nomorMesinKeyboard, setNomorMesinKeyboard] = useState("default");

  const [isRecording, setIsRecording] = useState(false);
  const [recordingMs, setRecordingMs] = useState(0);
  const [recordingUri, setRecordingUri] = useState(null);
  const [recordingName, setRecordingName] = useState(null);

  const [cdbPhoto, setCdbPhoto] = useState(null);
  const [cdbPhotoName, setCdbPhotoName] = useState(null);
  const [cdbPreviewVisible, setCdbPreviewVisible] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadLabel, setUploadLabel] = useState("Mengupload...");

  const [whatsNewVisible, setWhatsNewVisible] = useState(false);

  const recordingRef = useRef(null);
  const timerRef = useRef(null);
  const startTimeRef = useRef(0);

  // ── Poin verifikasi wajib baru (9 item, 2 kolom) ──
  const verifikasiItems = [
    "Nama Lengkap",
    "Alamat Lengkap",
    "Tempat Tgl Lahir",
    "Agama",
    "Pekerjaan",
    "Email & Medsos",
    "Metode Pembayaran",
    "Hobi",
  ];

  // 13 karakter = 5 kode + 1 spasi + 7 angka (display) = raw 12
  const mesinRaw = nomorMesin.replace(/\s/g, "");
  const mesinValid = mesinRaw.length === 12;
  const mesinTyping = mesinRaw.length > 0 && mesinRaw.length < 12;

  const canUpload = !!recordingUri && !!namaKonsumen.trim() && mesinValid && driveConnected;

  useEffect(() => {
    AsyncStorage.getItem(WHATS_NEW_KEY).then(seen => {
      if (!seen) setWhatsNewVisible(true);
    });
  }, []);

  const closeWhatsNew = async () => {
    await AsyncStorage.setItem(WHATS_NEW_KEY, "1");
    setWhatsNewVisible(false);
  };

  const refreshDriveStatus = async () => {
    if (!token) return;
    setCheckingStatus(true);
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 10000);
      const res = await authFetch(token, `${APP_BACKEND_URL}/api/drive/status`, { signal: ctrl.signal });
      clearTimeout(t);
      const data = await res.json();
      setDriveConnected(!!data.connected);
      setDriveEmail(data.email ?? null);
    } catch {
      setDriveConnected(false); setDriveEmail(null);
    } finally { setCheckingStatus(false); }
  };

  useEffect(() => {
    if (token) refreshDriveStatus();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (recordingRef.current) recordingRef.current.stopAndUnloadAsync().catch(() => {});
    };
  }, [token]);

  const handleConnectDrive = async () => {
    if (!token) return;
    try {
      setConnecting(true);
      const res = await authFetch(token, `${APP_BACKEND_URL}/api/drive/connect`);
      const data = await res.json();
      if (!res.ok || !data.authorization_url) throw new Error(data.detail || "Gagal mendapatkan link");
      await WebBrowser.openBrowserAsync(data.authorization_url, { dismissButtonStyle: "close" });
      await refreshDriveStatus();
    } catch (e) { Alert.alert("Gagal", e?.message ?? "Gagal terhubung ke Drive"); }
    finally { setConnecting(false); }
  };

  const handleDisconnectDrive = () => {
    Alert.alert("Putuskan Drive?", "Anda perlu menghubungkan ulang nanti.", [
      { text: "Batal", style: "cancel" },
      {
        text: "Putuskan", style: "destructive", onPress: async () => {
          try {
            await authFetch(token, `${APP_BACKEND_URL}/api/drive/disconnect`, { method: "POST" });
            setDriveConnected(false); setDriveEmail(null);
          } catch { setDriveConnected(false); setDriveEmail(null); }
        }
      }
    ]);
  };

  const handleNamaKonsumenChange = (text) => {
    setNamaKonsumen(text.toUpperCase());
  };

  const handleNomorMesinChange = (text) => {
    const formatted = formatNomorMesin(text);
    setNomorMesin(formatted);
    const raw = formatted.replace(/\s/g, "");
    setNomorMesinKeyboard(raw.length >= 5 ? "numeric" : "default");
  };

  const startRecording = async () => {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) { Alert.alert("Izin Ditolak", "Izin mikrofon diperlukan untuk merekam."); return; }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await rec.startAsync();
      recordingRef.current = rec;
      startTimeRef.current = Date.now();
      setIsRecording(true);
      setRecordingMs(0);
      timerRef.current = setInterval(() => setRecordingMs(Date.now() - startTimeRef.current), 100);
    } catch (e) { Alert.alert("Gagal", "Tidak bisa mulai rekam: " + e?.message); }
  };

  const stopRecording = async () => {
    if (!recordingRef.current) return;
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setIsRecording(false);
    try {
      await recordingRef.current.stopAndUnloadAsync();
      // Reset ke mode playback — WAJIB agar suara keluar dari speaker besar, bukan earpiece
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false, // speaker utama Android
      });
      const uri = recordingRef.current.getURI();
      const ms = Date.now() - startTimeRef.current;
      setRecordingMs(ms);
      setRecordingUri(uri ?? null);
      setRecordingName(`REK_${Date.now()}.m4a`);
    } catch {}
    finally { recordingRef.current = null; }
  };

  const pickAudio = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: "audio/*", copyToCacheDirectory: true });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      setRecordingUri(asset.uri);
      setRecordingName(asset.name ?? "audio.m4a");
      setRecordingMs(0);
    } catch (e) { Alert.alert("Gagal", "Tidak bisa membuka file: " + e?.message); }
  };

  const pickCdbPhoto = async () => {
    try {
      const { granted } = await ImagePicker.requestCameraPermissionsAsync();
      if (!granted) { Alert.alert("Izin Kamera", "Izin kamera diperlukan."); return; }
      Alert.alert("Foto CDB", "Pilih sumber foto", [
        {
          text: "Kamera", onPress: async () => {
            const r = await ImagePicker.launchCameraAsync({ quality: 0.8, mediaTypes: ImagePicker.MediaTypeOptions.Images });
            if (!r.canceled && r.assets?.length) { setCdbPhoto(r.assets[0].uri); setCdbPhotoName(`CDB_${Date.now()}.jpg`); }
          }
        },
        {
          text: "Galeri", onPress: async () => {
            const r = await ImagePicker.launchImageLibraryAsync({ quality: 0.8, mediaTypes: ImagePicker.MediaTypeOptions.Images });
            if (!r.canceled && r.assets?.length) { setCdbPhoto(r.assets[0].uri); setCdbPhotoName(`CDB_${Date.now()}.jpg`); }
          }
        },
        { text: "Batal", style: "cancel" },
      ]);
    } catch (e) { Alert.alert("Gagal", e?.message); }
  };

  const handleUpload = async () => {
    if (!canUpload) return;
    const nama = namaKonsumen.trim();
    const mesin = nomorMesin.replace(/\s/g, "");
    if (mesin.length !== 12) { Alert.alert("Nomor Mesin", "Nomor mesin harus 12 karakter (5 kode + 8 angka)."); return; }

    setUploading(true);
    setUploadProgress(0);
    setUploadLabel("Mengupload audio...");

    try {
      const audioForm = new FormData();
      audioForm.append("file", { uri: recordingUri, name: recordingName ?? "audio.m4a", type: "audio/m4a" });
      audioForm.append("nama_konsumen", nama);
      audioForm.append("nomor_mesin", mesin);

      const audioRes = await authFetch(token, `${APP_BACKEND_URL}/api/upload`, {
        method: "POST",
        body: audioForm,
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (!audioRes.ok) {
        const d = await audioRes.json().catch(() => ({}));
        throw new Error(typeof d.detail === "string" ? d.detail : "Upload audio gagal");
      }
      setUploadProgress(0.6);

      if (cdbPhoto && cdbPhotoName) {
        setUploadLabel("Mengupload foto CDB...");
        const photoForm = new FormData();
        photoForm.append("file", { uri: cdbPhoto, name: cdbPhotoName, type: "image/jpeg" });
        photoForm.append("nama_konsumen", nama);
        photoForm.append("nomor_mesin", mesin);
        photoForm.append("file_type", "cdb_photo");
        const photoRes = await authFetch(token, `${APP_BACKEND_URL}/api/upload`, {
          method: "POST",
          body: photoForm,
          headers: { "Content-Type": "multipart/form-data" },
        });
        if (!photoRes.ok) {
          const d = await photoRes.json().catch(() => ({}));
          throw new Error(typeof d.detail === "string" ? d.detail : "Upload foto gagal");
        }
      }
      setUploadProgress(1);
      setUploadLabel("Berhasil!");
      await new Promise(r => setTimeout(r, 600));
      setNamaKonsumen(""); setNomorMesin(""); setRecordingUri(null); setRecordingName(null);
      setRecordingMs(0); setCdbPhoto(null); setCdbPhotoName(null);
      Alert.alert("Upload Berhasil! ✅", "Data berhasil dikirim ke Google Drive.");
    } catch (e) {
      Alert.alert("Gagal Upload", e?.message ?? "Terjadi kesalahan saat upload.");
    } finally {
      setUploading(false); setUploadProgress(0);
    }
  };

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: C.bg }]}>

      {/* ── NAVBAR ── */}
      <View style={[s.navbar, { backgroundColor: C.headerBg, borderBottomColor: getBorder(isDark) }]}>
        <View style={s.navLeft}>
          {/* <Image source={require("../assets/images/icon.png")} style={s.navLogo} resizeMode="contain" /> */}
          <View>
            <Text style={[s.navTitle, { color: C.textPrimary }]}>Honda Visual On-site Capture</Text>
            <Text style={[s.navSub, { color: C.textMuted }]}>PT Capella Dinamik Nusantara</Text>
          </View>
        </View>
        {/* Icon lebih besar, border lebih tebal */}
        <View style={s.navRight}>
          <TouchableOpacity style={[s.navBtn, { borderColor: getBorder(isDark) }]} onPress={toggleTheme} activeOpacity={0.7}>
            <Ionicons name={isDark ? "sunny" : "moon"} size={20} color={C.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={[s.navBtn, { borderColor: getBorder(isDark) }]} onPress={() => router.push("/history")} activeOpacity={0.7}>
            <Ionicons name="time-outline" size={20} color={C.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={[s.navBtn, { borderColor: getBorder(isDark) }]} onPress={() => router.push("/profile")} activeOpacity={0.7}>
            <Ionicons name="person-circle-outline" size={21} color={C.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.navBtn, { borderColor: getBorder(isDark) }]}
            onPress={() => Alert.alert("Logout?", "Yakin ingin keluar?", [
              { text: "Batal", style: "cancel" },
              { text: "Logout", style: "destructive", onPress: () => logout() },
            ])}
            activeOpacity={0.7}
          >
            <Ionicons name="log-out-outline" size={20} color={C.accentRecord} />
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={[s.content, { backgroundColor: C.bg }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          decelerationRate="normal"
          scrollEventThrottle={16}
        >

          {/* ── Drive Status — glowing icon ── */}
          <View style={[s.card, { backgroundColor: C.surface, borderColor: driveConnected ? GREEN + "99" : RED + "88" }]}>
            <View style={s.cardRow}>
              {/* Ikon cloud glowing */}
              <View style={[s.iconBox, {
                backgroundColor: driveConnected ? GREEN + "22" : RED + "18",
                shadowColor: driveConnected ? GREEN : RED,
                shadowOpacity: 0.5,
                shadowRadius: 8,
                elevation: 4,
              }]}>
                <Ionicons name="cloud" size={20} color={driveConnected ? GREEN : RED} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.cardTitle, { color: C.textPrimary }]}>Google Drive</Text>
                {checkingStatus
                  ? <ActivityIndicator size="small" color={C.textMuted} style={{ alignSelf: "flex-start", marginTop: 2 }} />
                  : <Text style={[s.cardSub, { color: driveConnected ? GREEN : RED, fontWeight: "700" }]}>
                    {driveConnected ? `● ${driveEmail ?? "Terhubung"}` : "● Belum terhubung"}
                  </Text>
                }
              </View>
              {!checkingStatus && (
                <TouchableOpacity
                  style={[s.driveBadge, { backgroundColor: driveConnected ? RED + "18" : GREEN + "22", borderWidth: 1.5, borderColor: driveConnected ? RED + "99" : GREEN + "99" }]}
                  onPress={driveConnected ? handleDisconnectDrive : handleConnectDrive}
                  disabled={connecting}
                  activeOpacity={0.8}
                >
                  {connecting
                    ? <ActivityIndicator size="small" color={driveConnected ? RED : GREEN} />
                    : <Text style={[s.driveBadgeText, { color: driveConnected ? RED : GREEN }]}>
                      {driveConnected ? "Putus" : "Hubungkan"}
                    </Text>
                  }
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* ── Form Input ── */}
          <View style={[s.card, { backgroundColor: C.surface, borderColor: (namaKonsumen.trim().length >= 2 && mesinValid) ? GREEN + "cc" : getBorder(isDark) }]}>
            <View style={s.cardHeaderRow}>
              <Text style={[s.sectionTitle, { color: C.textPrimary }]}>Data Konsumen</Text>
              {namaKonsumen.trim().length >= 2 && mesinValid && (
                <View style={[s.siapBadge, { backgroundColor: GREEN + "22" }]}>
                  <Ionicons name="checkmark-circle" size={13} color={GREEN} />
                  <Text style={[s.siapText, { color: GREEN }]}>Siap</Text>
                </View>
              )}
            </View>

            <Text style={[s.label, { color: getLabelColor(isDark) }]}>NAMA KONSUMEN</Text>
            <TextInput
              style={[s.input, { backgroundColor: C.inputBg, borderColor: namaKonsumen.trim().length >= 2 ? GREEN + "cc" : getBorder(isDark), color: C.textPrimary }]}
              value={namaKonsumen}
              onChangeText={handleNamaKonsumenChange}
              placeholder="Contoh: AHMAD RAGASH PUTRA"
              placeholderTextColor={getPlaceholderColor(isDark)}
              autoCapitalize="characters"
              editable={!uploading}
              returnKeyType="next"
            />

            {/* Nomor mesin — indikator hijau/merah */}
            <View style={s.mesinLabelRow}>
              <Text style={[s.label, { color: getLabelColor(isDark), marginTop: 0 }]}>NOMOR MESIN</Text>
              {mesinValid && (
                <View style={[s.mesinBadge, { backgroundColor: GREEN + "20", borderColor: GREEN + "99" }]}>
                  <Ionicons name="checkmark-circle" size={11} color={GREEN} />
                  <Text style={[s.mesinBadgeText, { color: GREEN }]}>12 karakter</Text>
                </View>
              )}
              {mesinTyping && (
                <View style={[s.mesinBadge, { backgroundColor: RED + "18", borderColor: RED + "99" }]}>
                  <Ionicons name="close-circle" size={11} color={RED} />
                  <Text style={[s.mesinBadgeText, { color: RED }]}>{mesinRaw.length}/12</Text>
                </View>
              )}
            </View>
            <TextInput
              style={[s.input, {
                backgroundColor: C.inputBg,
                borderColor: mesinValid ? GREEN + "cc" : mesinTyping ? RED + "bb" : getBorder(isDark),
                color: C.textPrimary,
              }]}
              value={nomorMesin}
              onChangeText={handleNomorMesinChange}
              placeholder="Contoh: JMH2E 1234567"
              placeholderTextColor={getPlaceholderColor(isDark)}
              autoCapitalize="characters"
              keyboardType={nomorMesinKeyboard}
              maxLength={13}
              editable={!uploading}
              returnKeyType="done"
            />
          </View>

          {/* ── Rekam Audio ── */}
          <View style={[s.card, { backgroundColor: C.surface, borderColor: recordingUri ? GREEN + "cc" : getBorder(isDark) }]}>
            <View style={s.cardHeaderRow}>
              <Text style={[s.sectionTitle, { color: C.textPrimary }]}>Rekam Audio</Text>
              {recordingUri && (
                <View style={[s.siapBadge, { backgroundColor: GREEN + "22" }]}>
                  <Ionicons name="checkmark-circle" size={13} color={GREEN} />
                  <Text style={[s.siapText, { color: GREEN }]}>Siap</Text>
                </View>
              )}
            </View>

            {isRecording && <Waveform isRecording={isRecording} />}

            {isRecording && (
              <Text style={[s.recTimer, { color: GREEN }]}>{formatTime(recordingMs)}</Text>
            )}

            {/* Tombol rekam: hanya tampil jika belum ada rekaman atau sedang rekam */}
            {!recordingUri && (
              <>
                <View style={s.recBtnRow}>
                  {!isRecording ? (
                    <TouchableOpacity
                      style={[s.recBtn, { backgroundColor: C.accentRecord, flex: 1 }]}
                      onPress={startRecording}
                      disabled={uploading}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="mic" size={20} color="#FFF" />
                      <Text style={s.recBtnText}>Mulai Rekam</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[s.recBtn, { backgroundColor: C.primary, flex: 1 }]}
                      onPress={stopRecording}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="stop" size={20} color={C.primaryFg} />
                      <Text style={[s.recBtnText, { color: C.primaryFg }]}>Hentikan</Text>
                    </TouchableOpacity>
                  )}
                </View>
                {!isRecording && (
                  <>
                    <View style={s.orDivider}>
                      <View style={[s.orLine, { backgroundColor: getBorder(isDark) }]} />
                      <Text style={[s.orText, { color: getLabelColor(isDark) }]}>atau</Text>
                      <View style={[s.orLine, { backgroundColor: getBorder(isDark) }]} />
                    </View>
                    <TouchableOpacity
                      style={[s.recBtnSmall, { backgroundColor: C.surface, borderColor: getBorder(isDark), width: "100%" }]}
                      onPress={pickAudio}
                      disabled={uploading}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="folder-open-outline" size={16} color={C.textSecondary} />
                      <Text style={[s.recBtnSmallText, { color: C.textSecondary }]}>Pilih dari File</Text>
                    </TouchableOpacity>
                    <Text style={[s.browseHint, { color: getLabelColor(isDark) }]}>
                      Format: mp3, mp4, m4a, aac, wav
                    </Text>
                  </>
                )}
              </>
            )}

            {/* Setelah selesai rekam: preview + tombol ulangi & hapus */}
            {recordingUri && !isRecording && (
              <>
                <PlaybackBar uri={recordingUri} durationMs={recordingMs} C={C} isDark={isDark} />
                <View style={s.recBtnRow}>
                  <TouchableOpacity
                    style={[s.recBtnSmall, { backgroundColor: C.surface, borderColor: getBorder(isDark), flex: 1 }]}
                    onPress={() => { setRecordingUri(null); setRecordingName(null); setRecordingMs(0); startRecording(); }}
                    disabled={uploading}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="refresh" size={15} color={C.textSecondary} />
                    <Text style={[s.recBtnSmallText, { color: C.textSecondary }]}>Ulangi</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.recBtnSmall, { backgroundColor: RED + "15", borderColor: RED + "50", flex: 1 }]}
                    onPress={() => { setRecordingUri(null); setRecordingName(null); setRecordingMs(0); }}
                    disabled={uploading}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="trash-outline" size={15} color={RED} />
                    <Text style={[s.recBtnSmallText, { color: RED }]}>Hapus</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>

          {/* ── Foto CDB ── */}
          <View style={[s.card, { backgroundColor: C.surface, borderColor: cdbPhoto ? GREEN + "cc" : getBorder(isDark) }]}>
            <View style={s.cardHeaderRow}>
              <Text style={[s.sectionTitle, { color: C.textPrimary }]}>Foto CDB</Text>
              {cdbPhoto && (
                <View style={[s.siapBadge, { backgroundColor: GREEN + "22" }]}>
                  <Ionicons name="checkmark-circle" size={13} color={GREEN} />
                  <Text style={[s.siapText, { color: GREEN }]}>Siap</Text>
                </View>
              )}
            </View>

            {cdbPhoto ? (
              <>
                <View style={[s.cdbReadyRow, { backgroundColor: C.surface, borderColor: getBorder(isDark) }]}>
                  <View style={[s.iconBox, { backgroundColor: C.cdbBg }]}>
                    <Ionicons name="image" size={18} color={C.accentDrive} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.cardTitle, { color: C.textPrimary }]}>Foto dipilih</Text>
                    <Text style={[s.cardSub, { color: C.textMuted }]} numberOfLines={1}>
                      {cdbPhotoName ?? "foto.jpg"}
                    </Text>
                  </View>
                </View>
                <View style={s.recBtnRow}>
                  <TouchableOpacity
                    style={[s.recBtnSmall, { backgroundColor: C.surface, borderColor: getBorder(isDark), flex: 1 }]}
                    onPress={() => setCdbPreviewVisible(true)}
                    disabled={uploading}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="eye-outline" size={15} color={C.textSecondary} />
                    <Text style={[s.recBtnSmallText, { color: C.textSecondary }]}>Lihat</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.recBtnSmall, { backgroundColor: RED + "15", borderColor: RED + "50", flex: 1 }]}
                    onPress={() => { setCdbPhoto(null); setCdbPhotoName(null); }}
                    disabled={uploading}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="trash-outline" size={15} color={RED} />
                    <Text style={[s.recBtnSmallText, { color: RED }]}>Hapus</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <TouchableOpacity
                style={[s.recBtn, { backgroundColor: C.accentDrive + "dd" }]}
                onPress={pickCdbPhoto}
                disabled={uploading}
                activeOpacity={0.8}
              >
                <Ionicons name="camera" size={20} color="#FFF" />
                <Text style={s.recBtnText}>Ambil Foto</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* ── Poin Verifikasi Wajib — 2 kolom compact ── */}
          <View style={[s.card, { backgroundColor: C.verifikasiBg, borderColor: getBorder(isDark), paddingVertical: 10 }]}>
            <View style={[s.cardRow, { marginBottom: 4 }]}>
              <Ionicons name="shield-checkmark" size={14} color={C.verifikasiText} />
              <Text style={[s.veriTitle, { color: C.verifikasiText }]}>Verifikasi Data Konsumen</Text>
            </View>
            <View style={s.veriGrid}>
              {verifikasiItems.map((item, i) => (
                <View key={i} style={s.veriItem}>
                  <View style={[s.veriDot, { backgroundColor: C.verifikasiText }]} />
                  <Text style={[s.veriText, { color: C.verifikasiText }]}>{item}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* ── Upload Button ── */}
          <TouchableOpacity
            style={[s.uploadBtn, { backgroundColor: canUpload ? C.primary : C.border }]}
            onPress={handleUpload}
            disabled={!canUpload || uploading}
            activeOpacity={0.85}
          >
            <Ionicons name="cloud-upload" size={20} color={canUpload ? C.primaryFg : C.textMuted} />
            <Text style={[s.uploadBtnText, { color: canUpload ? C.primaryFg : C.textMuted }]}>
              Upload ke Drive
            </Text>
          </TouchableOpacity>

          {!canUpload && (
            <View style={[s.hintBox, { backgroundColor: C.surface, borderColor: getBorder(isDark) }]}>
              {!driveConnected && <Text style={[s.hintItem, { color: C.textMuted }]}>• Hubungkan Google Drive terlebih dahulu</Text>}
              {!namaKonsumen.trim() && <Text style={[s.hintItem, { color: C.textMuted }]}>• Isi nama konsumen</Text>}
              {!mesinValid && <Text style={[s.hintItem, { color: C.textMuted }]}>• Nomor mesin harus 12 karakter</Text>}
              {!recordingUri && <Text style={[s.hintItem, { color: C.textMuted }]}>• Rekam audio terlebih dahulu</Text>}
            </View>
          )}

          <View style={{ height: 32 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Foto Preview Modal */}
      <Modal visible={cdbPreviewVisible} transparent animationType="fade" onRequestClose={() => setCdbPreviewVisible(false)}>
        <TouchableOpacity
          style={[s.previewBackdrop, { backgroundColor: C.overlay }]}
          activeOpacity={1}
          onPress={() => setCdbPreviewVisible(false)}
        >
          {cdbPhoto && (
            <Image source={{ uri: cdbPhoto }} style={s.previewImage} resizeMode="contain" />
          )}
        </TouchableOpacity>
      </Modal>

      <LoadingOverlay visible={uploading} label={uploadLabel} progress={uploadProgress} C={C} isDark={isDark} />
      <WhatsNewModal visible={whatsNewVisible} onClose={closeWhatsNew} C={C} isDark={isDark} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  navbar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1,
  },
  navLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  navLogo: { width: 32, height: 32, borderRadius: 8 },
  navTitle: { fontSize: 14, fontWeight: "900", letterSpacing: 0.5 },
  navSub: { fontSize: 12, fontWeight: "600" },
  navRight: { flexDirection: "row", alignItems: "center", gap: 5 },
  // Icon lebih besar (38x38), border lebih tebal (1.5)
  navBtn: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center", borderWidth: 1.5 },
  content: { padding: 12, gap: 10, paddingBottom: 24 },
  card: { borderRadius: 16, borderWidth: 1.5, padding: 14, gap: 8 },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconBox: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  cardTitle: { fontSize: 13, fontWeight: "800" },
  cardSub: { fontSize: 11, fontWeight: "500", marginTop: 1 },
  driveBadge: { paddingHorizontal: 11, paddingVertical: 7, borderRadius: 10 },
  driveBadgeText: { fontSize: 12, fontWeight: "700" },
  sectionTitle: { fontSize: 13, fontWeight: "800" },
  label: { fontSize: 10, fontWeight: "700", letterSpacing: 1.1, marginTop: 4 },
  input: { height: 46, borderWidth: 2, borderRadius: 12, paddingHorizontal: 13, fontSize: 14, fontWeight: "600" },
  mesinLabelRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  mesinBadge: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8, borderWidth: 1.5 },
  mesinBadgeText: { fontSize: 10, fontWeight: "700" },
  recTimer: { fontSize: 32, fontWeight: "900", textAlign: "center", letterSpacing: 2, fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" },
  recBtnRow: { flexDirection: "row", gap: 8 },
  recBtn: { height: 48, borderRadius: 13, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  recBtnText: { color: "#FFF", fontWeight: "700", fontSize: 14 },
  recBtnSmall: { height: 36, borderRadius: 10, borderWidth: 1.5, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5 },
  recBtnSmallText: { fontWeight: "700", fontSize: 12 },
  veriTitle: { fontSize: 12, fontWeight: "800" },
  veriGrid: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  veriItem: { flexDirection: "row", alignItems: "center", gap: 5, width: "48%" },
  veriDot: { width: 4, height: 4, borderRadius: 2 },
  veriText: { fontSize: 11, lineHeight: 18, flex: 1 },
  cardHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 2 },
  siapBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  siapText: { fontSize: 11, fontWeight: "700" },
  orDivider: { flexDirection: "row", alignItems: "center", gap: 8, marginVertical: 2 },
  orLine: { flex: 1, height: 1 },
  orText: { fontSize: 13, fontWeight: "700" },
  browseHint: { fontSize: 12, fontWeight: "600", textAlign: "center", marginTop: 2 },
  cdbReadyRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5 },
  cdbSiapBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  cdbSiapText: { fontSize: 11, fontWeight: "700" },
  uploadBtn: { height: 52, borderRadius: 15, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  uploadBtnText: { fontSize: 15, fontWeight: "800" },
  hintBox: { borderRadius: 12, borderWidth: 1.5, padding: 12, gap: 4 },
  hintItem: { fontSize: 12 },
  previewBackdrop: { flex: 1, alignItems: "center", justifyContent: "center" },
  previewImage: { width: "92%", height: "70%", borderRadius: 12 },
});