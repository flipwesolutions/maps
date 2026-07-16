import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  StyleSheet,
  View,
  Animated,
  StatusBar,
  Alert,
} from "react-native";
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import * as Location from "expo-location";
import MapWebView, { type MapWebViewRef } from "./components/MapWebView";
import AppHeader, { APP_HEADER_HEIGHT, HEADER_SEARCH_GAP } from "./components/AppHeader";
import MapZoomControls from "./components/MapZoomControls";
import LocationSearchPanel, {
  type SearchField,
} from "./components/LocationSearchPanel";
import RouteOptionsPanel from "./components/RouteOptionsPanel";
import QuickAccessSheet from "./components/QuickAccessSheet";
import DestinationSheet from "./components/DestinationSheet";
import MapControls, { BottomNav } from "./components/MapControls";
import TurnByTurnPanel from "./components/TurnByTurnPanel";
import NavigationUI from "./components/NavigationUI";
import {
  fetchDrivingRoutes,
  formatDistance,
  formatDuration,
  isValidRouteCoord,
  type RouteResult,
  type RouteStep,
} from "./lib/routing";
import {
  reverseGeocode,
  searchPlaces,
  getLocalPlaceCount,
  type SearchPlace,
} from "./lib/geocoding";
import { isPlatformConfigured } from "./lib/api-config";
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
  setVoiceEnabled,
} from "./lib/voice-navigation";
import { INDIA_CENTER, INDIA_ZOOM } from "./lib/india-places";
import { getRegion, type SearchRegion } from "./lib/regions";
import { ensureIndiaIndex, ensureWorldIndex } from "./lib/place-index";
import {
  MAP_STYLE,
  MAP_STYLE_FALLBACK,
  MAP_MIN_ZOOM,
  MAP_MAX_ZOOM,
  zoomForPlace,
} from "./lib/map-config";
import { colors } from "./lib/theme";
import { bottomStackHeight } from "./lib/layout";

export default function App() {
  return (
    <SafeAreaProvider>
      <FlipwiMapsApp />
    </SafeAreaProvider>
  );
}

