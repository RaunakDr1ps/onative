import { useEffect, useRef, useState } from "react";
import {
  MapContainer,
  TileLayer,
  useMapEvents,
  useMap,
} from "react-leaflet";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";

const API_URL = "https://onative-backend.onrender.com";
const WS_URL = "wss://onative-backend.onrender.com/ws";

const categories = {
  all: { label: "All", emoji: "🌐", color: "#ffffff" },
  vibe: { label: "Vibe", emoji: "💜", color: "#8b5cf6" },
  alert: { label: "Alert", emoji: "🚨", color: "#ef4444" },
  event: { label: "Event", emoji: "🎉", color: "#3b82f6" },
  food: { label: "Food", emoji: "🍔", color: "#f59e0b" },
  traffic: { label: "Traffic", emoji: "🚗", color: "#f97316" },
};

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function createPinIcon(category) {
  return L.divIcon({
    html: `
      <div style="
        width: 26px;
        height: 26px;
        border-radius: 999px;
        background: ${category.color};
        border: 3px solid white;
        box-shadow: 0 8px 18px rgba(0,0,0,0.35);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
      ">
        ${category.emoji}
      </div>
    `,
    className: "",
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -14],
  });
}

function parseBackendDate(value) {
  if (!value) return null;
  const hasTimezone = value.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(value);
  return new Date(hasTimezone ? value : `${value}Z`);
}

