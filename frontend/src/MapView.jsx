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

const API_URL = "http://127.0.0.1:8000";

const categoryColors = {
  vibe: "#8b5cf6",
  alert: "#ef4444",
  event: "#3b82f6",
  food: "#f59e0b",
  traffic: "#f97316",
};

function formatTimeLeft(expiresAt) {
  const now = new Date();
  const expiry = new Date(expiresAt);

  const diff = expiry - now;

  if (diff <= 0) return "Expired";

  const mins = Math.floor(diff / 60000);

  if (mins < 60) {
    return `${mins}m left`;
  }

  const hrs = Math.floor(mins / 60);

  return `${hrs}h left`;
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
      console.log(err);
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
    ws.current = new WebSocket("ws://127.0.0.1:8000/ws");

    ws.current.onopen = () => {
      setConnected(true);
      console.log("Realtime connected");
    };

    ws.current.onclose = () => {
      setConnected(false);
      console.log("Realtime disconnected");
    };

    ws.current.onmessage = (event) => {
      const newPin = JSON.parse(event.data);

      setMarkers((prev) => [newPin, ...prev]);
    };

    return () => {
      ws.current.close();
    };
  }, []);

  const submitPin = async () => {
    if (!draftPin.text.trim()) return;

    const pinData = {
      ...draftPin,
      time: new Date().toLocaleTimeString(),
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
      console.log(err);
    }
  };

  const filteredMarkers =
    selectedCategory === "all"
      ? markers
      : markers.filter((m) => m.category === selectedCategory);

  return (
    <div style={{ position: "relative" }}>
      {/* LEFT TOP */}
      <div
        style={{
          position: "absolute",
          zIndex: 1000,
          top: "12px",
          left: "12px",
          background: "#0b1020",
          color: "white",
          padding: "12px",
          borderRadius: "14px",
          fontFamily: "Arial",
          boxShadow: "0 4px 15px rgba(0,0,0,0.4)",
        }}
      >
        <h2 style={{ margin: 0 }}>Onative</h2>

        <small style={{ color: "#9ca3af" }}>
          realtime local pulse
        </small>

        <br />
        <small>@{user.username}</small>

        <br />

        <button
          onClick={logout}
          style={{
            marginTop: "8px",
            padding: "6px 10px",
            borderRadius: "8px",
            border: "none",
            cursor: "pointer",
          }}
        >
          Logout
        </button>
      </div>

      {/* RIGHT TOP */}
      <div
        style={{
          position: "absolute",
          zIndex: 1000,
          top: "12px",
          right: "12px",
          background: "#0b1020",
          color: "white",
          padding: "12px",
          borderRadius: "14px",
          fontFamily: "Arial",
          textAlign: "center",
          boxShadow: "0 4px 15px rgba(0,0,0,0.4)",
        }}
      >
        <div>Pins visible: {filteredMarkers.length}</div>

        <div style={{ marginTop: "6px" }}>
          Realtime:{" "}
          <span
            style={{
              color: connected ? "#22c55e" : "#ef4444",
              fontWeight: "bold",
            }}
          >
            {connected ? "Live" : "Disconnected"}
          </span>
        </div>

        <div style={{ marginTop: "6px" }}>
          Viewport loading: ON
        </div>
      </div>

      {/* CATEGORY FILTER */}
      <div
        style={{
          position: "absolute",
          zIndex: 1000,
          top: "70px",
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          gap: "8px",
          background: "#0b1020",
          padding: "10px",
          borderRadius: "14px",
          boxShadow: "0 4px 15px rgba(0,0,0,0.4)",
        }}
      >
        {["all", "vibe", "alert", "event", "food", "traffic"].map(
          (cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                background:
                  selectedCategory === cat ? "white" : "#1f2937",
                color:
                  selectedCategory === cat ? "black" : "white",
                border: "none",
                padding: "8px 12px",
                borderRadius: "10px",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              {cat}
            </button>
          )
        )}
      </div>

      {/* MY LOCATION */}
      <button
        onClick={() => {
          navigator.geolocation.getCurrentPosition((pos) => {
            window.location.href = `#${pos.coords.latitude},${pos.coords.longitude}`;
          });
        }}
        style={{
          position: "absolute",
          zIndex: 1000,
          bottom: "20px",
          right: "20px",
          background: "#0b1020",
          color: "white",
          border: "none",
          padding: "14px",
          borderRadius: "14px",
          cursor: "pointer",
          fontWeight: "bold",
        }}
      >
        📍 My Location
      </button>

      {/* CREATE POST MODAL */}
      {draftPin && (
        <div
          style={{
            position: "absolute",
            zIndex: 2000,
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background: "white",
            padding: "20px",
            borderRadius: "18px",
            width: "320px",
            boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
            fontFamily: "Arial",
          }}
        >
          <h2
            style={{
              marginTop: 0,
              textAlign: "center",
            }}
          >
            Drop a live update
          </h2>

          <input
            value={draftPin.username}
            disabled
            style={{
              width: "100%",
              padding: "12px",
              marginBottom: "12px",
              borderRadius: "10px",
              border: "1px solid #d1d5db",
              background: "#f3f4f6",
            }}
          />

          <textarea
            placeholder="What's happening?"
            value={draftPin.text}
            onChange={(e) =>
              setDraftPin({
                ...draftPin,
                text: e.target.value,
              })
            }
            style={{
              width: "100%",
              height: "100px",
              padding: "12px",
              borderRadius: "10px",
              border: "1px solid #d1d5db",
              resize: "none",
              marginBottom: "12px",
            }}
          />

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
              padding: "12px",
              borderRadius: "10px",
              border: "1px solid #d1d5db",
              marginBottom: "14px",
            }}
          >
            <option value="vibe">💜 Vibe — 2h</option>
            <option value="alert">🚨 Alert — 6h</option>
            <option value="event">🎉 Event — 12h</option>
            <option value="food">🍔 Food — 4h</option>
            <option value="traffic">🚗 Traffic — 30m</option>
          </select>

          <div
            style={{
              display: "flex",
              gap: "10px",
            }}
          >
            <button
              onClick={submitPin}
              style={{
                flex: 1,
                background: "#0b1020",
                color: "white",
                border: "none",
                padding: "12px",
                borderRadius: "10px",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              Post
            </button>

            <button
              onClick={() => setDraftPin(null)}
              style={{
                flex: 1,
                background: "#e5e7eb",
                color: "black",
                border: "none",
                padding: "12px",
                borderRadius: "10px",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              Cancel
            </button>
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

        <MapClickHandler
          setDraftPin={setDraftPin}
          user={user}
        />

        {filteredMarkers.map((marker) => (
          <CircleMarker
            key={marker.id}
            center={[marker.lat, marker.lng]}
            radius={10}
            pathOptions={{
              color:
                categoryColors[marker.category] || "#3b82f6",
              fillColor:
                categoryColors[marker.category] || "#3b82f6",
              fillOpacity: 0.8,
            }}
          >
            <Popup>
              <strong>@{marker.username}</strong>

              <br />

              {marker.text}

              <br />
              <br />

              <small>
                Category: {marker.category}
              </small>

              <br />

              <small>
                Posted: {marker.time || "Just now"}
              </small>

              <br />

              <small
                style={{
                  color: "#ef4444",
                  fontWeight: "bold",
                }}
              >
                ⏳ {formatTimeLeft(marker.expires_at)}
              </small>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}

export default MapView;