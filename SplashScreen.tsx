// SplashScreen.tsx — HAVOC v3.0.1
// Dark mode  : icon_dark.png  (background hitam)
// Light mode : icon_light.png (background putih)
//
// Cara pakai di _layout.tsx:
//   {showSplash && <SplashScreen onFinish={handleSplashFinish} />}

import React, { useEffect, useRef, useState } from "react";
import {
  Image,
  StyleSheet,
  Animated,
  Easing,
  StatusBar,
  useColorScheme,
  View,
} from "react-native";
import * as ExpoSplashScreen from "expo-splash-screen";

interface Props {
  onFinish: () => void;
}

const BAR_WIDTH  = 220;
const BAR_HEIGHT = 3;
const ICON_LARGE = 300;
const ICON_SMALL = 60;

const ICON_DARK  = require("../assets/images/icon_dark.png");
const ICON_LIGHT = require("../assets/images/icon_light.png");

export default function SplashScreen({ onFinish }: Props) {
  const colorScheme = useColorScheme();
  const isDark      = colorScheme === "dark";
  const BG          = isDark ? "#000000" : "#FFFFFF";
  const iconSource  = isDark ? ICON_DARK : ICON_LIGHT;

  const iconScaleEnd = useRef(new Animated.Value(1)).current;
  const iconTransX   = useRef(new Animated.Value(0)).current;
  const barOpacity   = useRef(new Animated.Value(0)).current;
  const barScaleX    = useRef(new Animated.Value(0)).current;
  const groupOpacity = useRef(new Animated.Value(1)).current;

  const [showBar, setShowBar] = useState(false);
  const [ready, setReady]     = useState(false);

  useEffect(() => {
    const hide = setTimeout(async () => {
      await ExpoSplashScreen.hideAsync();
      setReady(true);
    }, 50);
    return () => clearTimeout(hide);
  }, []);

  useEffect(() => {
    if (!ready) return;

    const hold = setTimeout(() => {
      // Icon geser ke KANAN bar
      const targetX     = (BAR_WIDTH / 2) + 6 + (ICON_SMALL / 2);
      const targetScale = ICON_SMALL / ICON_LARGE;

      setShowBar(true);

      Animated.parallel([
        Animated.timing(barOpacity, {
          toValue: 1,
          duration: 220,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(iconScaleEnd, {
          toValue: targetScale,
          duration: 460,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(iconTransX, {
          toValue: targetX,
          duration: 460,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(() => {
        Animated.timing(barScaleX, {
          toValue: 1,
          duration: 900,
          easing: Easing.bezier(0.25, 0.1, 0.35, 1.0),
          useNativeDriver: true,
        }).start(() => {
          setTimeout(() => {
            Animated.timing(groupOpacity, {
              toValue: 0,
              duration: 300,
              easing: Easing.in(Easing.cubic),
              useNativeDriver: true,
            }).start(() => onFinish());
          }, 150);
        });
      });
    }, 1600);

    return () => clearTimeout(hold);
  }, [ready]);

  // Bar tumbuh dari kiri ke kanan
  const barTranslateX = barScaleX.interpolate({
    inputRange: [0, 1],
    outputRange: [-BAR_WIDTH, 0],
  });

  if (!ready) return null;

  return (
    <Animated.View
      style={[s.root, { backgroundColor: BG }]}
      pointerEvents="none"
    >
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={BG}
        translucent
      />

      <Animated.View style={[s.group, { opacity: groupOpacity }]}>

        {/* Icon — sesuai tema, langsung visible */}
        <Animated.View
          style={[
            s.iconWrap,
            {
              transform: [
                { translateX: iconTransX },
                { scale: iconScaleEnd },
              ],
            },
          ]}
        >
          <Image
            source={iconSource}
            style={s.logoImg}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Red bar */}
        {showBar && (
          <Animated.View style={[s.barTrack, { opacity: barOpacity }]}>
            <Animated.View
              style={[
                s.barFill,
                {
                  transform: [
                    { scaleX: barScaleX },
                    { translateX: barTranslateX },
                  ],
                },
              ]}
            />
          </Animated.View>
        )}

      </Animated.View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  root: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
  },
  group: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  iconWrap: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  logoImg: {
    width: ICON_LARGE,
    height: ICON_LARGE,
    borderRadius: 52,
  },
  barTrack: {
    position: "absolute",
    width: BAR_WIDTH,
    height: BAR_HEIGHT,
    overflow: "hidden",
    zIndex: 1,
  },
  barFill: {
    position: "absolute",
    left: 0,
    top: 0,
    width: BAR_WIDTH,
    height: BAR_HEIGHT,
    backgroundColor: "#FF0000",
    borderRadius: 2,
    shadowColor: "#FF0000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 6,
  },
});
