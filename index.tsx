// ============================================================
// index.tsx — UPDATED
// Perubahan:
//  1. Logo aplikasi di home
//  2. Placeholder nama konsumen = "Contoh: AHMAD RAGASH PUTRA"
//  3. Auto kapital nama konsumen
//  4. Placeholder no mesin = "Contoh: JMH2E 1234567"
//  5. Setelah 5 karakter + spasi, otomatis numeric keyboard
//  6. Navbar minimal & compact (bottom tab style)
//  7. Hapus teks "rekam atau pilih file audio", hapus "opsional foto CDB"
//     tambahkan poin verifikasi wajib (file sudah ada), tampilan compact
//  8. Fix PlaybackBar — durasi bisa di-drag dengan Slider yang smooth
//  9. Smooth scrolling + loading efek
// 10. Notifikasi update ketika ada versi baru (WhatsNew modal)
// ============================================================

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, Platform, KeyboardAvoidingView, Image,
  Animated, Easing, Modal, PanResponder, Dimensions,
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

// ─── App version untuk WhatsNew ───────────────────────────────
const APP_VERSION = "2.2.0";
const WHATS_NEW_KEY = `whats_new_seen_v${APP_VERSION}`;
const WHATS_NEW_ITEMS = [
  "🎨 Navbar baru yang lebih minimalis & compact",
  "🔤 Nama konsumen otomatis KAPITAL saat diketik",
  "📱 Keyboard angka otomatis setelah kode mesin (5 karakter)",
  "🔍 Pencarian di riwayat upload",
  "🎵 Playback audio lebih smooth & bisa di-drag",
  "✅ Tampilan poin verifikasi lebih ringkas",
  "⚡ Animasi & loading lebih halus",
];

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
  return clean.slice(0, 5) + " " + clean.slice(5, 12);
}

// ─── WhatsNew Modal ───────────────────────────────────────────
function WhatsNewModal({ visible, onClose, C }) {
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 9 }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={wn.backdrop}>
        <Animated.View style={[
          wn.card,
          { backgroundColor: C.surface, borderColor: C.border, transform: [{ scale: scaleAnim }], opacity: opacityAnim }
        ]}>
          <View style={wn.iconRow}>
            <View style={[wn.iconCircle, { backgroundColor: C.badgeSuccessBg }]}>
              <Ionicons name="sparkles" size={26} color={C.accentSuccess} />
            </View>
          </View>
          <Text style={[wn.title, { color: C.textPrimary }]}>Apa yang Baru? 🎉</Text>
          <Text style={[wn.version, { color: C.textMuted }]}>Versi {APP_VERSION}</Text>
          <View style={{ gap: 8, marginTop: 8, width: "100%" }}>
            {WHATS_NEW_ITEMS.map((item, i) => (
              <View key={i} style={wn.itemRow}>
                <Text style={[wn.itemText, { color: C.textSecondary }]}>{item}</Text>
              </View>
            ))}
          </View>
          <TouchableOpacity
            style={[wn.btn, { backgroundColor: C.primary }]}
            onPress={onClose}
            activeOpacity={0.85}
          >
            <Text style={[wn.btnText, { color: C.primaryFg }]}>Oke, Mengerti!</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const wn = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center", padding: 24 },
  card: { width: "100%", maxWidth: 360, borderRadius: 24, borderWidth: 1, padding: 24, alignItems: "center", gap: 6 },
  iconRow: { marginBottom: 4 },
  iconCircle: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 20, fontWeight: "900", textAlign: "center" },
  version: { fontSize: 11, fontWeight: "600", textAlign: "center", marginBottom: 4 },
  itemRow: { width: "100%", paddingVertical: 5, paddingHorizontal: 12, borderRadius: 10 },
  itemText: { fontSize: 13, lineHeight: 18 },
  btn: { marginTop: 16, width: "100%", height: 50, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  btnText: { fontSize: 15, fontWeight: "700" },
});

