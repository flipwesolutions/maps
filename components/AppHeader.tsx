import React from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import GlassPanel from "./ui/GlassPanel";
import { colors, spacing, typography } from "../lib/theme";

interface AppHeaderProps {
  subtitle: string;
}

const LOGO_ASPECT = 715 / 460;
const LOGO_WIDTH = 96;

export default function AppHeader({ subtitle }: AppHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + 4 }]}>
      <GlassPanel style={styles.brandRow} rounded="xl" elevated>
        <Image
          source={require("../assets/flipwi-logo-nav.png")}
          style={styles.logo}
          resizeMode="contain"
          accessibilityLabel="Flipwi Maps"
        />
        <Text style={styles.sub} numberOfLines={2}>
          {subtitle}
        </Text>
      </GlassPanel>
    </View>
  );
}

/** Content height below safe area (logo + padding) */
export const APP_HEADER_HEIGHT =
  4 + Math.round(LOGO_WIDTH / LOGO_ASPECT) + 12;

/** Space between navbar and search panel */
export const HEADER_SEARCH_GAP = 20;

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 55,
    paddingHorizontal: spacing.safe,
    alignItems: "flex-start",
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "rgba(255,255,255,0.92)",
    maxWidth: "100%",
  },
  logo: {
    width: LOGO_WIDTH,
    height: Math.round(LOGO_WIDTH / LOGO_ASPECT),
  },
  sub: {
    ...typography.labelMd,
    fontSize: 10,
    color: colors.outline,
    fontWeight: "600",
    letterSpacing: 0.3,
    flex: 1,
    lineHeight: 14,
  },
});
