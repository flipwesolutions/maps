import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  Pressable,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { RouteStep } from "../lib/routing";
import { formatDistance, formatNavDuration } from "../lib/routing";
import { formatEtaTime } from "../lib/navigation";
import { formatManeuverDistance, streetLabel } from "../lib/maneuvers";
import { colors, shadow } from "../lib/theme";
import {
  ArrivedIcon,
  CloseIcon,
  CompassFabIcon,
  ManeuverIconView,
  RouteOverviewIcon,
  RerouteIcon,
  SearchIcon,
  StepManeuverIcon,
  VolumeOffIcon,
  VolumeOnIcon,
} from "./NavIcons";

const SHEET_HEIGHT = Math.round(Dimensions.get("window").height * 0.68);

interface NavigationUIProps {
  steps: RouteStep[];
  currentStepIndex: number;
  distanceToManeuverMeters: number;
  remainingDistanceMeters: number;
  remainingDurationSeconds: number;
  etaMs: number;
  isRerouting: boolean;
  hasArrived: boolean;
  voiceEnabled: boolean;
  northUp: boolean;
  mapBearing: number;
  userHeading: number;
  onStop: () => void;
  onToggleVoice: () => void;
  onToggleCompass: () => void;
  onShowRoutes?: () => void;
}

function FabButton({
  label,
  children,
  onPress,
  active,
}: {
  label: string;
  children: React.ReactNode;
  onPress: () => void;
  active?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.fab, active && styles.fabActive]}
      activeOpacity={0.82}
      accessibilityLabel={label}
    >
      {children}
    </TouchableOpacity>
  );
}

function CircleIconButton({
  children,
  onPress,
  disabled,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.circleBtn, disabled && styles.circleBtnDisabled]}
      disabled={disabled}
      activeOpacity={0.82}
    >
      {children}
    </TouchableOpacity>
  );
}