// ─── Loading Overlay ──────────────────────────────────────────
function LoadingOverlay({ visible, label, progress, C }) {
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
      <View style={[ls.box, { backgroundColor: C.surface, borderColor: C.border }]}>
        <Animated.View style={[ls.ring, { borderColor: C.primary, borderTopColor: "transparent", transform: [{ rotate }] }]} />
        <Text style={[ls.label, { color: C.textPrimary }]}>{label}</Text>
        {progress !== undefined && (
          <>
            <View style={[ls.bar, { backgroundColor: C.border }]}>
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
  box: { padding: 28, alignItems: "center", gap: 12, width: 200, borderRadius: 20, borderWidth: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 10 },
  ring: { width: 44, height: 44, borderRadius: 22, borderWidth: 3 },
  label: { fontSize: 12, fontWeight: "700", textAlign: "center" },
  bar: { width: "100%", height: 5, borderRadius: 3, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 3 },
  pct: { fontSize: 16, fontWeight: "800" },
});

// ─── Waveform ─────────────────────────────────────────────────
function Waveform({ isRecording, C }) {
  const bars = Array.from({ length: 28 }, () => useRef(new Animated.Value(0.2)).current);

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
          style={[wf.bar, { backgroundColor: C.accentRecord, transform: [{ scaleY: bar }] }]}
        />
      ))}
    </View>
  );
}

const wf = StyleSheet.create({
  container: { flexDirection: "row", alignItems: "center", justifyContent: "center", height: 50, gap: 3 },
  bar: { width: 3, height: 44, borderRadius: 2 },
});

// ─── PlaybackBar FIXED — smooth drag dengan PanResponder ──────
function PlaybackBar({ uri, durationMs, C, onDelete }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [posMs, setPosMs] = useState(0);
  const [totalMs, setTotalMs] = useState(durationMs || 0);
  const soundRef = useRef(null);
  const updateTimerRef = useRef(null);
  const barWidthRef = useRef(260);
  const isDraggingRef = useRef(false);
  const dragPosRef = useRef(0);
  const [dragPos, setDragPos] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    return () => {
      if (updateTimerRef.current) clearInterval(updateTimerRef.current);
      soundRef.current?.unloadAsync().catch(() => { });
    };
  }, []);

  const loadSound = async () => {
    if (soundRef.current) return soundRef.current;
    const { sound } = await Audio.Sound.createAsync({ uri }, { shouldPlay: false });
    soundRef.current = sound;
    const status = await sound.getStatusAsync();
    if (status.isLoaded && status.durationMillis) setTotalMs(status.durationMillis);
    sound.setOnPlaybackStatusUpdate((s) => {
      if (s.isLoaded && s.didJustFinish) {
        setIsPlaying(false);
        setPosMs(0);
        sound.setPositionAsync(0);
        if (updateTimerRef.current) { clearInterval(updateTimerRef.current); updateTimerRef.current = null; }
      }
    });
    return sound;
  };

  const togglePlay = async () => {
    try {
      const sound = await loadSound();
      if (isPlaying) {
        await sound.pauseAsync();
        setIsPlaying(false);
        if (updateTimerRef.current) { clearInterval(updateTimerRef.current); updateTimerRef.current = null; }
      } else {
        await sound.playAsync();
        setIsPlaying(true);
        updateTimerRef.current = setInterval(async () => {
          if (isDraggingRef.current) return;
          const status = await sound.getStatusAsync();
          if (status.isLoaded) setPosMs(status.positionMillis ?? 0);
        }, 100);
      }
    } catch { Alert.alert("Error", "Gagal memutar audio"); }
  };

  // PanResponder untuk drag seek yang smooth
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        isDraggingRef.current = true;
        setIsDragging(true);
        const x = evt.nativeEvent.locationX;
        const ratio = Math.max(0, Math.min(1, x / barWidthRef.current));
        dragPosRef.current = ratio;
        setDragPos(ratio);
      },
      onPanResponderMove: (evt) => {
        const x = evt.nativeEvent.locationX;
        const ratio = Math.max(0, Math.min(1, x / barWidthRef.current));
        dragPosRef.current = ratio;
        setDragPos(ratio);
      },
      onPanResponderRelease: async () => {
        const ratio = dragPosRef.current;
        const ms = Math.floor(ratio * (totalMs || 0));
        setPosMs(ms);
        isDraggingRef.current = false;
        setIsDragging(false);
        try {
          const sound = await loadSound();
          await sound.setPositionAsync(ms);
        } catch { }
      },
    })
  ).current;

  const displayRatio = isDragging ? dragPos : (totalMs > 0 ? posMs / totalMs : 0);
  const fillPct = `${Math.round(displayRatio * 100)}%`;

  return (
    <View style={[pb.container, { backgroundColor: C.surface, borderColor: C.border }]}>
      <TouchableOpacity style={[pb.playBtn, { backgroundColor: C.primary }]} onPress={togglePlay} activeOpacity={0.8}>
        <Ionicons name={isPlaying ? "pause" : "play"} size={20} color={C.primaryFg} />
      </TouchableOpacity>

      <View style={{ flex: 1, gap: 4 }}>
        {/* Draggable seek bar */}
        <View
          style={[pb.bar, { backgroundColor: C.border }]}
          onLayout={e => { barWidthRef.current = e.nativeEvent.layout.width; }}
          {...panResponder.panHandlers}
        >
          <View style={[pb.fill, { backgroundColor: C.primary, width: fillPct }]} />
          <View style={[pb.thumb, { backgroundColor: C.primary, left: fillPct }]} />
        </View>
        <View style={pb.timeRow}>
          <Text style={[pb.timeText, { color: C.textMuted }]}>{formatTime(isDragging ? Math.floor(dragPos * totalMs) : posMs)}</Text>
          <Text style={[pb.timeText, { color: C.textMuted }]}>{formatTime(totalMs)}</Text>
        </View>
      </View>

      <TouchableOpacity
        onPress={onDelete}
        style={[pb.trashBtn, { borderColor: C.border, backgroundColor: C.deleteBtn }]}
        activeOpacity={0.7}
      >
        <Ionicons name="trash-outline" size={16} color={C.accentRecord} />
      </TouchableOpacity>
    </View>
  );
}

