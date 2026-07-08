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
import { colors, shadow } from "../lib/theme";

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
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => onSelect(index)}
              activeOpacity={0.85}
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
    top: 10,
    left: 10,
    right: 10,
    zIndex: 10,
  },
  wrapNav: {
    top: undefined,
    bottom: 100,
  },
  row: {
    gap: 8,
    paddingRight: 8,
  },
  chip: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    minWidth: 118,
    borderWidth: 2,
    borderColor: colors.border,
    ...shadow.sm,
  },
  chipActive: {
    backgroundColor: colors.nav,
    borderColor: colors.nav,
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
    color: colors.text,
  },
  timeActive: {
    color: "#fff",
  },
  dist: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  distActive: {
    color: "rgba(255,255,255,0.85)",
  },
  badge: {
    backgroundColor: "#DCFCE7",
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#15803D",
  },
  altBadge: {
    backgroundColor: "#F3F4F6",
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  altBadgeText: {
    fontSize: 9,
    fontWeight: "600",
    color: "#6B7280",
  },
});
