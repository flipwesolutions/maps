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

interface RouteOptionsPanelProps {
  routes: RouteResult[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}

export default function RouteOptionsPanel({
  routes,
  selectedIndex,
  onSelect,
}: RouteOptionsPanelProps) {
  if (routes.length === 0) return null;

  return (
    <View style={styles.wrap} pointerEvents="box-none">
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
  row: {
    gap: 8,
    paddingRight: 8,
  },
  chip: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minWidth: 110,
    borderWidth: 1.5,
    borderColor: "#E5E4E0",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  chipActive: {
    backgroundColor: "#1A1A2E",
    borderColor: "#1A1A2E",
  },
  chipTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  time: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1A1A2E",
  },
  timeActive: {
    color: "#fff",
  },
  dist: {
    fontSize: 12,
    color: "#7C7C8A",
    fontWeight: "500",
  },
  distActive: {
    color: "#D1D5DB",
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
