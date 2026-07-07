import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import type { RouteStep } from "../lib/routing";
import { formatDistance, formatDuration } from "../lib/routing";
import { formatEtaTime } from "../lib/navigation";
import {
  formatManeuverDistance,
  maneuverGlyph,
  shortInstruction,
} from "../lib/maneuvers";

interface NavigationBannerProps {
  steps: RouteStep[];
  currentStepIndex: number;
  distanceToManeuverMeters: number;
  remainingDistanceMeters: number;
  remainingDurationSeconds: number;
  etaMs: number;
  isRerouting: boolean;
  hasArrived: boolean;
  onStop: () => void;
  onExpandSteps?: () => void;
  showStepList: boolean;
}

export default function NavigationBanner({
  steps,
  currentStepIndex,
  distanceToManeuverMeters,
  remainingDistanceMeters,
  remainingDurationSeconds,
  etaMs,
  isRerouting,
  hasArrived,
  onStop,
  onExpandSteps,
  showStepList,
}: NavigationBannerProps) {
  const current = steps[currentStepIndex];
  const next = steps[currentStepIndex + 1];

  if (hasArrived) {
    return (
      <View style={styles.wrap}>
        <View style={[styles.banner, styles.arrivedBanner]}>
          <Text style={styles.arrivedIcon}>🏁</Text>
          <View style={styles.bannerText}>
            <Text style={styles.arrivedTitle}>You've arrived</Text>
            <Text style={styles.arrivedSub}>Destination reached</Text>
          </View>
          <TouchableOpacity onPress={onStop} style={styles.stopBtn}>
            <Text style={styles.stopText}>End</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.banner}>
        {isRerouting ? (
          <View style={styles.rerouteRow}>
            <Text style={styles.rerouteSpinner}>⟳</Text>
            <Text style={styles.rerouteText}>Rerouting…</Text>
          </View>
        ) : (
          <>
            <View style={styles.maneuverIcon}>
              <Text style={styles.maneuverGlyph}>
                {current ? maneuverGlyph(current) : "↑"}
              </Text>
            </View>
            <View style={styles.bannerText}>
              <Text style={styles.distance}>
                {formatManeuverDistance(distanceToManeuverMeters)}
              </Text>
              <Text style={styles.instruction} numberOfLines={2}>
                {current
                  ? shortInstruction(current)
                  : "Continue on route"}
              </Text>
              {next && next.type !== "arrive" && (
                <Text style={styles.thenText} numberOfLines={1}>
                  Then {shortInstruction(next).toLowerCase()}
                </Text>
              )}
            </View>
          </>
        )}
        <TouchableOpacity onPress={onStop} style={styles.stopBtn}>
          <Text style={styles.stopText}>Exit</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsBar}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>
            {formatDuration(remainingDurationSeconds)}
          </Text>
          <Text style={styles.statLabel}>min</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={styles.statValue}>
            {formatDistance(remainingDistanceMeters)}
          </Text>
          <Text style={styles.statLabel}>left</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={styles.statValue}>{formatEtaTime(etaMs)}</Text>
          <Text style={styles.statLabel}>ETA</Text>
        </View>
        {onExpandSteps && (
          <TouchableOpacity onPress={onExpandSteps} style={styles.stepsToggle}>
            <Text style={styles.stepsToggleText}>
              {showStepList ? "▲" : "▼"} Steps
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {showStepList && (
        <ScrollView style={styles.stepList} nestedScrollEnabled>
          {steps.map((step, index) => {
            const active = index === currentStepIndex;
            const done = index < currentStepIndex;
            return (
              <View
                key={`${step.location[0]}-${index}`}
                style={[styles.stepRow, active && styles.stepRowActive]}
              >
                <Text style={styles.stepGlyph}>{maneuverGlyph(step)}</Text>
                <View style={styles.stepBody}>
                  <Text
                    style={[
                      styles.stepInstruction,
                      done && styles.stepDone,
                    ]}
                  >
                    {step.instruction}
                  </Text>
                  <Text style={styles.stepMeta}>
                    {formatDistance(step.distanceMeters)}
                  </Text>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    paddingHorizontal: 8,
    paddingTop: 4,
  },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1e293b",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12,
    elevation: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  arrivedBanner: {
    backgroundColor: "#14532d",
  },
  maneuverIcon: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: "#334155",
    alignItems: "center",
    justifyContent: "center",
  },
  maneuverGlyph: {
    fontSize: 28,
    color: "#fff",
    fontWeight: "700",
  },
  bannerText: { flex: 1 },
  distance: {
    fontSize: 28,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -0.5,
  },
  instruction: {
    fontSize: 15,
    fontWeight: "600",
    color: "#e2e8f0",
    marginTop: 2,
  },
  thenText: {
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 4,
  },
  rerouteRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  rerouteSpinner: {
    fontSize: 24,
    color: "#fbbf24",
  },
  rerouteText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fbbf24",
  },
  stopBtn: {
    backgroundColor: "#ef4444",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  stopText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  statsBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    marginTop: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    elevation: 8,
  },
  stat: { flex: 1, alignItems: "center" },
  statValue: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1e293b",
  },
  statLabel: {
    fontSize: 10,
    color: "#64748b",
    fontWeight: "600",
    marginTop: 2,
    textTransform: "uppercase",
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: "#e2e8f0",
  },
  stepsToggle: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  stepsToggleText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2563eb",
  },
  stepList: {
    maxHeight: 160,
    backgroundColor: "#fff",
    borderRadius: 12,
    marginTop: 6,
    paddingHorizontal: 8,
    elevation: 6,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  stepRowActive: { backgroundColor: "#eff6ff" },
  stepGlyph: { fontSize: 18, width: 28, textAlign: "center" },
  stepBody: { flex: 1 },
  stepInstruction: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1e293b",
  },
  stepDone: {
    color: "#94a3b8",
    textDecorationLine: "line-through",
  },
  stepMeta: { fontSize: 11, color: "#94a3b8", marginTop: 2 },
  arrivedIcon: { fontSize: 32 },
  arrivedTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#fff",
  },
  arrivedSub: {
    fontSize: 13,
    color: "#bbf7d0",
    marginTop: 2,
  },
});