function formatTimeLeft(expiresAt, nowMs) {
  const expiry = parseBackendDate(expiresAt);
  if (!expiry) return "No expiry";

  const diff = expiry.getTime() - nowMs;
  if (diff <= 0) return "Expired";

  const totalSeconds = Math.floor(diff / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s left`;
  if (minutes > 0) return `${minutes}m ${seconds}s left`;
  return `${seconds}s left`;
}

function isExpired(expiresAt, nowMs) {
  const expiry = parseBackendDate(expiresAt);
  if (!expiry) return false;
  return expiry.getTime() <= nowMs;
}

function ViewportTracker({ setBounds }) {
  const map = useMap();

  useEffect(() => {
    const updateBounds = () => {
      const bounds = map.getBounds();

      setBounds({
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest(),
      });
    };

    updateBounds();
    map.on("moveend", updateBounds);
    map.on("zoomend", updateBounds);

    return () => {
      map.off("moveend", updateBounds);
      map.off("zoomend", updateBounds);
    };
  }, [map, setBounds]);

  return null;
}

function MapController({ searchTarget }) {
  const map = useMap();

  useEffect(() => {
    if (!searchTarget) return;
    map.setView([searchTarget.lat, searchTarget.lng], 15);
  }, [searchTarget, map]);

  return null;
}

function MapClickHandler({ setDraftPin, user }) {
  useMapEvents({
    click(e) {
      setDraftPin({
        lat: e.latlng.lat,
        lng: e.latlng.lng,
        username: user.username,
        text: "",
        category: "vibe",
      });
    },
  });

  return null;
}

function LocateButton() {
  const map = useMap();

  const goToMyLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        map.setView([pos.coords.latitude, pos.coords.longitude], 15);
      },
      () => {
        alert("Location permission denied.");
      }
    );
  };

  return (
    <button
      onClick={goToMyLocation}
      style={{
        position: "absolute",
        zIndex: 1000,
        bottom: "22px",
        right: "22px",
        background: "linear-gradient(135deg, #111827, #020617)",
        color: "white",
        border: "1px solid rgba(255,255,255,0.16)",
        padding: "13px 16px",
        borderRadius: "999px",
        cursor: "pointer",
        fontWeight: "800",
        boxShadow: "0 18px 45px rgba(0,0,0,0.35)",
      }}
    >
      📍 My Location
    </button>
  );
}

function ClusteredMarkers({ markers, nowMs }) {
  const map = useMap();

  useEffect(() => {
    const clusterGroup = L.markerClusterGroup({
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: true,
      chunkedLoading: true,
      maxClusterRadius: 80,
    });

    markers.forEach((marker) => {
      const category = categories[marker.category] || categories.vibe;

      const leafletMarker = L.marker([marker.lat, marker.lng], {
        icon: createPinIcon(category),
      });

      leafletMarker.bindPopup(`
        <div style="min-width:190px;font-family:Inter,Arial,sans-serif;">
          <div style="font-weight:950;font-size:15px;margin-bottom:6px;color:#020617;">
            ${category.emoji} ${category.label}
          </div>

          <div style="color:#334155;font-weight:800;">
            @${escapeHtml(marker.username)}
          </div>

          <div style="color:#0f172a;margin-top:8px;margin-bottom:10px;line-height:1.35;">
            ${escapeHtml(marker.text)}
          </div>

          <div style="padding:8px 10px;border-radius:12px;background:#f1f5f9;color:#475569;font-size:12px;font-weight:800;">
            Posted: ${escapeHtml(marker.time || "Just now")}<br/>
            ⏳ ${formatTimeLeft(marker.expires_at, nowMs)}
          </div>
        </div>
      `);

      clusterGroup.addLayer(leafletMarker);
    });

    map.addLayer(clusterGroup);

    return () => {
      map.removeLayer(clusterGroup);
    };
  }, [map, markers, nowMs]);

  return null;
}

function MapView({ user, logout }) {
  const [markers, setMarkers] = useState([]);
  const [draftPin, setDraftPin] = useState(null);
  const [bounds, setBounds] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [connected, setConnected] = useState(false);
  const [nowMs, setNowMs] = useState(Date.now());
  const [searchText, setSearchText] = useState("");
  const [searchTarget, setSearchTarget] = useState(null);
  const [searching, setSearching] = useState(false);

  const ws = useRef(null);

  const fetchPins = async () => {
    if (!bounds) return;

    try {
      const response = await fetch(
        `${API_URL}/pins?north=${bounds.north}&south=${bounds.south}&east=${bounds.east}&west=${bounds.west}`
      );

      const data = await response.json();
      setMarkers(data);
    } catch (err) {
      console.log("Fetch pins failed:", err);
    }
  };

  useEffect(() => {
    fetchPins();
  }, [bounds]);

  useEffect(() => {
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchPins();
    }, 10000);

    return () => clearInterval(interval);
  }, [bounds]);

  useEffect(() => {
    ws.current = new WebSocket(WS_URL);

    ws.current.onopen = () => {
      setConnected(true);
      console.log("Realtime connected");
    };

    ws.current.onclose = () => {
      setConnected(false);
      console.log("Realtime disconnected");
    };

    ws.current.onerror = () => {
      setConnected(false);
      console.log("Realtime error");
    };

    ws.current.onmessage = (event) => {
      const newPin = JSON.parse(event.data);

      setMarkers((prev) => {
        const exists = prev.some((pin) => pin.id === newPin.id);
        if (exists) return prev;
        return [newPin, ...prev];
      });
    };

    return () => {
      if (ws.current) ws.current.close();
    };
  }, []);

  const searchPlace = async () => {
    if (!searchText.trim()) return;

    setSearching(true);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchText
        )}&limit=1`
      );

      const data = await response.json();

      if (!data || data.length === 0) {
        alert("Place not found.");
        return;
      }

      setSearchTarget({
        lat: Number(data[0].lat),
        lng: Number(data[0].lon),
      });
    } catch (err) {
      console.log("Search failed:", err);
      alert("Search failed. Try again.");
    } finally {
      setSearching(false);
    }
  };

  const submitPin = async () => {
    if (!draftPin.text.trim()) return;

    const pinData = {
      ...draftPin,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    try {
      await fetch(`${API_URL}/pins`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(pinData),
      });

      setDraftPin(null);
    } catch (err) {
      console.log("Post failed:", err);
    }
  };

  const nonExpiredMarkers = markers.filter(
    (marker) => !isExpired(marker.expires_at, nowMs)
  );

  const filteredMarkers =
    selectedCategory === "all"
      ? nonExpiredMarkers
      : nonExpiredMarkers.filter((m) => m.category === selectedCategory);

  return (
    <div
      style={{
        position: "relative",
        height: "100vh",
        width: "100%",
        overflow: "hidden",
        background: "#020617",
      }}
    >
      <div
        style={{
          position: "absolute",
          zIndex: 1000,
          top: "18px",
          left: "18px",
          background: "rgba(2, 6, 23, 0.88)",
          backdropFilter: "blur(18px)",
          color: "white",
          padding: "16px",
          borderRadius: "22px",
          fontFamily: "Inter, Arial, sans-serif",
          boxShadow: "0 20px 50px rgba(0,0,0,0.35)",
          border: "1px solid rgba(255,255,255,0.12)",
          minWidth: "170px",
        }}
      >
        <div style={{ fontSize: "24px", fontWeight: "900" }}>Onative</div>
        <div style={{ color: "#94a3b8", fontSize: "12px" }}>
          realtime local pulse
        </div>

        <div
          style={{
            marginTop: "12px",
            padding: "8px 10px",
            borderRadius: "12px",
            background: "rgba(255,255,255,0.08)",
            fontSize: "13px",
            fontWeight: "700",
          }}
        >
          @{user.username}
        </div>

        <button
          onClick={logout}
          style={{
            marginTop: "10px",
            width: "100%",
            padding: "9px 10px",
            borderRadius: "12px",
            border: "1px solid rgba(255,255,255,0.16)",
            background: "rgba(255,255,255,0.1)",
            color: "white",
            cursor: "pointer",
            fontWeight: "800",
          }}
        >
          Logout
        </button>
      </div>

      <div
        style={{
          position: "absolute",
          zIndex: 1000,
          top: "18px",
          right: "18px",
          background: "rgba(2, 6, 23, 0.88)",
          backdropFilter: "blur(18px)",
          color: "white",
          padding: "15px 16px",
          borderRadius: "22px",
          fontFamily: "Inter, Arial, sans-serif",
          boxShadow: "0 20px 50px rgba(0,0,0,0.35)",
          border: "1px solid rgba(255,255,255,0.12)",
          minWidth: "190px",
        }}
      >
        <div style={{ fontWeight: "900", fontSize: "14px" }}>
          Pins visible: {filteredMarkers.length}
        </div>

        <div style={{ marginTop: "8px", fontSize: "13px" }}>
          <span
            style={{
              display: "inline-block",
              height: "8px",
              width: "8px",
              borderRadius: "50%",
              marginRight: "7px",
              background: connected ? "#22c55e" : "#ef4444",
            }}
          />
          Realtime:{" "}
          <strong style={{ color: connected ? "#22c55e" : "#ef4444" }}>
            {connected ? "Live" : "Disconnected"}
          </strong>
        </div>

        <div style={{ marginTop: "8px", color: "#cbd5e1", fontSize: "12px" }}>
          Viewport loading: ON
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          zIndex: 1000,
          top: "92px",
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          gap: "8px",
          background: "rgba(2, 6, 23, 0.88)",
          backdropFilter: "blur(18px)",
          padding: "10px",
          borderRadius: "999px",
          boxShadow: "0 20px 50px rgba(0,0,0,0.35)",
          border: "1px solid rgba(255,255,255,0.12)",
          fontFamily: "Inter, Arial, sans-serif",
        }}
      >
        {Object.entries(categories).map(([key, cat]) => {
          const active = selectedCategory === key;

          return (
            <button
              key={key}
              onClick={() => setSelectedCategory(key)}
              style={{
                background: active ? "white" : "rgba(30,41,59,0.95)",
                color: active ? "#020617" : "white",
                border: active
                  ? "1px solid white"
                  : "1px solid rgba(255,255,255,0.12)",
                padding: "9px 13px",
                borderRadius: "999px",
                cursor: "pointer",
                fontWeight: "900",
                fontSize: "12px",
              }}
            >
              {cat.emoji} {cat.label}
            </button>
          );
        })}
      </div>

      <div
        style={{
          position: "absolute",
          zIndex: 1000,
          top: "150px",
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          gap: "8px",
          background: "rgba(2, 6, 23, 0.88)",
          backdropFilter: "blur(18px)",
          padding: "10px",
          borderRadius: "999px",
          border: "1px solid rgba(255,255,255,0.12)",
          boxShadow: "0 20px 50px rgba(0,0,0,0.35)",
          fontFamily: "Inter, Arial, sans-serif",
        }}
      >
        <input
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") searchPlace();
          }}
          placeholder="Search place..."
          style={{
            width: "260px",
            padding: "11px 14px",
            borderRadius: "999px",
            border: "1px solid rgba(255,255,255,0.18)",
            background: "rgba(15,23,42,0.95)",
            color: "white",
            outline: "none",
            fontWeight: "700",
          }}
        />

        <button
          onClick={searchPlace}
          disabled={searching}
          style={{
            padding: "11px 16px",
            borderRadius: "999px",
            border: "none",
            background: "white",
            color: "#020617",
            cursor: "pointer",
            fontWeight: "900",
          }}
        >
          {searching ? "Searching..." : "Search"}
        </button>
      </div>

      <div
        style={{
          position: "absolute",
          zIndex: 1000,
          bottom: "22px",
          left: "22px",
          background: "rgba(2, 6, 23, 0.88)",
          backdropFilter: "blur(18px)",
          color: "white",
          padding: "12px 15px",
          borderRadius: "999px",
          fontFamily: "Inter, Arial, sans-serif",
          fontSize: "13px",
          border: "1px solid rgba(255,255,255,0.12)",
        }}
      >
        Click anywhere on the map to post
      </div>

      {draftPin && (
        <div
          style={{
            position: "absolute",
            zIndex: 2000,
            inset: 0,
            background: "rgba(2,6,23,0.45)",
            backdropFilter: "blur(5px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "Inter, Arial, sans-serif",
          }}
        >
          <div
            style={{
              width: "380px",
              background: "linear-gradient(180deg, #ffffff, #f8fafc)",
              padding: "22px",
              borderRadius: "26px",
              boxShadow: "0 30px 80px rgba(0,0,0,0.45)",
            }}
          >
            <div style={{ textAlign: "center", marginBottom: "18px" }}>
              <div
                style={{
                  fontSize: "22px",
                  fontWeight: "950",
                  color: "#020617",
                }}
              >
                Drop a live update
              </div>
              <div style={{ fontSize: "13px", color: "#64748b" }}>
                This pin will expire based on category
              </div>
            </div>

            <input
              value={draftPin.username}
              disabled
              style={{
                width: "100%",
                padding: "13px 14px",
                marginBottom: "13px",
                borderRadius: "15px",
                border: "1px solid #cbd5e1",
                background: "#f1f5f9",
                color: "#0f172a",
                boxSizing: "border-box",
                fontWeight: "800",
              }}
            />

            <textarea
              placeholder="What's happening here?"
              value={draftPin.text}
              onChange={(e) =>
                setDraftPin({ ...draftPin, text: e.target.value })
              }
              style={{
                width: "100%",
                height: "105px",
                padding: "13px 14px",
                marginBottom: "13px",
                borderRadius: "15px",
                border: "1px solid #cbd5e1",
                resize: "none",
                boxSizing: "border-box",
                color: "#0f172a",
              }}
            />

            <select
              value={draftPin.category}
              onChange={(e) =>
                setDraftPin({ ...draftPin, category: e.target.value })
              }
              style={{
                width: "100%",
                padding: "13px 14px",
                marginBottom: "16px",
                borderRadius: "15px",
                border: "1px solid #cbd5e1",
                color: "#0f172a",
                boxSizing: "border-box",
                fontWeight: "800",
              }}
            >
              <option value="vibe">💜 Vibe — 2h</option>
              <option value="alert">🚨 Alert — 6h</option>
              <option value="event">🎉 Event — 12h</option>
              <option value="food">🍔 Food — 4h</option>
              <option value="traffic">🚗 Traffic — 30m</option>
            </select>

            <div style={{ display: "flex", gap: "11px" }}>
              <button
                onClick={submitPin}
                style={{
                  flex: 1,
                  background: "#020617",
                  color: "white",
                  border: "none",
                  padding: "13px",
                  borderRadius: "15px",
                  cursor: "pointer",
                  fontWeight: "950",
                }}
              >
                Post
              </button>

              <button
                onClick={() => setDraftPin(null)}
                style={{
                  flex: 1,
                  background: "#e2e8f0",
                  color: "#020617",
                  border: "1px solid #cbd5e1",
                  padding: "13px",
                  borderRadius: "15px",
                  cursor: "pointer",
                  fontWeight: "950",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <MapContainer
        center={[25.5941, 85.1376]}
        zoom={13}
        style={{ height: "100vh", width: "100%" }}
      >
        <ViewportTracker setBounds={setBounds} />
        <MapController searchTarget={searchTarget} />

        <TileLayer
          attribution="© OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <LocateButton />
        <MapClickHandler setDraftPin={setDraftPin} user={user} />

        <ClusteredMarkers markers={filteredMarkers} nowMs={nowMs} />
      </MapContainer>
    </div>
  );
}

export default MapView;
