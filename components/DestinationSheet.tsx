import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { SearchPlace } from "../lib/geocoding";
import GlassPanel from "./ui/GlassPanel";
import { colors, spacing, radius, typography, shadow } from "../lib/theme";

interface DestinationSheetProps {
  place: SearchPlace;
  isSaved: boolean;
  navigating: boolean;
  canRoute: boolean;
  visible: boolean;
  translateY: Animated.AnimatedInterpolation<number>;
  onSave: () => void;
  onClose: () => void;
  onGetDirections: () => void;
}

export default function DestinationSheet({
  place,
  isSaved,
  navigating,
  canRoute,
  visible,
  translateY,
  onSave,
  onClose,
  onGetDirections,
}: DestinationSheetProps) {
  const insets = useSafeAreaInsets();

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.wrap,
        { paddingBottom: insets.bottom + 12, transform: [{ translateY }] },
      ]}
    >
      <GlassPanel style={styles.sheet} rounded="sheet" elevated>
        <View style={styles.handle} />

        <View style={styles.row}>
          <View style={styles.iconBox}>
            <Ionicons name="location" size={26} color={colors.primary} />
          </View>
          <View style={styles.textBlock}>
            <Text style={styles.name} numberOfLines={2}>
              {place.name}
            </Text>
            <Text style={styles.subtitle} numberOfLines={2}>
              {place.subtitle}
            </Text>
          </View>
          <TouchableOpacity onPress={onSave} style={styles.iconBtn} activeOpacity={0.85}>
            <Ionicons
              name={isSaved ? "star" : "star-outline"}
              size={22}
              color={isSaved ? colors.primary : colors.outline}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={styles.iconBtn} activeOpacity={0.85}>
            <Ionicons name="close" size={22} color={colors.outline} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.cta, !canRoute && styles.ctaDisabled]}
          onPress={onGetDirections}
          disabled={!canRoute || navigating}
          activeOpacity={0.88}
        >
          <Ionicons name="navigate" size={20} color={colors.onPrimary} />
          <Text style={styles.ctaText}>
            {navigating ? "Loading route…" : "Get directions here"}
          </Text>
        </TouchableOpacity>
      </GlassPanel>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 35,
  },
  sheet: {
    paddingHorizontal: spacing.panel,
    paddingTop: 10,
    paddingBottom: spacing.panel,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.outlineVariant,
    alignSelf: "center",
    marginBottom: 14,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: radius.lg,
    backgroundColor: colors.secondaryContainer,
    alignItems: "center",
    justifyContent: "center",
  },
  textBlock: { flex: 1 },
  name: {
    ...typography.headlineMd,
    fontSize: 18,
    color: colors.onSurface,
  },
  subtitle: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    marginTop: 4,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: "center",
    justifyContent: "center",
  },
  cta: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    ...shadow.sm,
  },
  ctaDisabled: { opacity: 0.45 },
  ctaText: {
    color: colors.onPrimary,
    fontSize: 16,
    fontWeight: "800",
  },
});
