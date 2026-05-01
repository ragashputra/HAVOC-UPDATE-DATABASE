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
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth, APP_BACKEND_URL, authFetch } from "../lib/auth";
import { useTheme } from "../lib/theme";

function formatTime(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60).toString().padStart(2, "0");
  const s = (total % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function formatNomorMesin(raw: string): string {
  const clean = raw.replace(/\s/g, "").toUpperCase();
  if (clean.length <= 5) return clean;
  return clean.slice(0, 5) + " " + clean.slice(5, 12);
}

// Loading overlay
function LoadingOverlay({ visible, label, progress, C }: { visible: boolean; label: string; progress?: number; C: any }) {
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
    <Animated.View style={[ls.overlay, { backgroundColor: C.overlay, opacity: fade }]}>
      <View style={[ls.box, { backgroundColor: C.surface, borderColor: C.border }]}>
        <Animated.View style={[ls.ring, { borderColor: C.border, borderTopColor: C.accentRecord, transform: [{ rotate }] }]} />
        <Text style={[ls.label, { color: C.textPrimary }]}>{label}</Text>
        {progress !== undefined && (
          <>
            <View style={[ls.bar, { backgroundColor: C.inputBg }]}>
              <View style={[ls.barFill, { width: `${Math.round(progress * 100)}%` as any, backgroundColor: C.accentSuccess }]} />
            </View>
            <Text style={[ls.pct, { color: C.accentSuccess }]}>{Math.round(progress * 100)}%</Text>
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

// Waveform visualization (iPhone-style)
function Waveform({ isRecording, C }: { isRecording: boolean; C: any }) {
  const bars = Array.from({ length: 30 }, () => useRef(new Animated.Value(0.2)).current);

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
        <Animated.View key={i} style={[wf.bar, { backgroundColor: C.accentRecord, transform: [{ scaleY: bar }] }]} />
      ))}
    </View>
  );
}

const wf = StyleSheet.create({
  container: { flexDirection: "row", alignItems: "center", justifyContent: "center", height: 50, gap: 3 },
  bar: { width: 3, height: 44, borderRadius: 2 },
});

// Playback bar dengan scrub yang fixed
function PlaybackBar({ uri, durationMs, C, onDelete }: { uri: string; durationMs: number; C: any; onDelete: () => void }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [posMs, setPosMs] = useState(0);
  const [totalMs, setTotalMs] = useState(durationMs || 0);
  const soundRef = useRef<Audio.Sound | null>(null);
  const updateTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (updateTimerRef.current) clearInterval(updateTimerRef.current);
      soundRef.current?.unloadAsync().catch(() => {});
    };
  }, []);

  const loadSound = async () => {
    if (soundRef.current) return soundRef.current;
    const { sound } = await Audio.Sound.createAsync({ uri }, { shouldPlay: false });
    soundRef.current = sound;
    const status = await sound.getStatusAsync();
    if (status.isLoaded && status.durationMillis) setTotalMs(status.durationMillis);
    sound.setOnPlaybackStatusUpdate((s) => {
      if (s.isLoaded) {
        if (s.didJustFinish) {
          setIsPlaying(false);
          setPosMs(0);
          sound.setPositionAsync(0);
          if (updateTimerRef.current) { clearInterval(updateTimerRef.current); updateTimerRef.current = null; }
        }
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
          const status = await sound.getStatusAsync();
          if (status.isLoaded) setPosMs(status.positionMillis ?? 0);
        }, 200);
      }
    } catch (e: any) { Alert.alert("Error", "Gagal memutar audio"); }
  };

  const onSeek = async (evt: any) => {
    const x = evt.nativeEvent.locationX;
    const width = evt.nativeEvent.target.measure ? 300 : 260; // fallback
    const ratio = Math.max(0, Math.min(1, x / width));
    const ms = Math.floor(ratio * totalMs);
    setPosMs(ms);
    try {
      const sound = await loadSound();
      await sound.setPositionAsync(ms);
    } catch {}
  };

  const progress = totalMs > 0 ? posMs / totalMs : 0;

  return (
    <View style={[pb.container, { backgroundColor: C.surface, borderColor: C.border }]}>
      <TouchableOpacity onPress={togglePlay} style={[pb.playBtn, { backgroundColor: C.primary }]}>
        <Ionicons name={isPlaying ? "pause" : "play"} size={20} color={C.primaryFg} />
      </TouchableOpacity>
      <View style={{ flex: 1, gap: 6 }}>
        <TouchableOpacity activeOpacity={1} onPress={onSeek}>
          <View style={[pb.bar, { backgroundColor: C.inputBg }]}>
            <View style={[pb.fill, { width: `${progress * 100}%` as any, backgroundColor: C.accentRecord }]} />
            <View style={[pb.thumb, { left: `${progress * 100}%` as any, backgroundColor: C.accentRecord }]} />
          </View>
        </TouchableOpacity>
        <View style={pb.timeRow}>
          <Text style={[pb.timeText, { color: C.textSecondary }]}>{formatTime(posMs)}</Text>
          <Text style={[pb.timeText, { color: C.textMuted }]}>{formatTime(totalMs)}</Text>
        </View>
      </View>
      <TouchableOpacity onPress={onDelete} style={[pb.trashBtn, { borderColor: C.border }]}>
        <Ionicons name="trash-outline" size={16} color={C.accentRecord} />
      </TouchableOpacity>
    </View>
  );
}

