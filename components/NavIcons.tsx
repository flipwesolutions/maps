import React from "react";
import { View, StyleSheet } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import Feather from "@expo/vector-icons/Feather";
import type { RouteStep } from "../lib/routing";
import { maneuverIcon, type ManeuverIcon } from "../lib/maneuvers";

const ICON_DARK = "#1f2937";
const ICON_MUTED = "#6b7280";
const ICON_WHITE = "#ffffff";
const ICON_GREEN = "#0d5c47";
const COMPASS_RED = "#ea4335";

type IconSize = "sm" | "md" | "lg" | "xl";

const SIZES: Record<IconSize, number> = {
  sm: 18,
  md: 22,
  lg: 28,
  xl: 40,
};

export function CloseIcon({
  size = "md" as IconSize,
  color = ICON_DARK,
}: {
  size?: IconSize;
  color?: string;
}) {
  return <Feather name="x" size={SIZES[size]} color={color} />;
}

export function RoutesIcon({
  size = "md" as IconSize,
  color = ICON_DARK,
}: {
  size?: IconSize;
  color?: string;
}) {
  return (
    <MaterialCommunityIcons
      name="routes"
      size={SIZES[size]}
      color={color}
    />
  );
}

/** Google Maps–style route overview / fork icon for bottom bar. */
export function RouteOverviewIcon({
  size = "md" as IconSize,
  color = ICON_DARK,
}: {
  size?: IconSize;
  color?: string;
}) {
  return (
    <View style={routeOverviewStyles.wrap}>
      <View style={[routeOverviewStyles.stem, { backgroundColor: color }]} />
      <View style={[routeOverviewStyles.forkLeft, { backgroundColor: color }]} />
      <View style={[routeOverviewStyles.forkRight, { backgroundColor: color }]} />
    </View>
  );
}

const routeOverviewStyles = StyleSheet.create({
  wrap: {
    width: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  stem: {
    position: "absolute",
    bottom: 2,
    width: 3,
    height: 10,
    borderRadius: 2,
  },
  forkLeft: {
    position: "absolute",
    top: 4,
    left: 4,
    width: 10,
    height: 3,
    borderRadius: 2,
    transform: [{ rotate: "-38deg" }],
  },
  forkRight: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 10,
    height: 3,
    borderRadius: 2,
    transform: [{ rotate: "38deg" }],
  },
});

export function SearchIcon({
  size = "md" as IconSize,
  color = ICON_DARK,
}: {
  size?: IconSize;
  color?: string;
}) {
  return <Feather name="search" size={SIZES[size]} color={color} />;
}

export function VolumeOnIcon({
  size = "md" as IconSize,
  color = ICON_DARK,
}: {
  size?: IconSize;
  color?: string;
}) {
  return (
    <Ionicons name="volume-high-outline" size={SIZES[size]} color={color} />
  );
}

export function VolumeOffIcon({
  size = "md" as IconSize,
  color = ICON_DARK,
}: {
  size?: IconSize;
  color?: string;
}) {
  return (
    <Ionicons name="volume-mute-outline" size={SIZES[size]} color={color} />
  );
}

export function RerouteIcon({
  size = "lg" as IconSize,
  color = ICON_WHITE,
}: {
  size?: IconSize;
  color?: string;
}) {
  return (
    <MaterialCommunityIcons
      name="sync"
      size={SIZES[size]}
      color={color}
    />
  );
}

export function ArrivedIcon({
  size = "xl" as IconSize,
  color = ICON_WHITE,
}: {
  size?: IconSize;
  color?: string;
}) {
  return (
    <MaterialCommunityIcons
      name="flag-checkered"
      size={SIZES[size]}
      color={color}
    />
  );
}

/** Google Maps–style compass with north needle; rotates with map bearing. */
export function CompassFabIcon({
  mapBearing,
  northUp,
  size = "md",
}: {
  mapBearing: number;
  northUp: boolean;
  size?: IconSize;
}) {
  const needleRotation = northUp ? 0 : -mapBearing;

  return (
    <View style={styles.compassWrap}>
      <MaterialCommunityIcons
        name="compass-outline"
        size={SIZES[size]}
        color={northUp ? ICON_GREEN : ICON_DARK}
      />
      <View
        style={[
          styles.compassNeedle,
          { transform: [{ rotate: `${needleRotation}deg` }] },
        ]}
      >
        <View style={styles.compassNeedleNorth} />
        <View style={styles.compassNeedleSouth} />
      </View>
    </View>
  );
}

const MANEUVER_CONFIG: Record<
  ManeuverIcon,
  { name: React.ComponentProps<typeof MaterialCommunityIcons>["name"]; rotate?: number }
> = {
  depart: { name: "arrow-up-bold" },
  straight: { name: "arrow-up-bold" },
  arrive: { name: "flag-checkered" },
  left: { name: "arrow-left-bold" },
  right: { name: "arrow-right-bold" },
  "slight-left": { name: "arrow-up-left-bold" },
  "slight-right": { name: "arrow-up-right-bold" },
  "sharp-left": { name: "arrow-left-bold", rotate: -15 },
  "sharp-right": { name: "arrow-right-bold", rotate: 15 },
  "u-turn": { name: "arrow-u-left-top" },
  roundabout: { name: "rotate-right" },
  merge: { name: "call-merge" },
  fork: { name: "source-fork" },
};

export function ManeuverIconView({
  step,
  size = "xl",
  color = ICON_WHITE,
}: {
  step?: RouteStep;
  size?: IconSize;
  color?: string;
}) {
  const kind = step ? maneuverIcon(step) : "straight";
  const config = MANEUVER_CONFIG[kind];
  const iconSize = SIZES[size];

  return (
    <View
      style={[
        styles.maneuverWrap,
        { width: iconSize + 8, height: iconSize + 8 },
        config.rotate != null && {
          transform: [{ rotate: `${config.rotate}deg` }],
        },
      ]}
    >
      <MaterialCommunityIcons
        name={config.name}
        size={iconSize}
        color={color}
      />
    </View>
  );
}

export function StepManeuverIcon({
  step,
  color = ICON_GREEN,
}: {
  step: RouteStep;
  color?: string;
}) {
  return <ManeuverIconView step={step} size="md" color={color} />;
}

const styles = StyleSheet.create({
  compassWrap: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  compassNeedle: {
    position: "absolute",
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  compassNeedleNorth: {
    position: "absolute",
    top: 3,
    width: 3,
    height: 9,
    borderRadius: 1,
    backgroundColor: COMPASS_RED,
  },
  compassNeedleSouth: {
    position: "absolute",
    bottom: 3,
    width: 3,
    height: 7,
    borderRadius: 1,
    backgroundColor: "#9ca3af",
  },
  maneuverWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
});
