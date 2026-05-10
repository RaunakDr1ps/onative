import { useState } from "react";
import MapView from "./MapView";

function App() {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("onative_user");
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const login = () => {
    const username = prompt("Choose your Onative username:");

    if (!username || username.trim() === "") return;

    const newUser = {
      username: username.trim(),
      userId: crypto.randomUUID(),
    };

    localStorage.setItem("onative_user", JSON.stringify(newUser));
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem("onative_user");
    setUser(null);
  };

  if (!user) {
    return (
      <div
        style={{
          height: "100vh",
          background: "#0b0f19",
          color: "white",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          fontFamily: "Arial",
        }}
      >
        <h1>Onative</h1>
        <p>Location-native realtime social platform</p>

        <button
          onClick={login}
          style={{
            padding: "12px 18px",
            borderRadius: "12px",
            border: "none",
            background: "white",
            color: "#0b0f19",
            fontWeight: "700",
            cursor: "pointer",
          }}
        >
          Enter Onative
        </button>
      </div>
    );
  }

  return <MapView user={user} logout={logout} />;
}

export default App;