import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Keyboard,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { SearchPlace } from "../lib/geocoding";
import { isPlatformConfigured } from "../lib/api-config";
import type { SearchRegion } from "../lib/regions";
import GlassPanel from "./ui/GlassPanel";
import { APP_HEADER_HEIGHT, HEADER_SEARCH_GAP } from "./AppHeader";
import { colors, spacing, radius, typography } from "../lib/theme";

export type SearchField = "pickup" | "drop";

interface LocationSearchPanelProps {
  pickupLabel: string;
  dropLabel: string;
  useCurrentLocation: boolean;
  searching: boolean;
  navigating: boolean;
  canRoute: boolean;
  searchRegion: SearchRegion;
  onSearchRegionChange: (region: SearchRegion) => void;
  localPlaceCount: number;
  routeSummary?: string | null;
  onPickupFocus: () => void;
  onDropFocus: () => void;
  onPickupBlur: () => void;
  onDropBlur: () => void;
  onPickupChange: (text: string) => void;
  onDropChange: (text: string) => void;
  onUseCurrentLocation: () => void;
  onSelectPlace: (place: SearchPlace, field: SearchField) => void;
  onShowRoute: () => void;
  onClearRoute: () => void;
  activeField: SearchField | null;
  pickupQuery: string;
  dropQuery: string;
  results: SearchPlace[];
  focusRequest?: SearchField | null;
  onFocusRequestHandled?: () => void;
  hidden?: boolean;
  onLayoutHeight?: (bottom: number) => void;
}

