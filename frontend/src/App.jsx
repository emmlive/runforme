import { useEffect, useState } from "react";
import { Elements } from "@stripe/react-stripe-js";
import { stripePromise } from "./lib/stripe";

import Login from "./Login";
import Dashboard from "./Dashboard";
import RunnerDashboard from "./RunnerDashboard";
import PaymentPage from "./pages/PaymentPage";

////////////////////////////////////////////////////////
// 🔐 TOKEN DECODER (SAFE)
////////////////////////////////////////////////////////

function decodeToken(token) {
  try {
    const payload = token.split(".")[1];
    const decoded = JSON.parse(atob(payload));

    console.log("DECODED TOKEN:", decoded); // 🔍 DEBUG

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
  // 💳 PAYMENT STATE
  ////////////////////////////////////////////////////////

  const [clientSecret, setClientSecret] = useState(null);
  const [showPayment, setShowPayment] = useState(false);
  const [activeRunId, setActiveRunId] = useState(null);

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

  ////////////////////////////////////////////////////////
  // 💳 CREATE PAYMENT INTENT
  ////////////////////////////////////////////////////////

  async function startPayment(runId) {
    try {
      const token = localStorage.getItem("token");

      const res = await fetch(
        "http://localhost:5050/api/payments/create-intent",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ runId }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create payment");
      }

      setClientSecret(data.clientSecret);
      setActiveRunId(runId);
      setShowPayment(true);
    } catch (err) {
      console.error("Payment init error:", err);
      alert("Failed to start payment");
    }
  }

  ////////////////////////////////////////////////////////
  // 🚪 LOGOUT
  ////////////////////////////////////////////////////////

  function handleLogout() {
    localStorage.removeItem("token");
    setUser(null);
  }

  ////////////////////////////////////////////////////////
  // ⏳ LOADING STATE
  ////////////////////////////////////////////////////////

  if (loading) {
    return <div style={{ padding: 20 }}>Loading...</div>;
  }

  ////////////////////////////////////////////////////////
  // 🔐 LOGIN SCREEN
  ////////////////////////////////////////////////////////

  if (!user) {
    return <Login setUser={setUser} />;
  }

  ////////////////////////////////////////////////////////
  // 💳 PAYMENT SCREEN
  ////////////////////////////////////////////////////////

  if (showPayment && clientSecret) {
    return (
      <Elements stripe={stripePromise}>
        <PaymentPage
          clientSecret={clientSecret}
          runId={activeRunId}
        />
      </Elements>
    );
  }

  ////////////////////////////////////////////////////////
  // 🧠 DASHBOARD ROUTING
  ////////////////////////////////////////////////////////

  return (
    <Elements stripe={stripePromise}>
      {user.role === "runner" ? (
        <RunnerDashboard user={user} onLogout={handleLogout} />
      ) : (
        <Dashboard
          user={user}
          onLogout={handleLogout}
          onStartPayment={startPayment}
        />
      )}
    </Elements>
  );
}