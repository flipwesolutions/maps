import AsyncStorage from "@react-native-async-storage/async-storage";
import type { SearchPlace } from "./geocoding";

const STORAGE_KEY = "@india_explore_saved_places";

export async function loadSavedPlaces(): Promise<SearchPlace[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SearchPlace[];
  } catch {
    return [];
  }
}

export async function savePlace(place: SearchPlace): Promise<SearchPlace[]> {
  const existing = await loadSavedPlaces();
  if (existing.some((p) => p.id === place.id)) return existing;
  const updated = [place, ...existing].slice(0, 20);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export async function removeSavedPlace(id: string): Promise<SearchPlace[]> {
  const existing = await loadSavedPlaces();
  const updated = existing.filter((p) => p.id !== id);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export function isPlaceSaved(id: string, saved: SearchPlace[]): boolean {
  return saved.some((p) => p.id === id);
}