const pb = StyleSheet.create({
  container: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 14, borderWidth: 1 },
  playBtn: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  bar: { height: 6, borderRadius: 3, position: "relative", overflow: "visible" },
  fill: { height: 6, borderRadius: 3, position: "absolute", top: 0, left: 0 },
  thumb: { width: 16, height: 16, borderRadius: 8, position: "absolute", top: -5, marginLeft: -8, shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 4, elevation: 3 },
  timeRow: { flexDirection: "row", justifyContent: "space-between" },
  timeText: { fontSize: 10, fontWeight: "600", fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" },
  trashBtn: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center", borderWidth: 1 },
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

  // WhatsNew
  const [whatsNewVisible, setWhatsNewVisible] = useState(false);

  const recordingRef = useRef(null);
  const timerRef = useRef(null);
  const startTimeRef = useRef(0);

  // Poin verifikasi wajib (dikembalikan dari repo asli)
  const verifikasiItems = [
    "Nama konsumen sudah sesuai KTP",
    "Nomor mesin sudah diverifikasi fisik",
    "Rekaman audio sudah jelas & tidak terpotong",
    "Foto CDB terbaca dengan jelas (jika ada)",
  ];

  const canUpload = !!recordingUri && !!namaKonsumen.trim() && nomorMesin.replace(/\s/g, "").length === 12 && driveConnected;

  // Cek WhatsNew saat pertama buka
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
      if (recordingRef.current) recordingRef.current.stopAndUnloadAsync().catch(() => { });
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
    } catch (e: any) { Alert.alert("Gagal", e?.message ?? "Gagal terhubung ke Drive"); }
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

  // Nama konsumen — auto kapital
  const handleNamaKonsumenChange = (text: string) => {
    setNamaKonsumen(text.toUpperCase());
  };

  // Nomor mesin — auto format + auto switch keyboard ke numeric setelah 5 char
  const handleNomorMesinChange = (text: string) => {
    const formatted = formatNomorMesin(text);
    setNomorMesin(formatted);
    // Setelah 5 karakter (+ spasi = 6 total), keyboard otomatis numeric
    const raw = formatted.replace(/\s/g, "");
    if (raw.length >= 5) {
      setNomorMesinKeyboard("numeric");
    } else {
      setNomorMesinKeyboard("default");
    }
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
    } catch (e: any) { Alert.alert("Gagal", "Tidak bisa mulai rekam: " + e?.message); }
  };

  const stopRecording = async () => {
    if (!recordingRef.current) return;
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setIsRecording(false);
    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      const ms = Date.now() - startTimeRef.current;
      setRecordingMs(ms);
      setRecordingUri(uri ?? null);
      setRecordingName(`REK_${Date.now()}.m4a`);
    } catch { }
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
    } catch (e: any) { Alert.alert("Gagal", "Tidak bisa membuka file: " + e?.message); }
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
    } catch (e: any) { Alert.alert("Gagal", e?.message); }
  };

  const handleUpload = async () => {
    if (!canUpload) return;
    const nama = namaKonsumen.trim();
    const mesin = nomorMesin.replace(/\s/g, "");
    if (mesin.length !== 12) { Alert.alert("Nomor Mesin", "Nomor mesin harus 12 karakter (5 kode + 7 angka)."); return; }

    setUploading(true);
    setUploadProgress(0);
    setUploadLabel("Mengupload audio...");

    try {
      // Upload audio
      const audioInfo = await FileSystem.getInfoAsync(recordingUri!);
      const audioSize = (audioInfo as any).size ?? 0;
      const audioForm = new FormData();
      audioForm.append("file", { uri: recordingUri!, name: recordingName ?? "audio.m4a", type: "audio/m4a" } as any);
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

      // Upload foto CDB jika ada
      if (cdbPhoto && cdbPhotoName) {
        setUploadLabel("Mengupload foto CDB...");
        const photoForm = new FormData();
        photoForm.append("file", { uri: cdbPhoto, name: cdbPhotoName, type: "image/jpeg" } as any);
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
    } catch (e: any) {
      Alert.alert("Gagal Upload", e?.message ?? "Terjadi kesalahan saat upload.");
    } finally {
      setUploading(false); setUploadProgress(0);
    }
  };

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: C.bg }]}>

      {/* ── MINIMAL TOP NAVBAR ── */}
      <View style={[s.navbar, { backgroundColor: C.headerBg, borderBottomColor: C.border }]}>
        {/* Logo kecil + nama app */}
        <View style={s.navLeft}>
          <Image source={require("../assets/images/icon.png")} style={s.navLogo} resizeMode="contain" />
          <View>
            <Text style={[s.navTitle, { color: C.textPrimary }]}>HAVOC</Text>
            <Text style={[s.navSub, { color: C.textMuted }]}>Verifikasi Data Konsumen</Text>
          </View>
        </View>
        {/* Aksi navbar */}
        <View style={s.navRight}>
          <TouchableOpacity
            style={[s.navBtn, { borderColor: C.border }]}
            onPress={toggleTheme}
            activeOpacity={0.7}
          >
            <Ionicons name={isDark ? "sunny" : "moon"} size={17} color={C.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.navBtn, { borderColor: C.border }]}
            onPress={() => router.push("/history")}
            activeOpacity={0.7}
          >
            <Ionicons name="time-outline" size={17} color={C.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.navBtn, { borderColor: C.border }]}
            onPress={() => router.push("/profile")}
            activeOpacity={0.7}
          >
            <Ionicons name="person-circle-outline" size={18} color={C.textSecondary} />
          </TouchableOpacity>
          {user?.role === "admin" && (
            <TouchableOpacity
              style={[s.navBtn, { borderColor: C.border }]}
              onPress={() => router.push("/admin")}
              activeOpacity={0.7}
            >
              <Ionicons name="shield-checkmark-outline" size={17} color={C.accentWarning} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[s.navBtn, { borderColor: C.border }]}
            onPress={() => Alert.alert("Logout?", "Yakin ingin keluar?", [
              { text: "Batal", style: "cancel" },
              { text: "Logout", style: "destructive", onPress: () => logout() },
            ])}
            activeOpacity={0.7}
          >
            <Ionicons name="log-out-outline" size={17} color={C.accentRecord} />
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

          {/* ── Drive Status ── */}
          <View style={[s.card, { backgroundColor: C.surface, borderColor: C.border }]}>
            <View style={s.cardRow}>
              <View style={[s.iconBox, { backgroundColor: driveConnected ? C.badgeSuccessBg : C.badgeOffBg }]}>
                <Ionicons name="cloud" size={18} color={driveConnected ? C.accentSuccess : C.textMuted} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.cardTitle, { color: C.textPrimary }]}>Google Drive</Text>
                {checkingStatus
                  ? <ActivityIndicator size="small" color={C.textMuted} style={{ alignSelf: "flex-start", marginTop: 2 }} />
                  : <Text style={[s.cardSub, { color: driveConnected ? C.accentSuccess : C.textMuted }]}>
                    {driveConnected ? `✓ ${driveEmail ?? "Terhubung"}` : "Belum terhubung"}
                  </Text>
                }
              </View>
              {!checkingStatus && (
                <TouchableOpacity
                  style={[s.driveBadge, { backgroundColor: driveConnected ? C.deleteBtn : C.primary }]}
                  onPress={driveConnected ? handleDisconnectDrive : handleConnectDrive}
                  disabled={connecting}
                  activeOpacity={0.8}
                >
                  {connecting
                    ? <ActivityIndicator size="small" color={driveConnected ? C.accentRecord : C.primaryFg} />
                    : <Text style={[s.driveBadgeText, { color: driveConnected ? C.accentRecord : C.primaryFg }]}>
                      {driveConnected ? "Putus" : "Hubungkan"}
                    </Text>
                  }
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* ── Form Input ── */}
          <View style={[s.card, { backgroundColor: C.surface, borderColor: C.border }]}>
            <Text style={[s.sectionTitle, { color: C.textPrimary }]}>Data Konsumen</Text>

            {/* Nama konsumen — auto KAPITAL */}
            <Text style={[s.label, { color: C.textMuted }]}>NAMA KONSUMEN</Text>
            <TextInput
              style={[s.input, { backgroundColor: C.inputBg, borderColor: C.border, color: C.textPrimary }]}
              value={namaKonsumen}
              onChangeText={handleNamaKonsumenChange}
              placeholder="Contoh: AHMAD RAGASH PUTRA"
              placeholderTextColor={C.textMuted}
              autoCapitalize="characters"
              editable={!uploading}
              returnKeyType="next"
            />

            {/* Nomor mesin — auto format + auto keyboard numeric */}
            <Text style={[s.label, { color: C.textMuted }]}>NOMOR MESIN <Text style={{ color: C.accentRecord }}>*12 karakter</Text></Text>
            <TextInput
              style={[s.input, { backgroundColor: C.inputBg, borderColor: C.border, color: C.textPrimary }]}
              value={nomorMesin}
              onChangeText={handleNomorMesinChange}
              placeholder="Contoh: JMH2E 1234567"
              placeholderTextColor={C.textMuted}
              autoCapitalize="characters"
              keyboardType={nomorMesinKeyboard}
              maxLength={13}
              editable={!uploading}
              returnKeyType="done"
            />
            <Text style={[s.hintText, { color: C.textMuted }]}>5 kode + 7 angka (otomatis format & keyboard angka)</Text>
          </View>

          {/* ── Rekam Audio ── */}
          <View style={[s.card, { backgroundColor: C.surface, borderColor: C.border }]}>
            <Text style={[s.sectionTitle, { color: C.textPrimary }]}>Rekam Audio</Text>

            {isRecording && <Waveform isRecording={isRecording} C={C} />}

            {isRecording && (
              <Text style={[s.recTimer, { color: C.accentRecord }]}>{formatTime(recordingMs)}</Text>
            )}

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

            {/* Playback — smooth drag */}
            {recordingUri && !isRecording && (
              <PlaybackBar
                uri={recordingUri}
                durationMs={recordingMs}
                C={C}
                onDelete={() => { setRecordingUri(null); setRecordingName(null); setRecordingMs(0); }}
              />
            )}
          </View>

          {/* ── Foto CDB (Opsional — tanpa teks "Opsional") ── */}
          <View style={[s.card, { backgroundColor: C.surface, borderColor: C.border }]}>
            <View style={s.cardRow}>
              <View style={[s.iconBox, { backgroundColor: C.cdbBg }]}>
                <Ionicons name="camera" size={18} color={C.accentDrive} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.cardTitle, { color: C.textPrimary }]}>Foto CDB</Text>
                <Text style={[s.cardSub, { color: C.textMuted }]}>
                  {cdbPhoto ? cdbPhotoName ?? "Foto dipilih" : "Belum ada foto"}
                </Text>
              </View>
              <TouchableOpacity
                style={[s.driveBadge, { backgroundColor: C.primary }]}
                onPress={cdbPhoto ? () => setCdbPreviewVisible(true) : pickCdbPhoto}
                activeOpacity={0.8}
              >
                <Text style={[s.driveBadgeText, { color: C.primaryFg }]}>
                  {cdbPhoto ? "Lihat" : "Ambil"}
                </Text>
              </TouchableOpacity>
              {cdbPhoto && (
                <TouchableOpacity
                  style={[s.driveBadge, { backgroundColor: C.deleteBtn, marginLeft: 6 }]}
                  onPress={() => { setCdbPhoto(null); setCdbPhotoName(null); }}
                  activeOpacity={0.8}
                >
                  <Text style={[s.driveBadgeText, { color: C.accentRecord }]}>Hapus</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* ── Poin Verifikasi Wajib (dikembalikan) ── */}
          <View style={[s.card, { backgroundColor: C.verifikasiBg, borderColor: C.border }]}>
            <View style={s.cardRow}>
              <Ionicons name="shield-checkmark" size={16} color={C.verifikasiText} />
              <Text style={[s.sectionTitle, { color: C.verifikasiText }]}>Poin Verifikasi Wajib</Text>
            </View>
            {verifikasiItems.map((item, i) => (
              <View key={i} style={s.verifikasiRow}>
                <View style={[s.verifikasiDot, { backgroundColor: C.verifikasiText }]} />
                <Text style={[s.verifikasiText, { color: C.verifikasiText }]}>{item}</Text>
              </View>
            ))}
          </View>

          {/* ── Upload Button ── */}
          <TouchableOpacity
            style={[
              s.uploadBtn,
              { backgroundColor: canUpload ? C.primary : C.border },
            ]}
            onPress={handleUpload}
            disabled={!canUpload || uploading}
            activeOpacity={0.85}
          >
            <Ionicons name="cloud-upload" size={20} color={canUpload ? C.primaryFg : C.textMuted} />
            <Text style={[s.uploadBtnText, { color: canUpload ? C.primaryFg : C.textMuted }]}>
              Upload ke Drive
            </Text>
          </TouchableOpacity>

          {/* Hint jika belum bisa upload */}
          {!canUpload && (
            <View style={[s.hintBox, { backgroundColor: C.surface, borderColor: C.border }]}>
              {!driveConnected && <Text style={[s.hintItem, { color: C.textMuted }]}>• Hubungkan Google Drive terlebih dahulu</Text>}
              {!namaKonsumen.trim() && <Text style={[s.hintItem, { color: C.textMuted }]}>• Isi nama konsumen</Text>}
              {nomorMesin.replace(/\s/g, "").length !== 12 && <Text style={[s.hintItem, { color: C.textMuted }]}>• Nomor mesin harus 12 karakter</Text>}
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

      {/* Loading Overlay */}
      <LoadingOverlay visible={uploading} label={uploadLabel} progress={uploadProgress} C={C} />

      {/* WhatsNew Modal */}
      <WhatsNewModal visible={whatsNewVisible} onClose={closeWhatsNew} C={C} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  // ── Navbar ──
  navbar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1,
  },
  navLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  navLogo: { width: 32, height: 32, borderRadius: 8 },
  navTitle: { fontSize: 13, fontWeight: "900", letterSpacing: 0.5 },
  navSub: { fontSize: 9, fontWeight: "600" },
  navRight: { flexDirection: "row", alignItems: "center", gap: 4 },
  navBtn: { width: 34, height: 34, borderRadius: 9, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  // ── Content ──
  content: { padding: 12, gap: 10, paddingBottom: 24 },
  card: { borderRadius: 16, borderWidth: 1, padding: 14, gap: 8 },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconBox: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  cardTitle: { fontSize: 13, fontWeight: "800" },
  cardSub: { fontSize: 11, fontWeight: "500", marginTop: 1 },
  driveBadge: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10 },
  driveBadgeText: { fontSize: 12, fontWeight: "700" },
  sectionTitle: { fontSize: 13, fontWeight: "800" },
  label: { fontSize: 10, fontWeight: "700", letterSpacing: 1.1, marginTop: 4 },
  input: { height: 46, borderWidth: 1, borderRadius: 12, paddingHorizontal: 13, fontSize: 14, fontWeight: "600" },
  hintText: { fontSize: 10, marginTop: -4 },
  recTimer: { fontSize: 32, fontWeight: "900", textAlign: "center", letterSpacing: 2, fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" },
  recBtnRow: { flexDirection: "row", gap: 8 },
  recBtn: { height: 48, borderRadius: 13, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  recBtnText: { color: "#FFF", fontWeight: "700", fontSize: 14 },
  verifikasiRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, paddingLeft: 2 },
  verifikasiDot: { width: 5, height: 5, borderRadius: 2.5, marginTop: 6 },
  verifikasiText: { fontSize: 12, lineHeight: 19, flex: 1 },
  uploadBtn: { height: 52, borderRadius: 15, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  uploadBtnText: { fontSize: 15, fontWeight: "800" },
  hintBox: { borderRadius: 12, borderWidth: 1, padding: 12, gap: 4 },
  hintItem: { fontSize: 12 },
  previewBackdrop: { flex: 1, alignItems: "center", justifyContent: "center" },
  previewImage: { width: "92%", height: "70%", borderRadius: 12 },
});