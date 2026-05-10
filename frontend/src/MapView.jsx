import { useEffect, useRef, useState } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  useMapEvents,
  useMap,
} from "react-leaflet";

import "leaflet/dist/leaflet.css";

const API_URL = "https://onative-backend.onrender.com";
const WS_URL = "wss://onative-backend.onrender.com/ws";

const categories = {
  all: {
    label: "All",
    emoji: "🌐",
    color: "#ffffff",
  },
  vibe: {
    label: "Vibe",
    emoji: "💜",
    color: "#8b5cf6",
  },
  alert: {
    label: "Alert",
    emoji: "🚨",
    color: "#ef4444",
  },
  event: {
    label: "Event",
    emoji: "🎉",
    color: "#3b82f6",
  },
  food: {
    label: "Food",
    emoji: "🍔",
    color: "#f59e0b",
  },
  traffic: {
    label: "Traffic",
    emoji: "🚗",
    color: "#f97316",
  },
};

function formatTimeLeft(expiresAt) {
  const now = new Date();
  const expiry = new Date(expiresAt);
  const diff = expiry - now;

  if (diff <= 0) return "Expired";

  const mins = Math.floor(diff / 60000);

  if (mins < 1) return "Less than 1m left";
  if (mins < 60) return `${mins}m left`;

  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;

  return `${hrs}h ${remMins}m left`;
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

function MapView({ user, logout }) {
  const [markers, setMarkers] = useState([]);
  const [draftPin, setDraftPin] = useState(null);
  const [bounds, setBounds] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [connected, setConnected] = useState(false);

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
      ws.current.close();
    };
  }, []);

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

  const filteredMarkers =
    selectedCategory === "all"
      ? markers
      : markers.filter((m) => m.category === selectedCategory);

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
      {/* BRAND PANEL */}
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
        <div
          style={{
            fontSize: "24px",
            fontWeight: "900",
            letterSpacing: "-0.8px",
          }}
        >
          Onative
        </div>

        <div
          style={{
            color: "#94a3b8",
            fontSize: "12px",
            marginTop: "2px",
          }}
        >
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

      {/* STATUS PANEL */}
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
          textAlign: "left",
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
              boxShadow: connected
                ? "0 0 12px rgba(34,197,94,0.8)"
                : "0 0 12px rgba(239,68,68,0.8)",
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

      {/* CATEGORY FILTER */}
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
                background: active
                  ? "white"
                  : "rgba(30,41,59,0.95)",
                color: active ? "#020617" : "white",
                border: active
                  ? "1px solid white"
                  : "1px solid rgba(255,255,255,0.12)",
                padding: "9px 13px",
                borderRadius: "999px",
                cursor: "pointer",
                fontWeight: "900",
                fontSize: "12px",
                textTransform: "capitalize",
                boxShadow: active
                  ? `0 0 22px ${cat.color}55`
                  : "none",
              }}
            >
              {cat.emoji} {cat.label}
            </button>
          );
        })}
      </div>

      {/* HINT */}
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
          boxShadow: "0 20px 50px rgba(0,0,0,0.35)",
        }}
      >
        Click anywhere on the map to post
      </div>

      {/* CREATE POST MODAL */}
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
              border: "1px solid rgba(15,23,42,0.08)",
            }}
          >
            <div
              style={{
                textAlign: "center",
                marginBottom: "18px",
              }}
            >
              <div
                style={{
                  fontSize: "22px",
                  fontWeight: "950",
                  color: "#020617",
                  letterSpacing: "-0.5px",
                }}
              >
                Drop a live update
              </div>

              <div
                style={{
                  fontSize: "13px",
                  color: "#64748b",
                  marginTop: "4px",
                }}
              >
                This pin will expire based on category
              </div>
            </div>

            <label
              style={{
                fontSize: "12px",
                fontWeight: "900",
                color: "#334155",
              }}
            >
              Username
            </label>

            <input
              value={draftPin.username}
              disabled
              style={{
                width: "100%",
                padding: "13px 14px",
                marginTop: "6px",
                marginBottom: "13px",
                borderRadius: "15px",
                border: "1px solid #cbd5e1",
                background: "#f1f5f9",
                color: "#0f172a",
                boxSizing: "border-box",
                fontWeight: "800",
              }}
            />

            <label
              style={{
                fontSize: "12px",
                fontWeight: "900",
                color: "#334155",
              }}
            >
              Update
            </label>

            <textarea
              placeholder="What's happening here?"
              value={draftPin.text}
              onChange={(e) =>
                setDraftPin({
                  ...draftPin,
                  text: e.target.value,
                })
              }
              style={{
                width: "100%",
                height: "105px",
                padding: "13px 14px",
                marginTop: "6px",
                marginBottom: "13px",
                borderRadius: "15px",
                border: "1px solid #cbd5e1",
                resize: "none",
                boxSizing: "border-box",
                outline: "none",
                color: "#0f172a",
                background: "white",
                fontWeight: "600",
              }}
            />

            <label
              style={{
                fontSize: "12px",
                fontWeight: "900",
                color: "#334155",
              }}
            >
              Category
            </label>

            <select
              value={draftPin.category}
              onChange={(e) =>
                setDraftPin({
                  ...draftPin,
                  category: e.target.value,
                })
              }
              style={{
                width: "100%",
                padding: "13px 14px",
                marginTop: "6px",
                marginBottom: "16px",
                borderRadius: "15px",
                border: "1px solid #cbd5e1",
                background: "white",
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
                  background: "linear-gradient(135deg, #020617, #111827)",
                  color: "white",
                  border: "none",
                  padding: "13px",
                  borderRadius: "15px",
                  cursor: "pointer",
                  fontWeight: "950",
                  boxShadow: "0 16px 35px rgba(2,6,23,0.35)",
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
        style={{
          height: "100vh",
          width: "100%",
        }}
      >
        <ViewportTracker setBounds={setBounds} />

        <TileLayer
          attribution="© OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <LocateButton />

        <MapClickHandler
          setDraftPin={setDraftPin}
          user={user}
        />

        {filteredMarkers.map((marker) => {
          const category = categories[marker.category] || categories.vibe;

          return (
            <CircleMarker
              key={marker.id}
              center={[marker.lat, marker.lng]}
              radius={11}
              pathOptions={{
                color: category.color,
                fillColor: category.color,
                fillOpacity: 0.82,
                weight: 3,
              }}
            >
              <Popup>
                <div
                  style={{
                    minWidth: "190px",
                    fontFamily: "Inter, Arial, sans-serif",
                  }}
                >
                  <div
                    style={{
                      fontWeight: "950",
                      fontSize: "15px",
                      marginBottom: "6px",
                      color: "#020617",
                    }}
                  >
                    {category.emoji} {category.label}
                  </div>

                  <div
                    style={{
                      color: "#334155",
                      fontWeight: "800",
                      marginBottom: "8px",
                    }}
                  >
                    @{marker.username}
                  </div>

                  <div
                    style={{
                      color: "#0f172a",
                      marginBottom: "10px",
                      lineHeight: 1.35,
                    }}
                  >
                    {marker.text}
                  </div>

                  <div
                    style={{
                      padding: "8px 10px",
                      borderRadius: "12px",
                      background: "#f1f5f9",
                      color: "#475569",
                      fontSize: "12px",
                      fontWeight: "800",
                    }}
                  >
                    Posted: {marker.time || "Just now"}
                    <br />
                    ⏳ {formatTimeLeft(marker.expires_at)}
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}

export default MapView;
