import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { SearchPlace } from "../lib/geocoding";
import GlassPanel from "./ui/GlassPanel";
import { colors, spacing, radius, typography } from "../lib/theme";
import { bottomChrome } from "../lib/layout";

interface QuickAccessSheetProps {
  savedPlaces: SearchPlace[];
  recentPlace: SearchPlace | null;
  onSelect: (place: SearchPlace) => void;
  onRemoveSaved: (id: string) => void;
  hidden?: boolean;
}

export default function QuickAccessSheet({
  savedPlaces,
  recentPlace,
  onSelect,
  onRemoveSaved,
  hidden,
}: QuickAccessSheetProps) {
  const insets = useSafeAreaInsets();
  const [expanded, setExpanded] = useState(false);

  if (hidden) return null;

  const home = savedPlaces[0] ?? null;
  const work = savedPlaces[1] ?? null;

  const handleShortcut = (label: string, place: SearchPlace | null) => {
    if (place) {
      onSelect(place);
      return;
    }
    Alert.alert(
      `${label} not set`,
      `Save a place first — long-press a saved chip to remove it, or star a destination after searching.`
    );
  };

  return (
    <View style={[styles.wrap, { bottom: insets.bottom + bottomChrome.gap }]}>
      <GlassPanel style={styles.panel} rounded="xl">
        <View style={styles.row}>
          <ShortcutBtn
            icon="home-outline"
            label="Home"
            onPress={() => handleShortcut("Home", home)}
          />
          <ShortcutBtn
            icon="briefcase-outline"
            label="Work"
            onPress={() => handleShortcut("Work", work)}
          />
          <ShortcutBtn
            icon="time-outline"
            label="Recent"
            onPress={() => handleShortcut("Recent", recentPlace)}
            disabled={!recentPlace}
          />
          <ShortcutBtn
            icon="bookmark-outline"
            label="Saved"
            onPress={() => setExpanded((v) => !v)}
            active={expanded}
            badge={savedPlaces.length > 0 ? savedPlaces.length : undefined}
          />
        </View>

        {expanded && savedPlaces.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.savedRow}
          >
            {savedPlaces.map((place) => (
              <TouchableOpacity
                key={place.id}
                style={styles.savedChip}
                onPress={() => onSelect(place)}
                onLongPress={() => onRemoveSaved(place.id)}
                activeOpacity={0.85}
              >
                <Ionicons name="star" size={14} color={colors.primary} />
                <Text style={styles.savedName} numberOfLines={1}>
                  {place.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {expanded && savedPlaces.length === 0 && (
          <Text style={styles.emptySaved}>
            No saved places yet — tap ★ on a destination to save it
          </Text>
        )}
      </GlassPanel>
    </View>
  );
}

function ShortcutBtn({
  icon,
  label,
  onPress,
  active,
  disabled,
  badge,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  active?: boolean;
  disabled?: boolean;
  badge?: number;
}) {
  return (
    <TouchableOpacity
      style={[styles.shortcut, active && styles.shortcutActive, disabled && styles.shortcutDisabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
    >
      <View style={styles.iconWrap}>
        <Ionicons
          name={icon}
          size={20}
          color={active ? colors.primary : colors.onSurfaceVariant}
        />
        {badge != null && badge > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge > 9 ? "9+" : badge}</Text>
          </View>
        )}
      </View>
      <Text style={[styles.shortcutLabel, active && styles.shortcutLabelActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: spacing.safe,
    right: spacing.safe,
    zIndex: 52,
  },
  panel: {
    paddingVertical: spacing.gutter,
    paddingHorizontal: spacing.gutter + 2,
    minHeight: bottomChrome.quickAccessHeight,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  shortcut: {
    flex: 1,
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
    borderRadius: radius.md,
  },
  shortcutActive: {
    backgroundColor: colors.surfaceContainerHigh,
  },
  shortcutDisabled: {
    opacity: 0.4,
  },
  iconWrap: {
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: -6,
    right: -10,
    backgroundColor: colors.primary,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: colors.onPrimary,
  },
  shortcutLabel: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
  },
  shortcutLabelActive: {
    color: colors.primary,
    fontWeight: "700",
  },
  savedRow: {
    gap: 8,
    paddingTop: 10,
    paddingHorizontal: 2,
  },
  savedChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.secondaryContainer,
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxWidth: 160,
  },
  savedName: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.onSurface,
    flexShrink: 1,
  },
  emptySaved: {
    fontSize: 12,
    color: colors.outline,
    textAlign: "center",
    marginTop: 10,
    paddingHorizontal: 8,
  },
});
