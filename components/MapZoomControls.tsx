import React from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import GlassPanel from "./ui/GlassPanel";
import { colors, spacing, radius } from "../lib/theme";

interface MapZoomControlsProps {
  top: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  hidden?: boolean;
}

export default function MapZoomControls({
  top,
  onZoomIn,
  onZoomOut,
  hidden,
}: MapZoomControlsProps) {
  if (hidden) return null;

  return (
    <View style={[styles.wrap, { top }]}>
      <GlassPanel style={styles.group} rounded="xl" elevated>
        <TouchableOpacity
          style={styles.btn}
          onPress={onZoomIn}
          activeOpacity={0.85}
          accessibilityLabel="Zoom in"
        >
          <Ionicons name="add" size={22} color={colors.onSurfaceVariant} />
        </TouchableOpacity>
        <View style={styles.divider} />
        <TouchableOpacity
          style={styles.btn}
          onPress={onZoomOut}
          activeOpacity={0.85}
          accessibilityLabel="Zoom out"
        >
          <Ionicons name="remove" size={22} color={colors.onSurfaceVariant} />
        </TouchableOpacity>
      </GlassPanel>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    right: spacing.safe,
    zIndex: 44,
  },
  group: {
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.92)",
  },
  btn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  divider: {
    height: 1,
    backgroundColor: colors.outlineVariant,
    marginHorizontal: 8,
  },
});
