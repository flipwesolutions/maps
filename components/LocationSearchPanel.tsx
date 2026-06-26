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
import { type SearchPlace } from "../lib/geocoding";

export type SearchField = "pickup" | "drop";

interface LocationSearchPanelProps {
  pickupLabel: string;
  dropLabel: string;
  useCurrentLocation: boolean;
  searching: boolean;
  navigating: boolean;
  canRoute: boolean;
  routeSummary?: string | null;
  onPickupFocus: () => void;
  onDropFocus: () => void;
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
  routeSummary,
  onPickupFocus,
  onDropFocus,
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

  useEffect(() => {
    const query = activeField === "pickup" ? pickupQuery : dropQuery;
    setShowResults(
      Boolean(activeField && query.trim().length >= 2 && results.length > 0)
    );
  }, [activeField, pickupQuery, dropQuery, results]);

  return (
    <View style={styles.panel}>
      <View style={styles.fieldBlock}>
        <Text style={styles.fieldLabel}>Current location</Text>
        <View style={styles.fieldRow}>
          <View style={[styles.dot, styles.pickupDot]} />
          <TextInput
            style={styles.input}
            placeholder="Your location"
            placeholderTextColor="#9C9CAA"
            value={activeField === "pickup" ? pickupQuery : pickupLabel}
            onChangeText={onPickupChange}
            onFocus={onPickupFocus}
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
            placeholder="City, area, road, or landmark in India"
            placeholderTextColor="#9C9CAA"
            value={activeField === "drop" ? dropQuery : dropLabel}
            onChangeText={onDropChange}
            onFocus={onDropFocus}
            returnKeyType="search"
          />
        </View>
      </View>

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
          <ActivityIndicator size="small" color="#1A1A2E" />
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
    marginHorizontal: 12,
    marginBottom: 8,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 12,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  fieldBlock: {
    gap: 4,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#7C7C8A",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginLeft: 22,
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
    backgroundColor: "#22C55E",
  },
  dropDot: {
    backgroundColor: "#EF4444",
  },
  connector: {
    width: 2,
    height: 14,
    backgroundColor: "#E5E4E0",
    marginLeft: 4,
    marginVertical: 6,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: "#1A1A2E",
    paddingVertical: 10,
    fontWeight: "500",
  },
  gpsBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F0EFE9",
    alignItems: "center",
    justifyContent: "center",
  },
  gpsBtnActive: {
    backgroundColor: "#DCFCE7",
  },
  gpsBtnText: {
    fontSize: 16,
    color: "#1A1A2E",
  },
  results: {
    maxHeight: 220,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#EFECE4",
  },
  resultItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F4EF",
  },
  resultName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A1A2E",
  },
  resultSub: {
    fontSize: 11,
    color: "#7C7C8A",
    marginTop: 2,
  },
  searchingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  searchingText: {
    fontSize: 12,
    color: "#7C7C8A",
  },
  routeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#EFECE4",
  },
  routeText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1A1A2E",
  },
  clearText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#7C7C8A",
  },
  routeBtn: {
    marginTop: 12,
    backgroundColor: "#1A1A2E",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  routeBtnDisabled: {
    opacity: 0.45,
  },
  routeBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
});
