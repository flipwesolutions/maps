import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import type { RouteResult } from "../lib/routing";
import { formatDistance, formatDuration } from "../lib/routing";
import GlassPanel from "./ui/GlassPanel";
import { colors, radius, spacing } from "../lib/theme";

interface RouteOptionsPanelProps {
  routes: RouteResult[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  navMode?: boolean;
}

export default function RouteOptionsPanel({
  routes,
  selectedIndex,
  onSelect,
  navMode = false,
}: RouteOptionsPanelProps) {
  if (routes.length === 0) return null;

  return (
    <View
      style={[styles.wrap, navMode && styles.wrapNav]}
      pointerEvents="box-none"
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {routes.map((route, index) => {
          const active = index === selectedIndex;
          const isFastest = index === 0;
          const badgeLabel =
            route.label ?? (isFastest ? "Fastest" : `Route ${String.fromCharCode(65 + index)}`);
          return (
            <TouchableOpacity
              key={index}
              onPress={() => onSelect(index)}
              activeOpacity={0.88}
            >
              <GlassPanel
                style={[styles.chip, active && styles.chipActive]}
                rounded="xl"
                elevated
              >
                <View style={styles.chipTop}>
                  <Text style={[styles.time, active && styles.timeActive]}>
                    {formatDuration(route.durationSeconds)}
                  </Text>
                  <View style={[styles.badge, !isFastest && styles.altBadge]}>
                    <Text style={[styles.badgeText, !isFastest && styles.altBadgeText]}>
                      {badgeLabel}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.dist, active && styles.distActive]}>
                  {formatDistance(route.distanceMeters)}
                </Text>
              </GlassPanel>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    top: spacing.safe + 72,
    left: spacing.safe,
    right: spacing.safe,
    zIndex: 30,
  },
  wrapNav: {
    top: undefined,
    bottom: 120,
  },
  row: {
    gap: 8,
    paddingRight: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    minWidth: 118,
    borderWidth: 2,
    borderColor: colors.outlineVariant,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  time: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.onSurface,
  },
  timeActive: { color: colors.onPrimary },
  dist: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    fontWeight: "600",
  },
  distActive: { color: "rgba(255,255,255,0.9)" },
  badge: {
    backgroundColor: colors.secondaryContainer,
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: colors.primaryDark,
  },
  altBadge: {
    backgroundColor: colors.surfaceContainerHigh,
  },
  altBadgeText: {
    color: colors.outline,
  },
});
