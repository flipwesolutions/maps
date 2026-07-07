import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import { Image, StyleSheet } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";

const NAV_ARROW_URI = Image.resolveAssetSource(
  require("../assets/nav-arrow.png")
).uri;

export interface MapMarker {
  id: string;
  coordinates: [number, number];
  emoji: string;
  color: string;
}

export interface MapWebViewRef {
  flyTo: (coordinates: [number, number], zoom?: number) => void;
  showRoute: (coordinates: [number, number][], color: string) => void;
  showRoutes: (routes: [number, number][][], selectedIndex: number) => void;
  clearRoute: () => void;
  followNavigation: (coordinates: [number, number], heading: number) => void;
  exitNavigationMode: () => void;
  updateRouteProgress: (remaining: [number, number][]) => void;
}

interface MapWebViewProps {
  mapStyle: string;
  center: [number, number];
  zoom: number;
  minZoom?: number;
  maxZoom?: number;
  markers: MapMarker[];
  selectedId?: string | null;
  userLocation?: [number, number] | null;
  userHeading?: number;
  navigationActive?: boolean;
  pickupLocation?: [number, number] | null;
  dropLocation?: [number, number] | null;
  onMarkerPress: (id: string) => void;
  onMapPress: () => void;
}

function buildMapHtml(
  mapStyle: string,
  center: [number, number],
  zoom: number,
  markers: MapMarker[],
  minZoom: number,
  maxZoom: number,
  navArrowUri: string
) {
  const payload = JSON.stringify({
    mapStyle,
    center,
    zoom,
    markers,
    minZoom,
    maxZoom,
    navArrowUri,
  });

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <link href="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css" rel="stylesheet" />
  <script src="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100%; }
    .marker-wrap { cursor: pointer; display: flex; flex-direction: column; align-items: center; }
    .marker-bubble {
      width: 40px; height: 40px; border-radius: 20px; border: 2.5px solid;
      display: flex; align-items: center; justify-content: center;
      background: #fff; font-size: 18px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      transition: transform 0.15s ease, background 0.15s ease;
    }
    .marker-bubble.selected { transform: scale(1.15); }
    .marker-tail {
      width: 0; height: 0; margin-top: -1px;
      border-left: 6px solid transparent;
      border-right: 6px solid transparent;
      border-top: 8px solid;
    }
    .user-dot {
      width: 18px; height: 18px; border-radius: 50%;
      background: #22c55e; border: 3px solid #fff;
      box-shadow: 0 0 0 2px rgba(34,197,94,0.4);
    }
    .user-nav-wrap {
      position: relative;
      width: 44px;
      height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .user-nav-img {
      width: 40px;
      height: 40px;
      object-fit: contain;
      pointer-events: none;
      transform: rotate(-90deg);
      filter: drop-shadow(0 2px 5px rgba(0,0,0,0.45));
      mix-blend-mode: lighten;
    }
    .endpoint-dot {
      width: 14px; height: 14px; border-radius: 50%;
      border: 3px solid #fff;
      box-shadow: 0 2px 6px rgba(0,0,0,0.25);
    }
    .endpoint-dot.pickup { background: #22c55e; }
    .endpoint-dot.drop { background: #ef4444; }
    .maplibregl-ctrl-attrib { font-size: 10px; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    const CONFIG = ${payload};
    const markerEls = {};
    const markerMeta = {};
    let userMarker = null;
    let userMarkerEl = null;
    let navMode = false;
    let userHeading = 0;
    let pickupMarker = null;
    let dropMarker = null;
    let selectedId = null;
    let map;

    function post(msg) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify(msg));
      }
    }

    function renderMarker(loc) {
      const wrap = document.createElement("div");
      wrap.className = "marker-wrap";
      wrap.onclick = (e) => {
        e.stopPropagation();
        post({ type: "markerPress", id: loc.id });
      };

      const bubble = document.createElement("div");
      bubble.className = "marker-bubble";
      bubble.style.borderColor = loc.color;
      bubble.textContent = loc.emoji;

      const tail = document.createElement("div");
      tail.className = "marker-tail";
      tail.style.borderTopColor = loc.color;

      wrap.appendChild(bubble);
      wrap.appendChild(tail);

      markerEls[loc.id] = bubble;
      markerMeta[loc.id] = loc;

      return wrap;
    }

    function applySelected() {
      Object.keys(markerEls).forEach((id) => {
        const el = markerEls[id];
        const meta = markerMeta[id];
        const active = id === selectedId;
        el.classList.toggle("selected", active);
        el.style.background = active ? meta.color : "#fff";
      });
    }

    window.setSelectedMarker = function(id) {
      selectedId = id;
      applySelected();
    };

    window.flyTo = function(lng, lat, zoom) {
      if (!map) return;
      map.flyTo({ center: [lng, lat], zoom: zoom || 14, duration: 600 });
    };

    function buildUserElement(isNav) {
      if (isNav) {
        const wrap = document.createElement("div");
        wrap.className = "user-nav-wrap";
        const img = document.createElement("img");
        img.className = "user-nav-img";
        img.src = CONFIG.navArrowUri;
        img.alt = "";
        img.draggable = false;
        wrap.appendChild(img);
        return wrap;
      }
      const el = document.createElement("div");
      el.className = "user-dot";
      return el;
    }

    function applyUserMarkerStyle(isNav) {
      if (!userMarker || isNav === navMode) return;
      navMode = isNav;
      const lngLat = userMarker.getLngLat();
      userMarker.remove();
      userMarkerEl = buildUserElement(navMode);
      userMarker = new maplibregl.Marker({
        element: userMarkerEl,
        anchor: "center",
        rotationAlignment: isNav ? "viewport" : "map",
        pitchAlignment: isNav ? "viewport" : "map",
      })
        .setLngLat(lngLat)
        .setRotation(0)
        .addTo(map);
    }

    window.setUserLocation = function(lng, lat, heading, isNav) {
      if (!map) return;
      if (heading != null) userHeading = heading;
      const nextNavMode = typeof isNav === "boolean" ? isNav : navMode;

      if (!userMarker) {
        navMode = nextNavMode;
        userMarkerEl = buildUserElement(navMode);
        userMarker = new maplibregl.Marker({
          element: userMarkerEl,
          anchor: "center",
          rotationAlignment: navMode ? "viewport" : "map",
          pitchAlignment: navMode ? "viewport" : "map",
        })
          .setLngLat([lng, lat])
          .setRotation(0)
          .addTo(map);
        return;
      }

      userMarker.setLngLat([lng, lat]);
      applyUserMarkerStyle(nextNavMode);
    };

    window.followNavigation = function(lng, lat, heading) {
      if (!map) return;
      userHeading = heading || 0;
      navMode = true;

      if (!userMarker) {
        window.setUserLocation(lng, lat, userHeading, true);
      } else {
        applyUserMarkerStyle(true);
        userMarker.setLngLat([lng, lat]);
        userMarker.setRotation(0);
      }

      const lookMeters = 120;
      const brng = (userHeading * Math.PI) / 180;
      const latRad = (lat * Math.PI) / 180;
      const offsetLat = lat + (lookMeters / 111320) * Math.cos(brng);
      const offsetLng = lng + (lookMeters / (111320 * Math.cos(latRad))) * Math.sin(brng);

      map.easeTo({
        center: [offsetLng, offsetLat],
        bearing: userHeading,
        zoom: 18,
        pitch: 52,
        padding: { top: 24, bottom: 100, left: 16, right: 16 },
        duration: 320,
        essential: true,
      });
    };

    window.exitNavigationMode = function() {
      navMode = false;
      if (map) {
        map.easeTo({ bearing: 0, pitch: 0, duration: 500 });
      }
      if (userMarker) {
        const lngLat = userMarker.getLngLat();
        userMarker.remove();
        userMarkerEl = buildUserElement(false);
        userMarker = new maplibregl.Marker({
          element: userMarkerEl,
          anchor: "center",
        })
          .setLngLat(lngLat)
          .addTo(map);
      }
    };

    function setEndpointMarker(kind, lng, lat) {
      if (!map) return;
      const isPickup = kind === "pickup";
      let marker = isPickup ? pickupMarker : dropMarker;
      if (lng == null || lat == null) {
        if (marker) {
          marker.remove();
          if (isPickup) pickupMarker = null;
          else dropMarker = null;
        }
        return;
      }
      if (!marker) {
        const el = document.createElement("div");
        el.className = "endpoint-dot " + kind;
        marker = new maplibregl.Marker({ element: el }).setLngLat([lng, lat]).addTo(map);
        if (isPickup) pickupMarker = marker;
        else dropMarker = marker;
      } else {
        marker.setLngLat([lng, lat]);
      }
    }

    window.setPickupLocation = function(lng, lat) {
      setEndpointMarker("pickup", lng, lat);
    };

    window.setDropLocation = function(lng, lat) {
      setEndpointMarker("drop", lng, lat);
    };

    function clearAllRoutes() {
      if (!map) return;
      if (map.getLayer("route-line")) map.removeLayer("route-line");
      if (map.getLayer("route-outline")) map.removeLayer("route-outline");
      if (map.getSource("route")) map.removeSource("route");

      let i = 0;
      while (map.getSource("route-" + i)) {
        if (map.getLayer("route-line-" + i)) map.removeLayer("route-line-" + i);
        if (map.getLayer("route-outline-" + i)) map.removeLayer("route-outline-" + i);
        map.removeSource("route-" + i);
        i++;
      }
    }

    function addRouteLayer(index, coordinates, isSelected) {
      const sourceId = "route-" + index;
      const outlineId = "route-outline-" + index;
      const lineId = "route-line-" + index;
      const color = isSelected ? "#6366f1" : "#94a3b8";
      const width = isSelected ? 6 : 4;
      const outlineWidth = isSelected ? 10 : 7;
      const opacity = isSelected ? 1 : 0.55;

      map.addSource(sourceId, {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: { type: "LineString", coordinates },
        },
      });

      map.addLayer({
        id: outlineId,
        type: "line",
        source: sourceId,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": color,
          "line-width": outlineWidth,
          "line-opacity": opacity * 0.3,
        },
      });

      map.addLayer({
        id: lineId,
        type: "line",
        source: sourceId,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": color,
          "line-width": width,
          "line-opacity": opacity,
        },
      });
    }

    function ensureRouteLayers(color) {
      if (!map.getSource("route")) {
        map.addSource("route", {
          type: "geojson",
          data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [] } },
        });
        map.addLayer({
          id: "route-outline",
          type: "line",
          source: "route",
          layout: { "line-cap": "round", "line-join": "round" },
          paint: { "line-color": color, "line-width": 9, "line-opacity": 0.25 },
        });
        map.addLayer({
          id: "route-line",
          type: "line",
          source: "route",
          layout: { "line-cap": "round", "line-join": "round" },
          paint: { "line-color": color, "line-width": 5 },
        });
      } else {
        map.setPaintProperty("route-outline", "line-color", color);
        map.setPaintProperty("route-line", "line-color", color);
      }
    }

    window.showRoutes = function(routesList, selectedIndex) {
      if (!map || !routesList || !routesList.length) return;
      clearAllRoutes();

      const order = routesList
        .map(function(_, i) { return i; })
        .sort(function(a, b) {
          if (a === selectedIndex) return 1;
          if (b === selectedIndex) return -1;
          return a - b;
        });

      order.forEach(function(routeIndex) {
        addRouteLayer(routeIndex, routesList[routeIndex], routeIndex === selectedIndex);
      });

      const selected = routesList[selectedIndex] || routesList[0];
      const bounds = selected.reduce(
        function(b, coord) { return b.extend(coord); },
        new maplibregl.LngLatBounds(selected[0], selected[0])
      );
      map.fitBounds(bounds, {
        padding: { top: 90, bottom: 120, left: 40, right: 40 },
        duration: 900,
      });
    };

    window.showRoute = function(coordinates, color) {
      if (!map || !coordinates || !coordinates.length) return;
      clearAllRoutes();
      ensureRouteLayers(color || "#2563eb");
      const feature = {
        type: "Feature",
        properties: {},
        geometry: { type: "LineString", coordinates },
      };
      map.getSource("route").setData(feature);

      const bounds = coordinates.reduce(
        (b, coord) => b.extend(coord),
        new maplibregl.LngLatBounds(coordinates[0], coordinates[0])
      );
      map.fitBounds(bounds, { padding: { top: 70, bottom: 90, left: 40, right: 40 }, duration: 900 });
    };

    window.updateRouteProgress = function(remainingCoords) {
      if (!map || !remainingCoords || remainingCoords.length < 2) return;
      clearAllRoutes();
      ensureRouteLayers("#3b82f6");
      map.getSource("route").setData({
        type: "Feature",
        properties: {},
        geometry: { type: "LineString", coordinates: remainingCoords },
      });
    };

    window.clearRoute = function() {
      clearAllRoutes();
    };

    map = new maplibregl.Map({
      container: "map",
      style: CONFIG.mapStyle,
      center: CONFIG.center,
      zoom: CONFIG.zoom,
      minZoom: CONFIG.minZoom,
      maxZoom: CONFIG.maxZoom,
      attributionControl: true,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), "top-right");

    map.on("load", () => {
      CONFIG.markers.forEach((loc) => {
        new maplibregl.Marker({ element: renderMarker(loc), anchor: "bottom" })
          .setLngLat(loc.coordinates)
          .addTo(map);
      });
      post({ type: "ready" });
    });

    map.on("click", () => post({ type: "mapPress" }));
  </script>
