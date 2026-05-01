import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, Platform, KeyboardAvoidingView, Image,
  Animated, Easing, Modal, Switch,
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

const BAR_COUNT = 32;
function Waveform({ isRecording, C }: { isRecording: boolean; C: any }) {
  const bars = useRef(
    Array.from({ length: BAR_COUNT }, () => new Animated.Value(0.15))
  ).current;
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (isRecording) {
      const buildLoop = () => {
        const anims = bars.map((bar) =>
          Animated.sequence([
            Animated.timing(bar, {
              toValue: Math.random() * 0.85 + 0.15,
              duration: 100 + Math.random() * 120,
              easing: Easing.out(Easing.quad),
              useNativeDriver: false,
            }),
            Animated.timing(bar, {
              toValue: Math.random() * 0.35 + 0.1,
              duration: 100 + Math.random() * 120,
              easing: Easing.in(Easing.quad),
              useNativeDriver: false,
            }),
          ])
        );
        loopRef.current = Animated.loop(Animated.stagger(20, anims));
        loopRef.current.start();
      };
      buildLoop();
    } else {
      loopRef.current?.stop();
      bars.forEach((bar) =>
        Animated.timing(bar, { toValue: 0.1, duration: 200, useNativeDriver: false }).start()
      );
    }
    return () => { loopRef.current?.stop(); };
  }, [isRecording]);

  return (
    <View style={wf.container}>
      {bars.map((bar, i) => (
        <Animated.View
          key={i}
          style={[
            wf.bar,
            {
              backgroundColor: isRecording ? C.accentSuccess : C.border,
              height: bar.interpolate({ inputRange: [0, 1], outputRange: [3, 38] }),
            },
          ]}
        />
      ))}
    </View>
  );
}

const wf = StyleSheet.create({
  container: { flexDirection: "row", alignItems: "center", justifyContent: "center", height: 50, gap: 3 },
  bar: { width: 3.5, borderRadius: 2, minHeight: 3 },
});

