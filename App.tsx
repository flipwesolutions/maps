import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Animated,
  Platform,
  StatusBar,
  Alert,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import * as Location from "expo-location";
import MapWebView, { type MapWebViewRef } from "./components/MapWebView";
import LocationSearchPanel, {
  type SearchField,
} from "./components/LocationSearchPanel";
import RouteOptionsPanel from "./components/RouteOptionsPanel";
import SavedPlacesBar from "./components/SavedPlacesBar";
import TurnByTurnPanel from "./components/TurnByTurnPanel";
import NavigationBanner from "./components/NavigationBanner";
import {
  fetchDrivingRoutes,
  formatDistance,
  formatDuration,
  type RouteResult,
  type RouteStep,
} from "./lib/routing";
import {
  reverseGeocode,
  searchPlaces,
  type SearchPlace,
} from "./lib/geocoding";
import {
  loadSavedPlaces,
  savePlace,
  removeSavedPlace,
  isPlaceSaved,
} from "./lib/saved-places";
import { resolveHeading } from "./lib/geo-utils";
import {
  computeNavigationProgress,
  navigationHeading,
  type NavigationProgress,
} from "./lib/navigation";
import {
  resetVoiceNavigation,
  updateVoiceGuidance,
  announceRerouting,
  announceArrival,
} from "./lib/voice-navigation";
import { INDIA_CENTER, INDIA_ZOOM } from "./lib/india-places";
import {
  MAP_STYLE,
  MAP_MIN_ZOOM,
  MAP_MAX_ZOOM,
  zoomForPlace,
} from "./lib/map-config";

export default function App() {
  return (
    <SafeAreaProvider>
      <IndiaExploreApp />
    </SafeAreaProvider>
  );
}

