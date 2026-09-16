import { useEffect, useState } from "react";
import { Elements } from "@stripe/react-stripe-js";
import { stripePromise } from "./lib/stripe";

import Login from "./Login";
import ForgotPassword from "./ForgotPassword";
import Dashboard from "./Dashboard";
import RunnerDashboard from "./RunnerDashboard";


////////////////////////////////////////////////////////
// 🔐 TOKEN DECODER (SAFE)
////////////////////////////////////////////////////////

function decodeToken(token) {
  try {
    const payload = token.split(".")[1];
    const decoded = JSON.parse(atob(payload));


    return decoded;
  } catch (err) {
    console.error("Invalid token:", err);
    return null;
  }
}

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  ////////////////////////////////////////////////////////
  // 🔥 INIT SESSION (FIXED)
  ////////////////////////////////////////////////////////

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      setLoading(false);
      return;
    }

    const decoded = decodeToken(token);

    // 🚨 IMPORTANT FIX: DO NOT instantly delete token
    if (!decoded || !decoded.userId) {
      console.warn("⚠️ Invalid token structure");

      setUser(null);
      setLoading(false);
      return;
    }

    // ✅ Normalize user object (CRITICAL)
    setUser({
      id: decoded.userId,
      role: decoded.role,
    });

    setLoading(false);
  }, []);
  function handleLogout() {
    localStorage.removeItem("token");
    setUser(null);
  }

  ////////////////////////////////////////////////////////
  // ⏳ LOADING STATE
  ////////////////////////////////////////////////////////

  if (window.location.pathname === "/forgot-password") {
    return <ForgotPassword />;
  }
  if (loading) {
    return <div style={{ padding: 20 }}>Loading...</div>;
  }

  ////////////////////////////////////////////////////////
  // 🔐 LOGIN SCREEN
  ////////////////////////////////////////////////////////

  if (!user) {
    return <Login setUser={setUser} />;
  }
  return (
    <Elements stripe={stripePromise}>
      {user.role === "runner" ? (
        <RunnerDashboard user={user} onLogout={handleLogout} />
      ) : (
        <Dashboard
          user={user}
          onLogout={handleLogout}
        />
      )}
    </Elements>
  );
}