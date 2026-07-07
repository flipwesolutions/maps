import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import type { RouteStep } from "../lib/routing";
import { formatDistance } from "../lib/routing";

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
  if (steps.length === 0) return null;

  const current = steps[currentStepIndex];

  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {isNavigating ? "Navigating" : "Turn-by-turn"}
        </Text>
        <TouchableOpacity
          onPress={isNavigating ? onStop : onStart}
          style={[styles.actionBtn, isNavigating && styles.stopBtn]}
        >
          <Text style={styles.actionText}>
            {isNavigating ? "Stop" : "Start navigation"}
          </Text>
        </TouchableOpacity>
      </View>

      {current && (
        <View style={styles.currentStep}>
          <Text style={styles.currentStepNum}>
            Step {currentStepIndex + 1} of {steps.length}
          </Text>
          <Text style={styles.currentInstruction}>{current.instruction}</Text>
          <Text style={styles.currentDistance}>
            {formatDistance(current.distanceMeters)}
          </Text>
          {isNavigating && (
            <Text style={styles.navHint}>
              Direction arrow follows your drive · voice · auto-reroute
            </Text>
          )}
          {!isNavigating && (
            <Text style={styles.navHint}>
              Start for voice turns, live ETA, and rerouting
            </Text>
          )}
        </View>
      )}

      <ScrollView style={styles.list} nestedScrollEnabled>
        {steps.map((step, index) => {
          const active = index === currentStepIndex && isNavigating;
          const done = isNavigating && index < currentStepIndex;
          return (
            <View
              key={`${step.location[0]}-${step.location[1]}-${index}`}
              style={[
                styles.stepRow,
                active && styles.stepRowActive,
                done && styles.stepRowDone,
              ]}
            >
              <View style={[styles.stepDot, active && styles.stepDotActive]}>
                <Text style={styles.stepNum}>{index + 1}</Text>
              </View>
              <View style={styles.stepText}>
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
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 20,
    maxHeight: 280,
    elevation: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A2E",
  },
  actionBtn: {
    backgroundColor: "#2563EB",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  stopBtn: {
    backgroundColor: "#EF4444",
  },
  actionText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  currentStep: {
    backgroundColor: "#EFF6FF",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  currentStepNum: {
    fontSize: 11,
    fontWeight: "600",
    color: "#2563EB",
    marginBottom: 4,
  },
  currentInstruction: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1A1A2E",
  },
  currentDistance: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 4,
  },
  navHint: {
    fontSize: 11,
    color: "#16A34A",
    marginTop: 6,
    fontWeight: "600",
  },
  list: {
    maxHeight: 140,
  },
  stepRow: {
    flexDirection: "row",
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F4EF",
  },
  stepRowActive: {
    backgroundColor: "#F8FAFC",
  },
  stepRowDone: {
    opacity: 0.5,
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#E5E4E0",
    alignItems: "center",
    justifyContent: "center",
  },
  stepDotActive: {
    backgroundColor: "#2563EB",
  },
  stepNum: {
    fontSize: 10,
    fontWeight: "700",
    color: "#1A1A2E",
  },
  stepText: { flex: 1 },
  stepInstruction: {
    fontSize: 13,
    fontWeight: "500",
    color: "#1A1A2E",
  },
  stepDoneText: {
    textDecorationLine: "line-through",
  },
  stepDistance: {
    fontSize: 11,
    color: "#9C9CAA",
    marginTop: 2,
  },
});