export default function NavigationUI({
  steps,
  currentStepIndex,
  distanceToManeuverMeters,
  remainingDistanceMeters,
  remainingDurationSeconds,
  etaMs,
  isRerouting,
  hasArrived,
  voiceEnabled,
  northUp,
  mapBearing,
  onStop,
  onToggleVoice,
  onToggleCompass,
  onShowRoutes,
}: NavigationUIProps) {
  const insets = useSafeAreaInsets();
  const [showSteps, setShowSteps] = React.useState(false);
  const [showSoundMenu, setShowSoundMenu] = React.useState(false);
  const stepsScrollRef = React.useRef<ScrollView>(null);

  const current = steps[currentStepIndex];
  const next = steps[currentStepIndex + 1];

  React.useEffect(() => {
    if (!showSteps || steps.length === 0) return;
    const timer = setTimeout(() => {
      stepsScrollRef.current?.scrollTo({
        y: Math.max(0, currentStepIndex * 72 - 40),
        animated: true,
      });
    }, 280);
    return () => clearTimeout(timer);
  }, [showSteps, currentStepIndex, steps.length]);

  if (hasArrived) {
    return (
      <View style={styles.overlay} pointerEvents="box-none">
        <View style={[styles.topWrap, { paddingTop: insets.top + 8 }]}>
          <View style={[styles.topCard, styles.arrivedCard]}>
            <ArrivedIcon />
            <View style={styles.topText}>
              <Text style={styles.arrivedTitle}>You've arrived</Text>
              <Text style={styles.arrivedSub}>Destination reached</Text>
            </View>
          </View>
        </View>
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 10 }]}>
          <CircleIconButton onPress={onStop}>
            <CloseIcon />
          </CircleIconButton>
          <View style={styles.bottomCenter}>
            <Text style={styles.etaLarge}>0 min</Text>
            <Text style={styles.etaSub}>Arrived</Text>
          </View>
          <View style={styles.circleBtnPlaceholder} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <View style={[styles.topWrap, { paddingTop: insets.top + 8 }]}>
        <View style={styles.topCard}>
          {isRerouting ? (
            <View style={styles.rerouteRow}>
              <RerouteIcon />
              <Text style={styles.rerouteText}>Rerouting…</Text>
            </View>
          ) : (
            <>
              <View style={styles.maneuverIconWrap}>
                <ManeuverIconView step={current} size="xl" color="#fff" />
              </View>
              <View style={styles.topText}>
                <Text style={styles.distanceText}>
                  {formatManeuverDistance(distanceToManeuverMeters)}
                </Text>
                <Text style={styles.streetText} numberOfLines={2}>
                  {current ? streetLabel(current) : "Continue"}
                </Text>
              </View>
            </>
          )}
        </View>

        {next && next.type !== "arrive" && !isRerouting && (
          <View style={styles.thenTab}>
            <Text style={styles.thenLabel}>Then</Text>
            <ManeuverIconView step={next} size="sm" color="#fff" />
          </View>
        )}
      </View>

      <View style={styles.fabColumn}>
        <FabButton
          label="Compass"
          onPress={onToggleCompass}
          active={northUp}
        >
          <CompassFabIcon mapBearing={mapBearing} northUp={northUp} />
        </FabButton>
        <FabButton label="Directions" onPress={() => setShowSteps(true)}>
          <SearchIcon />
        </FabButton>
        <FabButton
          label="Sound"
          onPress={() => setShowSoundMenu(true)}
          active={!voiceEnabled}
        >
          {voiceEnabled ? <VolumeOnIcon /> : <VolumeOffIcon />}
        </FabButton>
      </View>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 10 }]}>
        <View style={styles.bottomHandle} />
        <View style={styles.bottomRow}>
          <CircleIconButton onPress={onStop}>
            <CloseIcon />
          </CircleIconButton>

          <View style={styles.bottomCenter}>
            <Text style={styles.etaLarge}>
              {formatNavDuration(remainingDurationSeconds)}
            </Text>
            <Text style={styles.etaSub}>
              {formatDistance(remainingDistanceMeters)} · {formatEtaTime(etaMs)}
            </Text>
          </View>

          <CircleIconButton onPress={onShowRoutes} disabled={!onShowRoutes}>
            <RouteOverviewIcon
              color={onShowRoutes ? colors.textSecondary : colors.textMuted}
            />
          </CircleIconButton>
        </View>
      </View>

      <Modal visible={showSteps} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setShowSteps(false)}
          />
          <View
            style={[
              styles.stepsSheet,
              {
                height: SHEET_HEIGHT,
                paddingBottom: insets.bottom + 8,
              },
            ]}
          >
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>Directions</Text>
                <Text style={styles.sheetSubtitle}>
                  {steps.length} steps · swipe to scroll
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowSteps(false)}
                style={styles.sheetDismiss}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Text style={styles.sheetDismissText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              ref={stepsScrollRef}
              style={styles.stepsList}
              contentContainerStyle={styles.stepsListContent}
              nestedScrollEnabled
              showsVerticalScrollIndicator
              keyboardShouldPersistTaps="handled"
            >
              {steps.map((step, index) => (
                <View
                  key={`${step.location[0]}-${index}`}
                  style={[
                    styles.stepRow,
                    index === currentStepIndex && styles.stepRowActive,
                    index < currentStepIndex && styles.stepRowDone,
                  ]}
                >
                  <View
                    style={[
                      styles.stepIndex,
                      index === currentStepIndex && styles.stepIndexActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.stepIndexText,
                        index === currentStepIndex && styles.stepIndexTextActive,
                      ]}
                    >
                      {index + 1}
                    </Text>
                  </View>
                  <StepManeuverIcon step={step} />
                  <View style={styles.stepBody}>
                    <Text
                      style={[
                        styles.stepInstruction,
                        index < currentStepIndex && styles.stepInstructionDone,
                      ]}
                    >
                      {step.instruction}
                    </Text>
                    <Text style={styles.stepMeta}>
                      {formatDistance(step.distanceMeters)}
                    </Text>
                  </View>
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={styles.sheetClose}
              onPress={() => setShowSteps(false)}
              activeOpacity={0.88}
            >
              <Text style={styles.sheetCloseText}>Back to map</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showSoundMenu} transparent animationType="fade">
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setShowSoundMenu(false)}
        >
          <View style={[styles.soundMenu, { bottom: 120 + insets.bottom }]}>
            <Text style={styles.soundTitle}>Voice guidance</Text>
            <TouchableOpacity
              style={styles.soundOption}
              onPress={() => {
                if (!voiceEnabled) onToggleVoice();
                setShowSoundMenu(false);
              }}
              activeOpacity={0.85}
            >
              <VolumeOnIcon />
              <Text style={styles.soundOptionText}>On</Text>
              {voiceEnabled && (
                <Ionicons name="checkmark-circle" size={20} color={colors.nav} />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.soundOption}
              onPress={() => {
                if (voiceEnabled) onToggleVoice();
                setShowSoundMenu(false);
              }}
              activeOpacity={0.85}
            >
              <VolumeOffIcon />
              <Text style={styles.soundOptionText}>Muted</Text>
              {!voiceEnabled && (
                <Ionicons name="checkmark-circle" size={20} color={colors.nav} />
              )}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 30,
  },
  topWrap: {
    paddingHorizontal: 12,
  },
  topCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 14,
    ...shadow.lg,
  },
  arrivedCard: {
    backgroundColor: colors.primaryContainer,
  },
  maneuverIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  topText: { flex: 1 },
  distanceText: {
    fontSize: 34,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: -0.8,
    lineHeight: 38,
  },
  streetText: {
    fontSize: 17,
    fontWeight: "700",
    color: "rgba(255,255,255,0.95)",
    marginTop: 4,
    lineHeight: 22,
  },
  thenTab: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.primaryDark,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginLeft: 10,
    marginTop: -2,
  },
  thenLabel: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 13,
    fontWeight: "700",
  },
  rerouteRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
  },
  rerouteText: {
    fontSize: 22,
    fontWeight: "700",
    color: "#fff",
  },
  fabColumn: {
    position: "absolute",
    right: 14,
    top: "36%",
    gap: 12,
  },
  fab: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.md,
  },
  fabActive: {
    backgroundColor: colors.secondaryContainer,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
    paddingHorizontal: 16,
    ...shadow.lg,
  },
  bottomHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: "center",
    marginBottom: 10,
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 6,
  },
  circleBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.borderLight,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  circleBtnDisabled: {
    opacity: 0.4,
  },
  circleBtnPlaceholder: {
    width: 48,
    height: 48,
  },
  bottomCenter: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 8,
  },
  etaLarge: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.primary,
    letterSpacing: -0.6,
  },
  etaSub: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
    fontWeight: "600",
  },
  arrivedTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#fff",
  },
  arrivedSub: {
    fontSize: 14,
    color: "rgba(255,255,255,0.85)",
    marginTop: 2,
    fontWeight: "500",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.35)",
    justifyContent: "flex-end",
  },
  stepsSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    ...shadow.lg,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 4,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 10,
  },
  sheetTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.3,
  },
  sheetSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
    fontWeight: "500",
  },
  sheetDismiss: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.borderLight,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetDismissText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: "700",
  },
  stepsList: {
    flex: 1,
  },
  stepsListContent: {
    paddingHorizontal: 14,
    paddingBottom: 8,
  },
  stepRow: {
    flexDirection: "row",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 10,
    marginBottom: 6,
    borderRadius: 14,
    alignItems: "center",
    backgroundColor: colors.borderLight,
  },
  stepRowActive: {
    backgroundColor: colors.secondaryContainer,
    borderWidth: 1.5,
    borderColor: colors.primaryFixedDim,
  },
  stepRowDone: {
    opacity: 0.5,
  },
  stepIndex: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  stepIndexActive: {
    backgroundColor: colors.primary,
  },
  stepIndexText: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.textSecondary,
  },
  stepIndexTextActive: {
    color: "#fff",
  },
  stepBody: { flex: 1 },
  stepInstruction: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    lineHeight: 19,
  },
  stepInstructionDone: {
    textDecorationLine: "line-through",
    color: colors.textMuted,
  },
  stepMeta: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 3,
    fontWeight: "500",
  },
  sheetClose: {
    marginHorizontal: 20,
    marginTop: 8,
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    ...shadow.sm,
  },
  sheetCloseText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },
  soundMenu: {
    position: "absolute",
    right: 16,
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingVertical: 8,
    minWidth: 200,
    ...shadow.lg,
  },
  soundTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  soundOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  soundOptionText: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    fontWeight: "600",
  },
});