function IndiaExploreApp() {
  const mapRef = useRef<MapWebViewRef>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const locationSub = useRef<Location.LocationSubscription | null>(null);
  const headingSub = useRef<Location.LocationSubscription | null>(null);
  const prevCoordsRef = useRef<[number, number] | null>(null);
  const prevHeadingRef = useRef(0);
  const compassHeadingRef = useRef<number | null>(null);
  const routeStepsRef = useRef<RouteStep[]>([]);
  const activeRouteRef = useRef<RouteResult | null>(null);
  const dropCoordsRef = useRef<[number, number] | null>(null);
  const rerouteCooldownRef = useRef(0);
  const offRouteSinceRef = useRef<number | null>(null);
  const arrivedRef = useRef(false);
  const isReroutingRef = useRef(false);

  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [userHeading, setUserHeading] = useState(0);
  const [locationPermission, setLocationPermission] = useState(false);

  const [useCurrentLocation, setUseCurrentLocation] = useState(true);
  const [pickupPlace, setPickupPlace] = useState<SearchPlace | null>(null);
  const [dropPlace, setDropPlace] = useState<SearchPlace | null>(null);
  const [pickupLabel, setPickupLabel] = useState("My location");
  const [dropLabel, setDropLabel] = useState("");

  const [activeField, setActiveField] = useState<SearchField | null>(null);
  const [pickupQuery, setPickupQuery] = useState("");
  const [dropQuery, setDropQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchPlace[]>([]);
  const [searching, setSearching] = useState(false);

  const [savedPlaces, setSavedPlaces] = useState<SearchPlace[]>([]);
  const [routes, setRoutes] = useState<RouteResult[]>([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [routeSteps, setRouteSteps] = useState<RouteStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [turnByTurnActive, setTurnByTurnActive] = useState(false);
  const [navProgress, setNavProgress] = useState<NavigationProgress | null>(null);
  const [isRerouting, setIsRerouting] = useState(false);
  const [showNavSteps, setShowNavSteps] = useState(false);

  const [routeInfo, setRouteInfo] = useState<{
    distanceMeters: number;
    durationSeconds: number;
  } | null>(null);
  const [navigating, setNavigating] = useState(false);
  const cardAnim = useRef(new Animated.Value(0)).current;

  const pickupCoords = useCurrentLocation
    ? userLocation
    : pickupPlace?.coordinates ?? null;

  const stopLocationWatch = useCallback(() => {
    locationSub.current?.remove();
    locationSub.current = null;
    headingSub.current?.remove();
    headingSub.current = null;
    compassHeadingRef.current = null;
    resetVoiceNavigation();
    arrivedRef.current = false;
    offRouteSinceRef.current = null;
    setNavProgress(null);
    setIsRerouting(false);
    setShowNavSteps(false);
    setTurnByTurnActive(false);
    mapRef.current?.exitNavigationMode();
  }, []);

  const clearRoute = useCallback(() => {
    mapRef.current?.clearRoute();
    setRoutes([]);
    setSelectedRouteIndex(0);
    setRouteInfo(null);
    setRouteSteps([]);
    setCurrentStepIndex(0);
    activeRouteRef.current = null;
    stopLocationWatch();
  }, [stopLocationWatch]);

  const applySelectedRoute = useCallback(
    (index: number, routeList: RouteResult[]) => {
      const route = routeList[index];
      if (!route) return;
      setSelectedRouteIndex(index);
      setRouteSteps(route.steps);
      activeRouteRef.current = route;
      setRouteInfo({
        distanceMeters: route.distanceMeters,
        durationSeconds: route.durationSeconds,
      });
      setCurrentStepIndex(0);
      mapRef.current?.showRoutes(
        routeList.map((r) => r.coordinates),
        index
      );
    },
    []
  );

  const rerouteFromCurrentPosition = useCallback(async (from: [number, number]) => {
    const destination = dropCoordsRef.current;
    if (!destination || isReroutingRef.current) return;
    const now = Date.now();
    if (now - rerouteCooldownRef.current < 12000) return;

    rerouteCooldownRef.current = now;
    isReroutingRef.current = true;
    setIsRerouting(true);
    announceRerouting();

    try {
      const allRoutes = await fetchDrivingRoutes(from, destination);
      const route = allRoutes[0];
      if (!route) return;

      setRoutes(allRoutes);
      setSelectedRouteIndex(0);
      setRouteSteps(route.steps);
      routeStepsRef.current = route.steps;
      activeRouteRef.current = route;
      setCurrentStepIndex(0);
      setRouteInfo({
        distanceMeters: route.distanceMeters,
        durationSeconds: route.durationSeconds,
      });
      mapRef.current?.updateRouteProgress(route.coordinates);
      offRouteSinceRef.current = null;
    } catch {
      Alert.alert(
        "Reroute failed",
        "Could not find a new route. Continue toward destination."
      );
    } finally {
      isReroutingRef.current = false;
      setIsRerouting(false);
    }
  }, []);

  useEffect(() => {
    routeStepsRef.current = routeSteps;
  }, [routeSteps]);

  useEffect(() => {
    dropCoordsRef.current = dropPlace?.coordinates ?? null;
  }, [dropPlace]);

  useEffect(() => {
    loadSavedPlaces().then(setSavedPlaces);
  }, []);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

      setLocationPermission(true);
      const loc = await Location.getCurrentPositionAsync({});
      const coords: [number, number] = [
        loc.coords.longitude,
        loc.coords.latitude,
      ];
      setUserLocation(coords);
      mapRef.current?.flyTo(coords, 12);
      try {
        const label = await reverseGeocode(coords);
        setPickupLabel(label);
      } catch {
        setPickupLabel("My location");
      }
    })();
  }, []);

  useEffect(() => {
    return () => {
      locationSub.current?.remove();
      headingSub.current?.remove();
    };
  }, []);

  useEffect(() => {
    Animated.spring(cardAnim, {
      toValue: dropPlace && routes.length === 0 ? 1 : 0,
      useNativeDriver: true,
      tension: 80,
      friction: 12,
    }).start();
  }, [dropPlace, routes.length, cardAnim]);

  useEffect(() => {
    if (!activeField) {
      setSearchResults([]);
      return;
    }

    const query = activeField === "pickup" ? pickupQuery : dropQuery;
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await searchPlaces(query, {
          proximity: userLocation ?? undefined,
        });
        setSearchResults(results);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);

    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [activeField, pickupQuery, dropQuery, userLocation]);

  const flyToPlace = (place: SearchPlace) => {
    mapRef.current?.flyTo(place.coordinates, zoomForPlace(place.type));
  };

  const setDropFromPlace = (place: SearchPlace) => {
    clearRoute();
    setDropPlace(place);
    setDropLabel(place.name);
    setDropQuery("");
    setActiveField(null);
    setSearchResults([]);
    flyToPlace(place);
  };

  const handleSelectPlace = (place: SearchPlace, field: SearchField) => {
    clearRoute();
    if (field === "pickup") {
      setUseCurrentLocation(false);
      setPickupPlace(place);
      setPickupLabel(place.name);
      setPickupQuery("");
      flyToPlace(place);
    } else {
      setDropFromPlace(place);
    }
    setActiveField(null);
  };

  const handleUseCurrentLocation = async () => {
    clearRoute();
    setUseCurrentLocation(true);
    setPickupPlace(null);
    setPickupQuery("");
    setActiveField(null);

    if (userLocation) {
      setPickupLabel("My location");
      try {
        const label = await reverseGeocode(userLocation);
        setPickupLabel(label);
      } catch {
        setPickupLabel("My location");
      }
      mapRef.current?.flyTo(userLocation, 14);
      return;
    }

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Location required", "Allow location to use current position.");
      return;
    }

    const loc = await Location.getCurrentPositionAsync({});
    const coords: [number, number] = [
      loc.coords.longitude,
      loc.coords.latitude,
    ];
    setUserLocation(coords);
    setLocationPermission(true);
    setPickupLabel("My location");
    mapRef.current?.flyTo(coords, 14);
  };

  const handleShowRoute = async () => {
    if (!pickupCoords || !dropPlace || navigating) return;

    setNavigating(true);
    try {
      const allRoutes = await fetchDrivingRoutes(
        pickupCoords,
        dropPlace.coordinates
      );
      setRoutes(allRoutes);
      applySelectedRoute(0, allRoutes);
    } catch {
      Alert.alert("Route unavailable", "Could not load driving routes. Try again.");
    } finally {
      setNavigating(false);
    }
  };

  const handleSelectRoute = (index: number) => {
    if (turnByTurnActive) stopLocationWatch();
    applySelectedRoute(index, routes);
  };

  const startTurnByTurn = async () => {
    const route = activeRouteRef.current;
    if (!route || routeSteps.length === 0) return;

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Location required", "Allow location for turn-by-turn navigation.");
      return;
    }

    resetVoiceNavigation();
    arrivedRef.current = false;
    offRouteSinceRef.current = null;
    setTurnByTurnActive(true);
    setShowNavSteps(false);
    prevCoordsRef.current = userLocation;

    let initialHeading = userHeading;
    if (userLocation && route.coordinates.length > 1) {
      initialHeading = navigationHeading(
        userLocation,
        route.coordinates,
        userHeading
      );
    }
    prevHeadingRef.current = initialHeading;
    setUserHeading(initialHeading);

    try {
      headingSub.current = await Location.watchHeadingAsync((heading) => {
        const deg =
          heading.trueHeading >= 0
            ? heading.trueHeading
            : heading.magHeading >= 0
              ? heading.magHeading
              : null;
        if (deg != null) {
          compassHeadingRef.current = deg;
        }
      });
    } catch {
      // Heading may be unavailable on some Android devices.
    }

    locationSub.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        distanceInterval: 2,
        timeInterval: 1000,
      },
      (loc) => {
        const coords: [number, number] = [
          loc.coords.longitude,
          loc.coords.latitude,
        ];
        const activeRoute = activeRouteRef.current;
        const steps = routeStepsRef.current;
        if (!activeRoute) return;

        const destination = dropCoordsRef.current;
        if (!destination) return;

        const progress = computeNavigationProgress(
          coords,
          activeRoute,
          steps,
          destination
        );
        setNavProgress(progress);
        setCurrentStepIndex(progress.stepIndex);

        if (progress.hasArrived && !arrivedRef.current) {
          arrivedRef.current = true;
          announceArrival();
        }

        if (progress.isOffRoute && !progress.hasArrived) {
          if (!offRouteSinceRef.current) {
            offRouteSinceRef.current = Date.now();
          } else if (Date.now() - offRouteSinceRef.current > 4000) {
            rerouteFromCurrentPosition(coords);
          }
        } else {
          offRouteSinceRef.current = null;
        }

        const routeHeading = navigationHeading(
          progress.snappedLocation,
          progress.remainingCoordinates,
          prevHeadingRef.current
        );
        const heading = resolveHeading(
          coords,
          compassHeadingRef.current ?? loc.coords.heading,
          prevCoordsRef.current,
          routeHeading,
          loc.coords.speed
        );

        prevCoordsRef.current = coords;
        prevHeadingRef.current = heading;

        setUserLocation(progress.snappedLocation);
        setUserHeading(heading);
        mapRef.current?.followNavigation(progress.snappedLocation, heading);
        mapRef.current?.updateRouteProgress(progress.remainingCoordinates);

        setRouteInfo({
          distanceMeters: progress.remainingDistanceMeters,
          durationSeconds: progress.remainingDurationSeconds,
        });

        if (!progress.hasArrived && !isReroutingRef.current) {
          updateVoiceGuidance(progress, steps);
        }
      }
    );

    if (userLocation && route && dropCoordsRef.current) {
      const progress = computeNavigationProgress(
        userLocation,
        route,
        routeStepsRef.current,
        dropCoordsRef.current
      );
      setNavProgress(progress);
      mapRef.current?.followNavigation(progress.snappedLocation, initialHeading);
      mapRef.current?.updateRouteProgress(progress.remainingCoordinates);
    }
  };

  const handleMyLocation = async () => {
    if (userLocation) {
      mapRef.current?.flyTo(userLocation, 14);
      return;
    }
    await handleUseCurrentLocation();
  };

  const clearDestination = () => {
    clearRoute();
    setDropPlace(null);
    setDropLabel("");
    setDropQuery("");
  };

  const handleSaveDestination = async () => {
    if (!dropPlace) return;
    if (isPlaceSaved(dropPlace.id, savedPlaces)) {
      const updated = await removeSavedPlace(dropPlace.id);
      setSavedPlaces(updated);
      return;
    }
    const updated = await savePlace(dropPlace);
    setSavedPlaces(updated);
  };

  const handleSavedPlaceSelect = (place: SearchPlace) => {
    setDropFromPlace(place);
  };

  const handleRemoveSaved = async (id: string) => {
    const updated = await removeSavedPlace(id);
    setSavedPlaces(updated);
  };

  const routeSummary = routeInfo
    ? `${formatDistance(routeInfo.distanceMeters)} · ${formatDuration(routeInfo.durationSeconds)}`
    : null;

  const cardTranslateY = cardAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [300, 0],
  });

  const isSaved = dropPlace ? isPlaceSaved(dropPlace.id, savedPlaces) : false;

  return (
    <SafeAreaView
      style={styles.safe}
      edges={turnByTurnActive ? ["top"] : ["top", "left", "right"]}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#F8F7F4" />

      {!turnByTurnActive && (
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>📍 IndiaExplore</Text>
            <Text style={styles.headerSub}>Search anywhere in India</Text>
          </View>
        </View>
      )}

      {!turnByTurnActive && (
        <LocationSearchPanel
          pickupLabel={pickupLabel}
          dropLabel={dropLabel}
          useCurrentLocation={useCurrentLocation}
          searching={searching}
          navigating={navigating}
          canRoute={Boolean(pickupCoords && dropPlace)}
          routeSummary={routeSummary}
          activeField={activeField}
          pickupQuery={pickupQuery}
          dropQuery={dropQuery}
          results={searchResults}
          onPickupFocus={() => {
            setActiveField("pickup");
            setPickupQuery(pickupLabel);
          }}
          onDropFocus={() => {
            setActiveField("drop");
            setDropQuery(dropLabel);
          }}
          onPickupChange={setPickupQuery}
          onDropChange={setDropQuery}
          onUseCurrentLocation={handleUseCurrentLocation}
          onSelectPlace={handleSelectPlace}
          onShowRoute={handleShowRoute}
          onClearRoute={clearRoute}
        />
      )}

      {!turnByTurnActive && (
        <SavedPlacesBar
          places={savedPlaces}
          onSelect={handleSavedPlaceSelect}
          onRemove={handleRemoveSaved}
        />
      )}

      <View
        style={[
          styles.mapContainer,
          turnByTurnActive && styles.mapContainerNav,
        ]}
      >
        <MapWebView
          ref={mapRef}
          mapStyle={MAP_STYLE}
          center={INDIA_CENTER}
          zoom={INDIA_ZOOM}
          minZoom={MAP_MIN_ZOOM}
          maxZoom={MAP_MAX_ZOOM}
          markers={[]}
          userLocation={locationPermission ? userLocation : null}
          userHeading={userHeading}
          navigationActive={turnByTurnActive}
          pickupLocation={turnByTurnActive ? null : pickupCoords}
          dropLocation={dropPlace?.coordinates ?? null}
          onMarkerPress={() => {}}
          onMapPress={() => setActiveField(null)}
        />

        <TouchableOpacity
          style={styles.locationBtn}
          onPress={handleMyLocation}
          activeOpacity={0.8}
        >
          <Text style={styles.locationBtnIcon}>◎</Text>
        </TouchableOpacity>

        <RouteOptionsPanel
          routes={turnByTurnActive ? [] : routes}
          selectedIndex={selectedRouteIndex}
          onSelect={handleSelectRoute}
        />

        {turnByTurnActive && navProgress && (
          <NavigationBanner
            steps={routeSteps}
            currentStepIndex={navProgress.stepIndex}
            distanceToManeuverMeters={navProgress.distanceToManeuverMeters}
            remainingDistanceMeters={navProgress.remainingDistanceMeters}
            remainingDurationSeconds={navProgress.remainingDurationSeconds}
            etaMs={navProgress.etaMs}
            isRerouting={isRerouting}
            hasArrived={navProgress.hasArrived}
            onStop={stopLocationWatch}
            onExpandSteps={() => setShowNavSteps((v) => !v)}
            showStepList={showNavSteps}
          />
        )}
      </View>

      {routes.length > 0 && !turnByTurnActive ? (
        <TurnByTurnPanel
          steps={routeSteps}
          currentStepIndex={currentStepIndex}
          isNavigating={turnByTurnActive}
          onStart={startTurnByTurn}
          onStop={stopLocationWatch}
        />
      ) : !turnByTurnActive ? (
        <Animated.View
          style={[
            styles.card,
            { transform: [{ translateY: cardTranslateY }] },
            !dropPlace && styles.cardHidden,
          ]}
        >
          {dropPlace && (
            <>
              <View style={styles.cardHandle} />
              <View style={styles.cardRow}>
                <View style={styles.cardIconBox}>
                  <Text style={styles.cardIcon}>📍</Text>
                </View>
                <View style={styles.cardTextBlock}>
                  <Text style={styles.cardName}>{dropPlace.name}</Text>
                  <Text style={styles.cardCoords} numberOfLines={2}>
                    {dropPlace.subtitle}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={handleSaveDestination}
                  style={styles.saveBtn}
                >
                  <Text style={styles.saveBtnText}>{isSaved ? "★" : "☆"}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={clearDestination}
                  style={styles.cardClose}
                >
                  <Text style={styles.cardCloseText}>✕</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={styles.setDestBtn}
                onPress={handleShowRoute}
                disabled={!pickupCoords || navigating}
                activeOpacity={0.85}
              >
                <Text style={styles.setDestBtnText}>
                  {navigating ? "Loading route…" : "Get directions here"}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </Animated.View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F8F7F4" },
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "android" ? 8 : 4,
    paddingBottom: 6,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1A1A2E",
    letterSpacing: -0.4,
  },
  headerSub: { fontSize: 12, color: "#7C7C8A", marginTop: 1 },
  mapContainer: {
    flex: 1,
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: 20,
    overflow: "hidden",
    elevation: 6,
  },
  mapContainerNav: {
    marginHorizontal: 0,
    marginBottom: 0,
    borderRadius: 0,
  },
  locationBtn: {
    position: "absolute",
    right: 14,
    bottom: 16,
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
  },
  locationBtnIcon: { fontSize: 22, color: "#1A1A2E", lineHeight: 24 },
  card: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 28,
    paddingTop: 10,
    elevation: 10,
    minHeight: 120,
  },
  cardHidden: { display: "none" },
  cardHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E0DFD9",
    alignSelf: "center",
    marginBottom: 14,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  cardIconBox: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
  },
  cardIcon: { fontSize: 24 },
  cardTextBlock: { flex: 1 },
  cardName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A2E",
  },
  cardCoords: { fontSize: 12, color: "#9C9CAA", marginTop: 4 },
  saveBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#FEF9C3",
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnText: { fontSize: 16, color: "#CA8A04" },
  cardClose: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#F0EFE9",
    alignItems: "center",
    justifyContent: "center",
  },
  cardCloseText: { fontSize: 12, color: "#6B6B7B", fontWeight: "600" },
  setDestBtn: {
    backgroundColor: "#1A1A2E",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  setDestBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
});
