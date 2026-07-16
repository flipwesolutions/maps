import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  PanResponder,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { RouteStep } from "../lib/routing";
import { formatDistance } from "../lib/routing";
import GlassPanel from "./ui/GlassPanel";
import { colors, spacing, radius, typography, shadow } from "../lib/theme";

const SCREEN_H = Dimensions.get("window").height;
const EXPANDED_HEIGHT = Math.round(SCREEN_H * 0.46);
const COLLAPSED_HEIGHT = 200;
const DRAG_ZONE = 72;

interface TurnByTurnPanelProps {
  steps: RouteStep[];
  currentStepIndex: number;
  isNavigating: boolean;
  routeSummary?: string | null;
  onStart: () => void;
  onStop: () => void;
  onDismiss?: () => void;
  onSnapChange?: (expanded: boolean) => void;
}

export default function TurnByTurnPanel({
  steps,
  currentStepIndex,
  isNavigating,
  routeSummary,
  onStart,
  onStop,
  onDismiss,
  onSnapChange,
}: TurnByTurnPanelProps) {
  const insets = useSafeAreaInsets();
  const expandedHeight = EXPANDED_HEIGHT + insets.bottom;
  const collapsedHeight = COLLAPSED_HEIGHT + insets.bottom;
  const collapseOffset = expandedHeight - collapsedHeight;

  const translateY = useRef(new Animated.Value(0)).current;
  const dragY = useRef(0);
  const [expanded, setExpanded] = useState(true);

  const snapTo = useCallback(
    (toExpanded: boolean, velocity = 0) => {
      const target = toExpanded ? 0 : collapseOffset;
      setExpanded(toExpanded);
      onSnapChange?.(toExpanded);

      Animated.spring(translateY, {
        toValue: target,
        useNativeDriver: true,
        tension: 68,
        friction: 12,
        velocity: velocity * 0.35,
      }).start(({ finished }) => {
        if (finished) dragY.current = target;
      });
    },
    [collapseOffset, onSnapChange, translateY]
  );

  useEffect(() => {
    translateY.setValue(0);
    dragY.current = 0;
    setExpanded(true);
    onSnapChange?.(true);
  }, [steps.length, onSnapChange, translateY]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) =>
          Math.abs(g.dy) > 6 && Math.abs(g.dy) > Math.abs(g.dx),
        onPanResponderGrant: () => {
          translateY.stopAnimation((v) => {
            dragY.current = v;
          });
        },
        onPanResponderMove: (_, g) => {
          const next = Math.min(
            collapseOffset,
            Math.max(0, dragY.current + g.dy)
          );
          translateY.setValue(next);
        },
        onPanResponderRelease: (_, g) => {
          const finalY = Math.min(
            collapseOffset,
            Math.max(0, dragY.current + g.dy)
          );
          let toExpanded = finalY < collapseOffset * 0.45;
          if (g.vy > 0.55) toExpanded = false;
          if (g.vy < -0.55) toExpanded = true;
          snapTo(toExpanded, g.vy);
        },
      }),
    [collapseOffset, snapTo, translateY]
  );

  if (steps.length === 0) return null;

  const current = steps[currentStepIndex];

  return (
    <Animated.View
      style={[
        styles.wrap,
        {
          height: expandedHeight,
          paddingBottom: insets.bottom + 12,
          transform: [{ translateY }],
        },
      ]}
    >
      <GlassPanel style={styles.panel} rounded="sheet" elevated>
        <View {...panResponder.panHandlers} style={styles.dragZone}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => snapTo(!expanded)}
            style={styles.handleTouch}
          >
            <View style={styles.handle} />
            <Text style={styles.handleHint}>
              {expanded ? "Swipe down to minimize" : "Swipe up for full route"}
            </Text>
          </TouchableOpacity>

          <View style={styles.header}>
            <View style={styles.headerLeft}>
              {onDismiss && !isNavigating && (
                <TouchableOpacity
                  onPress={onDismiss}
                  style={styles.backBtn}
                  activeOpacity={0.85}
                >
                  <Ionicons name="chevron-back" size={22} color={colors.onSurface} />
                </TouchableOpacity>
              )}
              <View style={styles.headerText}>
                <Text style={styles.headerTitle}>Route overview</Text>
                <Text style={styles.headerSub} numberOfLines={1}>
                  {routeSummary ??
                    `${steps.length} steps · step ${currentStepIndex + 1} of ${steps.length}`}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={isNavigating ? onStop : onStart}
              style={[styles.actionBtn, isNavigating && styles.stopBtn]}
              activeOpacity={0.88}
            >
              <Ionicons
                name={isNavigating ? "stop" : "play"}
                size={18}
                color={colors.onPrimary}
              />
              <Text style={styles.actionText}>
                {isNavigating ? "Stop" : "Start"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {current && (
          <View style={styles.currentStep}>
            <Text style={styles.currentBadge}>NEXT</Text>
            <Text style={styles.currentInstruction} numberOfLines={expanded ? 3 : 2}>
              {current.instruction}
            </Text>
            <Text style={styles.currentDistance}>
              {formatDistance(current.distanceMeters)}
            </Text>
          </View>
        )}

        {expanded && (
          <>
            <Text style={styles.listLabel}>All directions</Text>
            <ScrollView
              style={styles.list}
              contentContainerStyle={styles.listContent}
              nestedScrollEnabled
              showsVerticalScrollIndicator
              scrollEventThrottle={16}
            >
              {steps.map((step, index) => {
                const active = index === currentStepIndex && isNavigating;
                const done = isNavigating && index < currentStepIndex;
                const isLast = index === steps.length - 1;
                return (
                  <View
                    key={`${step.location[0]}-${step.location[1]}-${index}`}
                    style={styles.stepRow}
                  >
                    <View style={styles.timeline}>
                      <View
                        style={[
                          styles.stepDot,
                          active && styles.stepDotActive,
                          done && styles.stepDotDone,
                        ]}
                      >
                        <Text
                          style={[styles.stepNum, (active || done) && styles.stepNumLight]}
                        >
                          {index + 1}
                        </Text>
                      </View>
                      {!isLast && (
                        <View
                          style={[styles.timelineLine, done && styles.timelineLineDone]}
                        />
                      )}
                    </View>
                    <View
                      style={[
                        styles.stepCard,
                        active && styles.stepCardActive,
                        done && styles.stepCardDone,
                      ]}
                    >
                      <Text style={[styles.stepInstruction, done && styles.stepDoneText]}>
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
          </>
        )}

        {!expanded && (
          <TouchableOpacity
            style={styles.expandBtn}
            onPress={() => snapTo(true)}
            activeOpacity={0.88}
          >
            <Text style={styles.expandBtnText}>View all {steps.length} steps</Text>
            <Ionicons name="chevron-up" size={18} color={colors.primary} />
          </TouchableOpacity>
        )}
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
  panel: {
    flex: 1,
    paddingHorizontal: spacing.panel,
    paddingTop: 8,
  },
  dragZone: {
    minHeight: DRAG_ZONE,
  },
  handleTouch: {
    alignItems: "center",
    paddingBottom: 8,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.outlineVariant,
    marginBottom: 6,
  },
  handleHint: {
    ...typography.labelMd,
    color: colors.outline,
    fontSize: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
    marginRight: 8,
  },
  headerText: {
    flex: 1,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    ...typography.headlineMd,
    fontSize: 18,
    color: colors.onSurface,
  },
  headerSub: {
    ...typography.bodyMd,
    color: colors.outline,
    marginTop: 2,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 10,
    ...shadow.sm,
  },
  stopBtn: {
    backgroundColor: colors.error,
  },
  actionText: {
    color: colors.onPrimary,
    fontSize: 14,
    fontWeight: "800",
  },
  currentStep: {
    backgroundColor: colors.secondaryContainer,
    borderRadius: radius.lg,
    padding: spacing.stack,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.primaryFixedDim,
  },
  currentBadge: {
    ...typography.labelLg,
    color: colors.primary,
    marginBottom: 6,
  },
  currentInstruction: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.onSurface,
    lineHeight: 21,
  },
  currentDistance: {
    fontSize: 13,
    color: colors.primaryDark,
    marginTop: 4,
    fontWeight: "600",
  },
  listLabel: {
    ...typography.labelLg,
    color: colors.outline,
    marginBottom: 8,
  },
  list: { flex: 1 },
  listContent: { paddingBottom: 8 },
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
    backgroundColor: colors.surfaceContainer,
    borderWidth: 2,
    borderColor: colors.outlineVariant,
    alignItems: "center",
    justifyContent: "center",
  },
  stepDotActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  stepDotDone: {
    backgroundColor: colors.primaryContainer,
    borderColor: colors.primaryContainer,
  },
  stepNum: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.onSurfaceVariant,
  },
  stepNumLight: { color: colors.onPrimary },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: colors.outlineVariant,
    marginVertical: 4,
    minHeight: 12,
  },
  timelineLineDone: {
    backgroundColor: colors.primaryFixedDim,
  },
  stepCard: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 6,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceContainerLow,
  },
  stepCardActive: {
    backgroundColor: colors.secondaryContainer,
    borderWidth: 1,
    borderColor: colors.primaryFixedDim,
  },
  stepCardDone: { opacity: 0.55 },
  stepInstruction: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.onSurface,
    lineHeight: 19,
  },
  stepDoneText: {
    textDecorationLine: "line-through",
    color: colors.outline,
  },
  stepDistance: {
    fontSize: 12,
    color: colors.outline,
    marginTop: 3,
  },
  expandBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    marginTop: 4,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceContainerLow,
  },
  expandBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.primary,
  },
});
