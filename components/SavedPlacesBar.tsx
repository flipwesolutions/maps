import React from "react";
import {
  ScrollView,
  TouchableOpacity,
  Text,
  StyleSheet,
  View,
} from "react-native";
import type { SearchPlace } from "../lib/geocoding";

interface SavedPlacesBarProps {
  places: SearchPlace[];
  onSelect: (place: SearchPlace) => void;
  onRemove: (id: string) => void;
}

export default function SavedPlacesBar({
  places,
  onSelect,
  onRemove,
}: SavedPlacesBarProps) {
  if (places.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Saved places</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {places.map((place) => (
          <TouchableOpacity
            key={place.id}
            style={styles.chip}
            onPress={() => onSelect(place)}
            onLongPress={() => onRemove(place.id)}
            activeOpacity={0.75}
          >
            <Text style={styles.star}>★</Text>
            <Text style={styles.name} numberOfLines={1}>
              {place.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 6 },
  title: {
    fontSize: 11,
    fontWeight: "600",
    color: "#7C7C8A",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginLeft: 16,
    marginBottom: 6,
  },
  row: { paddingHorizontal: 12, gap: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FEF9C3",
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    maxWidth: 140,
    borderWidth: 1,
    borderColor: "#FDE047",
  },
  star: { fontSize: 12, color: "#CA8A04" },
  name: { fontSize: 12, fontWeight: "600", color: "#713F12", flexShrink: 1 },
});