const pb = StyleSheet.create({
  container: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 14, borderWidth: 1 },
  playBtn: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  bar: { height: 5, borderRadius: 3, position: "relative", overflow: "visible" },
  fill: { height: 5, borderRadius: 3, position: "absolute", top: 0, left: 0 },
  thumb: { width: 14, height: 14, borderRadius: 7, position: "absolute", top: -4.5, marginLeft: -7 },
  timeRow: { flexDirection: "row", justifyContent: "space-between" },
  timeText: { fontSize: 10, fontWeight: "600", fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" },
  trashBtn: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center", borderWidth: 1 },
});

export default function Index() {
  const { user, token, logout } = useAuth();
  const { mode, toggleTheme, C } = useTheme();
  const router = useRouter();
  const isDark = mode === "dark";

  const [driveConnected, setDriveConnected] = useState(false);
  const [driveEmail, setDriveEmail] = useState<string | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [connecting, setConnecting] = useState(false);

  const [namaKonsumen, setNamaKonsumen] = useState("");
  const [nomorMesin, setNomorMesin] = useState("");

  const [isRecording, setIsRecording] = useState(false);
  const [recordingMs, setRecordingMs] = useState(0);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [recordingName, setRecordingName] = useState<string | null>(null);

  const [cdbPhoto, setCdbPhoto] = useState<string | null>(null);
  const [cdbPhotoName, setCdbPhotoName] = useState<string | null>(null);
  const [cdbPreviewVisible, setCdbPreviewVisible] = useState(false);

  const [menuVisible, setMenuVisible] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadLabel, setUploadLabel] = useState("Mengupload...");

  const recordingRef = useRef<Audio.Recording | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const menuAnim = useRef(new Animated.Value(0)).current;

  const canUpload = !!recordingUri && !!namaKonsumen.trim() && nomorMesin.replace(/\s/g, "").length === 12 && driveConnected;

  const openMenu = () => {
    setMenuVisible(true);
    Animated.spring(menuAnim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 10 }).start();
  };
  const closeMenu = () => {
    Animated.timing(menuAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => setMenuVisible(false));
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
    } catch (e: any) { Alert.alert("Gagal", e?.message ?? "Gagal terhubung ke Drive"); }
    finally { setConnecting(false); }
  };

  const handleDisconnectDrive = () => {
    Alert.alert("Putuskan Drive?", "Anda perlu menghubungkan ulang nanti.", [
      { text: "Batal", style: "cancel" },
      { text: "Putuskan", style: "destructive", onPress: async () => {
          await authFetch(token, `${APP_BACKEND_URL}/api/drive/disconnect`, { method: "POST" });
          setDriveConnected(false); setDriveEmail(null);
        } },
    ]);
  };

  const startRecording = async () => {
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) { Alert.alert("Izin Ditolak", "Aplikasi memerlukan akses mikrofon."); return; }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync({
        ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
        android: { ...Audio.RecordingOptionsPresets.HIGH_QUALITY.android, extension: ".mp4", outputFormat: Audio.AndroidOutputFormat.MPEG_4, audioEncoder: Audio.AndroidAudioEncoder.AAC },
        ios: { ...Audio.RecordingOptionsPresets.HIGH_QUALITY.ios, extension: ".mp4", outputFormat: Audio.IOSOutputFormat.MPEG4AAC },
      });
      recordingRef.current = recording;
      startTimeRef.current = Date.now();
      setRecordingMs(0); setIsRecording(true); setRecordingName(null);
      timerRef.current = setInterval(() => setRecordingMs(Date.now() - startTimeRef.current), 200);
    } catch (e: any) { Alert.alert("Error", "Gagal memulai rekaman: " + (e?.message ?? e)); }
  };

  const stopRecording = async () => {
    try {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      const rec = recordingRef.current; if (!rec) return;
      await rec.stopAndUnloadAsync();
      const uri = rec.getURI();
      recordingRef.current = null; setIsRecording(false);
      if (uri) { setRecordingUri(uri); setRecordingName(null); }
    } catch (e: any) {
      Alert.alert("Error", "Gagal menghentikan rekaman: " + (e?.message ?? e)); setIsRecording(false);
    }
  };

  const browseAudioFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ["audio/*"], copyToCacheDirectory: true });
      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        setRecordingUri(asset.uri);
        setRecordingName(asset.name ?? "File Audio");
        setRecordingMs(0);
      }
    } catch (e: any) { Alert.alert("Error", "Gagal memilih file: " + (e?.message ?? e)); }
  };

  const deleteRecording = () => {
    Alert.alert("Hapus Rekaman?", "", [
      { text: "Batal", style: "cancel" },
      { text: "Hapus", style: "destructive", onPress: () => {
          setRecordingUri(null); setRecordingName(null); setRecordingMs(0);
        } },
    ]);
  };

  const handleScanCDB = async () => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) { Alert.alert("Izin Kamera", "Izinkan akses kamera."); return; }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"] as ImagePicker.MediaType[], quality: 0.92, allowsEditing: false,
      });
      if (!result.canceled && result.assets[0]) { setCdbPhoto(result.assets[0].uri); setCdbPhotoName(null); }
    } catch (e: any) { Alert.alert("Error", "Gagal mengambil foto: " + (e?.message ?? e)); }
  };

  const browseCdbPhoto = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ["image/*"], copyToCacheDirectory: true });
      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        setCdbPhoto(asset.uri); setCdbPhotoName(asset.name ?? "Foto CDB");
      }
    } catch (e: any) { Alert.alert("Error", "Gagal memilih foto: " + (e?.message ?? e)); }
  };

  const deleteCdbPhoto = () => {
    Alert.alert("Hapus Foto CDB?", "", [
      { text: "Batal", style: "cancel" },
      { text: "Hapus", style: "destructive", onPress: () => { setCdbPhoto(null); setCdbPhotoName(null); } },
    ]);
  };

  const uploadToDrive = async () => {
    if (!recordingUri) return;
    if (!namaKonsumen.trim()) { Alert.alert("Wajib diisi", "Mohon isi Nama Konsumen."); return; }
    if (!nomorMesin.trim()) { Alert.alert("Wajib diisi", "Mohon isi Nomor Mesin SMH."); return; }
    const cleanMesin = nomorMesin.replace(/\s/g, "");
    if (cleanMesin.length !== 12) { Alert.alert("Nomor Mesin", `Harus 12 karakter. Sekarang: ${cleanMesin.length}`); return; }
    if (!driveConnected) { Alert.alert("Drive Belum Terhubung", "Hubungkan Google Drive dulu."); return; }

    try {
      setUploading(true); setUploadProgress(0);
      setUploadLabel("Mengupload rekaman suara...");
      setUploadProgress(0.1);
      const audioFilename = `${namaKonsumen.trim()}.mp3`;
      const formData = new FormData();
      formData.append("nama_konsumen", namaKonsumen.trim());
      formData.append("nomor_mesin", nomorMesin.trim());
      if (Platform.OS === "web") {
        const blobRes = await fetch(recordingUri);
        const blob = await blobRes.blob();
        formData.append("file", new File([blob], audioFilename, { type: "audio/mpeg" }));
      } else {
        const info = await FileSystem.getInfoAsync(recordingUri);
        if (!info.exists) throw new Error("File rekaman tidak ditemukan");
        formData.append("file", { uri: recordingUri, name: audioFilename, type: "audio/mpeg" } as any);
      }
      setUploadProgress(0.35);
      const res = await authFetch(token, `${APP_BACKEND_URL}/api/drive/upload`, { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Upload rekaman gagal");
      setUploadProgress(0.6);

      if (cdbPhoto) {
        setUploadLabel("Mengupload foto CDB...");
        setUploadProgress(0.65);
        const cdbFilename = `${namaKonsumen.trim()} - CDB.jpg`;
        const cdbForm = new FormData();
        cdbForm.append("nama_konsumen", namaKonsumen.trim());
        cdbForm.append("nomor_mesin", nomorMesin.trim());
        cdbForm.append("file_type", "cdb_photo");
        if (Platform.OS === "web") {
          const blobRes2 = await fetch(cdbPhoto);
          const blob2 = await blobRes2.blob();
          cdbForm.append("file", new File([blob2], cdbFilename, { type: "image/jpeg" }));
        } else {
          cdbForm.append("file", { uri: cdbPhoto, name: cdbFilename, type: "image/jpeg" } as any);
        }
        setUploadProgress(0.8);
        const res2 = await authFetch(token, `${APP_BACKEND_URL}/api/drive/upload`, { method: "POST", body: cdbForm });
        const data2 = await res2.json();
        if (!res2.ok) throw new Error(data2.detail || "Upload foto CDB gagal");
      }

      setUploadProgress(1.0); setUploadLabel("Berhasil!");
      await new Promise(r => setTimeout(r, 500));
      Alert.alert("Upload Berhasil!", `File berhasil diupload ke Google Drive.\nFolder: ${nomorMesin.trim()}`, [
        { text: "OK", onPress: () => {
            setRecordingUri(null); setRecordingName(null); setRecordingMs(0);
            setCdbPhoto(null); setCdbPhotoName(null);
            setNamaKonsumen(""); setNomorMesin("");
          } },
      ]);
    } catch (e: any) { Alert.alert("Upload Gagal", e?.message ?? "Terjadi kesalahan"); }
    finally { setUploading(false); setUploadProgress(0); }
  };

  const menuScale = menuAnim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] });
  const menuOpacity = menuAnim;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      <LoadingOverlay visible={uploading} label={uploadLabel} progress={uploadProgress} C={C} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>

        {/* ── Header ── */}
        <View style={[styles.header, { backgroundColor: C.headerBg, borderBottomColor: C.border }]}>
          <View style={styles.headerLeft}>
            <Image
              source={{ uri: "https://customer-assets.emergentagent.com/job_audio-archiver/artifacts/o8vroxrg_LOGO%20APLIKASIKU.png" }}
              style={styles.logoImg} resizeMode="contain"
            />
            <View style={{ flexShrink: 1 }}>
              <Text style={[styles.headerTitle, { color: C.textPrimary }]} numberOfLines={1}>Perekam Verifikasi Data Konsumen</Text>
              <Text style={[styles.headerSubtitle, { color: C.textSecondary }]} numberOfLines={1}>PT Capella Dinamik Nusantara</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            {/* Theme toggle - text + icon */}
            <TouchableOpacity onPress={toggleTheme} style={[styles.themeToggle, { backgroundColor: C.surface, borderColor: C.border }]}>
              <Ionicons name={isDark ? "sunny" : "moon-outline"} size={13} color={isDark ? "#FBBF24" : C.textSecondary} />
              <Text style={[styles.themeText, { color: C.textSecondary }]}>{isDark ? "Light" : "Dark"}</Text>
            </TouchableOpacity>
            {/* Drive status */}
            {checkingStatus ? <ActivityIndicator size="small" color={C.textMuted} /> :
              driveConnected ? (
                <TouchableOpacity onPress={handleDisconnectDrive} style={[styles.pill, { backgroundColor: C.badgeSuccessBg, borderColor: C.accentSuccess }]}>
                  <Ionicons name="cloud-done" size={12} color={C.accentSuccess} />
                  <Text style={[styles.pillText, { color: C.accentSuccess }]}>Drive</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={refreshDriveStatus} style={[styles.pill, { backgroundColor: C.surface, borderColor: C.border }]}>
                  <Ionicons name="cloud-offline-outline" size={12} color={C.textMuted} />
                </TouchableOpacity>
              )
            }
            {/* Menu — minimalis 3 dot */}
            <TouchableOpacity style={[styles.pill, { backgroundColor: C.surface, borderColor: C.border }]} onPress={openMenu}>
              <View style={styles.dots}>
                {[0,1,2].map(i => <View key={i} style={[styles.dot, { backgroundColor: C.textSecondary }]} />)}
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── User strip ── */}
        <View style={[styles.userStrip, { backgroundColor: C.stripBg, borderBottomColor: C.border }]}>
          <View style={[styles.avatarSmall, { backgroundColor: C.primary }]}>
            <Text style={[styles.avatarSmallText, { color: C.primaryFg }]}>{(user?.nama_lengkap ?? "U")[0]}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.userName, { color: C.textPrimary }]} numberOfLines={1}>{user?.nama_lengkap}</Text>
            <Text style={[styles.userEmail, { color: C.textSecondary }]} numberOfLines={1}>{user?.email}</Text>
          </View>
          <TouchableOpacity style={[styles.pill, { backgroundColor: C.surface, borderColor: C.border, gap: 4, paddingHorizontal: 10 }]} onPress={() => router.push("/history")}>
            <Ionicons name="time-outline" size={13} color={C.textSecondary} />
            <Text style={[styles.pillText, { color: C.textSecondary }]}>Riwayat</Text>
          </TouchableOpacity>
        </View>

        {/* ── Dropdown Menu ── */}
        <Modal visible={menuVisible} transparent animationType="none" onRequestClose={closeMenu}>
          <TouchableOpacity style={styles.menuBackdrop} activeOpacity={1} onPress={closeMenu}>
            <Animated.View style={[styles.menuBox, { backgroundColor: C.menuBg, borderColor: C.border, opacity: menuOpacity, transform: [{ scale: menuScale }, { translateY: menuAnim.interpolate({ inputRange: [0,1], outputRange: [-8, 0] }) }] }]}>
              {[
                { icon: "person-outline", label: "Profil / Akun", route: "/profile" },
                { icon: "lock-closed-outline", label: "Ganti Password", route: "/ganti-password" },
                { icon: "folder-outline", label: "Folder Google Drive", route: "/folder-drive" },
                { icon: "information-circle-outline", label: "Tentang Aplikasi", route: "/tentang" },
              ].map((item, i) => (
                <TouchableOpacity key={i} style={[styles.menuItem, { borderBottomColor: C.border }]} onPress={() => { closeMenu(); setTimeout(() => router.push(item.route as any), 150); }}>
                  <View style={[styles.menuIconWrap, { backgroundColor: C.surface }]}>
                    <Ionicons name={item.icon as any} size={16} color={C.textPrimary} />
                  </View>
                  <Text style={[styles.menuItemText, { color: C.textPrimary }]}>{item.label}</Text>
                  <Ionicons name="chevron-forward" size={14} color={C.textMuted} />
                </TouchableOpacity>
              ))}
              <View style={[styles.menuDivider, { backgroundColor: C.border }]} />
              <TouchableOpacity style={[styles.menuItem, { borderBottomColor: "transparent" }]} onPress={() => {
                closeMenu();
                setTimeout(() => Alert.alert("Keluar?", "Anda akan logout.", [
                  { text: "Batal", style: "cancel" },
                  { text: "Keluar", style: "destructive", onPress: () => logout() },
                ]), 150);
              }}>
                <View style={[styles.menuIconWrap, { backgroundColor: isDark ? "#2D0D0D" : "#FFF1F2" }]}>
                  <Ionicons name="log-out-outline" size={16} color={C.accentRecord} />
                </View>
                <Text style={[styles.menuItemText, { color: C.accentRecord }]}>Keluar</Text>
              </TouchableOpacity>
            </Animated.View>
          </TouchableOpacity>
        </Modal>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          decelerationRate="fast"
        >

          {/* Drive connect card */}
          {!driveConnected && (
            <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
              <View style={styles.cardRow}>
                <Ionicons name="logo-google" size={18} color={C.accentDrive} />
                <Text style={[styles.cardTitle, { color: C.textPrimary }]}>Hubungkan Google Drive</Text>
              </View>
              <Text style={[styles.cardDesc, { color: C.textSecondary }]}>File rekaman & foto CDB akan diupload ke Drive.</Text>
              <View style={styles.btnRow}>
                <TouchableOpacity style={[styles.btnPrimary, { backgroundColor: C.accentDrive, flex: 1 }]} onPress={handleConnectDrive} disabled={connecting}>
                  {connecting ? <ActivityIndicator color="#fff" size="small" /> : (
                    <><Ionicons name="link" size={14} color="#fff" /><Text style={[styles.btnPrimaryText, { color: "#fff" }]}>Hubungkan</Text></>
                  )}
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btnIcon, { borderColor: C.border, backgroundColor: C.bg }]} onPress={refreshDriveStatus} disabled={checkingStatus}>
                  {checkingStatus ? <ActivityIndicator color={C.textMuted} size="small" /> : <Ionicons name="refresh" size={16} color={C.textMuted} />}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {driveConnected && driveEmail && (
            <View style={[styles.connectedHint, { backgroundColor: C.connectedHintBg, borderColor: C.accentSuccess }]}>
              <Ionicons name="checkmark-circle" size={14} color={C.accentSuccess} />
              <Text style={[styles.connectedText, { color: C.accentSuccess }]} numberOfLines={1}>Drive: {driveEmail}</Text>
            </View>
          )}

          {/* Form */}
          <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
            <Text style={[styles.label, { color: C.textSecondary }]}>NAMA KONSUMEN</Text>
            <TextInput
              style={[styles.input, { backgroundColor: C.inputBg, borderColor: C.border, color: C.textPrimary }]}
              placeholder="Contoh: AHMAD RAGASH PUTRA" placeholderTextColor={C.textMuted}
              value={namaKonsumen} onChangeText={(t) => setNamaKonsumen(t.toUpperCase())}
              autoCapitalize="characters" editable={!isRecording && !uploading}
            />
            <Text style={[styles.label, { color: C.textSecondary, marginTop: 10 }]}>NOMOR MESIN SMH</Text>
            <TextInput
              style={[styles.input, { backgroundColor: C.inputBg, borderColor: C.border, color: C.textPrimary }]}
              placeholder="Contoh: JMH2E 1234567" placeholderTextColor={C.textMuted}
              value={nomorMesin}
              onChangeText={(t) => {
                const formatted = formatNomorMesin(t);
                if (formatted.replace(/\s/g, "").length <= 12) setNomorMesin(formatted);
              }}
              keyboardType={nomorMesin.replace(/\s/g, "").length >= 5 ? "numeric" : "default"}
              autoCapitalize="characters" editable={!isRecording && !uploading} maxLength={13}
            />
            <Text style={[styles.inputHint, { color: nomorMesin.replace(/\s/g, "").length === 12 ? C.accentSuccess : C.textMuted }]}>
              {nomorMesin.replace(/\s/g, "").length}/12 karakter
            </Text>
          </View>

          {/* Rekam */}
          <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
            <View style={styles.cardRow}>
              <Ionicons name="mic" size={16} color={C.accentRecord} />
              <Text style={[styles.cardTitle, { color: C.textPrimary }]}>Rekam Suara</Text>
            </View>

            {!recordingUri ? (
              <View style={styles.recorderArea}>
                <Text style={[styles.timerText, { color: C.textPrimary }]}>{formatTime(recordingMs)}</Text>
                {isRecording && <Waveform isRecording={isRecording} C={C} />}
                <TouchableOpacity
                  onPress={isRecording ? stopRecording : startRecording}
                  style={[styles.recordBtn, isRecording
                    ? { backgroundColor: C.accentRecord }
                    : { backgroundColor: C.inputBg, borderWidth: 2, borderColor: C.border }
                  ]}
                  activeOpacity={0.85}
                >
                  <Ionicons name={isRecording ? "stop" : "mic"} size={32} color={isRecording ? "#fff" : C.textPrimary} />
                </TouchableOpacity>
                <Text style={[styles.recordHint, { color: C.textSecondary }]}>
                  {isRecording ? "Sedang merekam — ketuk untuk berhenti" : "Ketuk untuk mulai merekam"}
                </Text>
                {!isRecording && (
                  <TouchableOpacity style={[styles.browseBtn, { borderColor: C.border, backgroundColor: C.bg }]} onPress={browseAudioFile}>
                    <Ionicons name="folder-open-outline" size={13} color={C.textSecondary} />
                    <Text style={[styles.browseBtnText, { color: C.textSecondary }]}>Pilih file audio dari storage</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <View style={{ gap: 8 }}>
                {recordingName && (
                  <View style={styles.cardRow}>
                    <Ionicons name="musical-note" size={13} color={C.textSecondary} />
                    <Text style={[styles.fileName, { color: C.textSecondary }]} numberOfLines={1}>{recordingName}</Text>
                  </View>
                )}
                <PlaybackBar uri={recordingUri} durationMs={recordingMs} C={C} onDelete={deleteRecording} />
              </View>
            )}
          </View>

          {/* Poin Verifikasi - compact tanpa nomor */}
          <View style={[styles.card, { backgroundColor: C.verifikasiBg, borderColor: C.accentRecord }]}>
            <View style={styles.cardRow}>
              <Ionicons name="shield-checkmark" size={15} color={C.accentRecord} />
              <Text style={[styles.cardTitle, { color: C.accentRecord }]}>Wajib Diverifikasi</Text>
            </View>
            <View style={styles.chipGrid}>
              {["Nama KTP","Alamat KTP","Tgl Lahir","Agama","Pekerjaan","Email & Medsos","Metode Bayar","Hobi","No. HP/WA"].map((item, i) => (
                <View key={i} style={[styles.chip, { backgroundColor: C.bg, borderColor: C.accentRecord }]}>
                  <Text style={[styles.chipText, { color: C.verifikasiText }]}>{item}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Foto CDB */}
          <View style={[styles.card, { backgroundColor: C.cdbBg, borderColor: C.accentDrive }]}>
            <View style={styles.cardRow}>
              <Ionicons name="camera" size={15} color={C.accentDrive} />
              <Text style={[styles.cardTitle, { color: C.accentDrive }]}>Foto CDB</Text>
            </View>
            {!cdbPhoto ? (
              <View style={styles.btnRow}>
                <TouchableOpacity style={[styles.btnPrimary, { backgroundColor: C.accentDrive, flex: 1 }]} onPress={handleScanCDB} disabled={uploading}>
                  <Ionicons name="camera" size={14} color="#fff" />
                  <Text style={[styles.btnPrimaryText, { color: "#fff" }]}>Kamera</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btnOutline, { borderColor: C.accentDrive, flex: 1 }]} onPress={browseCdbPhoto} disabled={uploading}>
                  <Ionicons name="folder-open-outline" size={14} color={C.accentDrive} />
                  <Text style={[styles.btnOutlineText, { color: C.accentDrive }]}>Pilih File</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.cdbReadyRow}>
                {/* Preview thumbnail */}
                <TouchableOpacity onPress={() => setCdbPreviewVisible(true)} activeOpacity={0.85}>
                  <Image source={{ uri: cdbPhoto }} style={[styles.cdbThumb, { borderColor: C.accentDrive }]} resizeMode="cover" />
                  <View style={styles.cdbThumbOverlay}>
                    <Ionicons name="expand-outline" size={14} color="#fff" />
                  </View>
                </TouchableOpacity>
                <View style={{ flex: 1, gap: 4 }}>
                  <View style={styles.cardRow}>
                    <Ionicons name="checkmark-circle" size={15} color={C.accentSuccess} />
                    <Text style={[styles.cdbReadyText, { color: C.accentSuccess }]}>Foto siap</Text>
                  </View>
                  {cdbPhotoName && <Text style={[styles.fileName, { color: C.textSecondary }]} numberOfLines={1}>{cdbPhotoName}</Text>}
                  <TouchableOpacity onPress={deleteCdbPhoto} style={styles.cardRow}>
                    <Ionicons name="trash-outline" size={13} color={C.accentRecord} />
                    <Text style={[styles.deleteTxt, { color: C.accentRecord }]}>Hapus & foto ulang</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          {/* Upload */}
          {recordingUri && (
            <TouchableOpacity
              style={[styles.btnUpload, { backgroundColor: canUpload ? C.primary : C.textMuted }]}
              onPress={uploadToDrive} disabled={!canUpload}
            >
              <Ionicons name="cloud-upload" size={17} color={C.primaryFg} />
              <Text style={[styles.btnUploadText, { color: C.primaryFg }]}>Upload ke Google Drive{cdbPhoto ? " + Foto" : ""}</Text>
            </TouchableOpacity>
          )}

          <View style={{ height: 24 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Preview foto fullscreen */}
      <Modal visible={cdbPreviewVisible} transparent animationType="fade" onRequestClose={() => setCdbPreviewVisible(false)}>
        <TouchableOpacity style={styles.previewBackdrop} activeOpacity={1} onPress={() => setCdbPreviewVisible(false)}>
          {cdbPhoto && <Image source={{ uri: cdbPhoto }} style={styles.previewImg} resizeMode="contain" />}
          <View style={[styles.previewClose, { backgroundColor: C.surface }]}>
            <Ionicons name="close" size={20} color={C.textPrimary} />
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1 },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  logoImg: { width: 34, height: 34, borderRadius: 8 },
  headerTitle: { fontSize: 12, fontWeight: "800" },
  headerSubtitle: { fontSize: 10, marginTop: 1 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  themeToggle: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  themeText: { fontSize: 11, fontWeight: "600" },
  pill: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  pillText: { fontSize: 11, fontWeight: "600" },
  dots: { flexDirection: "row", gap: 3, alignItems: "center" },
  dot: { width: 3.5, height: 3.5, borderRadius: 2 },
  userStrip: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1 },
  avatarSmall: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  avatarSmallText: { fontSize: 12, fontWeight: "800" },
  userName: { fontSize: 12, fontWeight: "700" },
  userEmail: { fontSize: 10 },
  menuBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.25)", justifyContent: "flex-start", alignItems: "flex-end" },
  menuBox: { marginTop: 76, marginRight: 10, borderRadius: 16, borderWidth: 1, minWidth: 220, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 10 },
  menuItem: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 13, borderBottomWidth: 1 },
  menuIconWrap: { width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  menuItemText: { flex: 1, fontSize: 13, fontWeight: "600" },
  menuDivider: { height: 1 },
  content: { padding: 12, gap: 10 },
  card: { borderRadius: 16, borderWidth: 1, padding: 14, gap: 10 },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  cardTitle: { fontSize: 13, fontWeight: "800" },
  cardDesc: { fontSize: 12, lineHeight: 17 },
  label: { fontSize: 10, fontWeight: "700", letterSpacing: 1.2 },
  input: { height: 46, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, fontSize: 15, fontWeight: "500" },
  inputHint: { fontSize: 10, fontWeight: "600", textAlign: "right" },
  btnRow: { flexDirection: "row", gap: 8 },
  btnPrimary: { height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 5, paddingHorizontal: 14 },
  btnPrimaryText: { fontWeight: "700", fontSize: 13 },
  btnOutline: { height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 5, paddingHorizontal: 14, borderWidth: 1.5 },
  btnOutlineText: { fontWeight: "700", fontSize: 13 },
  btnIcon: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  connectedHint: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1 },
  connectedText: { flex: 1, fontSize: 12, fontWeight: "600" },
  recorderArea: { alignItems: "center", gap: 10, paddingVertical: 4 },
  timerText: { fontSize: 40, fontWeight: "900", letterSpacing: -2, fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" },
  recordBtn: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center" },
  recordHint: { fontSize: 12, textAlign: "center" },
  browseBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10, borderWidth: 1 },
  browseBtnText: { fontSize: 12 },
  fileName: { fontSize: 11 },
  chipGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 11, fontWeight: "600" },
  cdbReadyRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  cdbThumb: { width: 64, height: 80, borderRadius: 10, borderWidth: 1.5 },
  cdbThumbOverlay: { position: "absolute", bottom: 4, right: 4, backgroundColor: "rgba(0,0,0,0.45)", borderRadius: 6, padding: 3 },
  cdbReadyText: { fontSize: 12, fontWeight: "800" },
  deleteTxt: { fontSize: 12, fontWeight: "600" },
  btnUpload: { height: 50, borderRadius: 14, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  btnUploadText: { fontWeight: "700", fontSize: 14 },
  previewBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.92)", alignItems: "center", justifyContent: "center" },
  previewImg: { width: "90%", height: "80%" },
  previewClose: { position: "absolute", top: 50, right: 20, width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
});