function FlipwiMapsApp() {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapWebViewRef>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fieldBlurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
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
  const northUpRef = useRef(false);

  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [userHeading, setUserHeading] = useState(0);
  const [locationPermission, setLocationPermission] = useState(false);

  const [useCurrentLocation, setUseCurrentLocation] = useState(true);
  const [pickupPlace, setPickupPlace] = useState<SearchPlace | null>(null);
  const [dropPlace, setDropPlace] = useState<SearchPlace | null>(null);
  const [pickupLabel, setPickupLabel] = useState("Locating…");
  const [dropLabel, setDropLabel] = useState("");

  const [activeField, setActiveField] = useState<SearchField | null>(null);
  const [pickupQuery, setPickupQuery] = useState("");
  const [dropQuery, setDropQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchPlace[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchRegion, setSearchRegion] = useState<SearchRegion>("india");
  const [localPlaceCount, setLocalPlaceCount] = useState(getLocalPlaceCount("india"));

  const [savedPlaces, setSavedPlaces] = useState<SearchPlace[]>([]);
  const [routes, setRoutes] = useState<RouteResult[]>([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [routeSteps, setRouteSteps] = useState<RouteStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [turnByTurnActive, setTurnByTurnActive] = useState(false);
  const [navProgress, setNavProgress] = useState<NavigationProgress | null>(null);
  const [isRerouting, setIsRerouting] = useState(false);
  const [voiceEnabled, setVoiceEnabledState] = useState(true);
  const [northUp, setNorthUp] = useState(false);
  const [showNavRoutes, setShowNavRoutes] = useState(false);
  const [recentPlace, setRecentPlace] = useState<SearchPlace | null>(null);
  const [bottomTab, setBottomTab] = useState<
    "explore" | "location" | "layers" | "routes"
  >("explore");
  const [focusRequest, setFocusRequest] = useState<SearchField | null>(null);
  const [searchPanelBottom, setSearchPanelBottom] = useState(0);

  const [routeInfo, setRouteInfo] = useState<{
    distanceMeters: number;
    durationSeconds: number;
  } | null>(null);
  const [navigating, setNavigating] = useState(false);
  const cardAnim = useRef(new Animated.Value(0)).current;

  const pickupCoords = useCurrentLocation
    ? userLocation
    : pickupPlace?.coordinates ?? null;

  const updatePickupLabel = useCallback(async (coords: [number, number]) => {
    setPickupLabel("Locating…");
    try {
      const label = await reverseGeocode(coords);
      setPickupLabel(label.replace(/\n/g, ", "));
    } catch {
      setPickupLabel("Current location");
    }
  }, []);

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
    setNorthUp(false);
    northUpRef.current = false;
    setShowNavRoutes(false);
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
    ensureIndiaIndex().then(() => {
      setLocalPlaceCount(getLocalPlaceCount("india"));
    });
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
      await updatePickupLabel(coords);
    })();
  }, [updatePickupLabel]);

  useEffect(() => {
    return () => {
      locationSub.current?.remove();
      headingSub.current?.remove();
      if (fieldBlurTimer.current) clearTimeout(fieldBlurTimer.current);
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
    if (query.trim().length < 1) {
      setSearchResults([]);
      return;
    }

    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await searchPlaces(query, {
          proximity: userLocation ?? undefined,
          region: searchRegion,
          limit: 30,
        });
        setSearchResults(results);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, searchRegion === "world" ? 450 : query.trim().length < 4 ? 280 : 380);

    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [activeField, pickupQuery, dropQuery, userLocation, searchRegion]);

  const handleSearchRegionChange = useCallback(async (region: SearchRegion) => {
    setSearchRegion(region);
    setSearchResults([]);
    if (!isPlatformConfigured()) {
      setLocalPlaceCount(getLocalPlaceCount(region));
      if (region === "world") {
        await ensureWorldIndex();
        setLocalPlaceCount(getLocalPlaceCount("world"));
      }
    }
    const cfg = getRegion(region);
    mapRef.current?.flyTo(cfg.center, cfg.zoom);
  }, []);

  const flyToPlace = (place: SearchPlace) => {
    mapRef.current?.flyTo(place.coordinates, zoomForPlace(place.type));
  };

  const normalizePlace = (place: SearchPlace): SearchPlace => ({
    ...place,
    name: place.name?.trim() || place.subtitle?.split(",")[0]?.trim() || "Selected place",
    subtitle: place.subtitle?.trim() || "OpenStreetMap",
  });

  const resolveDropFromQuery = useCallback(
    async (query: string): Promise<SearchPlace | null> => {
      const trimmed = query.trim();
      if (trimmed.length < 2) return null;
      const results = await searchPlaces(trimmed, {
        proximity: userLocation ?? undefined,
        region: searchRegion,
      });
      return results[0] ? normalizePlace(results[0]) : null;
    },
    [userLocation, searchRegion]
  );

  const setDropFromPlace = (place: SearchPlace) => {
    const normalized = normalizePlace(place);
    if (
      !normalized.coordinates ||
      normalized.coordinates.length < 2 ||
      !Number.isFinite(normalized.coordinates[0]) ||
      !Number.isFinite(normalized.coordinates[1])
    ) {
      Alert.alert("Invalid place", "Could not use that location. Try another result.");
      return;
    }
    clearRoute();
    setDropPlace(normalized);
    setDropLabel(normalized.name);
    setDropQuery(normalized.name);
    setRecentPlace(normalized);
    setActiveField(null);
    setSearchResults([]);
    flyToPlace(normalized);
  };

  const handleFieldBlur = (field: SearchField) => {
    if (fieldBlurTimer.current) clearTimeout(fieldBlurTimer.current);
    fieldBlurTimer.current = setTimeout(() => {
      setActiveField((current) => (current === field ? null : current));
    }, 250);
  };

  const handleSelectPlace = (place: SearchPlace, field: SearchField) => {
    if (fieldBlurTimer.current) {
      clearTimeout(fieldBlurTimer.current);
      fieldBlurTimer.current = null;
    }
    clearRoute();
    const normalized = normalizePlace(place);
    if (field === "pickup") {
      setUseCurrentLocation(false);
      setPickupPlace(normalized);
      setPickupLabel(normalized.name);
      setPickupQuery(normalized.name);
      flyToPlace(normalized);
    } else {
      setDropFromPlace(normalized);
      return;
    }
    setActiveField(null);
    setSearchResults([]);
  };

  const handleUseCurrentLocation = async () => {
    clearRoute();
    setUseCurrentLocation(true);
    setPickupPlace(null);
    setPickupQuery("");
    setActiveField(null);

    if (userLocation) {
      await updatePickupLabel(userLocation);
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
    mapRef.current?.flyTo(coords, 14);
    await updatePickupLabel(coords);
  };

  const handleShowRoute = async () => {
    if (navigating) return;

    if (!pickupCoords) {
      Alert.alert(
        "Pickup location needed",
        "Allow location access or set a pickup point before routing."
      );
      return;
    }

    setNavigating(true);
    try {
      let destination = dropPlace;
      if (!destination) {
        const queryText = dropQuery.trim() || dropLabel.trim();
        destination = await resolveDropFromQuery(queryText);
        if (!destination) {
          Alert.alert(
            "Destination not found",
            "Type a place name and pick from the list, or try a different search."
          );
          return;
        }
        setDropPlace(destination);
        setDropLabel(destination.name);
        setDropQuery(destination.name);
        setActiveField(null);
        setSearchResults([]);
        flyToPlace(destination);
      }

      if (!isValidRouteCoord(destination.coordinates)) {
        Alert.alert(
          "Invalid destination",
          "This place has no valid map coordinates. Pick a different search result."
        );
        return;
      }

      const allRoutes = await fetchDrivingRoutes(
        pickupCoords,
        destination.coordinates
      );
      if (!allRoutes.length) {
        Alert.alert("Route unavailable", "No driving route could be calculated.");
        return;
      }
      setRoutes(allRoutes);
      applySelectedRoute(0, allRoutes);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Could not load driving routes.";
      Alert.alert("Route unavailable", msg);
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
    setVoiceEnabledState(true);
    setVoiceEnabled(true);
    arrivedRef.current = false;
    offRouteSinceRef.current = null;
    setTurnByTurnActive(true);
    setNorthUp(false);
    northUpRef.current = false;
    setShowNavRoutes(false);
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
        mapRef.current?.updateRouteProgress(progress.remainingCoordinates);

        setRouteInfo({
          distanceMeters: progress.remainingDistanceMeters,
          durationSeconds: progress.remainingDurationSeconds,
        });

        if (!progress.hasArrived && !isReroutingRef.current) {
          updateVoiceGuidance(progress, steps);
        }

        mapRef.current?.followNavigation(
          progress.snappedLocation,
          heading,
          northUpRef.current
        );
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
      mapRef.current?.followNavigation(
        progress.snappedLocation,
        initialHeading,
        northUpRef.current
      );
      mapRef.current?.updateRouteProgress(progress.remainingCoordinates);
    }
  };

  const handleToggleVoice = useCallback(() => {
    setVoiceEnabledState((prev) => {
      const next = !prev;
      setVoiceEnabled(next);
      return next;
    });
  }, []);

  const handleToggleCompass = useCallback(() => {
    setNorthUp((prev) => {
      const next = !prev;
      northUpRef.current = next;
      if (userLocation) {
        if (next) {
          mapRef.current?.setNorthUp(userLocation, userHeading);
        } else {
          mapRef.current?.followNavigation(userLocation, userHeading, false);
        }
      }
      return next;
    });
  }, [userLocation, userHeading]);

  const handleMyLocation = async () => {
    setBottomTab("location");
    if (userLocation) {
      mapRef.current?.flyTo(userLocation, 14);
      return;
    }
    await handleUseCurrentLocation();
  };

  const handleExploreMap = useCallback(() => {
    setBottomTab("explore");
    if (routes.length > 0 && !turnByTurnActive) return;
    setFocusRequest("drop");
  }, [routes.length, turnByTurnActive]);

  const handleLayersToggle = useCallback(() => {
    setBottomTab("layers");
    if (turnByTurnActive) {
      handleToggleCompass();
      return;
    }
    const next: SearchRegion = searchRegion === "india" ? "world" : "india";
    handleSearchRegionChange(next);
  }, [turnByTurnActive, searchRegion, handleToggleCompass, handleSearchRegionChange]);

  const handleRoutesToggle = useCallback(() => {
    if (routes.length === 0) return;
    setBottomTab("routes");
    if (turnByTurnActive) {
      setShowNavRoutes((v) => !v);
      return;
    }
    mapRef.current?.flyTo(
      dropPlace?.coordinates ?? userLocation ?? INDIA_CENTER,
      12
    );
  }, [routes.length, turnByTurnActive, dropPlace, userLocation]);

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

  const headerSubtitle = isPlatformConfigured()
    ? "Live search · routing · navigation"
    : searchRegion === "india"
      ? `${localPlaceCount.toLocaleString()}+ places across India`
      : `${localPlaceCount.toLocaleString()}+ cities worldwide`;

  const showHomeChrome = !turnByTurnActive;
  const showHomeNavbar =
    showHomeChrome && routes.length === 0 && !dropPlace && !navigating;
  const showSearchPanel = showHomeNavbar;
  const showQuickAccess = showHomeNavbar;
  const showDestinationSheet =
    showHomeChrome && routes.length === 0 && Boolean(dropPlace);
  const showFloatingControls = showHomeNavbar;
  const canRoute = Boolean(
    pickupCoords &&
      (dropPlace || dropQuery.trim().length >= 2 || dropLabel.trim().length >= 2)
  );

  useEffect(() => {
    if (!showSearchPanel) setSearchPanelBottom(0);
  }, [showSearchPanel]);

  const chromeBottomHeight = showFloatingControls
    ? bottomStackHeight(showQuickAccess, true)
    : 0;

  const zoomControlsTop =
    showSearchPanel && searchPanelBottom > 0
      ? searchPanelBottom + 12
      : insets.top + APP_HEADER_HEIGHT + HEADER_SEARCH_GAP + 12;

  return (
    <SafeAreaView
      style={[styles.safe, turnByTurnActive && styles.safeNav]}
      edges={turnByTurnActive ? ["top"] : []}
    >
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      <View style={styles.mapLayer}>
        <MapWebView
          ref={mapRef}
          mapStyle={MAP_STYLE}
          mapStyleFallback={MAP_STYLE_FALLBACK}
          center={INDIA_CENTER}
          zoom={INDIA_ZOOM}
          minZoom={MAP_MIN_ZOOM}
          maxZoom={MAP_MAX_ZOOM}
          markers={[]}
          userLocation={locationPermission ? userLocation : null}
          userHeading={userHeading}
          navigationActive={turnByTurnActive}
          northUp={northUp}
          pickupLocation={turnByTurnActive ? null : pickupCoords}
          dropLocation={dropPlace?.coordinates ?? null}
          onMarkerPress={() => {}}
          onMapPress={() => {
            if (fieldBlurTimer.current) clearTimeout(fieldBlurTimer.current);
            setActiveField(null);
          }}
        />
      </View>

      {showHomeNavbar && <AppHeader subtitle={headerSubtitle} />}

      <LocationSearchPanel
        hidden={!showSearchPanel}
        pickupLabel={pickupLabel}
        dropLabel={dropLabel}
        useCurrentLocation={useCurrentLocation}
        searching={searching}
        navigating={navigating}
        canRoute={canRoute}
        searchRegion={searchRegion}
        onSearchRegionChange={handleSearchRegionChange}
        localPlaceCount={localPlaceCount}
        routeSummary={routeSummary}
        activeField={activeField}
        pickupQuery={pickupQuery}
        dropQuery={dropQuery}
        results={searchResults}
        focusRequest={focusRequest}
        onFocusRequestHandled={() => setFocusRequest(null)}
        onPickupFocus={() => {
          if (fieldBlurTimer.current) clearTimeout(fieldBlurTimer.current);
          setActiveField("pickup");
          setPickupQuery(pickupLabel || pickupQuery);
        }}
        onDropFocus={() => {
          if (fieldBlurTimer.current) clearTimeout(fieldBlurTimer.current);
          setActiveField("drop");
          setDropQuery(dropLabel || dropQuery);
        }}
        onPickupBlur={() => handleFieldBlur("pickup")}
        onDropBlur={() => handleFieldBlur("drop")}
        onPickupChange={setPickupQuery}
        onDropChange={setDropQuery}
        onUseCurrentLocation={handleUseCurrentLocation}
        onSelectPlace={handleSelectPlace}
        onShowRoute={handleShowRoute}
        onClearRoute={clearRoute}
        onLayoutHeight={setSearchPanelBottom}
      />

      <MapZoomControls
        hidden={!showHomeNavbar}
        top={zoomControlsTop}
        onZoomIn={() => mapRef.current?.zoomIn()}
        onZoomOut={() => mapRef.current?.zoomOut()}
      />

      <QuickAccessSheet
        hidden={!showQuickAccess}
        savedPlaces={savedPlaces}
        recentPlace={recentPlace}
        onSelect={handleSavedPlaceSelect}
        onRemoveSaved={handleRemoveSaved}
      />

      <RouteOptionsPanel
        routes={turnByTurnActive && !showNavRoutes ? [] : routes}
        selectedIndex={selectedRouteIndex}
        onSelect={handleSelectRoute}
        navMode={turnByTurnActive && showNavRoutes}
      />

      <MapControls
        hidden={!showFloatingControls}
        bottomStackHeight={chromeBottomHeight}
        onMyLocation={handleMyLocation}
        onExplore={() => {
          if (userLocation) mapRef.current?.flyTo(userLocation, 12);
          else handleExploreMap();
        }}
        onLayers={handleLayersToggle}
        onRoutes={handleRoutesToggle}
        hasRoutes={routes.length > 0}
        layersActive={turnByTurnActive ? northUp : searchRegion === "world"}
      />

      <BottomNav
        hidden={!showFloatingControls}
        aboveQuickAccess={showQuickAccess}
        activeTab={bottomTab}
        onLocation={handleMyLocation}
        onExplore={handleExploreMap}
        onLayers={handleLayersToggle}
        onRoutes={handleRoutesToggle}
        hasRoutes={routes.length > 0}
      />

      {turnByTurnActive && navProgress && (
        <NavigationUI
          steps={routeSteps}
          currentStepIndex={navProgress.stepIndex}
          distanceToManeuverMeters={navProgress.distanceToManeuverMeters}
          remainingDistanceMeters={navProgress.remainingDistanceMeters}
          remainingDurationSeconds={navProgress.remainingDurationSeconds}
          etaMs={navProgress.etaMs}
          isRerouting={isRerouting}
          hasArrived={navProgress.hasArrived}
          voiceEnabled={voiceEnabled}
          northUp={northUp}
          mapBearing={northUp ? 0 : userHeading}
          userHeading={userHeading}
          onStop={stopLocationWatch}
          onToggleVoice={handleToggleVoice}
          onToggleCompass={handleToggleCompass}
          onShowRoutes={
            routes.length > 1
              ? () => setShowNavRoutes((v) => !v)
              : undefined
          }
        />
      )}

      {routes.length > 0 && !turnByTurnActive && (
        <TurnByTurnPanel
          steps={routeSteps}
          currentStepIndex={currentStepIndex}
          isNavigating={turnByTurnActive}
          routeSummary={routeSummary}
          onStart={startTurnByTurn}
          onStop={stopLocationWatch}
          onDismiss={clearRoute}
        />
      )}

      <DestinationSheet
        visible={showDestinationSheet}
        place={dropPlace!}
        isSaved={isSaved}
        navigating={navigating}
        canRoute={canRoute}
        translateY={cardTranslateY}
        onSave={handleSaveDestination}
        onClose={clearDestination}
        onGetDirections={handleShowRoute}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  safeNav: { backgroundColor: colors.surface },
  mapLayer: {
    ...StyleSheet.absoluteFill,
  },
});