export default function LocationSearchPanel({
  pickupLabel,
  dropLabel,
  useCurrentLocation,
  searching,
  navigating,
  canRoute,
  searchRegion,
  onSearchRegionChange,
  localPlaceCount,
  routeSummary,
  onPickupFocus,
  onDropFocus,
  onPickupBlur,
  onDropBlur,
  onPickupChange,
  onDropChange,
  onUseCurrentLocation,
  onSelectPlace,
  onShowRoute,
  onClearRoute,
  activeField,
  pickupQuery,
  dropQuery,
  results,
  focusRequest,
  onFocusRequestHandled,
  hidden,
  onLayoutHeight,
}: LocationSearchPanelProps) {
  const insets = useSafeAreaInsets();
  const dropRef = useRef<TextInput>(null);
  const pickupRef = useRef<TextInput>(null);
  const [showResults, setShowResults] = React.useState(false);

  const pickupDisplay =
    activeField === "pickup" ? pickupQuery : pickupLabel || pickupQuery;
  const dropDisplay =
    activeField === "drop" ? dropQuery : dropLabel || dropQuery;

  useEffect(() => {
    const query = activeField === "pickup" ? pickupQuery : dropQuery;
    setShowResults(
      Boolean(activeField && query.trim().length >= 1 && results.length > 0)
    );
  }, [activeField, pickupQuery, dropQuery, results]);

  useEffect(() => {
    if (!focusRequest) return;
    if (focusRequest === "drop") {
      dropRef.current?.focus();
      onDropFocus();
    } else {
      pickupRef.current?.focus();
      onPickupFocus();
    }
    onFocusRequestHandled?.();
  }, [focusRequest, onDropFocus, onFocusRequestHandled, onPickupFocus]);

  if (hidden) return null;

  return (
    <View
      style={[
        styles.wrap,
        { top: insets.top + APP_HEADER_HEIGHT + HEADER_SEARCH_GAP },
      ]}
      onLayout={(e) => {
        const { y, height } = e.nativeEvent.layout;
        onLayoutHeight?.(y + height);
      }}
    >
      <GlassPanel style={styles.panel} rounded="xl">
        <View style={styles.regionRow}>
          <Text style={styles.regionLabel}>Search in</Text>
          <View style={styles.regionToggle}>
            {(["india", "world"] as SearchRegion[]).map((region) => (
              <TouchableOpacity
                key={region}
                style={[
                  styles.regionBtn,
                  searchRegion === region && styles.regionBtnActive,
                ]}
                onPress={() => onSearchRegionChange(region)}
              >
                <Text
                  style={[
                    styles.regionBtnText,
                    searchRegion === region && styles.regionBtnTextActive,
                  ]}
                >
                  {region === "india" ? "India" : "World"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <Text style={styles.regionHint}>
          {isPlatformConfigured()
            ? "Live search with offline fallback"
            : `${localPlaceCount.toLocaleString()}+ offline places`}
        </Text>

        <View style={styles.fieldsCard}>
          <View style={styles.fieldRow}>
            <View style={[styles.dot, styles.pickupDot]} />
            <View style={styles.inputWrap}>
              <Text style={styles.fieldLabel}>From</Text>
              <TextInput
                ref={pickupRef}
                style={styles.input}
                placeholder="Current location or address"
                placeholderTextColor={colors.outline}
                value={pickupDisplay}
                onChangeText={onPickupChange}
                onFocus={onPickupFocus}
                onBlur={onPickupBlur}
                returnKeyType="search"
              />
            </View>
            <TouchableOpacity
              style={[styles.gpsBtn, useCurrentLocation && styles.gpsBtnActive]}
              onPress={onUseCurrentLocation}
            >
              <Ionicons
                name="locate"
                size={18}
                color={useCurrentLocation ? colors.primary : colors.outline}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.connector} />

          <View style={styles.fieldRow}>
            <View style={[styles.dot, styles.dropDot]} />
            <View style={styles.inputWrap}>
              <Text style={styles.fieldLabel}>To</Text>
              <TextInput
                ref={dropRef}
                style={styles.input}
                placeholder={
                  searchRegion === "india"
                    ? "City, landmark, or address in India"
                    : "Search any city worldwide"
                }
                placeholderTextColor={colors.outline}
                value={dropDisplay}
                onChangeText={onDropChange}
                onFocus={onDropFocus}
                onBlur={onDropBlur}
                returnKeyType="search"
              />
            </View>
          </View>
        </View>

        {activeField &&
          !searching &&
          results.length === 0 &&
          (activeField === "pickup" ? pickupQuery : dropQuery).trim().length >= 2 && (
            <Text style={styles.noResults}>
              No places found — try another spelling or switch region
            </Text>
          )}

        {showResults && activeField && results.length > 0 && (
          <ScrollView
            style={styles.results}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
          >
            {results.map((place) => (
              <TouchableOpacity
                key={place.id}
                style={styles.resultItem}
                onPress={() => {
                  Keyboard.dismiss();
                  setShowResults(false);
                  onSelectPlace(place, activeField);
                }}
              >
                <Ionicons name="location-outline" size={18} color={colors.primary} />
                <View style={styles.resultText}>
                  <Text style={styles.resultName}>{place.name}</Text>
                  <Text style={styles.resultSub} numberOfLines={2}>
                    {place.subtitle}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {searching && (
          <View style={styles.searchingRow}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.searchingText}>Searching…</Text>
          </View>
        )}

        {routeSummary && (
          <View style={styles.routeRow}>
            <Text style={styles.routeText}>{routeSummary}</Text>
            <TouchableOpacity onPress={onClearRoute}>
              <Text style={styles.clearText}>Clear route</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          style={[styles.routeBtn, !canRoute && styles.routeBtnDisabled]}
          onPress={onShowRoute}
          disabled={!canRoute || navigating}
          activeOpacity={0.88}
        >
          {navigating ? (
            <ActivityIndicator color={colors.onPrimary} />
          ) : (
            <>
              <Ionicons name="navigate" size={20} color={colors.onPrimary} />
              <Text style={styles.routeBtnText}>Get directions</Text>
            </>
          )}
        </TouchableOpacity>
      </GlassPanel>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: spacing.safe,
    right: spacing.safe,
    zIndex: 45,
  },
  panel: {
    padding: spacing.gutter + 4,
  },
  regionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  regionLabel: {
    ...typography.labelLg,
    color: colors.outline,
    fontSize: 10,
  },
  regionToggle: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.md,
    padding: 3,
  },
  regionBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: radius.sm,
    alignItems: "center",
  },
  regionBtnActive: {
    backgroundColor: colors.surface,
  },
  regionBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.outline,
  },
  regionBtnTextActive: {
    color: colors.primary,
  },
  regionHint: {
    ...typography.labelMd,
    color: colors.outline,
    marginBottom: 10,
  },
  fieldsCard: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.lg,
    padding: spacing.gutter,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  fieldRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  pickupDot: { backgroundColor: colors.primary },
  dropDot: { backgroundColor: colors.tertiary },
  connector: {
    width: 2,
    height: 14,
    backgroundColor: colors.outlineVariant,
    marginLeft: 4,
    marginVertical: 4,
  },
  inputWrap: { flex: 1 },
  fieldLabel: {
    ...typography.labelMd,
    color: colors.outline,
    marginBottom: 2,
  },
  input: {
    fontSize: 15,
    color: colors.onSurface,
    paddingVertical: 4,
    fontWeight: "600",
  },
  gpsBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  gpsBtnActive: {
    backgroundColor: colors.secondaryContainer,
    borderColor: colors.primaryFixedDim,
  },
  results: {
    maxHeight: 220,
    marginTop: 10,
  },
  resultItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceContainer,
  },
  resultText: { flex: 1 },
  resultName: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.onSurface,
  },
  resultSub: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  searchingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
  },
  searchingText: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },
  noResults: {
    marginTop: 10,
    fontSize: 13,
    color: colors.onSurfaceVariant,
    textAlign: "center",
    paddingVertical: 8,
  },
  routeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceContainer,
  },
  routeText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.onSurface,
  },
  clearText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.primary,
  },
  routeBtn: {
    marginTop: 12,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  routeBtnDisabled: { opacity: 0.45 },
  routeBtnText: {
    color: colors.onPrimary,
    fontSize: 16,
    fontWeight: "800",
  },
});
