import React from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import GlassPanel from "./ui/GlassPanel";
import { colors, spacing, radius, shadow } from "../lib/theme";
import { bottomChrome, fabColumnBottom } from "../lib/layout";

interface MapControlsProps {
  onMyLocation: () => void;
  onExplore: () => void;
  onLayers: () => void;
  onRoutes: () => void;
  hasRoutes: boolean;
  layersActive?: boolean;
  hidden?: boolean;
  bottomStackHeight?: number;
}

export default function MapControls({
  onMyLocation,
  onExplore,
  onLayers,
  onRoutes,
  hasRoutes,
  layersActive,
  hidden,
  bottomStackHeight = 0,
}: MapControlsProps) {
  const insets = useSafeAreaInsets();
  if (hidden) return null;

  return (
    <View
      style={[
        styles.fabColumn,
        { bottom: fabColumnBottom(insets.bottom, bottomStackHeight) },
      ]}
    >
      <Fab icon="layers-outline" onPress={onLayers} active={layersActive} />
      <Fab icon="compass-outline" onPress={onExplore} />
      {hasRoutes && <Fab icon="git-branch-outline" onPress={onRoutes} accent />}
      <TouchableOpacity style={styles.primaryFab} onPress={onMyLocation} activeOpacity={0.88}>
        <Ionicons name="locate" size={26} color={colors.onPrimary} />
      </TouchableOpacity>
    </View>
  );
}

function Fab({
  icon,
  onPress,
  active,
  accent,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  active?: boolean;
  accent?: boolean;
}) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <GlassPanel
        style={[styles.fab, active && styles.fabActive, accent && styles.fabAccent]}
        rounded="xl"
        elevated
      >
        <Ionicons
          name={icon}
          size={22}
          color={active || accent ? colors.primary : colors.onSurfaceVariant}
        />
      </GlassPanel>
    </TouchableOpacity>
  );
}

interface BottomNavProps {
  activeTab: "explore" | "location" | "layers" | "routes";
  onLocation: () => void;
  onExplore: () => void;
  onLayers: () => void;
  onRoutes: () => void;
  hasRoutes: boolean;
  hidden?: boolean;
  aboveQuickAccess?: boolean;
}

export function BottomNav({
  activeTab,
  onLocation,
  onExplore,
  onLayers,
  onRoutes,
  hasRoutes,
  hidden,
  aboveQuickAccess = true,
}: BottomNavProps) {
  const insets = useSafeAreaInsets();
  if (hidden) return null;

  const bottomOffset = aboveQuickAccess
    ? insets.bottom + bottomChrome.gap + bottomChrome.quickAccessHeight + bottomChrome.gap
    : insets.bottom + bottomChrome.gap;

  return (
    <View style={[styles.navWrap, { bottom: bottomOffset }]}>
      <GlassPanel style={styles.navBar} rounded="xl" elevated>
        <NavBtn icon="locate-outline" active={activeTab === "location"} onPress={onLocation} />
        <NavBtn icon="map-outline" active={activeTab === "explore"} onPress={onExplore} filled />
        <NavBtn icon="layers-outline" active={activeTab === "layers"} onPress={onLayers} />
        <NavBtn
          icon="git-branch-outline"
          active={activeTab === "routes"}
          onPress={onRoutes}
          disabled={!hasRoutes}
        />
      </GlassPanel>
    </View>
  );
}

function NavBtn({
  icon,
  active,
  onPress,
  filled,
  disabled,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  active?: boolean;
  onPress: () => void;
  filled?: boolean;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.navBtn,
        active && styles.navBtnActive,
        filled && active && styles.navBtnFilled,
        disabled && styles.navBtnDisabled,
      ]}
      activeOpacity={0.85}
    >
      <Ionicons
        name={icon}
        size={22}
        color={
          active
            ? filled
              ? colors.onPrimaryContainer
              : colors.primary
            : colors.onSurfaceVariant
        }
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fabColumn: {
    position: "absolute",
    right: spacing.safe,
    zIndex: 45,
    gap: bottomChrome.fabGap,
    alignItems: "center",
  },
  fab: {
    width: bottomChrome.fabSize,
    height: bottomChrome.fabSize,
    alignItems: "center",
    justifyContent: "center",
  },
  fabActive: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  fabAccent: {
    backgroundColor: colors.secondaryContainer,
  },
  primaryFab: {
    width: bottomChrome.primaryFabSize,
    height: bottomChrome.primaryFabSize,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.lg,
  },
  navWrap: {
    position: "absolute",
    left: spacing.safe,
    right: spacing.safe,
    zIndex: 51,
    alignItems: "center",
  },
  navBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 8,
    width: "100%",
    maxWidth: 420,
    minHeight: bottomChrome.bottomNavHeight,
  },
  navBtn: {
    padding: 12,
    borderRadius: radius.md,
    minWidth: 48,
    alignItems: "center",
  },
  navBtnActive: {
    backgroundColor: colors.surfaceContainerHigh,
  },
  navBtnFilled: {
    backgroundColor: colors.primaryContainer,
  },
  navBtnDisabled: {
    opacity: 0.35,
  },
});