</body>
</html>`;
}

const MapWebView = forwardRef<MapWebViewRef, MapWebViewProps>(function MapWebView(
  {
    mapStyle,
    center,
    zoom,
    minZoom = 3,
    maxZoom = 18,
    markers,
    selectedId,
    userLocation,
    userHeading = 0,
    navigationActive = false,
    pickupLocation,
    dropLocation,
    onMarkerPress,
    onMapPress,
  },
  ref
) {
  const webRef = useRef<WebView>(null);
  const readyRef = useRef(false);

  const html = useMemo(
    () =>
      buildMapHtml(
        mapStyle,
        center,
        zoom,
        markers,
        minZoom,
        maxZoom,
        NAV_ARROW_URI
      ),
    [mapStyle, center, zoom, markers, minZoom, maxZoom]
  );

  const runInMap = useCallback((script: string) => {
    if (!readyRef.current) return;
    webRef.current?.injectJavaScript(`${script}\ntrue;`);
  }, []);

  useImperativeHandle(ref, () => ({
    flyTo: (coordinates, zoomLevel = 14) => {
      runInMap(`window.flyTo(${coordinates[0]}, ${coordinates[1]}, ${zoomLevel})`);
    },
    showRoute: (coordinates, color) => {
      runInMap(
        `window.showRoute(${JSON.stringify(coordinates)}, ${JSON.stringify(color)})`
      );
    },
    showRoutes: (routes, selectedIndex) => {
      runInMap(
        `window.showRoutes(${JSON.stringify(routes)}, ${selectedIndex})`
      );
    },
    clearRoute: () => {
      runInMap("window.clearRoute()");
    },
    followNavigation: (coordinates, heading) => {
      runInMap(
        `window.followNavigation(${coordinates[0]}, ${coordinates[1]}, ${heading})`
      );
    },
    exitNavigationMode: () => {
      runInMap("window.exitNavigationMode()");
    },
    updateRouteProgress: (remaining) => {
      runInMap(
        `window.updateRouteProgress(${JSON.stringify(remaining)})`
      );
    },
  }));

  useEffect(() => {
    runInMap(`window.setSelectedMarker(${JSON.stringify(selectedId ?? null)})`);
  }, [selectedId, runInMap]);

  useEffect(() => {
    if (!userLocation) return;
    if (navigationActive) {
      runInMap(
        `window.followNavigation(${userLocation[0]}, ${userLocation[1]}, ${userHeading})`
      );
      return;
    }
    runInMap(
      `window.setUserLocation(${userLocation[0]}, ${userLocation[1]}, ${userHeading}, false)`
    );
  }, [userLocation, userHeading, navigationActive, runInMap]);

  useEffect(() => {
    if (!pickupLocation) {
      runInMap("window.setPickupLocation(null, null)");
      return;
    }
    runInMap(
      `window.setPickupLocation(${pickupLocation[0]}, ${pickupLocation[1]})`
    );
  }, [pickupLocation, runInMap]);

  useEffect(() => {
    if (!dropLocation) {
      runInMap("window.setDropLocation(null, null)");
      return;
    }
    runInMap(
      `window.setDropLocation(${dropLocation[0]}, ${dropLocation[1]})`
    );
  }, [dropLocation, runInMap]);

  const onMessage = useCallback(
    (event: WebViewMessageEvent) => {
      try {
        const data = JSON.parse(event.nativeEvent.data) as {
          type: string;
          id?: string;
        };
        if (data.type === "ready") {
          readyRef.current = true;
          if (selectedId) {
            runInMap(`window.setSelectedMarker(${JSON.stringify(selectedId)})`);
          }
          if (userLocation) {
            if (navigationActive) {
              runInMap(
                `window.followNavigation(${userLocation[0]}, ${userLocation[1]}, ${userHeading})`
              );
            } else {
              runInMap(
                `window.setUserLocation(${userLocation[0]}, ${userLocation[1]}, ${userHeading}, false)`
              );
            }
          }
          if (pickupLocation) {
            runInMap(
              `window.setPickupLocation(${pickupLocation[0]}, ${pickupLocation[1]})`
            );
          }
          if (dropLocation) {
            runInMap(
              `window.setDropLocation(${dropLocation[0]}, ${dropLocation[1]})`
            );
          }
          return;
        }
        if (data.type === "markerPress" && data.id) {
          onMarkerPress(data.id);
          return;
        }
        if (data.type === "mapPress") {
          onMapPress();
        }
      } catch {
        // ignore malformed messages
      }
    },
    [onMarkerPress, onMapPress, runInMap, selectedId, userLocation, userHeading, navigationActive, pickupLocation, dropLocation]
  );

  return (
    <WebView
      ref={webRef}
      source={{ html, baseUrl: "https://localhost" }}
      style={styles.map}
      onMessage={onMessage}
      originWhitelist={["*"]}
      javaScriptEnabled
      domStorageEnabled
      allowsInlineMediaPlayback
      scrollEnabled={false}
      bounces={false}
      overScrollMode="never"
      setSupportMultipleWindows={false}
    />
  );
});

export default MapWebView;

const styles = StyleSheet.create({
  map: {
    flex: 1,
    backgroundColor: "#F8F7F4",
  },
});
