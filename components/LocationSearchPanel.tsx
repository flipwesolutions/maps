import React, { useEffect, useState } from "react";
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
import type { SearchPlace } from "../lib/geocoding";
import { isPlatformConfigured } from "../lib/api-config";
import type { SearchRegion } from "../lib/regions";
import { colors, shadow } from "../lib/theme";

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
}: LocationSearchPanelProps) {
  const [showResults, setShowResults] = useState(false);

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

  return (
    <View style={styles.panel}>
      <View style={styles.regionRow}>
        <Text style={styles.regionLabel}>Search in</Text>
        <View style={styles.regionToggle}>
          <TouchableOpacity
            style={[
              styles.regionBtn,
              searchRegion === "india" && styles.regionBtnActive,
            ]}
            onPress={() => onSearchRegionChange("india")}
          >
            <Text
              style={[
                styles.regionBtnText,
                searchRegion === "india" && styles.regionBtnTextActive,
              ]}
            >
              India
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.regionBtn,
              searchRegion === "world" && styles.regionBtnActive,
            ]}
            onPress={() => onSearchRegionChange("world")}
          >
            <Text
              style={[
                styles.regionBtnText,
                searchRegion === "world" && styles.regionBtnTextActive,
              ]}
            >
              World
            </Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.regionHint}>
          {isPlatformConfigured()
            ? "Search + offline fallback"
            : `${localPlaceCount.toLocaleString()}+ offline places`}
        </Text>
      </View>

      <View style={styles.fieldBlock}>
        <Text style={styles.fieldLabel}>Current location</Text>
        <View style={styles.fieldRow}>
          <View style={[styles.dot, styles.pickupDot]} />
          <TextInput
            style={styles.input}
            placeholder="Street, area, or city"
            placeholderTextColor={colors.textMuted}
            value={pickupDisplay}
            onChangeText={onPickupChange}
            onFocus={onPickupFocus}
            onBlur={onPickupBlur}
            returnKeyType="search"
          />
          <TouchableOpacity
            style={[
              styles.gpsBtn,
              useCurrentLocation && styles.gpsBtnActive,
            ]}
            onPress={onUseCurrentLocation}
          >
            <Text style={styles.gpsBtnText}>◎</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.connector} />

      <View style={styles.fieldBlock}>
        <Text style={styles.fieldLabel}>Destination</Text>
        <View style={styles.fieldRow}>
          <View style={[styles.dot, styles.dropDot]} />
          <TextInput
            style={styles.input}
            placeholder={
              searchRegion === "india"
                ? "Search city, area, road, or landmark in India"
                : "Search any city worldwide"
            }
            placeholderTextColor={colors.textMuted}
            value={dropDisplay}
            onChangeText={onDropChange}
            onFocus={onDropFocus}
            onBlur={onDropBlur}
            returnKeyType="search"
          />
        </View>
      </View>

      {activeField &&
        !searching &&
        results.length === 0 &&
        (activeField === "pickup" ? pickupQuery : dropQuery).trim().length >= 2 && (
        <View style={styles.noResults}>
          <Text style={styles.noResultsText}>
            No places found — try a different spelling or switch region
          </Text>
        </View>
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
              <Text style={styles.resultName}>{place.name}</Text>
              <Text style={styles.resultSub} numberOfLines={2}>
                {place.subtitle}
              </Text>
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
          <Text style={styles.routeText}>🚗 {routeSummary}</Text>
          <TouchableOpacity onPress={onClearRoute}>
            <Text style={styles.clearText}>Clear</Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity
        style={[styles.routeBtn, !canRoute && styles.routeBtnDisabled]}
        onPress={onShowRoute}
        disabled={!canRoute || navigating}
        activeOpacity={0.85}
      >
        {navigating ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.routeBtnText}>Show Route</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    marginHorizontal: 14,
    marginBottom: 10,
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.md,
  },
  regionRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  regionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  regionToggle: {
    flexDirection: "row",
    backgroundColor: colors.borderLight,
    borderRadius: 12,
    padding: 4,
    flex: 1,
  },
  regionBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 9,
    alignItems: "center",
  },
  regionBtnActive: {
    backgroundColor: colors.surface,
    ...shadow.sm,
  },
  regionBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textMuted,
  },
  regionBtnTextActive: {
    color: colors.primary,
  },
  regionHint: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: "600",
  },
  fieldBlock: {
    gap: 4,
    backgroundColor: colors.borderLight,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginLeft: 20,
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
  pickupDot: {
    backgroundColor: colors.success,
  },
  dropDot: {
    backgroundColor: colors.danger,
  },
  connector: {
    width: 2,
    height: 12,
    backgroundColor: colors.border,
    marginLeft: 17,
    marginVertical: 2,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    paddingVertical: 8,
    fontWeight: "600",
  },
  gpsBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  gpsBtnActive: {
    backgroundColor: "#DCFCE7",
    borderColor: "#86EFAC",
  },
  gpsBtnText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: "700",
  },
  results: {
    maxHeight: 280,
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  resultItem: {
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  resultName: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },
  resultSub: {
    fontSize: 12,
    color: colors.textSecondary,
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
    color: colors.textSecondary,
    fontWeight: "500",
  },
  noResults: {
    marginTop: 10,
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: colors.borderLight,
    borderRadius: 10,
  },
  noResultsText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: "500",
    textAlign: "center",
  },
  routeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  routeText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
  },
  clearText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.primary,
  },
  routeBtn: {
    marginTop: 14,
    backgroundColor: colors.nav,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    ...shadow.sm,
  },
  routeBtnDisabled: {
    opacity: 0.45,
  },
  routeBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
  },
});