function PlaybackBar({ uri, durationMs, C, onDelete }: { uri: string; durationMs: number; C: any; onDelete: () => void }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [posMs, setPosMs] = useState(0);
  const [totalMs, setTotalMs] = useState(durationMs || 0);

  const soundRef = useRef<Audio.Sound | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const barWidthRef = useRef(300);
  const isPlayingRef = useRef(false);
  const totalMsRef = useRef(durationMs || 0);

  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { totalMsRef.current = totalMs; }, [totalMs]);

  useEffect(() => {
    return () => {
      tickRef.current && clearInterval(tickRef.current);
      soundRef.current?.unloadAsync().catch(() => {});
    };
  }, []);

  const stopTick = useCallback(() => {
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
  }, []);

  const startTick = useCallback((sound: Audio.Sound) => {
    stopTick();
    tickRef.current = setInterval(async () => {
      try {
        const st = await sound.getStatusAsync();
        if (!st.isLoaded) return;
        setPosMs(st.positionMillis ?? 0);
        if (st.didJustFinish || (!st.isPlaying && (st.positionMillis ?? 0) >= totalMsRef.current - 300)) {
          setIsPlaying(false);
          setPosMs(0);
          stopTick();
          await sound.setPositionAsync(0).catch(() => {});
        }
      } catch { stopTick(); }
    }, 100);
  }, [stopTick]);

  const getSound = useCallback(async (): Promise<Audio.Sound> => {
    if (soundRef.current) return soundRef.current;
    await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true });
    const { sound } = await Audio.Sound.createAsync({ uri }, { shouldPlay: false });
    soundRef.current = sound;
    const st = await sound.getStatusAsync();
    if (st.isLoaded && st.durationMillis) {
      setTotalMs(st.durationMillis);
      totalMsRef.current = st.durationMillis;
    }
    return sound;
  }, [uri]);

  const togglePlay = useCallback(async () => {
    try {
      const sound = await getSound();
      const st = await sound.getStatusAsync();
      if (!st.isLoaded) return;
      if (isPlayingRef.current) {
        await sound.pauseAsync();
        setIsPlaying(false);
        stopTick();
      } else {
        const pos = st.isLoaded ? (st as any).positionMillis ?? 0 : 0;
        if (pos >= totalMsRef.current - 300) {
          await sound.setPositionAsync(0);
          setPosMs(0);
        }
        await sound.playAsync();
        setIsPlaying(true);
        startTick(sound);
      }
    } catch { Alert.alert("Error", "Gagal memutar audio"); }
  }, [getSound, stopTick, startTick]);

  const seekTo = useCallback(async (ratio: number) => {
    const ms = Math.floor(Math.max(0, Math.min(1, ratio)) * totalMsRef.current);
    setPosMs(ms);
    try {
      const sound = await getSound();
      await sound.setPositionAsync(ms);
      if (isPlayingRef.current) startTick(sound);
    } catch {}
  }, [getSound, startTick]);

  const onBarPress = useCallback((evt: any) => {
    const x = evt.nativeEvent.locationX;
    seekTo(x / barWidthRef.current);
  }, [seekTo]);

  const progress = totalMs > 0 ? Math.min(1, posMs / totalMs) : 0;

  return (
    <View style={[pb.container, { backgroundColor: C.surface, borderColor: C.border }]}>
      <TouchableOpacity onPress={togglePlay} style={[pb.playBtn, { backgroundColor: C.accentSuccess }]}>
        <Ionicons name={isPlaying ? "pause" : "play"} size={18} color="#fff" />
      </TouchableOpacity>
      <View style={{ flex: 1, gap: 4 }}>
        <TouchableOpacity
          activeOpacity={1}
          onPress={onBarPress}
          style={[pb.bar, { backgroundColor: C.inputBg }]}
          onLayout={(e) => { barWidthRef.current = e.nativeEvent.layout.width; }}
        >
          <View style={[pb.fill, { width: `${progress * 100}%` as any, backgroundColor: C.accentSuccess }]} />
          <View style={[pb.thumb, { left: `${progress * 100}%` as any, backgroundColor: C.accentSuccess }]} />
        </TouchableOpacity>
        <View style={pb.timeRow}>
          <Text style={[pb.timeText, { color: C.textMuted }]}>{formatTime(posMs)}</Text>
          <Text style={[pb.timeText, { color: C.textMuted }]}>{formatTime(totalMs)}</Text>
        </View>
      </View>
      <TouchableOpacity onPress={onDelete} style={[pb.trashBtn, { borderColor: C.border, backgroundColor: C.deleteBtn }]}>
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
  thumb: { width: 14, height: 14, borderRadius: 7, position: "absolute", top: -4, marginLeft: -7 },
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
  const startTimeRef = useRef(0);
  const menuAnim = useRef(new Animated.Value(0)).current;

  const rawMesin = nomorMesin.replace(/\s/g, "");
  const canUpload = !!recordingUri && !!namaKonsumen.trim() && rawMesin.length === 12 && driveConnected;
  const mesinKeyboardType = rawMesin.length >= 5 ? "numeric" : "default";

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
      {
        text: "Putuskan", style: "destructive", onPress: async () => {
          await authFetch(token, `${APP_BACKEND_URL}/api/drive/disconnect`, { method: "POST" });
          setDriveConnected(false); setDriveEmail(null);
        }
      },
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
        ios: { ...Audio.RecordingOptionsPresets.HIGH_QUALITY.ios, extension: ".m4a" },
      });
      recordingRef.current = recording;
      startTimeRef.current = Date.now();
      setIsRecording(true);
      setRecordingMs(0);
      setRecordingUri(null);
      setRecordingName(null);
      timerRef.current = setInterval(() => {
        setRecordingMs(Date.now() - startTimeRef.current);
      }, 100);
    } catch (e: any) { Alert.alert("Gagal", e?.message ?? "Tidak bisa memulai rekaman"); }
  };

  const stopRecording = async () => {
    try {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      setIsRecording(false);
      if (!recordingRef.current) return;
      await recordingRef.current.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;
      if (!uri) return;
      const ts = Date.now();
      const ext = Platform.OS === "ios" ? "m4a" : "mp4";
      const name = `REC_${ts}.${ext}`;
      const dest = `${FileSystem.documentDirectory}${name}`;
      await FileSystem.moveAsync({ from: uri, to: dest });
      setRecordingUri(dest);
      setRecordingName(name);
    } catch (e: any) { Alert.alert("Gagal", e?.message ?? "Gagal menyimpan rekaman"); }
  };

  const pickAudio = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: ["audio/*", "video/mp4"], copyToCacheDirectory: true });
      if (res.canceled || !res.assets?.[0]) return;
      const asset = res.assets[0];
      const ext = asset.name.split(".").pop()?.toLowerCase() ?? "mp4";
      const allowed = ["mp3", "m4a", "mp4", "aac", "wav", "ogg", "opus", "3gp", "amr"];
      if (!allowed.includes(ext)) { Alert.alert("Format tidak didukung", `File .${ext} tidak bisa diupload.`); return; }
      setRecordingUri(asset.uri);
      setRecordingName(asset.name);
    } catch (e: any) { Alert.alert("Gagal", e?.message ?? "Tidak bisa membuka file"); }
  };

  const pickCdbPhoto = async () => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        const gallPerm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!gallPerm.granted) { Alert.alert("Izin Ditolak", "Akses kamera/galeri dibutuhkan"); return; }
        const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: false, quality: 0.85 });
        if (!res.canceled && res.assets?.[0]) { setCdbPhoto(res.assets[0].uri); setCdbPhotoName(`CDB_${Date.now()}.jpg`); }
        return;
      }
      const res = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: false, quality: 0.85 });
      if (!res.canceled && res.assets?.[0]) { setCdbPhoto(res.assets[0].uri); setCdbPhotoName(`CDB_${Date.now()}.jpg`); }
    } catch (e: any) { Alert.alert("Gagal", e?.message ?? "Gagal ambil foto"); }
  };

  const handleUpload = async () => {
    if (!canUpload || !recordingUri) return;
    setUploading(true); setUploadProgress(0); setUploadLabel("Mengupload rekaman...");
    try {
      const ext = recordingUri.split(".").pop() ?? "mp4";
      const mime = ext === "m4a" ? "audio/m4a" : ext === "mp3" ? "audio/mpeg" : "video/mp4";
      const formData = new FormData();
      formData.append("nama_konsumen", namaKonsumen.trim());
      formData.append("nomor_mesin", rawMesin);
      formData.append("audio", { uri: recordingUri, name: recordingName ?? `rec.${ext}`, type: mime } as any);
      let prog = 0;
      const progInt = setInterval(() => { prog = Math.min(prog + 0.04, 0.88); setUploadProgress(prog); }, 300);
      const res = await authFetch(token, `${APP_BACKEND_URL}/api/uploads/audio`, { method: "POST", body: formData });
      clearInterval(progInt);
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data.detail === "string" ? data.detail : "Upload gagal");
      setUploadProgress(1);

      if (cdbPhoto && cdbPhotoName) {
        setUploadLabel("Mengupload foto CDB..."); setUploadProgress(0);
        const photoForm = new FormData();
        photoForm.append("nama_konsumen", namaKonsumen.trim());
        photoForm.append("nomor_mesin", rawMesin);
        photoForm.append("photo", { uri: cdbPhoto, name: cdbPhotoName, type: "image/jpeg" } as any);
        let p2 = 0;
        const p2Int = setInterval(() => { p2 = Math.min(p2 + 0.06, 0.88); setUploadProgress(p2); }, 200);
        const res2 = await authFetch(token, `${APP_BACKEND_URL}/api/uploads/photo`, { method: "POST", body: photoForm });
        clearInterval(p2Int);
        const d2 = await res2.json();
        if (!res2.ok) throw new Error(typeof d2.detail === "string" ? d2.detail : "Upload foto gagal");
        setUploadProgress(1);
      }

      setTimeout(() => {
        setUploading(false);
        Alert.alert("Berhasil!", `File berhasil diupload ke Google Drive.\nNomor mesin: ${rawMesin}`, [
          { text: "OK", onPress: () => { setNamaKonsumen(""); setNomorMesin(""); setRecordingUri(null); setRecordingName(null); setCdbPhoto(null); setCdbPhotoName(null); } }
        ]);
      }, 600);
    } catch (e: any) {
      setUploading(false);
      Alert.alert("Gagal Upload", e?.message ?? "Terjadi kesalahan");
    }
  };

  const menuScale = menuAnim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] });

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: C.bg }]}>
      <View style={[s.header, { backgroundColor: C.headerBg, borderBottomColor: C.border }]}>
        <View style={{ flex: 1 }}>
          <Text style={[s.headerTitle, { color: C.textPrimary }]}>Honda Visual On-site Capture</Text>
          <Text style={[s.headerSub, { color: C.textMuted }]}>{user?.unit_usaha ?? user?.email ?? ""}</Text>
        </View>
        <View style={s.themeRow}>
          <Ionicons name={isDark ? "moon" : "sunny"} size={14} color={C.textMuted} />
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{ false: "#E4E4E7", true: "#34C759" }}
            thumbColor="#fff"
            ios_backgroundColor="#E4E4E7"
            style={{ transform: [{ scaleX: 0.78 }, { scaleY: 0.78 }] }}
          />
        </View>
        <TouchableOpacity onPress={openMenu} style={[s.iconBtn, { borderColor: C.border }]}>
          <Ionicons name="ellipsis-horizontal" size={18} color={C.textPrimary} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={[s.content, { backgroundColor: C.bg }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {checkingStatus ? (
            <View style={[s.driveCard, { backgroundColor: C.surface, borderColor: C.border }]}>
              <ActivityIndicator size="small" color={C.textMuted} />
              <Text style={[s.driveText, { color: C.textMuted }]}>Mengecek koneksi Drive...</Text>
            </View>
          ) : driveConnected ? (
            <TouchableOpacity onPress={handleDisconnectDrive} style={[s.driveCard, { backgroundColor: C.connectedHintBg, borderColor: C.accentSuccess }]}>
              <Ionicons name="checkmark-circle" size={16} color={C.accentSuccess} />
              <Text style={[s.driveText, { color: C.accentSuccess, flex: 1 }]} numberOfLines={1}>Drive: {driveEmail}</Text>
              <Ionicons name="chevron-forward" size={14} color={C.accentSuccess} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={handleConnectDrive} disabled={connecting} style={[s.driveCard, { backgroundColor: C.surface, borderColor: C.accentDrive }]}>
              {connecting ? <ActivityIndicator size="small" color={C.accentDrive} /> : <Ionicons name="logo-google" size={16} color={C.accentDrive} />}
              <Text style={[s.driveText, { color: C.accentDrive, fontWeight: "700" }]}>{connecting ? "Menghubungkan..." : "Hubungkan Google Drive"}</Text>
            </TouchableOpacity>
          )}

          <View style={[s.card, { backgroundColor: C.surface, borderColor: C.border }]}>
            <Text style={[s.label, { color: C.textMuted }]}>NAMA KONSUMEN</Text>
            <TextInput
              style={[s.input, { backgroundColor: C.inputBg, borderColor: C.border, color: C.textPrimary }]}
              value={namaKonsumen}
              onChangeText={setNamaKonsumen}
              placeholder="Nama lengkap konsumen"
              placeholderTextColor={C.textMuted}
              autoCapitalize="words"
            />
            <Text style={[s.label, { color: C.textMuted, marginTop: 6 }]}>NOMOR MESIN (12 KARAKTER)</Text>
            <TextInput
              style={[s.input, { backgroundColor: C.inputBg, borderColor: C.border, color: C.textPrimary, fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace", letterSpacing: 2 }]}
              value={nomorMesin}
              onChangeText={(t) => {
                const fmt = formatNomorMesin(t);
                if (fmt.replace(/\s/g, "").length <= 12) setNomorMesin(fmt);
              }}
              placeholder="XXXXX 0000000"
              placeholderTextColor={C.textMuted}
              autoCapitalize="characters"
              keyboardType={mesinKeyboardType}
              maxLength={13}
            />
            {rawMesin.length > 0 && rawMesin.length < 12 && (
              <Text style={[s.hint, { color: C.accentWarning }]}>
                {rawMesin.length}/12{rawMesin.length === 5 ? " — lanjutkan dengan angka" : ""}
              </Text>
            )}
          </View>

          <View style={[s.card, { backgroundColor: C.surface, borderColor: C.border }]}>
            <View style={s.cardRow}>
              <Ionicons name="mic" size={15} color={C.accentSuccess} />
              <Text style={[s.cardTitle, { color: C.textPrimary }]}>Rekam Suara</Text>
            </View>

            {isRecording && (
              <View style={[s.waveBox, { backgroundColor: C.inputBg, borderColor: C.border }]}>
                <Waveform isRecording={isRecording} C={C} />
                <Text style={[s.recTimer, { color: C.accentSuccess }]}>{formatTime(recordingMs)}</Text>
              </View>
            )}

            {!recordingUri ? (
              <View style={{ gap: 8 }}>
                <TouchableOpacity
                  onPress={isRecording ? stopRecording : startRecording}
                  style={[s.recBtn, { backgroundColor: isRecording ? C.accentRecord : C.accentSuccess }]}
                >
                  <Ionicons name={isRecording ? "stop" : "mic"} size={18} color="#fff" />
                  <Text style={[s.recBtnText, { color: "#fff" }]}>
                    {isRecording ? `Stop  ${formatTime(recordingMs)}` : "Mulai Rekam"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={pickAudio} style={[s.btnOutline, { borderColor: C.border }]}>
                  <Ionicons name="document-outline" size={15} color={C.textSecondary} />
                  <Text style={[s.btnOutlineText, { color: C.textSecondary }]}>Pilih File Audio</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <PlaybackBar
                uri={recordingUri}
                durationMs={recordingMs > 0 ? recordingMs : 0}
                C={C}
                onDelete={() => { setRecordingUri(null); setRecordingName(null); setRecordingMs(0); }}
              />
            )}
          </View>

          <View style={[s.card, { backgroundColor: C.cdbBg, borderColor: C.border }]}>
            <View style={s.cardRow}>
              <Ionicons name="camera" size={15} color={C.accentDrive} />
              <Text style={[s.cardTitle, { color: C.textPrimary }]}>
                Foto CDB <Text style={{ color: C.textMuted, fontWeight: "500" }}>(opsional)</Text>
              </Text>
            </View>
            {cdbPhoto ? (
              <View style={{ gap: 8 }}>
                <TouchableOpacity onPress={() => setCdbPreviewVisible(true)}>
                  <Image source={{ uri: cdbPhoto }} style={s.cdbThumb} resizeMode="cover" />
                </TouchableOpacity>
                <View style={s.cdbActions}>
                  <TouchableOpacity
                    onPress={pickCdbPhoto}
                    style={[s.cdbActionBtn, { borderColor: C.border, backgroundColor: C.surface }]}
                  >
                    <Ionicons name="camera-outline" size={14} color={C.textSecondary} />
                    <Text style={[s.cdbActionText, { color: C.textSecondary }]}>Foto Ulang</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => { setCdbPhoto(null); setCdbPhotoName(null); }}
                    style={[s.cdbActionBtn, { borderColor: C.accentRecord + "55", backgroundColor: C.deleteBtn }]}
                  >
                    <Ionicons name="trash-outline" size={14} color={C.accentRecord} />
                    <Text style={[s.cdbActionText, { color: C.accentRecord }]}>Hapus</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity onPress={pickCdbPhoto} style={[s.recBtn, { backgroundColor: C.accentDrive }]}>
                <Ionicons name="camera" size={18} color="#fff" />
                <Text style={[s.recBtnText, { color: "#fff" }]}>Ambil / Pilih Foto CDB</Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            onPress={handleUpload}
            disabled={!canUpload}
            style={[s.uploadBtn, { backgroundColor: canUpload ? C.accentSuccess : C.inputBg }]}
          >
            <Ionicons name="cloud-upload-outline" size={20} color={canUpload ? "#fff" : C.textMuted} />
            <Text style={[s.uploadBtnText, { color: canUpload ? "#fff" : C.textMuted }]}>Upload ke Google Drive</Text>
          </TouchableOpacity>

          {!canUpload && (
            <Text style={[s.uploadHint, { color: C.textMuted }]}>
              {!driveConnected ? "• Hubungkan Google Drive dahulu" : ""}
              {!namaKonsumen.trim() ? "\n• Isi nama konsumen" : ""}
              {rawMesin.length !== 12 ? `\n• Nomor mesin harus 12 karakter (${rawMesin.length}/12)` : ""}
              {!recordingUri ? "\n• Rekam atau pilih file audio" : ""}
            </Text>
          )}

        </ScrollView>
      </KeyboardAvoidingView>

      {menuVisible && (
        <TouchableOpacity style={s.menuBackdrop} activeOpacity={1} onPress={closeMenu}>
          <Animated.View
            style={[s.menuBox, { backgroundColor: C.menuBg, borderColor: C.border, opacity: menuAnim, transform: [{ scale: menuScale }] }]}
          >
            {[
              { icon: "person-outline", label: "Profil / Akun", onPress: () => { closeMenu(); router.push("/profile"); } },
              { icon: "folder-outline", label: "Folder Drive", onPress: () => { closeMenu(); router.push("/folder-drive"); } },
              { icon: "time-outline", label: "Riwayat Upload", onPress: () => { closeMenu(); router.push("/history"); } },
              { icon: "information-circle-outline", label: "Tentang", onPress: () => { closeMenu(); router.push("/tentang"); } },
            ].map((item, i) => (
              <TouchableOpacity key={i} onPress={item.onPress} style={[s.menuItem, { borderBottomColor: C.border }]}>
                <Ionicons name={item.icon as any} size={16} color={C.textSecondary} />
                <Text style={[s.menuItemText, { color: C.textPrimary }]}>{item.label}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              onPress={() => { closeMenu(); logout(); }}
              style={[s.menuItemLogout, { backgroundColor: isDark ? "#1a0a0a" : "#FFF1F2" }]}
            >
              <Ionicons name="log-out-outline" size={16} color={C.accentRecord} />
              <Text style={[s.menuItemLogoutText, { color: C.accentRecord }]}>Keluar</Text>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      )}

      <Modal visible={cdbPreviewVisible} transparent animationType="fade" onRequestClose={() => setCdbPreviewVisible(false)}>
        <TouchableOpacity style={s.previewBackdrop} activeOpacity={1} onPress={() => setCdbPreviewVisible(false)}>
          {cdbPhoto && <Image source={{ uri: cdbPhoto }} style={s.previewImg} resizeMode="contain" />}
        </TouchableOpacity>
      </Modal>

      <LoadingOverlay visible={uploading} label={uploadLabel} progress={uploadProgress} C={C} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, gap: 10 },
  headerTitle: { fontSize: 13, fontWeight: "800" },
  headerSub: { fontSize: 10, marginTop: 1 },
  themeRow: { flexDirection: "row", alignItems: "center", gap: 2 },
  iconBtn: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  content: { padding: 14, gap: 12, paddingBottom: 40 },
  driveCard: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 12, borderWidth: 1 },
  driveText: { fontSize: 12, fontWeight: "600" },
  card: { borderRadius: 16, borderWidth: 1, padding: 14, gap: 10 },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardTitle: { fontSize: 13, fontWeight: "800" },
  label: { fontSize: 10, fontWeight: "700", letterSpacing: 1.2 },
  input: { height: 46, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, fontSize: 14, fontWeight: "500" },
  hint: { fontSize: 11, fontWeight: "600", marginTop: -4 },
  waveBox: { borderRadius: 12, borderWidth: 1, paddingVertical: 6, alignItems: "center", gap: 2 },
  recTimer: { fontSize: 13, fontWeight: "800", fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace", paddingBottom: 4 },
  recBtn: { height: 48, borderRadius: 13, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  recBtnText: { fontWeight: "700", fontSize: 14 },
  btnOutline: { height: 42, borderRadius: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, borderWidth: 1 },
  btnOutlineText: { fontWeight: "600", fontSize: 13 },
  cdbThumb: { width: "100%", height: 160, borderRadius: 12 },
  cdbActions: { flexDirection: "row", gap: 8 },
  cdbActionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, height: 38, borderRadius: 10, borderWidth: 1 },
  cdbActionText: { fontSize: 12, fontWeight: "700" },
  uploadBtn: { height: 52, borderRadius: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  uploadBtnText: { fontWeight: "800", fontSize: 15 },
  uploadHint: { fontSize: 11, lineHeight: 18, textAlign: "center" },
  menuBackdrop: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  menuBox: { position: "absolute", top: 60, right: 14, width: 200, borderRadius: 16, borderWidth: 1, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 10 },
  menuItem: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 13, borderBottomWidth: 1 },
  menuItemText: { fontSize: 13, fontWeight: "600" },
  menuItemLogout: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 13 },
  menuItemLogoutText: { fontSize: 13, fontWeight: "700" },
  previewBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.9)", alignItems: "center", justifyContent: "center" },
  previewImg: { width: "100%", height: "80%" },
});
