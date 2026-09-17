import { useEffect, useState } from "react";
import { Elements } from "@stripe/react-stripe-js";
import { stripePromise } from "./lib/stripe";
import { installAuthSession401Handler } from "./lib/authSession";

import Login from "./Login";
import ForgotPassword from "./ForgotPassword";
import ResetPassword from "./ResetPassword";
import Dashboard from "./Dashboard";
import RunnerDashboard from "./RunnerDashboard";


////////////////////////////////////////////////////////
// ðŸ” TOKEN DECODER (SAFE)
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

  useEffect(() => {
    return installAuthSession401Handler({
      onSessionExpired() {
        setUser(null);
      },
    });
  }, []);
  const [loading, setLoading] = useState(true);
  ////////////////////////////////////////////////////////
  // ðŸ”¥ INIT SESSION (FIXED)
  ////////////////////////////////////////////////////////

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      setLoading(false);
      return;
    }

    const decoded = decodeToken(token);

    // ðŸš¨ IMPORTANT FIX: DO NOT instantly delete token
    if (!decoded || !decoded.userId) {
      console.warn("âš ï¸ Invalid token structure");

      setUser(null);
      setLoading(false);
      return;
    }

    // âœ… Normalize user object (CRITICAL)
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
  // â³ LOADING STATE
  ////////////////////////////////////////////////////////

  if (window.location.pathname === "/forgot-password") {
    return <ForgotPassword />;
  }

  if (window.location.pathname === "/reset-password") {
    return <ResetPassword />;
  }
  if (loading) {
    return <div style={{ padding: 20 }}>Loading...</div>;
  }

  ////////////////////////////////////////////////////////
  // ðŸ” LOGIN SCREEN
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