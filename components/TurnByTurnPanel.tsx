import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { RouteStep } from "../lib/routing";
import { formatDistance } from "../lib/routing";
import { colors, shadow } from "../lib/theme";

const PANEL_HEIGHT = Math.round(Dimensions.get("window").height * 0.44);

interface TurnByTurnPanelProps {
  steps: RouteStep[];
  currentStepIndex: number;
  isNavigating: boolean;
  onStart: () => void;
  onStop: () => void;
}

export default function TurnByTurnPanel({
  steps,
  currentStepIndex,
  isNavigating,
  onStart,
  onStop,
}: TurnByTurnPanelProps) {
  const insets = useSafeAreaInsets();

  if (steps.length === 0) return null;

  const current = steps[currentStepIndex];

  return (
    <View
      style={[
        styles.panel,
        { height: PANEL_HEIGHT + insets.bottom, paddingBottom: insets.bottom + 12 },
      ]}
    >
      <View style={styles.handle} />

      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Route overview</Text>
          <Text style={styles.headerSub}>
            {steps.length} steps · step {currentStepIndex + 1} highlighted
          </Text>
        </View>
        <TouchableOpacity
          onPress={isNavigating ? onStop : onStart}
          style={[styles.actionBtn, isNavigating && styles.stopBtn]}
          activeOpacity={0.88}
        >
          <Text style={styles.actionText}>
            {isNavigating ? "Stop" : "Start"}
          </Text>
        </TouchableOpacity>
      </View>

      {current && (
        <View style={styles.currentStep}>
          <View style={styles.currentBadge}>
            <Text style={styles.currentBadgeText}>NEXT</Text>
          </View>
          <Text style={styles.currentInstruction}>{current.instruction}</Text>
          <Text style={styles.currentDistance}>
            {formatDistance(current.distanceMeters)}
          </Text>
        </View>
      )}

      <Text style={styles.listLabel}>All directions</Text>

      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        nestedScrollEnabled
        showsVerticalScrollIndicator
        keyboardShouldPersistTaps="handled"
      >
        {steps.map((step, index) => {
          const active = index === currentStepIndex && isNavigating;
          const done = isNavigating && index < currentStepIndex;
          const isLast = index === steps.length - 1;
          return (
            <View key={`${step.location[0]}-${step.location[1]}-${index}`} style={styles.stepRow}>
              <View style={styles.timeline}>
                <View
                  style={[
                    styles.stepDot,
                    active && styles.stepDotActive,
                    done && styles.stepDotDone,
                  ]}
                >
                  <Text
                    style={[
                      styles.stepNum,
                      (active || done) && styles.stepNumLight,
                    ]}
                  >
                    {index + 1}
                  </Text>
                </View>
                {!isLast && <View style={[styles.timelineLine, done && styles.timelineLineDone]} />}
              </View>
              <View
                style={[
                  styles.stepCard,
                  active && styles.stepCardActive,
                  done && styles.stepCardDone,
                ]}
              >
                <Text
                  style={[styles.stepInstruction, done && styles.stepDoneText]}
                >
                  {step.instruction}
                </Text>
                <Text style={styles.stepDistance}>
                  {formatDistance(step.distanceMeters)}
                </Text>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 18,
    paddingTop: 8,
    zIndex: 25,
    ...shadow.lg,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: "center",
    marginBottom: 14,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
    fontWeight: "500",
  },
  actionBtn: {
    backgroundColor: colors.nav,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 10,
    ...shadow.sm,
  },
  stopBtn: {
    backgroundColor: colors.danger,
  },
  actionText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
  },
  currentStep: {
    backgroundColor: colors.primaryLight,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#99F6E4",
  },
  currentBadge: {
    alignSelf: "flex-start",
    backgroundColor: colors.primary,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 6,
  },
  currentBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.6,
  },
  currentInstruction: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    lineHeight: 22,
  },
  currentDistance: {
    fontSize: 13,
    color: colors.primaryDark,
    marginTop: 4,
    fontWeight: "600",
  },
  listLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 8,
  },
  stepRow: {
    flexDirection: "row",
    gap: 10,
    minHeight: 56,
  },
  timeline: {
    width: 28,
    alignItems: "center",
  },
  stepDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.borderLight,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  stepDotActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  stepDotDone: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  stepNum: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.textSecondary,
  },
  stepNumLight: {
    color: "#fff",
  },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: colors.border,
    marginVertical: 4,
    minHeight: 12,
  },
  timelineLineDone: {
    backgroundColor: "#86EFAC",
  },
  stepCard: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 6,
    borderRadius: 12,
    backgroundColor: colors.borderLight,
  },
  stepCardActive: {
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#6EE7B7",
  },
  stepCardDone: {
    opacity: 0.55,
  },
  stepInstruction: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    lineHeight: 19,
  },
  stepDoneText: {
    textDecorationLine: "line-through",
    color: colors.textMuted,
  },
  stepDistance: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 3,
    fontWeight: "500",
  },
});
