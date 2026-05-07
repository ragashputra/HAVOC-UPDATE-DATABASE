import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Asset } from "expo-asset";
import * as ExpoSplashScreen from "expo-splash-screen";
import { Platform, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import * as NavigationBar from "expo-navigation-bar";
import { AuthProvider, useAuth } from "../lib/auth";
import { ThemeProvider, useTheme } from "../lib/theme";
import SplashScreen from "./SplashScreen";

ExpoSplashScreen.preventAutoHideAsync();

async function preloadAssets() {
  await Asset.loadAsync([
    require("../assets/images/logo.png"),
    require("../assets/images/icon.png"),
    require("../assets/images/icon_dark.png"),
    require("../assets/images/icon_light.png"),
  ]);
}

function AuthGate() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router   = useRouter();

  useEffect(() => {
    if (loading) return;
    const first    = segments[0];
    const isPublic =
      first === "login" || first === "register" || first === "forgot-password";
    if (!user && !isPublic) {
      router.replace("/login");
    } else if (
      user &&
      (first === "login" || first === "register" || first === "forgot-password")
    ) {
      router.replace("/");
    }
  }, [user, loading, segments, router]);

  return null;
}

function AppStack({
  showSplash,
  onSplashFinish,
}: {
  showSplash: boolean;
  onSplashFinish: () => void;
}) {
  const { C, mode } = useTheme();
  const isDark = mode === "dark";
  const bg = C.bg;

  useEffect(() => {
    if (Platform.OS === "android") {
      NavigationBar.setBackgroundColorAsync(bg).catch(() => {});
      NavigationBar.setButtonStyleAsync(isDark ? "light" : "dark").catch(() => {});
    }
  }, [bg, isDark]);

  const slideOpts = {
    animation: "slide_from_right" as const,
    animationDuration: 300,
    contentStyle: { backgroundColor: bg },
    gestureEnabled: true,
    gestureDirection: "horizontal" as const,
  };

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <StatusBar
        style={isDark ? "light" : "dark"}
        backgroundColor={bg}
        translucent={false}
      />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: bg },
          animation: "slide_from_right",
          animationDuration: 300,
          gestureEnabled: true,
          gestureDirection: "horizontal",
        }}
      >
        <Stack.Screen name="index"           options={{ animation: "fade_from_bottom", animationDuration: 280, contentStyle: { backgroundColor: bg } }} />
        <Stack.Screen name="login"           options={{ animation: "fade_from_bottom", animationDuration: 280, contentStyle: { backgroundColor: bg } }} />
        <Stack.Screen name="register"        options={{ animation: "fade_from_bottom", animationDuration: 280, contentStyle: { backgroundColor: bg } }} />
        <Stack.Screen name="forgot-password" options={{ animation: "fade_from_bottom", animationDuration: 280, contentStyle: { backgroundColor: bg } }} />
        <Stack.Screen name="history"         options={slideOpts} />
        <Stack.Screen name="profile"         options={slideOpts} />
        <Stack.Screen name="ganti-password"  options={slideOpts} />
        <Stack.Screen name="folder-drive"    options={slideOpts} />
        <Stack.Screen name="tentang"         options={slideOpts} />
      </Stack>

      {showSplash && <SplashScreen onFinish={onSplashFinish} />}
    </View>
  );
}

export default function RootLayout() {
  const splashDoneRef = useRef(false);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    preloadAssets().catch(() => {});
  }, []);

  const handleSplashFinish = () => {
    if (splashDoneRef.current) return;
    splashDoneRef.current = true;
    setShowSplash(false);
  };

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <AuthGate />
          <AppStack showSplash={showSplash} onSplashFinish={handleSplashFinish} />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
